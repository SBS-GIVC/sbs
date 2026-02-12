# Input Validation Enhancement Guide
**SBS Integration Engine - Security & Data Quality**

## Overview
This guide provides validation patterns for all SBS microservices to ensure data quality and prevent security vulnerabilities.

---

## Standard Validation Patterns

### 1. Using Pydantic Models (Recommended)

All FastAPI endpoints should use Pydantic models for automatic validation:

```python
from pydantic import BaseModel, Field, validator
from typing import Optional
from shared import validate_email, validate_phone, validate_national_id

class PatientRequest(BaseModel):
    national_id: str = Field(..., min_length=10, max_length=10)
    name: str = Field(..., min_length=2, max_length=100)
    email: Optional[str] = None
    phone: str = Field(..., regex=r'^(05|\\+9665)\\d{8}$')
    age: int = Field(..., ge=0, le=150)
    
    @validator('national_id')
    def validate_national_id(cls, v):
        from shared import validate_national_id
        if not validate_national_id(v):
            raise ValueError('Invalid Saudi national ID format')
        return v
    
    @validator('email')
    def validate_email(cls, v):
        if v and not validate_email(v):
            raise ValueError('Invalid email format')
        return v
```

### 2. Manual Validation Using Shared Module

```python
from shared import (
    validate_required_fields,
    validate_numeric_range,
    validate_string_length,
    sanitize_input,
    validate_claim_amount
)

def validate_claim_data(claim: dict):
    """Validate claim data before processing"""
    
    # Check required fields
    validate_required_fields(claim, ['facility_id', 'patient_id', 'items'])
    
    # Validate numeric ranges
    validate_numeric_range(
        claim['facility_id'], 
        min_val=1, 
        max_val=9999, 
        field_name='facility_id'
    )
    
    # Validate string lengths
    validate_string_length(
        claim.get('notes', ''), 
        max_length=500, 
        field_name='notes'
    )
    
    # Validate claim amounts
    for item in claim['items']:
        validate_claim_amount(item['amount'])
    
    # Sanitize text inputs
    if 'notes' in claim:
        claim['notes'] = sanitize_input(claim['notes'])
    
    return claim
```

---

## Service-Specific Validation

### Normalizer Service (Port 8000)

```python
from pydantic import BaseModel, Field, validator

class NormalizeRequest(BaseModel):
    facility_id: int = Field(..., gt=0, description="Facility ID must be positive")
    internal_code: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = Field(None, max_length=200)
    
    @validator('internal_code')
    def validate_code_format(cls, v):
        # Ensure code doesn't contain SQL injection patterns
        forbidden = [';', '--', '/*', '*/', 'DROP', 'DELETE', 'UPDATE']
        if any(pattern in v.upper() for pattern in forbidden):
            raise ValueError('Invalid code format')
        return v.strip()
```

### Signer Service (Port 8001)

```python
class SignRequest(BaseModel):
    facility_id: int = Field(..., gt=0)
    payload: Dict[str, Any] = Field(..., description="FHIR payload")
    
    @validator('payload')
    def validate_payload_size(cls, v):
        import json
        payload_size = len(json.dumps(v))
        if payload_size > 5_000_000:  # 5MB limit
            raise ValueError('Payload too large (max 5MB)')
        return v
    
    @validator('payload')
    def validate_fhir_structure(cls, v):
        if 'resourceType' not in v:
            raise ValueError('Invalid FHIR payload: missing resourceType')
        return v
```

### Financial Rules Engine (Port 8002)

```python
from shared import validate_claim_amount

class ClaimItem(BaseModel):
    code: str = Field(..., min_length=1, max_length=20)
    quantity: int = Field(..., gt=0, le=1000)
    unit_price: float = Field(..., gt=0)
    
    @validator('unit_price')
    def validate_price(cls, v):
        validate_claim_amount(v)
        return v

class FHIRClaim(BaseModel):
    facility_id: int = Field(..., gt=0)
    items: List[ClaimItem] = Field(..., min_items=1, max_items=100)
    
    @validator('items')
    def validate_total_amount(cls, v):
        total = sum(item.quantity * item.unit_price for item in v)
        if total > 1_000_000:  # 1M SAR limit
            raise ValueError('Total claim amount exceeds limit')
        return v
```

### NPHIES Bridge (Port 8003)

```python
class ClaimSubmission(BaseModel):
    facility_id: int = Field(..., gt=0)
    fhir_payload: Dict[str, Any]
    signature: str = Field(..., min_length=10)
    resource_type: str = Field(default="Claim")
    
    @validator('resource_type')
    def validate_resource_type(cls, v):
        allowed = ['Claim', 'Communication', 'CommunicationRequest']
        if v not in allowed:
            raise ValueError(f'Resource type must be one of {allowed}')
        return v
    
    @validator('signature')
    def validate_signature_format(cls, v):
        # Check if valid base64
        import base64
        try:
            base64.b64decode(v)
        except Exception:
            raise ValueError('Invalid signature format (must be base64)')
        return v
```

---

## Validation Best Practices

### 1. Always Validate User Input

```python
# BAD - No validation
@app.post("/create")
async def create_item(data: dict):
    db.insert(data)  # Dangerous!
    return {"status": "ok"}

# GOOD - Pydantic validation
@app.post("/create")
async def create_item(data: ItemRequest):  # Pydantic model
    db.insert(data.dict())
    return {"status": "ok"}
```

### 2. Sanitize Before Storage

```python
from shared import sanitize_input

@app.post("/comment")
async def add_comment(text: str):
    # Sanitize to prevent XSS
    clean_text = sanitize_input(text)
    db.save_comment(clean_text)
    return {"status": "ok"}
```

### 3. Use Type Hints

```python
# BAD - No type hints
def process_claim(claim):
    return claim['amount'] * 1.15

# GOOD - Type hints enable validation
def process_claim(claim: FHIRClaim) -> ValidatedClaim:
    return ValidatedClaim(...)
```

### 4. Validate File Uploads

```python
from fastapi import UploadFile, File

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    # Validate file type
    allowed_types = ['image/jpeg', 'image/png', 'application/pdf']
    if file.content_type not in allowed_types:
        raise HTTPException(400, "Invalid file type")
    
    # Validate file size
    content = await file.read()
    if len(content) > 10_000_000:  # 10MB
        raise HTTPException(400, "File too large")
    
    # Validate filename
    if '..' in file.filename or '/' in file.filename:
        raise HTTPException(400, "Invalid filename")
    
    return {"filename": file.filename, "size": len(content)}
```

### 5. Validate Database Lookups

```python
def get_facility(facility_id: int):
    # Validate ID before query
    if facility_id <= 0:
        raise ValueError("Invalid facility ID")
    
    # Use parameterized query
    result = db.execute(
        "SELECT * FROM facilities WHERE id = %s",
        (facility_id,)  # Prevents SQL injection
    )
    
    if not result:
        raise HTTPException(404, "Facility not found")
    
    return result
```

---

## Security Validation Checklist

### SQL Injection Prevention
- ✅ Use parameterized queries ALWAYS
- ✅ Never use string concatenation for SQL
- ✅ Validate input doesn't contain SQL keywords
- ✅ Use ORM when possible

### XSS Prevention
- ✅ Sanitize all user text inputs
- ✅ Escape HTML characters
- ✅ Validate URLs before storing
- ✅ Use Content Security Policy headers

### Path Traversal Prevention
- ✅ Validate filenames (no `..` or `/`)
- ✅ Use whitelisted paths only
- ✅ Validate file extensions

### Data Validation
- ✅ Validate all numeric ranges
- ✅ Validate all string lengths
- ✅ Validate all required fields
- ✅ Validate all email/phone formats
- ✅ Validate all dates/timestamps

---

## Validation Error Responses

Use standardized error responses from `shared.error_responses`:

```python
from shared import validation_error, ErrorCodes, raise_standard_http_exception

# Option 1: Return error dict
if not validate_email(email):
    return validation_error(
        field="email",
        message="Invalid email format",
        service="NORMALIZER"
    )

# Option 2: Raise HTTP exception
if facility_id <= 0:
    raise_standard_http_exception(
        error="Invalid facility ID",
        error_code=ErrorCodes.NORMALIZER_INVALID_INPUT,
        status_code=400,
        details={"facility_id": facility_id, "min_value": 1}
    )
```

---

## Testing Validation

```python
import pytest
from fastapi.testclient import TestClient

def test_validation_rejects_invalid_email():
    response = client.post("/register", json={
        "email": "not-an-email",
        "name": "John"
    })
    assert response.status_code == 422
    assert "email" in response.json()["detail"][0]["loc"]

def test_validation_accepts_valid_data():
    response = client.post("/register", json={
        "email": "john@example.com",
        "name": "John"
    })
    assert response.status_code == 200
```

---

## Migration Checklist

For each service:

- [ ] Review all POST/PUT/PATCH endpoints
- [ ] Add Pydantic models for all request bodies
- [ ] Add validators for critical fields
- [ ] Add string length limits
- [ ] Add numeric range limits
- [ ] Sanitize text inputs before storage
- [ ] Use parameterized database queries
- [ ] Add validation tests
- [ ] Document validation rules

---

**End of Validation Enhancement Guide**
