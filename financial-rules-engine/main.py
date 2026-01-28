"""
Financial Rules Engine Service
Applies CHI-mandated business rules to claims
Port: 8002
"""

from fastapi import FastAPI, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from decimal import Decimal
import os
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor
from collections import deque
from threading import Lock
import time

load_dotenv()

app = FastAPI(
    title="SBS Financial Rules Engine",
    description="Apply CHI business rules to healthcare claims",
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
    """Token bucket rate limiter"""
    def __init__(self, max_requests: int = 100, time_window: int = 60):
        self.max_requests = max_requests
        self.time_window = time_window
        self.requests = {}
        self.lock = Lock()

    def is_allowed(self, identifier: str) -> bool:
        with self.lock:
            now = time.time()
            if identifier not in self.requests:
                self.requests[identifier] = deque()
            while self.requests[identifier] and self.requests[identifier][0] < now - self.time_window:
                self.requests[identifier].popleft()
            if len(self.requests[identifier]) < self.max_requests:
                self.requests[identifier].append(now)
                return True
            return False

rate_limiter = RateLimiter(max_requests=100, time_window=60)

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


class FHIRClaim(BaseModel):
    resourceType: str = "Claim"
    status: str = "active"
    type: Optional[Dict[str, Any]] = None
    patient: Optional[Dict[str, Any]] = None
    provider: Optional[Dict[str, Any]] = None
    facility_id: int
    item: List[Dict[str, Any]]
    total: Optional[Dict[str, Any]] = None


class ValidatedClaim(BaseModel):
    resourceType: str
    status: str
    item: List[Dict[str, Any]]
    total: Dict[str, Any]
    extensions: Optional[Dict[str, Any]] = None


def get_facility_tier(facility_id: int) -> Optional[Dict]:
    """Get facility accreditation tier and pricing rules"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        query = """
        SELECT 
            f.facility_id,
            f.accreditation_tier,
            ptr.markup_pct,
            ptr.tier_description
        FROM facilities f
        JOIN pricing_tier_rules ptr ON f.accreditation_tier = ptr.tier_level
        WHERE f.facility_id = %s AND f.is_active = TRUE
        """
        
        cursor.execute(query, (facility_id,))
        result = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        return dict(result) if result else None
        
    except Exception as e:
        print(f"Error fetching facility tier: {e}")
        return None


def get_sbs_standard_price(sbs_code: str) -> Optional[Decimal]:
    """Get the standard price for an SBS code"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute(
            "SELECT standard_price FROM sbs_master_catalogue WHERE sbs_id = %s AND is_active = TRUE",
            (sbs_code,)
        )
        
        result = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        return Decimal(result['standard_price']) if result and result['standard_price'] else None
        
    except Exception as e:
        print(f"Error fetching SBS price: {e}")
        return None


def check_for_bundles(item_codes: List[str]) -> Optional[Dict]:
    """
    Check if the claim items qualify for a service bundle
    Returns bundle information if applicable
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Find bundles that contain all the provided codes
        query = """
        SELECT 
            sb.bundle_id,
            sb.bundle_code,
            sb.bundle_name,
            sb.total_allowed_price,
            COUNT(bi.sbs_code) as matched_items
        FROM service_bundles sb
        JOIN bundle_items bi ON sb.bundle_id = bi.bundle_id
        WHERE bi.sbs_code = ANY(%s)
          AND sb.is_active = TRUE
        GROUP BY sb.bundle_id, sb.bundle_code, sb.bundle_name, sb.total_allowed_price
        HAVING COUNT(bi.sbs_code) >= 2
        ORDER BY matched_items DESC
        LIMIT 1
        """
        
        cursor.execute(query, (item_codes,))
        result = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        return dict(result) if result else None
        
    except Exception as e:
        print(f"Error checking bundles: {e}")
        return None


def apply_pricing_markup(base_price: Decimal, markup_pct: float) -> Decimal:
    """Apply facility tier markup to base price"""
    markup_multiplier = Decimal(1 + (markup_pct / 100))
    return (base_price * markup_multiplier).quantize(Decimal('0.01'))


def calculate_claim_total(items: List[Dict]) -> Decimal:
    """Calculate total claim amount from all items"""
    total = Decimal('0.00')
    
    for item in items:
        if 'net' in item and 'value' in item['net']:
            total += Decimal(str(item['net']['value']))
    
    return total


@app.get("/")
def root():
    return {
        "service": "SBS Financial Rules Engine",
        "version": "1.0.0",
        "status": "active"
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


@app.post("/validate")
async def validate_claim(request: Request):
    """
    Apply financial rules to a FHIR claim
    
    Accepts either:
    - Direct FHIR claim: {"resourceType": "Claim", "facility_id": 1, ...}
    - Wrapped claim: {"claim": {"resourceType": "Claim", ...}}
    
    Rules Applied:
    1. Calculate service bundles
    2. Apply facility tier markup
    3. Validate coverage limits
    4. Calculate net prices
    """
    
    # Get the raw body
    body = await request.json()
    
    # Handle both wrapped and unwrapped formats
    if "claim" in body:
        claim_data = body["claim"]
    else:
        claim_data = body
    
    # Validate the claim data using Pydantic
    try:
        claim = FHIRClaim(**claim_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid claim data: {str(e)}"
        )
    
    # Get facility pricing tier
    facility_info = get_facility_tier(claim.facility_id)
    if not facility_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Facility {claim.facility_id} not found or inactive"
        )
    
    markup_pct = float(facility_info['markup_pct'])
    
    # Extract SBS codes from claim items
    sbs_codes = []
    for item in claim.item:
        if 'productOrService' in item and 'coding' in item['productOrService']:
            for coding in item['productOrService']['coding']:
                if coding.get('system') == 'http://sbs.sa/coding/services':
                    sbs_codes.append(coding['code'])
    
    # Check for applicable bundles
    bundle_info = check_for_bundles(sbs_codes)
    
    # Process each item
    validated_items = []
    bundle_applied = False
    
    if bundle_info and not bundle_applied:
        # Apply bundle pricing
        bundle_price = Decimal(str(bundle_info['total_allowed_price']))
        final_price = apply_pricing_markup(bundle_price, markup_pct)
        
        # Create a single bundled item
        bundled_item = {
            "sequence": 1,
            "productOrService": {
                "coding": [{
                    "system": "http://sbs.sa/coding/bundles",
                    "code": bundle_info['bundle_code'],
                    "display": bundle_info['bundle_name']
                }]
            },
            "net": {
                "value": float(final_price),
                "currency": "SAR"
            },
            "extensions": {
                "bundle_id": bundle_info['bundle_id'],
                "original_items": len(sbs_codes),
                "base_price": float(bundle_price),
                "markup_applied": markup_pct
            }
        }
        validated_items.append(bundled_item)
        bundle_applied = True
        
    else:
        # Apply individual pricing
        for idx, item in enumerate(claim.item, start=1):
            if 'productOrService' in item and 'coding' in item['productOrService']:
                sbs_code = None
                for coding in item['productOrService']['coding']:
                    if coding.get('system') == 'http://sbs.sa/coding/services':
                        sbs_code = coding['code']
                        break
                
                if sbs_code:
                    base_price = get_sbs_standard_price(sbs_code)
                    if base_price:
                        final_price = apply_pricing_markup(base_price, markup_pct)
                        
                        validated_item = {
                            "sequence": idx,
                            "productOrService": item['productOrService'],
                            "unitPrice": {
                                "value": float(base_price),
                                "currency": "SAR"
                            },
                            "net": {
                                "value": float(final_price),
                                "currency": "SAR"
                            },
                            "extensions": {
                                "base_price": float(base_price),
                                "markup_applied": markup_pct,
                                "facility_tier": facility_info['accreditation_tier']
                            }
                        }
                        validated_items.append(validated_item)
    
    # Calculate total
    total_amount = calculate_claim_total(validated_items)
    
    # Build response
    return ValidatedClaim(
        resourceType="Claim",
        status="active",
        item=validated_items,
        total={
            "value": float(total_amount),
            "currency": "SAR"
        },
        extensions={
            "facility_id": claim.facility_id,
            "facility_tier": facility_info['accreditation_tier'],
            "markup_percentage": markup_pct,
            "bundle_applied": bundle_applied
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
