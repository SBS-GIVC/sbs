# API Reference - SBS Integration Engine

## Overview

This document provides detailed API specifications for all microservices in the SBS Integration Engine.

---

## 1. Normalizer Service (Port 8000)

### POST /normalize

Translate internal hospital code to official SBS code.

**Request:**
```json
{
  "facility_id": 1,
  "internal_code": "LAB-CBC-01",
  "description": "Complete Blood Count Test"
}
```

**Response:**
```json
{
  "sbs_mapped_code": "SBS-LAB-001",
  "official_description": "Complete Blood Count (CBC)",
  "confidence": 1.0,
  "mapping_source": "manual",
  "description_en": "Complete Blood Count (CBC)",
  "description_ar": "تحليل صورة دم كاملة"
}
```

**Status Codes:**
- `200 OK` - Successful normalization
- `404 Not Found` - No mapping found
- `503 Service Unavailable` - Database connection failed

---

## 2. Financial Rules Engine (Port 8002)

### POST /validate

Apply CHI business rules and calculate pricing.

**Request:**
```json
{
  "resourceType": "Claim",
  "status": "active",
  "facility_id": 1,
  "item": [
    {
      "productOrService": {
        "coding": [
          {
            "system": "http://sbs.sa/coding/services",
            "code": "SBS-LAB-001",
            "display": "Complete Blood Count (CBC)"
          }
        ]
      }
    }
  ]
}
```

**Response:**
```json
{
  "resourceType": "Claim",
  "status": "active",
  "item": [
    {
      "sequence": 1,
      "productOrService": { ... },
      "unitPrice": {
        "value": 50.00,
        "currency": "SAR"
      },
      "net": {
        "value": 55.00,
        "currency": "SAR"
      },
      "extensions": {
        "base_price": 50.00,
        "markup_applied": 10.0,
        "facility_tier": 1
      }
    }
  ],
  "total": {
    "value": 55.00,
    "currency": "SAR"
  },
  "extensions": {
    "facility_id": 1,
    "facility_tier": 1,
    "markup_percentage": 10.0,
    "bundle_applied": false
  }
}
```

---

## 3. Signer Service (Port 8001)

### POST /sign

Generate digital signature for FHIR payload.

**Request:**
```json
{
  "payload": {
    "resourceType": "Claim",
    "status": "active",
    ...
  },
  "facility_id": 1
}
```

**Response:**
```json
{
  "signature": "MEUCIQDXy8...Base64Signature...==",
  "algorithm": "SHA256withRSA",
  "timestamp": "2024-01-15T10:30:00Z",
  "certificate_serial": "FAC-001-20240115"
}
```

### POST /generate-test-cert

Generate test certificate (Sandbox only).

**Request:**
```
POST /generate-test-cert?facility_id=1
```

**Response:**
```json
{
  "status": "success",
  "message": "Test certificate generated",
  "private_key_path": "/certs/facility_1/private_key.pem",
  "public_key_path": "/certs/facility_1/public_key.pem",
  "expires": "1 year from now"
}
```

### GET /verify-certificate/{facility_id}

Check certificate validity.

**Response:**
```json
{
  "facility_id": 1,
  "certificate_serial": "FAC-001-20240115",
  "valid_from": "2024-01-15",
  "valid_until": "2025-01-15",
  "is_expired": false,
  "status": "valid"
}
```

---

## 4. NPHIES Bridge (Port 8003)

### POST /submit-claim

Submit claim to NPHIES platform.

**Request:**
```json
{
  "facility_id": 1,
  "fhir_payload": {
    "resourceType": "Claim",
    ...
  },
  "signature": "MEUCIQDXy8...",
  "resource_type": "Claim"
}
```

**Response:**
```json
{
  "transaction_id": "NPHIES-TXN-12345",
  "transaction_uuid": "550e8400-e29b-41d4-a716-446655440000",
  "status": "submitted_successfully",
  "nphies_response": {
    "id": "NPHIES-TXN-12345",
    "resourceType": "ClaimResponse",
    ...
  },
  "http_status": 201,
  "message": "Claim submitted successfully to NPHIES"
}
```

**Status Codes:**
- `200 OK` - Submitted successfully
- `400 Bad Request` - Invalid payload
- `404 Not Found` - Facility not found
- `500 Internal Server Error` - Submission failed

### GET /transaction/{transaction_uuid}

Get transaction status.

**Response:**
```json
{
  "transaction_id": 12345,
  "transaction_uuid": "550e8400-e29b-41d4-a716-446655440000",
  "request_type": "Claim",
  "nphies_transaction_id": "NPHIES-TXN-12345",
  "http_status_code": 201,
  "status": "accepted",
  "error_message": null,
  "submission_timestamp": "2024-01-15T10:30:00Z",
  "response_timestamp": "2024-01-15T10:30:05Z"
}
```

### GET /facility/{facility_id}/transactions

Get recent transactions for facility.

**Parameters:**
- `limit` (optional): Number of results (default: 50)

**Response:**
```json
[
  {
    "transaction_uuid": "550e8400-e29b-41d4-a716-446655440000",
    "request_type": "Claim",
    "status": "accepted",
    "nphies_transaction_id": "NPHIES-TXN-12345",
    "http_status_code": 201,
    "submission_timestamp": "2024-01-15T10:30:00Z"
  },
  ...
]
```

---

## Error Handling

All services use consistent error response format:

```json
{
  "detail": "Error message description"
}
```

Common HTTP status codes:
- `400` - Bad Request (invalid input)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error
- `503` - Service Unavailable (dependency failure)

---

## Rate Limiting

NPHIES Bridge implements automatic retry with exponential backoff:
- Max retries: 3 (configurable)
- Backoff: 2^retry_count seconds
- Applies to: 5xx errors, 429 Too Many Requests, timeouts

---

## Authentication

All internal service-to-service communication uses HTTP without authentication (secured by Docker network isolation).

External NPHIES communication uses:
- Bearer token authentication
- Digital signatures (X-NPHIES-Signature header)
- Mutual TLS (mTLS)
