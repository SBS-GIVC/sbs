import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

function parseArgs(argv) {
  const out = {};
  for (let index = 2; index < argv.length; index++) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      out[key] = next;
      index++;
    } else {
      out[key] = true;
    }
  }
  return out;
}

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function findLatestSmokeReport(smokeRootDir) {
  let entries = [];
  try {
    entries = await fs.readdir(smokeRootDir, { withFileTypes: true });
  } catch {
    return null;
  }

  const candidateDirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  if (!candidateDirs.length) return null;

  const withStats = await Promise.all(
    candidateDirs.map(async (name) => {
      const reportPath = path.join(smokeRootDir, name, 'report.json');
      try {
        const stat = await fs.stat(reportPath);
        return { name, reportPath, mtimeMs: stat.mtimeMs };
      } catch {
        return null;
      }
    })
  );

  const available = withStats.filter(Boolean).sort((a, b) => b.mtimeMs - a.mtimeMs);
  return available[0]?.reportPath || null;
}

function buildRegressionCases(report) {
  const cases = [];
  const views = Array.isArray(report?.views) ? report.views : [];
  const failedViews = views.filter((view) => !view.ok);
  for (const failedView of failedViews) {
    cases.push({
      id: `REG-VIEW-${failedView.normalized || failedView.view}`,
      title: `View navigation regression: ${failedView.view}`,
      priority: 'P0',
      source: 'playwright_view_failure',
      testIdea: `Navigate via sidebar to ${failedView.view} and assert \`main[data-testid="view-${failedView.normalized || failedView.view}"]\` is visible.`,
      expected: 'View loads without timeout or runtime error.',
      observed: failedView.error || 'Unknown navigation failure'
    });
  }

  const apiFailures = Array.isArray(report?.browser?.apiFailures) ? report.browser.apiFailures : [];
  for (const failure of apiFailures) {
    cases.push({
      id: `REG-API-${Math.abs((failure.url || '').split('').reduce((sum, c) => sum + c.charCodeAt(0), 0))}`,
      title: `API failure regression: ${failure.method || 'GET'} ${failure.url}`,
      priority: 'P1',
      source: 'playwright_api_failure',
      testIdea: `Replay ${failure.method || 'GET'} ${failure.url} in API smoke and assert status < 400.`,
      expected: 'API endpoint should return success class status.',
      observed: `HTTP ${failure.status || 'unknown'}`
    });
  }

  const requestFailures = Array.isArray(report?.browser?.requestFailures) ? report.browser.requestFailures : [];
  for (const failure of requestFailures.slice(0, 10)) {
    cases.push({
      id: `REG-REQ-${Math.abs((failure.url || '').split('').reduce((sum, c) => sum + c.charCodeAt(0), 0))}`,
      title: `Request transport regression: ${failure.method || 'GET'} ${failure.url}`,
      priority: 'P2',
      source: 'playwright_request_failure',
      testIdea: `Monitor network for ${failure.url} and assert no requestfailed event occurs.`,
      expected: 'No transport-level request failures.',
      observed: failure.failure || 'requestfailed'
    });
  }

  return cases;
}

function summarizeOutcome(report) {
  const failedViews = (report?.views || []).filter((view) => !view.ok).length;
  const consoleErrors = (report?.browser?.consoleErrors || []).length;
  const pageErrors = (report?.browser?.pageErrors || []).length;
  const requestFailures = (report?.browser?.requestFailures || []).length;
  const apiFailures = (report?.browser?.apiFailures || []).length;
  const workflowValidationOk = Boolean(report?.n8n?.workflowFiles?.ok);
  const apiSmokeOk = Boolean(report?.apiSmoke?.ok);

  const overallPassed =
    failedViews === 0 &&
    consoleErrors === 0 &&
    pageErrors === 0 &&
    requestFailures === 0 &&
    apiFailures === 0 &&
    workflowValidationOk &&
    apiSmokeOk;

  return {
    overallPassed,
    failedViews,
    consoleErrors,
    pageErrors,
    requestFailures,
    apiFailures,
    workflowValidationOk,
    apiSmokeOk
  };
}

async function runSmokeScript(cwd, args = []) {
  const smokeArgs = ['scripts/smoke-e2e.mjs', ...args];
  return await new Promise((resolve) => {
    const child = spawn('node', smokeArgs, {
      cwd,
      env: process.env,
      stdio: 'inherit'
    });
    child.on('exit', (code) => resolve(code ?? 1));
  });
}

async function main() {
  const args = parseArgs(process.argv);
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const sbsLandingDir = path.resolve(scriptDir, '..');
  const repoRoot = path.resolve(sbsLandingDir, '..');

  const runId = nowStamp();
  const qaRoot = path.join(repoRoot, 'output', 'playwright', 'qa-agent');
  const runDir = path.join(qaRoot, runId);
  await ensureDir(runDir);

  const smokeArgs = [];
  if (args['base-url']) smokeArgs.push('--base-url', String(args['base-url']));
  if (args['api-base-url']) smokeArgs.push('--api-base-url', String(args['api-base-url']));
  if (args['start-frontend']) smokeArgs.push('--start-frontend');
  if (args.headed) smokeArgs.push('--headless', '0');
  if (args['skip-api']) smokeArgs.push('--skip-api');

  const smokeExitCode = await runSmokeScript(sbsLandingDir, smokeArgs);

  const smokeRootDir = path.join(repoRoot, 'output', 'playwright', 'sbs-landing-smoke');
  const latestReportPath = await findLatestSmokeReport(smokeRootDir);
  if (!latestReportPath) {
    const fallback = {
      success: false,
      error: 'No smoke report found. Ensure scripts/smoke-e2e.mjs generated report.json.',
      smokeExitCode
    };
    await fs.writeFile(path.join(runDir, 'qa-agent-report.json'), JSON.stringify(fallback, null, 2));
    console.error('[qa-agent] No smoke report found.');
    process.exit(smokeExitCode || 1);
  }

  const smokeReport = await readJson(latestReportPath);
  const outcome = summarizeOutcome(smokeReport);
  const regressionCases = buildRegressionCases(smokeReport);

  const qaReport = {
    runId,
    generatedAt: new Date().toISOString(),
    smokeExitCode,
    sourceReport: latestReportPath,
    outcome,
    regressionCases
  };

  await fs.writeFile(path.join(runDir, 'qa-agent-report.json'), JSON.stringify(qaReport, null, 2));

  const markdown = [
    '# Continuous QA Agent Report',
    '',
    `- Run ID: \`${runId}\``,
    `- Smoke report: \`${latestReportPath}\``,
    `- Overall passed: \`${outcome.overallPassed}\``,
    `- Failed views: \`${outcome.failedViews}\``,
    `- API failures: \`${outcome.apiFailures}\``,
    `- Request failures: \`${outcome.requestFailures}\``,
    `- Console errors: \`${outcome.consoleErrors}\``,
    `- Page errors: \`${outcome.pageErrors}\``,
    '',
    '## Regression Candidates',
    ...(regressionCases.length
      ? regressionCases.map((item) => `- [${item.priority}] ${item.title}: ${item.testIdea}`)
      : ['- No new regression candidates detected.'])
  ].join('\n');

  await fs.writeFile(path.join(runDir, 'qa-agent-report.md'), markdown);

  const latestSymlinkTarget = path.join(qaRoot, 'latest.json');
  await fs.writeFile(latestSymlinkTarget, JSON.stringify(qaReport, null, 2));

  console.log(`\n[qa-agent] Report generated: ${path.join(runDir, 'qa-agent-report.json')}`);
  process.exit(smokeExitCode);
}

main().catch((error) => {
  console.error('[qa-agent] Failed:', error.message || error);
  process.exit(1);
});
