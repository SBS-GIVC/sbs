# SBS Integration Engine - Frontend & Backend Setup Guide

## Overview

This guide provides comprehensive instructions for setting up the SBS (Saudi Billing System) Integration Engine with the frontend hosted on GitHub Pages (https://fadil369.github.io/sbs/) and the backend running via DevContainer.

## Architecture

```
┌─────────────────────────────────┐
│  GitHub Pages Frontend          │
│  https://fadil369.github.io/sbs │
└────────────────┬────────────────┘
                 │
                 │ HTTP/REST API
                 ▼
┌─────────────────────────────────┐
│  DevContainer Backend           │
│  http://localhost:5000          │
│  (or your configured host)      │
└─────────────────────────────────┘
        ├─ Normalizer Service
        ├─ Financial Rules Engine
        ├─ Signer Service
        └─ NPHIES Bridge
```

## Frontend Setup (GitHub Pages)

### New Features

1. **Environment-Based Configuration** (`config.js`)
2.    - Auto-detects environment (development/staging/production)
      -    - Configures API endpoint based on hostname
           -    - Development: `http://localhost:5000`
                -    - Production: Configurable via environment variables
                 
                     - 2. **Enhanced API Client** (`api-client.js`)
                       3.    - Automatic retry logic with exponential backoff
                             -    - Request timeout handling (30 seconds)
                                  -    - Comprehensive error reporting
                                       -    - Methods: `request()`, `submitClaim()`, `getClaimStatus()`, `healthCheck()`
                                        
                                            - ### Required Updates
                                        
                                            - #### 1. Update `index.html` to include new scripts
                                        
                                            - Add these lines before the closing `</body>` tag:
                                        
                                            - ```html
                                              <!-- SBS Configuration - Load first -->
                                              <script src="/sbs/config.js"></script>

                                              <!-- SBS API Client - Utility for HTTP requests -->
                                              <script src="/sbs/api-client.js"></script>

                                              <!-- SBS Landing Page - Main application -->
                                              <script src="/sbs/landing.js"></script>
                                              ```

                                              #### 2. Update landing.js submitClaim method

                                              Replace the existing fetch call in `submitClaim()` with:

                                              ```javascript
                                              async submitClaim(event) {
                                                event.preventDefault();

                                                const formElements = event.target.elements;

                                                // Validate form
                                                if (!this.validateForm(formElements)) {
                                                  this.render();
                                                  return;
                                                }

                                                this.isSubmitting = true;
                                                this.render();

                                                const formDataToSend = new FormData();
                                                formDataToSend.append('patientName', formElements.patientName.value.trim());
                                                formDataToSend.append('patientId', formElements.patientId.value.trim());
                                                formDataToSend.append('memberId', formElements.memberId.value.trim());
                                                formDataToSend.append('payerId', formElements.payerId.value.trim());
                                                formDataToSend.append('claimType', formElements.claimType.value);
                                                formDataToSend.append('userEmail', formElements.userEmail.value.trim());

                                                if (this.selectedFile) {
                                                  formDataToSend.append('claimFile', this.selectedFile);
                                                }

                                                try {
                                                  // Use the new API client with retry logic
                                                  const result = await window.sbsApiClient.submitClaim(formDataToSend);

                                                  if (result.success) {
                                                    this.showClaimModal = false;
                                                    this.selectedFile = null;
                                                    this.formData = {};
                                                    this.validationErrors = {};
                                                    this.currentClaimId = result.data.claimId;
                                                    this.lastSubmission = {
                                                      claimId: result.data.claimId,
                                                      patientName: formElements.patientName.value,
                                                      patientId: formElements.patientId.value
                                                    };
                                                    this.startStatusPolling();
                                                    this.render();
                                                  } else {
                                                    this.showError(result.error.message || 'Submission failed');
                                                  }
                                                } catch (error) {
                                                  this.showError('Unexpected error: ' + error.message);
                                                } finally {
                                                  this.isSubmitting = false;
                                                  this.render();
                                                }
                                              }
                                              ```

                                              ## Backend Setup (DevContainer)

                                              ### Prerequisites

                                              - Docker installed and running
                                              - - Docker Compose installed
                                                - - VS Code with Dev Containers extension (recommended)
                                                 
                                                  - ### Quick Start
                                                 
                                                  - #### Option 1: Using VS Code (Recommended)
                                                 
                                                  - 1. **Clone the repository**
                                                    2.    ```bash
                                                             git clone https://github.com/Fadil369/sbs.git
                                                             cd sbs
                                                             ```

                                                          2. **Open in DevContainer**
                                                          3.    - Open the folder in VS Code
                                                                -    - Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
                                                                     -    - Select "Dev Containers: Reopen in Container"
                                                                      
                                                                          - 3. **Services start automatically**
                                                                            4.    - Backend API: http://localhost:5000
                                                                                  -    - All microservices: Running
                                                                                   
                                                                                       - #### Option 2: Using Docker Compose CLI
                                                                                   
                                                                                       - ```bash
                                                                                         # Navigate to the sbs-landing folder
                                                                                         cd sbs-landing

                                                                                         # Start all services
                                                                                         docker-compose -f docker-compose.devcontainer.yml up -d

                                                                                         # Verify services
                                                                                         docker-compose -f docker-compose.devcontainer.yml ps
                                                                                         ```

                                                                                         ### API Endpoints

                                                                                         #### Health Check
                                                                                         ```bash
                                                                                         GET http://localhost:5000/health
                                                                                         ```

                                                                                         **Response:**
                                                                                         ```json
                                                                                         {
                                                                                           "status": "healthy",
                                                                                           "timestamp": "2026-01-18T01:48:41Z",
                                                                                           "version": "1.0.0"
                                                                                         }
                                                                                         ```

                                                                                         #### Submit Claim
                                                                                         ```bash
                                                                                         POST http://localhost:5000/api/submit-claim
                                                                                         Content-Type: multipart/form-data

                                                                                         {
                                                                                           "patientName": "Ahmed Mohammed",
                                                                                           "patientId": "1234567890",
                                                                                           "memberId": "MEM123456",
                                                                                           "payerId": "PAY789012",
                                                                                           "claimType": "professional",
                                                                                           "userEmail": "user@example.com",
                                                                                           "claimFile": <File>
                                                                                         }
                                                                                         ```

                                                                                         **Response:**
                                                                                         ```json
                                                                                         {
                                                                                           "success": true,
                                                                                           "claimId": "CLM20260118001",
                                                                                           "status": "validation_pending",
                                                                                           "message": "Claim received and queued for processing"
                                                                                         }
                                                                                         ```

                                                                                         #### Check Claim Status
                                                                                         ```bash
                                                                                         GET http://localhost:5000/api/claim-status/{claimId}
                                                                                         ```

                                                                                         **Response:**
                                                                                         ```json
                                                                                         {
                                                                                           "success": true,
                                                                                           "claimId": "CLM20260118001",
                                                                                           "status": "in_progress",
                                                                                           "stages": {
                                                                                             "received": { "status": "completed", "timestamp": "2026-01-18T01:48:41Z" },
                                                                                             "validation": { "status": "in_progress", "timestamp": "2026-01-18T01:48:50Z" },
                                                                                             "normalization": { "status": "pending", "timestamp": null },
                                                                                             "signing": { "status": "pending", "timestamp": null },
                                                                                             "nphies_submission": { "status": "pending", "timestamp": null }
                                                                                           },
                                                                                           "progress": 20
                                                                                         }
                                                                                         ```

                                                                                         ## Environment Configuration

                                                                                         ### Development (localhost)

                                                                                         **Frontend** (`config.js`):
                                                                                         ```javascript
                                                                                         development: {
                                                                                           apiBaseUrl: 'http://localhost:5000',
                                                                                           apiTimeout: 30000,
                                                                                           retryAttempts: 3,
                                                                                           retryDelay: 1000
                                                                                         }
                                                                                         ```

                                                                                         **Backend** (`.env` in DevContainer):
                                                                                         ```
                                                                                         PORT=5000
                                                                                         NODE_ENV=development
                                                                                         LOG_LEVEL=debug
                                                                                         CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:3000
                                                                                         ```

                                                                                         ### Production (GitHub Pages)

                                                                                         **Frontend** (`config.js`):
                                                                                         ```javascript
                                                                                         production: {
                                                                                           apiBaseUrl: 'https://sbs-api.yourdomain.com',
                                                                                           apiTimeout: 30000,
                                                                                           retryAttempts: 2,
                                                                                           retryDelay: 2000
                                                                                         }
                                                                                         ```

                                                                                         **Backend** (`.env` in production):
                                                                                         ```
                                                                                         PORT=5000
                                                                                         NODE_ENV=production
                                                                                         LOG_LEVEL=info
                                                                                         CORS_ORIGIN=https://fadil369.github.io
                                                                                         ```

                                                                                         ## Testing the Integration

                                                                                         ### 1. Check DevContainer Health

                                                                                         ```bash
                                                                                         # Terminal in DevContainer
                                                                                         curl http://localhost:5000/health

                                                                                         # Expected response
                                                                                         {"status":"healthy","timestamp":"2026-01-18T01:48:41Z","version":"1.0.0"}
                                                                                         ```

                                                                                         ### 2. Test Claim Submission (Curl)

                                                                                         ```bash
                                                                                         curl -X POST http://localhost:5000/api/submit-claim \
                                                                                           -F "patientName=Test Patient" \
                                                                                           -F "patientId=1234567890" \
                                                                                           -F "claimType=professional" \
                                                                                           -F "userEmail=test@example.com" \
                                                                                           -F "claimFile=@test-claim.pdf"
                                                                                         ```

                                                                                         ### 3. Test via Frontend

                                                                                         1. Open https://fadil369.github.io/sbs/
                                                                                         2. 2. Click "Submit Claim"
                                                                                            3. 3. Fill in test data:
                                                                                               4.    - Patient Name: `Ahmed Mohammed`
                                                                                                     -    - Patient ID: `1234567890`
                                                                                                          -    - Member ID: `MEM123456`
                                                                                                               -    - Payer ID: `PAY789012`
                                                                                                                    -    - Claim Type: `Professional`
                                                                                                                         -    - Email: `test@example.com`
                                                                                                                              - 4. Click "Submit Claim"
                                                                                                                                5. 5. Check browser console for API logs:
                                                                                                                                   6.    ```
                                                                                                                                            [SBS API] POST /api/submit-claim (Attempt 1/3)
                                                                                                                                            [SBS API] Success: /api/submit-claim {...}
                                                                                                                                            ```
                                                                                                                                         
                                                                                                                                         ### 4. Monitor Claim Status
                                                                                                                                     
                                                                                                                                     ```bash
                                                                                                                                     # Get claim ID from submission response
                                                                                                                                     curl http://localhost:5000/api/claim-status/CLM20260118001
                                                                                                                                     ```
                                                                                                                                     
                                                                                                                                     ## Troubleshooting
                                                                                                                                   
                                                                                                                                   ### Issue: "Failed to fetch" Error
                                                                                                                                   
                                                                                                                                   **Causes:**
                                                                                                                                   1. DevContainer not running
                                                                                                                                   2. 2. API base URL not configured correctly
                                                                                                                                      3. 3. CORS headers not set
                                                                                                                                        
                                                                                                                                         4. **Solutions:**
                                                                                                                                         5. ```bash
                                                                                                                                            # Check if DevContainer is running
                                                                                                                                            docker-compose ps

                                                                                                                                            # Check API connectivity
                                                                                                                                            curl -I http://localhost:5000/health

                                                                                                                                            # View DevContainer logs
                                                                                                                                            docker-compose logs -f sbs-api
                                                                                                                                            ```
                                                                                                                                            
                                                                                                                                            ### Issue: CORS Error
                                                                                                                                            
                                                                                                                                            **Frontend error:** `Access to XMLHttpRequest blocked by CORS policy`
                                                                                                                                            
                                                                                                                                            **Solutions:**
                                                                                                                                            1. Ensure backend has CORS configured for frontend URL
                                                                                                                                            2. 2. Update `.env` with correct CORS_ORIGIN
                                                                                                                                               3. 3. Restart DevContainer: `docker-compose restart`
                                                                                                                                                 
                                                                                                                                                  4. ### Issue: Timeout Errors
                                                                                                                                                 
                                                                                                                                                  5. **Cause:** Slow network or backend processing
                                                                                                                                                 
                                                                                                                                                  6. **Solutions:**
                                                                                                                                                  7. ```javascript
                                                                                                                                                     // Increase timeout in config.js
                                                                                                                                                     development: {
                                                                                                                                                       apiTimeout: 60000 // 60 seconds instead of 30
                                                                                                                                                     }
                                                                                                                                                     ```
                                                                                                                                                     
                                                                                                                                                     ## Integration Workflow
                                                                                                                                                     
                                                                                                                                                     ### Claim Submission Flow
                                                                                                                                                     
                                                                                                                                                     ```
                                                                                                                                                     1. User fills form and clicks "Submit"
                                                                                                                                                        ↓
                                                                                                                                                     2. Frontend validates form fields
                                                                                                                                                        ↓
                                                                                                                                                     3. Sends FormData to /api/submit-claim via sbsApiClient
                                                                                                                                                        ↓
                                                                                                                                                     4. sbsApiClient retries on failure (exponential backoff)
                                                                                                                                                        ↓
                                                                                                                                                     5. Backend receives claim and returns claimId
                                                                                                                                                        ↓
                                                                                                                                                     6. Frontend opens tracking modal
                                                                                                                                                        ↓
                                                                                                                                                     7. Frontend polls /api/claim-status/{claimId} every 3 seconds
                                                                                                                                                        ↓
                                                                                                                                                     8. Display real-time workflow progress to user
                                                                                                                                                        ↓
                                                                                                                                                     9. Update complete when all stages finished
                                                                                                                                                     ```
                                                                                                                                                     
                                                                                                                                                     ## Next Steps
                                                                                                                                                     
                                                                                                                                                     1. **Implement Backend API**
                                                                                                                                                     2.    - Create `/api/submit-claim` endpoint
                                                                                                                                                           -    - Create `/api/claim-status/{id}` endpoint
                                                                                                                                                                -    - Integrate with microservices
                                                                                                                                                                 
                                                                                                                                                                     - 2. **Add Database**
                                                                                                                                                                       3.    - Store claim submissions
                                                                                                                                                                             -    - Track processing status
                                                                                                                                                                                  -    - Audit logging
                                                                                                                                                                                   
                                                                                                                                                                                       - 3. **Deploy to Production**
                                                                                                                                                                                         4.    - Deploy backend to cloud (AWS, Azure, GCP)
                                                                                                                                                                                               -    - Update CORS origins
                                                                                                                                                                                                    -    - Set up SSL/TLS certificates
                                                                                                                                                                                                     
                                                                                                                                                                                                         - 4. **Monitoring & Logging**
                                                                                                                                                                                                           5.    - Set up ELK stack or similar
                                                                                                                                                                                                                 -    - Monitor API performance
                                                                                                                                                                                                                      -    - Alert on failures
                                                                                                                                                                                                                       
                                                                                                                                                                                                                           - ## Additional Resources
                                                                                                                                                                                                                       
                                                                                                                                                                                                                           - - [DevContainer Configuration](.devcontainer/README.md)
                                                                                                                                                                                                                             - - [Backend API Documentation](sbs-landing/docs/API.md)
                                                                                                                                                                                                                               - - [Microservices Documentation](docs/)
                                                                                                                                                                                                                                 - - [Testing Guide](tests/README.md)
                                                                                                                                                                                                                                  
                                                                                                                                                                                                                                   - ## Support
                                                                                                                                                                                                                                  
                                                                                                                                                                                                                                   - For issues or questions:
                                                                                                                                                                                                                                   - 1. Check the troubleshooting section
                                                                                                                                                                                                                                     2. 2. Review browser console logs
                                                                                                                                                                                                                                        3. 3. Check backend logs: `docker-compose logs -f sbs-api`
                                                                                                                                                                                                                                           4. 4. Open an issue on GitHub: https://github.com/Fadil369/sbs/issues
