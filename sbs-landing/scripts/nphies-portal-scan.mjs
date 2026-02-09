import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const PORTAL_URL = process.env.NPHIES_PORTAL_URL || 'https://portal.nphies.sa';
const EMAIL = process.env.NPHIES_EMAIL || '';
const PASSWORD = process.env.NPHIES_PASSWORD || '';
const OTP = process.env.NPHIES_OTP || '';
const NAFATH_NATIONAL_ID = clean(process.env.NAFATH_NATIONAL_ID || '');
const AUTH_MODE = clean(process.env.NPHIES_AUTH_MODE || 'nafath').toLowerCase();
const BROWSER_PROXY = clean(process.env.NPHIES_PROXY_URL || process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '');
const HEADLESS = !['0', 'false', 'no'].includes(String(process.env.NPHIES_HEADLESS || 'true').toLowerCase());
const TIMEOUT_MS = Math.max(5000, Number(process.env.NPHIES_TIMEOUT_MS || 45000));
const SAVE_STORAGE_STATE = ['1', 'true', 'yes'].includes(String(process.env.NPHIES_SAVE_STORAGE_STATE || 'false').toLowerCase());
const EXTRA_WAIT_MS = Math.max(0, Number(process.env.NPHIES_EXTRA_WAIT_MS || 7000));
const SKIP_SCREENSHOTS = ['1', 'true', 'yes'].includes(String(process.env.NPHIES_SKIP_SCREENSHOTS || 'false').toLowerCase());
const FORCE_LOGIN_PATH = clean(process.env.NPHIES_LOGIN_PATH || '');
const LOGIN_NAV_TIMEOUT_MS = Math.max(2000, Number(process.env.NPHIES_LOGIN_NAV_TIMEOUT_MS || 7000));
const LOGIN_NAV_POST_WAIT_MS = Math.max(0, Number(process.env.NPHIES_LOGIN_NAV_POST_WAIT_MS || 800));
const NAFATH_APPROVAL_WAIT_MS = Math.max(15000, Number(process.env.NAFATH_APPROVAL_WAIT_MS || 180000));

const ARTIFACT_DIR = path.resolve(process.cwd(), process.env.NPHIES_ARTIFACT_DIR || 'artifacts/nphies-portal');

const EMAIL_SELECTORS = [
  'input[type="email"]',
  'input[name="email"]',
  'input[id*="email" i]',
  'input[placeholder*="email" i]',
  'input[name*="user" i]',
  'input[id*="user" i]'
];

const PASSWORD_SELECTORS = [
  'input[type="password"]',
  'input[name="password"]',
  'input[id*="password" i]',
  'input[placeholder*="password" i]'
];

const OTP_SELECTORS = [
  'input[name*="otp" i]',
  'input[id*="otp" i]',
  'input[name*="code" i]',
  'input[id*="code" i]',
  'input[autocomplete="one-time-code"]'
];

const SUBMIT_SELECTORS = [
  'button[type="submit"]',
  'input[type="submit"]',
  'button:has-text("Sign in")',
  'button:has-text("Login")',
  'button:has-text("Log in")',
  'button:has-text("Continue")',
  'button:has-text("Verify")'
];

const NAFATH_ENTRY_SELECTORS = [
  'button:has-text("Nafath")',
  'a:has-text("Nafath")',
  'button:has-text("نفاذ")',
  'a:has-text("نفاذ")',
  'button:has-text("National Access")',
  'a:has-text("National Access")',
  'button[id*="nafath" i]',
  'a[id*="nafath" i]',
  'button[class*="nafath" i]',
  'a[class*="nafath" i]'
];

const NATIONAL_ID_SELECTORS = [
  'input[name*="national" i]',
  'input[id*="national" i]',
  'input[name*="iqama" i]',
  'input[id*="iqama" i]',
  'input[name*="nid" i]',
  'input[id*="nid" i]',
  'input[name*="identifier" i]',
  'input[id*="identifier" i]'
];

function dedupe(values) {
  return [...new Set(values.filter(Boolean))];
}

function clean(value) {
  return String(value || '').trim();
}

function extractSetupHints(text) {
  const source = clean(text);

  const urls = dedupe(source.match(/https?:\/\/[^\s"'<>)]+/gi) || []);
  const ipUrls = urls.filter((u) => /https?:\/\/\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?/i.test(u));
  const processUrls = urls.filter((u) => /process-message|eligibility|approval|submitclaim|claim/i.test(u));

  const chiIdMatches = source.match(/(?:CHI\s*ID|CHIID)\s*[:=]?\s*(\d{3,10})/gi) || [];
  const nphiesIdMatches = source.match(/(?:NPHIES\s*ID|NPIES\s*ID)\s*[:=]?\s*(\d{10,20})/gi) || [];
  const providerIdMatches = source.match(/(?:Provider\s*ID)\s*[:=]?\s*(\d{3,12})/gi) || [];

  return {
    urls,
    processUrls,
    ipUrls,
    ids: {
      chi: chiIdMatches,
      nphies: nphiesIdMatches,
      provider: providerIdMatches
    }
  };
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function safeScreenshot(page, filePath) {
  try {
    await page.screenshot({ path: filePath, fullPage: true, timeout: 60000 });
    return true;
  } catch {
    try {
      await page.screenshot({ path: filePath, fullPage: false, timeout: 15000 });
      return true;
    } catch {
      return false;
    }
  }
}

async function findFirstVisible(page, selectors) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    try {
      if ((await locator.count()) > 0 && (await locator.isVisible())) {
        return locator;
      }
    } catch {
      // ignore invalid selector/runtime checks
    }
  }
  return null;
}

async function findFirstVisibleAnyFrame(page, selectors) {
  const frames = [page.mainFrame(), ...page.frames().filter((frame) => frame !== page.mainFrame())];
  for (const frame of frames) {
    const found = await findFirstVisible(frame, selectors);
    if (found) return found;
  }
  return null;
}

async function maybeFill(locator, value) {
  if (!locator || !value) return false;
  await locator.click({ timeout: 2000 }).catch(() => {});
  await locator.fill(value, { timeout: 4000 });
  return true;
}

async function maybeClick(page, selectors) {
  const target = await findFirstVisible(page, selectors);
  if (!target) return false;
  await target.click({ timeout: 5000 });
  return true;
}

async function maybeClickAnyFrame(page, selectors) {
  const target = await findFirstVisibleAnyFrame(page, selectors);
  if (!target) return false;
  await target.click({ timeout: 5000 });
  return true;
}

async function likelyLoggedIn(page) {
  const url = String(page.url() || '').toLowerCase();
  if (/(dashboard|home|profile|workspace|claims|portal\/app)/.test(url)) return true;

  const bodyText = (await page.locator('body').innerText().catch(() => '')).toLowerCase();
  if (!bodyText) return false;

  const loginSignals = /(login|sign in|username|password|nafath|نفاذ|national access)/.test(bodyText);
  const appSignals = /(logout|sign out|my profile|welcome|claims|eligibility|pre.?auth|nphies)/.test(bodyText);
  return !loginSignals && appSignals;
}

async function runNafathFlow(page, result) {
  const clickedNafath = await maybeClickAnyFrame(page, NAFATH_ENTRY_SELECTORS);
  if (!clickedNafath) {
    result.notes.push('Nafath login entry was not detected on the current page.');
    return false;
  }

  result.notes.push('Nafath entry clicked.');
  await waitForSettled(page);

  const idInput = await findFirstVisibleAnyFrame(page, NATIONAL_ID_SELECTORS);
  if (idInput && NAFATH_NATIONAL_ID) {
    await maybeFill(idInput, NAFATH_NATIONAL_ID);
    await maybeClickAnyFrame(page, SUBMIT_SELECTORS);
    result.notes.push('National/Iqama ID submitted for Nafath flow.');
  } else if (idInput) {
    result.notes.push('National/Iqama ID field detected; set NAFATH_NATIONAL_ID to auto-fill it.');
  } else {
    result.notes.push('National/Iqama ID field not auto-detected; continue manually if prompted.');
  }

  result.notes.push(`Waiting up to ${Math.round(NAFATH_APPROVAL_WAIT_MS / 1000)}s for Nafath app approval.`);
  const deadline = Date.now() + NAFATH_APPROVAL_WAIT_MS;
  while (Date.now() < deadline) {
    if (await likelyLoggedIn(page)) {
      result.notes.push('Nafath approval appears successful.');
      return true;
    }
    await page.waitForTimeout(2000);
  }

  result.notes.push('Nafath approval window elapsed before login confirmation.');
  return false;
}

async function waitForSettled(page) {
  await page.waitForLoadState('domcontentloaded', { timeout: TIMEOUT_MS }).catch(() => {});
  await page.waitForTimeout(EXTRA_WAIT_MS);
}

async function tryNavigateLoginCandidates(page, notes) {
  const base = new URL(PORTAL_URL);
  const candidates = dedupe([
    FORCE_LOGIN_PATH,
    '/login',
    '/auth/login',
    '/signin',
    '/account/login',
    '/users/sign_in',
    '/sso/login'
  ]);

  for (const candidate of candidates) {
    if (!candidate) continue;
    const target = candidate.startsWith('http')
      ? candidate
      : new URL(candidate, `${base.origin}/`).toString();
    try {
      await page.goto(target, { waitUntil: 'domcontentloaded', timeout: LOGIN_NAV_TIMEOUT_MS });
      await page.waitForTimeout(LOGIN_NAV_POST_WAIT_MS);
      notes.push(`Navigated to login candidate: ${target}`);
      const emailInput = await findFirstVisible(page, EMAIL_SELECTORS);
      const passwordInput = await findFirstVisible(page, PASSWORD_SELECTORS);
      if (emailInput && passwordInput) return true;
    } catch {
      notes.push(`Login candidate failed: ${target}`);
    }
  }
  return false;
}

async function main() {
  await ensureDir(ARTIFACT_DIR);

  const launchOptions = { headless: HEADLESS };
  if (BROWSER_PROXY) {
    launchOptions.proxy = { server: BROWSER_PROXY };
  }
  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1512, height: 982 }
  });

  const page = await context.newPage();
  const startedAt = new Date().toISOString();

  const result = {
    startedAt,
    finishedAt: null,
    portalUrl: PORTAL_URL,
    loginAttempted: false,
    loginCredentialUsed: {
      email: Boolean(EMAIL),
      password: Boolean(PASSWORD),
      otp: Boolean(OTP),
      nafathNationalId: Boolean(NAFATH_NATIONAL_ID)
    },
    currentUrl: null,
    title: null,
    loginLikelySuccessful: false,
    authMode: AUTH_MODE,
    browserProxyConfigured: Boolean(BROWSER_PROXY),
    artifacts: {},
    setupHints: null,
    networkFailures: [],
    notes: []
  };

  try {
    const networkFailures = [];
    page.on('requestfailed', (request) => {
      const requestUrl = String(request.url() || '');
      if (!/sso\.nphies\.sa|keycloak|auth/i.test(requestUrl)) return;
      if (networkFailures.length >= 20) return;
      networkFailures.push({
        url: requestUrl,
        error: request.failure()?.errorText || 'request failed'
      });
    });

    await page.goto(PORTAL_URL, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
    await waitForSettled(page);

    const beforeShot = path.join(ARTIFACT_DIR, '01-landing.png');
    if (!SKIP_SCREENSHOTS) {
      if (await safeScreenshot(page, beforeShot)) {
        result.artifacts.beforeScreenshot = beforeShot;
      } else {
        result.notes.push('Unable to capture initial screenshot.');
      }
    }

    let emailInput = await findFirstVisibleAnyFrame(page, EMAIL_SELECTORS);
    let passwordInput = await findFirstVisibleAnyFrame(page, PASSWORD_SELECTORS);

    if (!(emailInput && passwordInput)) {
      await tryNavigateLoginCandidates(page, result.notes);
      emailInput = await findFirstVisibleAnyFrame(page, EMAIL_SELECTORS);
      passwordInput = await findFirstVisibleAnyFrame(page, PASSWORD_SELECTORS);
    }

    const shouldTryLegacyPassword = AUTH_MODE !== 'nafath' && EMAIL && PASSWORD && emailInput && passwordInput;
    if (shouldTryLegacyPassword) {
      result.loginAttempted = true;

      await maybeFill(emailInput, EMAIL);
      await maybeFill(passwordInput, PASSWORD);
      await maybeClickAnyFrame(page, SUBMIT_SELECTORS);

      await waitForSettled(page);

      const otpInput = await findFirstVisibleAnyFrame(page, OTP_SELECTORS);
      if (otpInput) {
        if (OTP) {
          await maybeFill(otpInput, OTP);
          await maybeClickAnyFrame(page, SUBMIT_SELECTORS);
          await waitForSettled(page);
          result.notes.push('OTP field detected and submitted from NPHIES_OTP.');
        } else {
          result.notes.push('OTP field detected. Re-run with NPHIES_OTP to complete login.');
        }
      }
    } else {
      const nafathCompleted = await runNafathFlow(page, result);
      if (nafathCompleted) {
        result.loginAttempted = true;
      } else {
        if (!EMAIL || !PASSWORD) {
          result.notes.push('Nafath flow did not complete (NPHIES_EMAIL/NPHIES_PASSWORD are optional in Nafath mode).');
        } else {
          result.notes.push('Could not complete Nafath flow. Re-run with NAFATH_NATIONAL_ID and approve from the Nafath app.');
        }
      }
    }

    const afterShot = path.join(ARTIFACT_DIR, '02-after-login-attempt.png');
    if (!SKIP_SCREENSHOTS) {
      if (await safeScreenshot(page, afterShot)) {
        result.artifacts.afterScreenshot = afterShot;
      } else {
        result.notes.push('Unable to capture post-login screenshot.');
      }
    }

    const content = await page.content();
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const links = await page.$$eval('a[href]', (els) =>
      els.map((el) => ({
        text: (el.textContent || '').trim(),
        href: String(el.getAttribute('href') || '').trim()
      }))
    ).catch(() => []);

    const formHints = await page.$$eval('input,button,label', (els) =>
      els.slice(0, 200).map((el) => ({
        tag: el.tagName.toLowerCase(),
        type: el.getAttribute('type') || '',
        name: el.getAttribute('name') || '',
        id: el.getAttribute('id') || '',
        placeholder: el.getAttribute('placeholder') || '',
        text: (el.textContent || '').trim().slice(0, 120)
      }))
    ).catch(() => []);

    result.currentUrl = page.url();
    result.title = await page.title();

    const lowerBody = bodyText.toLowerCase();
    const lowerTitle = String(result.title || '').toLowerCase();
    const looksLikeLogin = /login|sign in|username|password|nafath|نفاذ|national access/.test(lowerBody + ' ' + lowerTitle);
    result.loginLikelySuccessful = result.loginAttempted ? !looksLikeLogin : false;
    result.networkFailures = networkFailures;
    if (!result.loginLikelySuccessful && networkFailures.length > 0) {
      result.notes.push('Detected failed requests to SSO/auth endpoints. Check VPS egress/firewall/VPN reachability to sso.nphies.sa.');
    }

    result.setupHints = extractSetupHints(`${bodyText}\n${content}`);

    const linksPath = path.join(ARTIFACT_DIR, 'links.json');
    await fs.writeFile(linksPath, JSON.stringify(links, null, 2), 'utf8');
    result.artifacts.links = linksPath;

    const formHintsPath = path.join(ARTIFACT_DIR, 'form-hints.json');
    await fs.writeFile(formHintsPath, JSON.stringify(formHints, null, 2), 'utf8');
    result.artifacts.formHints = formHintsPath;

    if (SAVE_STORAGE_STATE) {
      const storagePath = path.join(ARTIFACT_DIR, 'storage-state.json');
      await context.storageState({ path: storagePath });
      result.artifacts.storageState = storagePath;
      result.notes.push('Storage state saved; treat as sensitive secret.');
    }
  } catch (error) {
    result.notes.push(`Automation error: ${error.message}`);
  } finally {
    result.finishedAt = new Date().toISOString();
    const summaryPath = path.join(ARTIFACT_DIR, 'summary.json');
    await fs.writeFile(summaryPath, JSON.stringify(result, null, 2), 'utf8');
    await browser.close();

    console.log('NPHIES portal scan complete');
    console.log(`Summary: ${summaryPath}`);
    console.log(`Login likely successful: ${result.loginLikelySuccessful}`);
    if (result.setupHints) {
      console.log(`Found URLs: ${result.setupHints.urls.length}`);
      console.log(`Found process URLs: ${result.setupHints.processUrls.length}`);
    }
    if (result.notes.length) {
      console.log('Notes:');
      for (const note of result.notes) console.log(`- ${note}`);
    }
  }
}

main();
