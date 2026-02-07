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
import uuid
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.backends import default_backend
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
import time
import sys
import os

# Add parent directory to path for shared module import
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared import RateLimiter, setup_logging, format_database_error  # noqa: E402

load_dotenv()

# Setup structured logging
logger = setup_logging("signer-service", log_level=os.getenv("LOG_LEVEL", "INFO"))
 

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

# Initialize rate limiter (50 requests per minute per IP) - using shared module
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
            error_id = str(uuid.uuid4())
            logger.warning(
                "No valid signing certificate found for facility %s (error_id=%s)",
                facility_id,
                error_id
            )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error": "No valid signing certificate found",
                    "error_code": "SIGNER_CERT_NOT_FOUND",
                    "error_id": error_id
                }
            )
        
        return dict(result)
        
    except HTTPException:
        raise
    except Exception as e:
        error_id = str(uuid.uuid4())
        logger.exception(
            "Error retrieving certificate for facility %s (error_id=%s): %s",
            facility_id,
            error_id,
            str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Error retrieving certificate",
                "error_code": "SIGNER_CERT_RETRIEVE_ERROR",
                "error_id": error_id
            }
        )


def load_private_key(key_path: str) -> rsa.RSAPrivateKey:
    """
    Load RSA private key from file
    Supports PEM format
    """
    try:
        base_cert_dir = os.path.abspath(os.getenv("CERT_BASE_PATH", "/certs"))
        if not os.path.isabs(key_path):
            key_path = os.path.join(base_cert_dir, key_path)

        key_path = os.path.abspath(os.path.normpath(key_path))

        if os.path.commonpath([base_cert_dir, key_path]) != base_cert_dir:
            error_id = str(uuid.uuid4())
            logger.warning(
                "Blocked private key path traversal: base=%s resolved=%s (error_id=%s)",
                base_cert_dir,
                key_path,
                error_id
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "Invalid certificate path",
                    "error_code": "SIGNER_CERT_PATH_INVALID",
                    "error_id": error_id
                }
            )

        with open(key_path, "rb") as key_file:
            private_key = serialization.load_pem_private_key(
                key_file.read(),
                password=os.getenv("CERT_PASSWORD", "").encode() if os.getenv("CERT_PASSWORD") else None,
                backend=default_backend()
            )
        
        return private_key
        
    except FileNotFoundError:
        error_id = str(uuid.uuid4())
        logger.error(
            "Private key file not found: %s (error_id=%s)",
            key_path,
            error_id
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "Private key file not found",
                "error_code": "SIGNER_PRIVATE_KEY_NOT_FOUND",
                "error_id": error_id
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        error_id = str(uuid.uuid4())
        logger.exception(
            "Error loading private key: %s (error_id=%s)",
            key_path,
            error_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Error loading private key",
                "error_code": "SIGNER_PRIVATE_KEY_LOAD_ERROR",
                "error_id": error_id
            }
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
    logger.warning(f"[SECURITY] Test certificate generation requested for facility {facility_id} from IP {client_ip}")
    
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
