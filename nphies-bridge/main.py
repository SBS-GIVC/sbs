"""
NPHIES Bridge Service
Manages all API communications with NPHIES platform
Port: 8003
"""

from fastapi import FastAPI, HTTPException, status, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
import httpx
import json
import os
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
import asyncio
import uuid

load_dotenv()

app = FastAPI(
    title="NPHIES Bridge Service",
    description="API Bridge to NPHIES national platform",
    version="1.0.0"
)

# NPHIES API Configuration
NPHIES_BASE_URL = os.getenv("NPHIES_BASE_URL", "https://nphies.sa/api/v1")
NPHIES_TIMEOUT = int(os.getenv("NPHIES_TIMEOUT", "30"))
MAX_RETRIES = int(os.getenv("NPHIES_MAX_RETRIES", "3"))


def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        database=os.getenv("DB_NAME", "sbs_integration"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD"),
        port=os.getenv("DB_PORT", "5432")
    )


class ClaimSubmission(BaseModel):
    facility_id: int = Field(..., description="Facility identifier")
    fhir_payload: Dict[str, Any] = Field(..., description="FHIR Claim payload")
    signature: str = Field(..., description="Digital signature")
    resource_type: str = Field(default="Claim", description="FHIR resource type")


class SubmissionResponse(BaseModel):
    transaction_id: str
    transaction_uuid: str
    status: str
    nphies_response: Optional[Dict[str, Any]] = None
    http_status: Optional[int] = None
    message: str


def log_transaction(
    facility_id: int,
    request_type: str,
    fhir_payload: Dict,
    signature: str,
    response_data: Optional[Dict] = None,
    http_status: Optional[int] = None,
    nphies_txn_id: Optional[str] = None,
    error_msg: Optional[str] = None
) -> str:
    """
    Log transaction to database for audit trail
    Returns transaction UUID
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        txn_uuid = str(uuid.uuid4())
        txn_status = "submitted" if http_status and http_status < 400 else "error"
        
        if http_status and http_status >= 200 and http_status < 300:
            txn_status = "accepted"
        elif http_status and http_status >= 400:
            txn_status = "rejected"
        
        cursor.execute("""
            INSERT INTO nphies_transactions 
            (facility_id, transaction_uuid, request_type, fhir_payload, signature,
             nphies_transaction_id, http_status_code, response_payload, status, 
             error_message, submission_timestamp, response_timestamp)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING transaction_id
        """, (
            facility_id,
            txn_uuid,
            request_type,
            json.dumps(fhir_payload),
            signature,
            nphies_txn_id,
            http_status,
            json.dumps(response_data) if response_data else None,
            txn_status,
            error_msg,
            datetime.utcnow(),
            datetime.utcnow() if response_data else None
        ))
        
        result = cursor.fetchone()
        transaction_id = result['transaction_id']
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return txn_uuid
        
    except Exception as e:
        print(f"Error logging transaction: {e}")
        return str(uuid.uuid4())  # Return UUID even if logging fails


async def submit_to_nphies_with_retry(
    endpoint: str,
    payload: Dict[str, Any],
    signature: str,
    retry_count: int = 0
) -> tuple:
    """
    Submit request to NPHIES with exponential backoff retry logic
    Returns (response_dict, status_code, error_message)
    """
    
    headers = {
        "Content-Type": "application/fhir+json",
        "Accept": "application/fhir+json",
        "X-NPHIES-Signature": signature,
        "Authorization": f"Bearer {os.getenv('NPHIES_API_KEY', '')}"
    }
    
    url = f"{NPHIES_BASE_URL}/{endpoint}"
    
    async with httpx.AsyncClient(timeout=NPHIES_TIMEOUT) as client:
        try:
            response = await client.post(url, json=payload, headers=headers)
            
            # Success
            if response.status_code in [200, 201]:
                return response.json(), response.status_code, None
            
            # Retriable errors (500s, 429)
            if response.status_code >= 500 or response.status_code == 429:
                if retry_count < MAX_RETRIES:
                    wait_time = 2 ** retry_count  # Exponential backoff
                    await asyncio.sleep(wait_time)
                    return await submit_to_nphies_with_retry(endpoint, payload, signature, retry_count + 1)
            
            # Client errors (4xx)
            error_message = f"HTTP {response.status_code}: {response.text}"
            return response.json() if response.text else {}, response.status_code, error_message
            
        except httpx.TimeoutException:
            if retry_count < MAX_RETRIES:
                wait_time = 2 ** retry_count
                await asyncio.sleep(wait_time)
                return await submit_to_nphies_with_retry(endpoint, payload, signature, retry_count + 1)
            return {}, None, f"Timeout after {MAX_RETRIES} retries"
            
        except Exception as e:
            error_message = f"Connection error: {str(e)}"
            if retry_count < MAX_RETRIES:
                wait_time = 2 ** retry_count
                await asyncio.sleep(wait_time)
                return await submit_to_nphies_with_retry(endpoint, payload, signature, retry_count + 1)
            return {}, None, error_message


@app.get("/")
def root():
    return {
        "service": "NPHIES Bridge Service",
        "version": "1.0.0",
        "status": "active",
        "nphies_endpoint": NPHIES_BASE_URL
    }


@app.get("/health")
def health_check():
    """Health check endpoint"""
    try:
        conn = get_db_connection()
        conn.close()
        return {
            "status": "healthy",
            "database": "connected",
            "nphies_endpoint": NPHIES_BASE_URL
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database connection failed: {str(e)}"
        )


@app.post("/submit-claim", response_model=SubmissionResponse)
async def submit_claim(submission: ClaimSubmission, background_tasks: BackgroundTasks):
    """
    Submit a signed FHIR Claim to NPHIES
    
    Features:
    - Automatic retry with exponential backoff
    - Transaction logging for audit
    - Error handling and reporting
    """
    
    # Validate payload structure
    if submission.fhir_payload.get('resourceType') != 'Claim':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid FHIR payload: resourceType must be 'Claim'"
        )
    
    # Submit to NPHIES
    response_data, http_status, error_msg = await submit_to_nphies_with_retry(
        endpoint="Claim",
        payload=submission.fhir_payload,
        signature=submission.signature
    )
    
    # Extract NPHIES transaction ID if available
    nphies_txn_id = None
    if response_data and 'id' in response_data:
        nphies_txn_id = response_data['id']
    
    # Log transaction
    txn_uuid = log_transaction(
        facility_id=submission.facility_id,
        request_type="Claim",
        fhir_payload=submission.fhir_payload,
        signature=submission.signature,
        response_data=response_data,
        http_status=http_status,
        nphies_txn_id=nphies_txn_id,
        error_msg=error_msg
    )
    
    # Determine status
    if http_status and 200 <= http_status < 300:
        status_msg = "submitted_successfully"
        message = "Claim submitted successfully to NPHIES"
    elif http_status and 400 <= http_status < 500:
        status_msg = "rejected"
        message = f"Claim rejected by NPHIES: {error_msg}"
    else:
        status_msg = "error"
        message = f"Error submitting claim: {error_msg or 'Unknown error'}"
    
    return SubmissionResponse(
        transaction_id=nphies_txn_id or "N/A",
        transaction_uuid=txn_uuid,
        status=status_msg,
        nphies_response=response_data,
        http_status=http_status,
        message=message
    )


@app.post("/submit-preauth")
async def submit_preauth(submission: ClaimSubmission):
    """
    Submit a pre-authorization request to NPHIES
    """
    
    response_data, http_status, error_msg = await submit_to_nphies_with_retry(
        endpoint="Claim/$submit",
        payload=submission.fhir_payload,
        signature=submission.signature
    )
    
    nphies_txn_id = response_data.get('id') if response_data else None
    
    txn_uuid = log_transaction(
        facility_id=submission.facility_id,
        request_type="PreAuth",
        fhir_payload=submission.fhir_payload,
        signature=submission.signature,
        response_data=response_data,
        http_status=http_status,
        nphies_txn_id=nphies_txn_id,
        error_msg=error_msg
    )
    
    return SubmissionResponse(
        transaction_id=nphies_txn_id or "N/A",
        transaction_uuid=txn_uuid,
        status="submitted" if http_status and http_status < 400 else "error",
        nphies_response=response_data,
        http_status=http_status,
        message="Pre-authorization submitted" if http_status and http_status < 400 else error_msg
    )


@app.get("/transaction/{transaction_uuid}")
def get_transaction_status(transaction_uuid: str):
    """
    Retrieve transaction status and details
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            SELECT 
                transaction_id,
                transaction_uuid,
                request_type,
                nphies_transaction_id,
                http_status_code,
                status,
                error_message,
                submission_timestamp,
                response_timestamp
            FROM nphies_transactions
            WHERE transaction_uuid = %s
        """, (transaction_uuid,))
        
        result = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Transaction {transaction_uuid} not found"
            )
        
        return dict(result)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving transaction: {str(e)}"
        )


@app.get("/facility/{facility_id}/transactions")
def get_facility_transactions(facility_id: int, limit: int = 50):
    """
    Get recent transactions for a facility
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            SELECT 
                transaction_uuid,
                request_type,
                status,
                nphies_transaction_id,
                http_status_code,
                submission_timestamp
            FROM nphies_transactions
            WHERE facility_id = %s
            ORDER BY submission_timestamp DESC
            LIMIT %s
        """, (facility_id, limit))
        
        results = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return [dict(row) for row in results]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving transactions: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
