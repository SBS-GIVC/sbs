/**
 * Oracle Portal Integration Script
 * Automates login to Oracle portal at https://128.1.1.185/prod/faces/Home
 * Uses Playwright for browser automation
 */

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Oracle Portal Scanner
 * @param {Object} options - Configuration options
 * @param {string} options.url - Oracle portal URL (default: from env)
 * @param {string} options.username - Login username (default: from env)
 * @param {string} options.password - Login password (default: from env)
 * @param {string} options.otp - Optional OTP code (default: from env)
 * @param {boolean} options.headless - Run in headless mode (default: true)
 * @param {string} options.artifactsDir - Directory for screenshots (default: artifacts/oracle-portal)
 * @returns {Promise<Object>} - Result with success, timestamp, title, screenshot
 */
export async function scanOraclePortal(options = {}) {
  const config = {
    url: options.url || process.env.ORACLE_PORTAL_URL || 'https://128.1.1.185/prod/faces/Home',
    username: options.username || process.env.ORACLE_USERNAME,
    password: options.password || process.env.ORACLE_PASSWORD,
    otp: options.otp || process.env.ORACLE_OTP,
    headless: options.headless !== undefined ? options.headless : 
              (process.env.ORACLE_HEADLESS !== 'false'),
    artifactsDir: options.artifactsDir || process.env.ORACLE_ARTIFACTS_DIR || 'artifacts/oracle-portal'
  };

  // Validation
  if (!config.username || !config.password) {
    throw new Error('ORACLE_USERNAME and ORACLE_PASSWORD are required');
  }

  console.log('🚀 Oracle Portal Scanner starting...');
  console.log(`   URL: ${config.url}`);
  console.log(`   User: ${config.username}`);
  console.log(`   Headless: ${config.headless}`);

  let browser;
  let page;

  try {
    // Ensure artifacts directory exists
    mkdirSync(config.artifactsDir, { recursive: true });

    // Launch browser
    browser = await chromium.launch({
      headless: config.headless,
      args: ['--ignore-certificate-errors'] // For self-signed SSL
    });

    const context = await browser.newContext({
      ignoreHTTPSErrors: true, // Accept self-signed certificates
      viewport: { width: 1920, height: 1080 }
    });

    page = await context.newPage();

    // Navigate to portal
    console.log('📡 Navigating to Oracle portal...');
    await page.goto(config.url, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    // Wait for login form
    console.log('🔍 Waiting for login form...');
    await page.waitForSelector('input[type="text"], input[name*="user"], input[id*="user"]', {
      timeout: 10000
    });

    // Fill username
    console.log('👤 Entering username...');
    const usernameField = await page.locator('input[type="text"], input[name*="user"], input[id*="user"]').first();
    await usernameField.fill(config.username);

    // Fill password
    console.log('🔐 Entering password...');
    const passwordField = await page.locator('input[type="password"]').first();
    await passwordField.fill(config.password);

    // Handle OTP if provided
    if (config.otp && config.otp !== 'false') {
      console.log('🔢 Entering OTP...');
      const otpField = await page.locator('input[name*="otp"], input[id*="otp"]').first();
      if (await otpField.count() > 0) {
        await otpField.fill(config.otp);
      }
    }

    // Click login button
    console.log('🔘 Clicking login button...');
    const loginButton = await page.locator(
      'button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Sign In")'
    ).first();
    await loginButton.click();

    // Wait for navigation after login
    console.log('⏳ Waiting for login to complete...');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Check if login was successful (adjust selectors based on actual portal)
    const title = await page.title();
    console.log(`✅ Page loaded: ${title}`);

    // Take full-page screenshot
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const screenshotPath = join(config.artifactsDir, `scan-${timestamp}.png`);
    
    console.log('📸 Taking screenshot...');
    await page.screenshot({ 
      path: screenshotPath, 
      fullPage: true 
    });

    console.log(`✅ Screenshot saved: ${screenshotPath}`);

    // Return result
    return {
      success: true,
      timestamp: new Date().toISOString(),
      title: title,
      screenshot: screenshotPath,
      url: config.url
    };

  } catch (error) {
    console.error('❌ Oracle portal scan failed:', error.message);
    throw new Error(`Oracle portal scan failed: ${error.message}`);
  } finally {
    // Cleanup
    if (browser) {
      await browser.close();
      console.log('🔒 Browser closed');
    }
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  scanOraclePortal()
    .then(result => {
      console.log('\n✅ Success!');
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Error:', error.message);
      process.exit(1);
    });
}
