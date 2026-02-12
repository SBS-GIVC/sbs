import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 2; i < argv.length; i++) {
    const raw = argv[i];
    if (!raw.startsWith('--')) {
      out._.push(raw);
      continue;
    }

    const key = raw.slice(2);
    const next = argv[i + 1];
    const hasValue = next && !next.startsWith('--');
    out[key] = hasValue ? next : true;
    if (hasValue) i++;
  }
  return out;
}

function boolFromEnv(value, defaultValue) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(raw);
}

function toUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  return new URL(raw.endsWith('/') ? raw : `${raw}/`);
}

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function waitForHttpOk(url, timeoutMs) {
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 2000);
      const res = await fetch(url, { redirect: 'manual', signal: ctrl.signal });
      clearTimeout(t);
      if (res.status >= 200 && res.status < 500) return;
    } catch {
      // ignore
    }
    if (Date.now() - start > timeoutMs) {
      throw new Error(`Timed out waiting for ${url}`);
    }
    await new Promise((r) => setTimeout(r, 250));
  }
}

function startProcess(command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    env: process.env,
    ...options
  });
  return child;
}

function isApiRelatedText(text) {
  const t = String(text || '');
  return (
    t.includes('/api/') ||
    t.includes('HTTP error! status:') ||
    t.toLowerCase().includes('fetch failed') ||
    t.toLowerCase().includes('catalog fetch failed') ||
    t.toLowerCase().includes('facility analytics error')
  );
}

function isApiRelatedConsoleError(item) {
  return isApiRelatedText(item?.text) || String(item?.location?.url || '').includes('/api/');
}

function isApiRelatedPageError(item) {
  return isApiRelatedText(item?.message);
}

async function validateN8nWorkflowFiles(n8nDir) {
  const results = [];
  if (!(await fileExists(n8nDir))) return { ok: true, results: [], skipped: true };

  const entries = await fs.readdir(n8nDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const filePath = path.join(n8nDir, entry.name);
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    const nodes = Array.isArray(parsed?.nodes) ? parsed.nodes : [];
    const connections = parsed?.connections && typeof parsed.connections === 'object' ? parsed.connections : null;
    const name = String(parsed?.name || entry.name);
    const webhookNodes = nodes
      .filter((n) => String(n?.type || '').toLowerCase().includes('webhook'))
      .map((n) => ({
        name: String(n?.name || ''),
        path: String(n?.parameters?.path || n?.webhookId || '')
      }))
      .filter((n) => n.path);

    const ok = nodes.length > 0 && Boolean(connections);
    results.push({
      file: entry.name,
      name,
      ok,
      nodeCount: nodes.length,
      webhookNodes
    });
  }

  const failed = results.filter((r) => !r.ok);
  return { ok: failed.length === 0, results, skipped: false };
}

async function runApiSmokeChecks(apiBaseUrl) {
  const base = toUrl(apiBaseUrl);
  if (!base) return { ok: true, skipped: true, checks: [] };

  const checks = [
    { name: 'health', url: new URL('/health', base).toString(), okStatuses: [200] },
    { name: 'services_status', url: new URL('/api/services/status', base).toString(), okStatuses: [200] },
    { name: 'claims_list', url: new URL('/api/claims', base).toString(), okStatuses: [200] }
  ];

  const out = [];
  for (const check of checks) {
    const startedAt = Date.now();
    try {
      const res = await fetch(check.url, { redirect: 'manual' });
      const durationMs = Date.now() - startedAt;
      out.push({
        name: check.name,
        url: check.url,
        status: res.status,
        ok: check.okStatuses.includes(res.status),
        durationMs
      });
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      out.push({
        name: check.name,
        url: check.url,
        status: null,
        ok: false,
        durationMs,
        error: error?.message || String(error)
      });
    }
  }

  return { ok: out.every((c) => c.ok), skipped: false, checks: out };
}

async function launchBrowser({ headless, channel }) {
  if (channel) {
    return chromium.launch({ headless, channel });
  }

  try {
    return await chromium.launch({ headless });
  } catch (error) {
    const message = String(error?.message || '');
    if (message.includes("Executable doesn't exist")) {
      try {
        return await chromium.launch({ headless, channel: 'chrome' });
      } catch {
        return await chromium.launch({ headless, channel: 'msedge' });
      }
    }
    throw error;
  }
}

async function main() {
  const args = parseArgs(process.argv);

  const headless = args.headless === true
    ? true
    : args.headless
      ? ['1', 'true', 'yes', 'on'].includes(String(args.headless).toLowerCase())
      : boolFromEnv(process.env.E2E_HEADLESS, true);

  const shouldStartFrontend = args['start-frontend'] === true || boolFromEnv(process.env.E2E_START_FRONTEND, false);
  const frontendMode = String(args['frontend-mode'] || process.env.E2E_FRONTEND_MODE || 'dev').toLowerCase();

  const baseUrl =
    args['base-url'] ||
    process.env.E2E_BASE_URL ||
    (shouldStartFrontend && frontendMode === 'preview' ? 'http://localhost:4173/' : 'http://localhost:3001/');

  const skipApi = args['skip-api'] === true || boolFromEnv(process.env.E2E_SKIP_API, false);
  const apiBaseUrl = skipApi ? '' : (args['api-base-url'] || process.env.E2E_API_BASE_URL || process.env.VITE_API_URL || 'http://localhost:3000');
  const timeoutMs = Math.max(5000, Number(args['timeout-ms'] || process.env.E2E_TIMEOUT_MS || 45000));

  const trace = args.trace === true || boolFromEnv(process.env.E2E_TRACE, false);
  const screenshots = args.screenshots === true
    ? true
    : args.screenshots
      ? ['1', 'true', 'yes', 'on'].includes(String(args.screenshots).toLowerCase())
      : boolFromEnv(process.env.E2E_SCREENSHOTS, true);

  const allowExternal = args['allow-external'] === true || boolFromEnv(process.env.E2E_ALLOW_EXTERNAL, false);
  const n8nWebhookUrl = args['n8n-webhook-url'] || process.env.E2E_N8N_WEBHOOK_URL || process.env.VITE_N8N_WEBHOOK_URL || '';
  const browserChannel = String(args['browser-channel'] || process.env.E2E_BROWSER_CHANNEL || '').trim() || null;

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const sbsLandingDir = path.resolve(scriptDir, '..');
  const repoRootDir = path.resolve(sbsLandingDir, '..');

  const runId = nowStamp();
  const artifactsDir = path.join(repoRootDir, 'output', 'playwright', 'sbs-landing-smoke', runId);
  const screenshotsDir = path.join(artifactsDir, 'screenshots');
  await ensureDir(screenshotsDir);

  let frontendProc = null;
  try {
    const frontendEnv = {
      ...process.env,
      ...(apiBaseUrl ? { VITE_API_URL: apiBaseUrl } : {})
    };

    if (shouldStartFrontend) {
      if (frontendMode === 'preview') {
        frontendProc = startProcess('npm', ['run', 'build'], { cwd: sbsLandingDir, env: frontendEnv });
        const buildExit = await new Promise((resolve) => frontendProc.on('exit', resolve));
        if (buildExit !== 0) {
          throw new Error(`Frontend build failed with exit code ${buildExit}`);
        }
        frontendProc = startProcess(
          'npm',
          ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4173', '--strictPort'],
          { cwd: sbsLandingDir, env: frontendEnv }
        );
      } else {
        frontendProc = startProcess(
          'npm',
          ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '3001', '--strictPort'],
          { cwd: sbsLandingDir, env: frontendEnv }
        );
      }

      await waitForHttpOk(baseUrl, timeoutMs);
    }

    const browser = await launchBrowser({ headless, channel: browserChannel });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      ignoreHTTPSErrors: true,
      locale: 'en-US',
      timezoneId: 'Asia/Riyadh'
    });

    if (trace) await context.tracing.start({ screenshots: true, snapshots: true, sources: true });

    const page = await context.newPage();
    page.setDefaultTimeout(timeoutMs);

    const baseOrigin = toUrl(baseUrl)?.origin || '';

    const consoleErrors = [];
    const pageErrors = [];
    const requestFailures = [];
    const apiFailures = [];

    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      consoleErrors.push({
        type: msg.type(),
        text: msg.text(),
        location: msg.location()
      });
    });

    page.on('pageerror', (err) => {
      pageErrors.push({ message: err?.message || String(err) });
    });

    page.on('requestfailed', (req) => {
      const url = req.url();
      if (url.includes('favicon') || url.includes('sockjs-node')) return;
      if (skipApi && url.includes('/api/')) return;

      const isSameOrigin = (() => {
        try {
          return baseOrigin && new URL(url).origin === baseOrigin;
        } catch {
          return false;
        }
      })();
      const looksLikeApi = url.includes('/api/');
      if (!isSameOrigin && !looksLikeApi) return;

      requestFailures.push({
        url,
        method: req.method(),
        resourceType: req.resourceType(),
        failure: req.failure()?.errorText || 'requestfailed'
      });
    });

    page.on('response', async (res) => {
      const url = res.url();
      const status = res.status();

      const looksLikeApi =
        url.includes('/api/') ||
        (toUrl(apiBaseUrl) ? url.startsWith(toUrl(apiBaseUrl).origin) : false);

      if (!looksLikeApi) return;
      if (skipApi) return;
      if (status < 400) return;

      apiFailures.push({
        url,
        status,
        method: res.request().method()
      });
    });

    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#root', { timeout: timeoutMs });
    await page.waitForSelector('[data-testid="nav-dashboard"]', { timeout: timeoutMs });

    const views = [
      { view: 'dashboard', normalized: 'dashboard', navTestId: 'nav-dashboard' },
      { view: 'eligibility', normalized: 'eligibility', navTestId: 'nav-eligibility' },
      { view: 'prior-auth', normalized: 'prior-auth', navTestId: 'nav-prior-auth' },
      { view: 'claim-builder', normalized: 'claim-builder', navTestId: 'nav-claim-builder' },
      { view: 'claims', normalized: 'claims', navTestId: 'nav-claims' },
      { view: 'code-browser', normalized: 'code-browser', navTestId: 'nav-code-browser' },
      { view: 'unified-browser', normalized: 'unified-browser', navTestId: 'nav-unified-browser' },
      { view: 'mappings', normalized: 'mappings', navTestId: 'nav-mappings' },
      { view: 'mapping_rules', normalized: 'mapping_rules', navTestId: 'nav-mapping_rules' },
      { view: 'ai-hub', normalized: 'ai-hub', navTestId: 'nav-ai-hub' },
      { view: 'ai-analytics', normalized: 'ai-analytics', navTestId: 'nav-ai-analytics' },
      { view: 'predictive-analytics', normalized: 'predictive-analytics', navTestId: 'nav-predictive-analytics' },
      { view: 'iot-dashboard', normalized: 'iot-dashboard', navTestId: 'nav-iot-dashboard' },
      { view: 'developer', normalized: 'developer', navTestId: 'nav-developer' },
      { view: 'settings', normalized: 'settings', navTestId: 'nav-settings' },
      { view: 'facility_performance', normalized: 'facility_performance' },
      { view: 'facility_usage', normalized: 'facility_usage' },
      ...(args['include-detail-views'] === true || boolFromEnv(process.env.E2E_INCLUDE_DETAIL_VIEWS, false)
        ? [
            { view: 'review', normalized: 'review' },
            { view: 'error', normalized: 'error' }
          ]
        : [])
    ];

    const viewResults = [];
    for (const item of views) {
      const startedAt = Date.now();
      const targetTestId = `view-${item.normalized}`;
      try {
        if (item.navTestId) {
          await page.click(`[data-testid="${item.navTestId}"]`);
        } else {
          await page.evaluate((view) => {
            window.dispatchEvent(new CustomEvent('sbs:navigate', { detail: { view } }));
          }, item.view);
        }
        await page.waitForSelector(`main[data-testid="${targetTestId}"]`, { timeout: timeoutMs });

        if (screenshots) {
          const filePath = path.join(screenshotsDir, `${item.normalized}.png`);
          await page.screenshot({ path: filePath, fullPage: true, timeout: Math.max(60000, timeoutMs) });
        }

        viewResults.push({
          view: item.view,
          normalized: item.normalized,
          ok: true,
          durationMs: Date.now() - startedAt
        });
      } catch (error) {
        viewResults.push({
          view: item.view,
          normalized: item.normalized,
          ok: false,
          durationMs: Date.now() - startedAt,
          error: error?.message || String(error)
        });
      }
    }

    const n8nDir = path.join(repoRootDir, 'n8n-workflows');
    const n8nValidation = await validateN8nWorkflowFiles(n8nDir);

    let n8nWebhookCheck = { ok: true, skipped: true };
    if (n8nWebhookUrl) {
      const webhook = toUrl(n8nWebhookUrl);
      const isLocal = webhook && ['localhost', '127.0.0.1'].includes(webhook.hostname);
      const shouldCall = allowExternal || isLocal;
      if (webhook && shouldCall) {
        try {
          const startedAt = Date.now();
          const res = await fetch(webhook.toString(), {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ kind: 'e2e_smoke', at: new Date().toISOString(), source: 'sbs-landing/scripts/smoke-e2e.mjs' })
          });
          n8nWebhookCheck = {
            ok: res.status >= 200 && res.status < 500,
            skipped: false,
            url: webhook.toString(),
            status: res.status,
            durationMs: Date.now() - startedAt
          };
        } catch (error) {
          n8nWebhookCheck = { ok: false, skipped: false, url: webhook.toString(), error: error?.message || String(error) };
        }
      } else {
        n8nWebhookCheck = { ok: true, skipped: true, reason: 'External webhook calls disabled (set E2E_ALLOW_EXTERNAL=1 to enable).' };
      }
    }

    const apiSmoke = await runApiSmokeChecks(apiBaseUrl);

    const report = {
      meta: {
        runId,
        headless,
        baseUrl,
        apiBaseUrl,
        artifactsDir
      },
      views: viewResults,
      browser: {
        consoleErrors,
        pageErrors,
        requestFailures,
        apiFailures
      },
      apiSmoke,
      n8n: {
        workflowFiles: n8nValidation,
        webhookCheck: n8nWebhookCheck
      }
    };

    await fs.writeFile(path.join(artifactsDir, 'report.json'), JSON.stringify(report, null, 2));

    if (trace) {
      await context.tracing.stop({ path: path.join(artifactsDir, 'trace.zip') });
    }

    await context.close();
    await browser.close();

    const consoleErrorsBlocking = skipApi
      ? consoleErrors.filter((e) => !isApiRelatedConsoleError(e))
      : consoleErrors;

    const pageErrorsBlocking = skipApi
      ? pageErrors.filter((e) => !isApiRelatedPageError(e))
      : pageErrors;

    const ok =
      viewResults.every((v) => v.ok) &&
      consoleErrorsBlocking.length === 0 &&
      pageErrorsBlocking.length === 0 &&
      requestFailures.length === 0 &&
      apiFailures.length === 0 &&
      apiSmoke.ok &&
      n8nValidation.ok &&
      n8nWebhookCheck.ok;

    // eslint-disable-next-line no-console
    console.log(`\nE2E smoke ${ok ? 'PASSED' : 'FAILED'} — report: ${path.join(artifactsDir, 'report.json')}`);
    process.exit(ok ? 0 : 1);
  } finally {
    if (frontendProc) {
      frontendProc.kill('SIGTERM');
    }
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
