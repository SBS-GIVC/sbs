"""
Security & Signer Service
Manages digital certificates and payload signing for NPHIES
Port: 8001
"""

from fastapi import FastAPI, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Dict, Any
import json
import hashlib
import base64
import os
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.backends import default_backend
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
from collections import deque
from threading import Lock
import time

load_dotenv()

app = FastAPI(
    title="SBS Security & Signer Service",
    description="Digital signing service for NPHIES integration",
    version="1.0.0"
)

# CORS middleware - Restrict to allowed origins
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Request-ID"],
)

# Rate limiter implementation
class RateLimiter:
    """Token bucket rate limiter with automatic cleanup"""
    def __init__(self, max_requests: int = 50, time_window: int = 60, max_tracked_ips: int = 10000):
        self.max_requests = max_requests
        self.time_window = time_window
        self.max_tracked_ips = max_tracked_ips  # Prevent unbounded memory growth
        self.requests = {}
        self.lock = Lock()
        self.last_cleanup = time.time()
        self.cleanup_interval = 300  # Cleanup every 5 minutes

    def _cleanup_old_entries(self, now: float) -> None:
        """Remove stale IP entries to prevent memory leak"""
        if now - self.last_cleanup < self.cleanup_interval:
            return
        
        stale_threshold = now - self.time_window * 2
        to_remove = [ip for ip, reqs in self.requests.items() 
                     if not reqs or reqs[-1] < stale_threshold]
        for ip in to_remove:
            del self.requests[ip]
        
        if len(self.requests) > self.max_tracked_ips:
            sorted_ips = sorted(self.requests.keys(), 
                               key=lambda ip: self.requests[ip][-1] if self.requests[ip] else 0)
            for ip in sorted_ips[:len(self.requests) - self.max_tracked_ips]:
                del self.requests[ip]
        
        self.last_cleanup = now

    def is_allowed(self, identifier: str) -> bool:
        with self.lock:
            now = time.time()
            self._cleanup_old_entries(now)
            
            if identifier not in self.requests:
                self.requests[identifier] = deque()
            while self.requests[identifier] and self.requests[identifier][0] < now - self.time_window:
                self.requests[identifier].popleft()
            if len(self.requests[identifier]) < self.max_requests:
                self.requests[identifier].append(now)
                return True
            return False

rate_limiter = RateLimiter(max_requests=50, time_window=60)

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """Rate limiting middleware"""
    if request.url.path in ["/health", "/"]:
        return await call_next(request)
    client_ip = request.client.host if request.client else "unknown"
    if not rate_limiter.is_allowed(client_ip):
        return JSONResponse(
            status_code=429,
            content={"error": "Rate limit exceeded", "retry_after_seconds": 60}
        )
    return await call_next(request)


def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        database=os.getenv("DB_NAME", "sbs_integration"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD"),
        port=os.getenv("DB_PORT", "5432")
    )


class SignRequest(BaseModel):
    payload: Dict[str, Any] = Field(..., description="FHIR JSON payload to sign")
    facility_id: int = Field(..., description="Facility identifier")


class SignResponse(BaseModel):
    signature: str = Field(..., description="Base64-encoded digital signature")
    algorithm: str = "SHA256withRSA"
    timestamp: str
    certificate_serial: str


def get_facility_certificate(facility_id: int) -> Dict:
    """
    Retrieve active signing certificate for facility
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        query = """
        SELECT 
            cert_id,
            serial_number,
            private_key_path,
            public_cert_path,
            valid_from,
            valid_until
        FROM facility_certificates
        WHERE facility_id = %s 
          AND cert_type IN ('signing', 'both')
          AND is_active = TRUE
          AND valid_until > CURRENT_DATE
        ORDER BY valid_until DESC
        LIMIT 1
        """
        
        cursor.execute(query, (facility_id,))
        result = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No valid signing certificate found for facility {facility_id}"
            )
        
        return dict(result)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving certificate: {str(e)}"
        )


def load_private_key(key_path: str) -> rsa.RSAPrivateKey:
    """
    Load RSA private key from file
    Supports PEM format
    """
    try:
        # Check if path is absolute or relative
        if not os.path.isabs(key_path):
            key_path = os.path.join(os.getenv("CERT_BASE_PATH", "/certs"), key_path)
        
        with open(key_path, "rb") as key_file:
            private_key = serialization.load_pem_private_key(
                key_file.read(),
                password=os.getenv("CERT_PASSWORD", "").encode() if os.getenv("CERT_PASSWORD") else None,
                backend=default_backend()
            )
        
        return private_key
        
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Private key file not found: {key_path}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error loading private key: {str(e)}"
        )

def load_private_key_from_env() -> rsa.RSAPrivateKey | None:
    """
    Load RSA private key from environment (Cloudflare Secrets Store).
    Supports either base64-encoded or raw PEM.
    """
    pem_b64 = os.getenv("SIGNER_PRIVATE_KEY_B64")
    pem_raw = os.getenv("SIGNER_PRIVATE_KEY_PEM")

    if not pem_b64 and not pem_raw:
        return None

    try:
        pem_data = base64.b64decode(pem_b64).decode("utf-8") if pem_b64 else pem_raw
        return serialization.load_pem_private_key(
            pem_data.encode("utf-8"),
            password=os.getenv("CERT_PASSWORD", "").encode() if os.getenv("CERT_PASSWORD") else None,
            backend=default_backend()
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error loading private key from secrets store: {str(e)}"
        )

def canonicalize_payload(payload: Dict[str, Any]) -> str:
    """
    Convert FHIR JSON to canonical string format
    
    Steps:
    1. Sort all keys alphabetically
    2. Remove whitespace
    3. Ensure consistent serialization
    """
    canonical_string = json.dumps(
        payload,
        sort_keys=True,
        separators=(',', ':'),
        ensure_ascii=False
    )
    return canonical_string


def sign_payload(canonical_string: str, private_key: rsa.RSAPrivateKey) -> str:
    """
    Sign the canonical payload using SHA-256 with RSA
    
    Steps:
    1. Hash the canonical string using SHA-256
    2. Sign the hash using RSA private key
    3. Encode signature as Base64
    """
    try:
        # Create SHA-256 hash
        message_bytes = canonical_string.encode('utf-8')
        
        # Sign using RSA with PKCS#1 v1.5 padding (NPHIES standard)
        signature = private_key.sign(
            message_bytes,
            padding.PKCS1v15(),
            hashes.SHA256()
        )
        
        # Encode as Base64
        signature_b64 = base64.b64encode(signature).decode('utf-8')
        
        return signature_b64
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error signing payload: {str(e)}"
        )


def generate_test_keypair(facility_id: int) -> tuple:
    """
    Generate a test RSA keypair for development/sandbox
    WARNING: Only use in non-production environments
    """
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
        backend=default_backend()
    )
    
    # Create certificates directory if it doesn't exist
    cert_dir = os.path.join(os.getenv("CERT_BASE_PATH", "/certs"), f"facility_{facility_id}")
    os.makedirs(cert_dir, exist_ok=True)
    
    # Save private key
    private_key_path = os.path.join(cert_dir, "private_key.pem")
    with open(private_key_path, "wb") as f:
        f.write(private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        ))
    
    # Save public key
    public_key = private_key.public_key()
    public_key_path = os.path.join(cert_dir, "public_key.pem")
    with open(public_key_path, "wb") as f:
        f.write(public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        ))
    
    return private_key_path, public_key_path


@app.get("/")
def root():
    return {
        "service": "SBS Security & Signer Service",
        "version": "1.0.0",
        "status": "active",
        "algorithm": "SHA256withRSA"
    }


@app.get("/health")
def health_check():
    """Health check endpoint"""
    try:
        conn = get_db_connection()
        conn.close()
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database connection failed: {str(e)}"
        )


@app.get("/ready")
def ready_check():
    """Readiness probe endpoint for Kubernetes"""
    try:
        conn = get_db_connection()
        conn.close()
        return {"status": "ready", "database": "connected"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database connection failed: {str(e)}"
        )


@app.post("/sign", response_model=SignResponse)
def sign_claim(request: SignRequest):
    """
    Sign a FHIR payload with facility's digital certificate
    
    Process:
    1. Retrieve facility's signing certificate
    2. Load private key
    3. Canonicalize the payload
    4. Generate SHA-256 hash
    5. Sign with RSA private key
    6. Return Base64-encoded signature
    """
    
    # Prefer secrets-store key when available
    private_key = load_private_key_from_env()
    cert_serial = os.getenv("SIGNER_CERT_SERIAL")

    if not private_key:
        # Get facility certificate
        cert_info = get_facility_certificate(request.facility_id)
        private_key = load_private_key(cert_info['private_key_path'])
        cert_serial = cert_info['serial_number']
    elif not cert_serial:
        cert_serial = "ENV-SIGNER"
    
    # Canonicalize payload
    canonical_string = canonicalize_payload(request.payload)
    
    # Sign the payload
    signature = sign_payload(canonical_string, private_key)
    
    # Return signature with metadata
    return SignResponse(
        signature=signature,
        algorithm="SHA256withRSA",
        timestamp=datetime.utcnow().isoformat() + "Z",
        certificate_serial=cert_serial
    )


@app.post("/generate-test-cert")
def generate_test_certificate(facility_id: int, request: Request):
    """
    Generate test certificate for sandbox environment
    WARNING: Only for development/testing - disabled by default in production
    """
    # Strictly enforce environment check
    nphies_env = os.getenv("NPHIES_ENV", "sandbox").lower()
    enable_test_certs = os.getenv("ENABLE_TEST_CERTIFICATES", "false").lower() == "true"

    if nphies_env == "production" or not enable_test_certs:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Test certificate generation is disabled. Set ENABLE_TEST_CERTIFICATES=true and NPHIES_ENV=sandbox to enable."
        )

    # Log this security-sensitive operation
    client_ip = request.client.host if request.client else "unknown"
    print(f"[SECURITY] Test certificate generation requested for facility {facility_id} from IP {client_ip}")
    
    try:
        private_path, public_path = generate_test_keypair(facility_id)
        
        # Insert into database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO facility_certificates 
            (facility_id, cert_type, serial_number, private_key_path, public_cert_path, 
             valid_from, valid_until, is_active)
            VALUES (%s, %s, %s, %s, %s, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', TRUE)
            ON CONFLICT (facility_id, cert_type, serial_number) 
            DO UPDATE SET is_active = TRUE
        """, (
            facility_id,
            'signing',
            f'TEST-{facility_id}-{datetime.now().strftime("%Y%m%d")}',
            private_path,
            public_path
        ))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return {
            "status": "success",
            "message": "Test certificate generated",
            "private_key_path": private_path,
            "public_key_path": public_path,
            "expires": "1 year from now"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating test certificate: {str(e)}"
        )


@app.get("/verify-certificate/{facility_id}")
def verify_certificate(facility_id: int):
    """
    Verify that facility has a valid certificate
    """
    try:
        cert_info = get_facility_certificate(facility_id)
        
        # Check if certificate is expired
        valid_until = cert_info['valid_until']
        is_expired = valid_until < datetime.now().date()
        
        return {
            "facility_id": facility_id,
            "certificate_serial": cert_info['serial_number'],
            "valid_from": str(cert_info['valid_from']),
            "valid_until": str(cert_info['valid_until']),
            "is_expired": is_expired,
            "status": "invalid" if is_expired else "valid"
        }
        
    except HTTPException as e:
        return {
            "facility_id": facility_id,
            "status": "not_found",
            "error": e.detail
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
