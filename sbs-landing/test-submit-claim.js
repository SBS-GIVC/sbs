#!/usr/bin/env node

/**
 * Test script for /api/submit-claim endpoint
 * Tests the 405 Method Not Allowed fix
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const os = require('os');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const ENDPOINT = `${API_BASE_URL}/api/submit-claim`;

async function testSubmitClaim() {
  console.log('\n🧪 Testing Claim Submission Endpoint');
  console.log('='.repeat(60));
  console.log(`Endpoint: ${ENDPOINT}\n`);

  // Test 1: OPTIONS request (CORS preflight)
  console.log('Test 1: OPTIONS request (CORS preflight)');
  try {
    const optionsResponse = await axios.options(ENDPOINT);
    console.log('✅ OPTIONS request successful');
    console.log('   Status:', optionsResponse.status);
    console.log('   Headers:', optionsResponse.headers['access-control-allow-methods']);
  } catch (error) {
    console.log('❌ OPTIONS request failed:', error.message);
  }

  // Test 2: POST request without file
  console.log('\nTest 2: POST request without file');
  try {
    const formData = new FormData();
    formData.append('patientName', 'Test Patient');
    formData.append('patientId', '1234567890');
    formData.append('claimType', 'professional');
    formData.append('userEmail', 'test@example.com');
    formData.append('memberId', 'MEM123456');
    formData.append('payerId', 'PAYER001');

    const response = await axios.post(ENDPOINT, formData, {
      headers: formData.getHeaders(),
      timeout: 30000
    });

    console.log('✅ POST request successful');
    console.log('   Status:', response.status);
    console.log('   Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (error.response) {
      console.log('❌ POST request failed with status:', error.response.status);
      console.log('   Response:', JSON.stringify(error.response.data, null, 2));

      if (error.response.status === 405) {
        console.log('\n⚠️  Still getting 405 Method Not Allowed!');
        console.log('   This indicates the fix needs more work.');
      }
    } else {
      console.log('❌ POST request failed:', error.message);
    }
  }

  // Test 3: POST request with dummy file
  console.log('\nTest 3: POST request with file upload');
  
  // Create a dummy test file
  const testFileContent = 'This is a test claim document';
  const testFilePath = path.join(os.tmpdir(), 'test-claim.txt');
  
  try {
    fs.writeFileSync(testFilePath, testFileContent);
  } catch (error) {
    console.log('❌ Failed to create test file:', error.message);
    return;
  }

  try {
    const formData = new FormData();
    formData.append('patientName', 'Test Patient With File');
    formData.append('patientId', '9876543210');
    formData.append('claimType', 'institutional');
    formData.append('userEmail', 'test-file@example.com');

    formData.append('claimFile', fs.createReadStream(testFilePath), {
      filename: 'test-claim.txt',
      contentType: 'text/plain'
    });

    const response = await axios.post(ENDPOINT, formData, {
      headers: formData.getHeaders(),
      timeout: 30000
    });

    console.log('✅ POST request with file successful');
    console.log('   Status:', response.status);
    console.log('   Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (error.response) {
      console.log('❌ POST request with file failed with status:', error.response.status);
      console.log('   Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('❌ POST request with file failed:', error.message);
    }
  } finally {
    // Cleanup
    try {
      fs.unlinkSync(testFilePath);
    } catch (error) {
      console.log('⚠️ Failed to cleanup test file:', error.message);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Testing complete!\n');
}

// Run the tests
testSubmitClaim().catch(error => {
  console.error('Test script error:', error);
  process.exit(1);
});
