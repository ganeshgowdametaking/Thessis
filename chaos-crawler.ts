/**
 * chaos-crawler.ts
 *
 * Runs three crawl phases against the app, each with its own auth context,
 * and writes one combined qa-report.md:
 *
 *   Phase A (Unauthenticated) — starts logged out; seeded with /login,
 *     /signup, /company-signup, /reset-password.
 *   Phase B (Employer) — logs in with QA_EMPLOYER_EMAIL/PASSWORD, seeded
 *     with /companies and the employer dashboard.
 *   Phase C (Job Seeker) — logs in with QA_EMAIL/PASSWORD, seeded with the
 *     app root.
 *
 * On every page in every phase it:
 *   - records console errors, uncaught exceptions, and 404/5xx responses.
 *   - repeatedly scans for <button>/<a> elements and clicks whichever ones
 *     it hasn't already tried (by tag+text+href signature), in multiple
 *     passes, so buttons that only appear after some other interaction
 *     (a job gets selected, a menu opens, ...) get a chance to be reached —
 *     not just what's visible on first paint.
 *   - if a click navigates (whether via a plain <a href> or a button that
 *     calls navigate() programmatically — both look identical from here:
 *     the URL changes), it queues the new page and returns to keep going.
 *
 * Credentials: never hardcode real values in this file. Two ways in:
 *   1. Shell env vars: QA_EMAIL, QA_PASSWORD, QA_EMPLOYER_EMAIL,
 *      QA_EMPLOYER_PASSWORD, BASE_URL.
 *   2. A local, gitignored `.chaos-crawler.env` file (KEY=value per line)
 *      in this directory — safer than typing secrets into a shared
 *      terminal/chat, since this script is the only thing that reads it.
 *      Shell env vars take precedence over the file.
 *
 * Usage:
 *   npx ts-node chaos-crawler.ts
 *   PAGE_LIMIT=20 npx ts-node chaos-crawler.ts
 */

import { chromium, Browser, BrowserContext, Page, ConsoleMessage } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

function loadDotEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  const out: Record<string, string> = {};
  for (const rawLine of fs.readFileSync(filePath, 'utf-8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return out;
}

const fileEnv = loadDotEnvFile(path.join(__dirname, '.chaos-crawler.env'));
function env(key: string): string | undefined {
  return process.env[key] || fileEnv[key];
}

const BASE_URL = env('BASE_URL') || 'http://localhost:5173';
const PAGE_LIMIT = Number(env('PAGE_LIMIT') || 50);
const CLICK_TIMEOUT_MS = 4000;
const SETTLE_MS = 400;
const MAX_PHASE_RUNTIME_MS = 10 * 60 * 1000; // 10 minutes per phase
const MAX_PASSES_PER_PAGE = 3;
const MAX_CLICK_ATTEMPTS_PER_PAGE = 120;

const QA_EMAIL = env('QA_EMAIL');
const QA_PASSWORD = env('QA_PASSWORD');
const QA_EMPLOYER_EMAIL = env('QA_EMPLOYER_EMAIL');
const QA_EMPLOYER_PASSWORD = env('QA_EMPLOYER_PASSWORD');

const DESTRUCTIVE_KEYWORDS = [
  'log out', 'logout', 'sign out',
  'delete', 'remove', 'unsubscribe', 'deactivate',
  'cancel my account', 'permanently',
];

interface ConsoleErrorEntry { phase: string; page: string; message: string; }
interface NetworkErrorEntry { phase: string; page: string; url: string; status: number; }
interface FailedClickEntry { phase: string; page: string; element: string; reason: string; }
interface SkippedEntry { phase: string; page: string; element: string; reason: string; }
interface PageStat { phase: string; url: string; buttonsClicked: number; linksClicked: number; errors: number; }
interface LoadFailure { phase: string; url: string; reason: string; }

const consoleErrors: ConsoleErrorEntry[] = [];
const networkErrors: NetworkErrorEntry[] = [];
const failedClicks: FailedClickEntry[] = [];
const skipped: SkippedEntry[] = [];
const pageStats: PageStat[] = [];
const loadFailures: LoadFailure[] = [];
const phaseNotes: { phase: string; note: string }[] = [];

const baseOrigin = new URL(BASE_URL).origin;

function normalizeUrl(href: string): string {
  const u = new URL(href, BASE_URL);
  u.hash = '';
  return u.toString();
}

function isInternal(href: string): boolean {
  try {
    return new URL(href, BASE_URL).origin === baseOrigin;
  } catch {
    return false;
  }
}

function truncate(s: string, n: number): string {
  const clean = s.replace(/\s+/g, ' ').trim();
  return clean.length > n ? clean.slice(0, n) + '…' : clean;
}

// Waits for the number of <button>/<a> elements to stop changing, rather
// than just becoming non-zero — a SPA often renders one element (e.g. the
// header logo) well before the rest of the page (job cards, nav, footer)
// finishes its own staggered async rendering.
async function waitForStableInteractiveCount(page: Page, maxWaitMs = 8000, stableChecks = 3, intervalMs = 400): Promise<void> {
  let lastCount = -1;
  let stableStreak = 0;
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const count = await page.locator('button, a').count().catch(() => 0);
    if (count === lastCount) {
      stableStreak++;
      if (stableStreak >= stableChecks) return;
    } else {
      stableStreak = 0;
      lastCount = count;
    }
    await page.waitForTimeout(intervalMs);
  }
}

// networkidle is unreliable here — this app holds a persistent connection
// open (a realtime subscription and/or the notification-poll interval), so
// "no network activity for 500ms" may just never become true, and every
// networkidle wait burns its full timeout for nothing. The element-count
// stability poll below doesn't care about network state at all, and it's
// what actually proved correct earlier (catching a page that re-mounts
// after goBack and needs to re-fetch before its buttons exist) — so lean on
// that alone, with one quick opportunistic networkidle check that's
// capped low enough to not matter if it never resolves.
async function waitForAppSettled(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: 1500 }).catch(() => {});
  await waitForStableInteractiveCount(page);
}

async function loginAs(browser: Browser, email: string, password: string, label: string): Promise<string | undefined> {
  console.log(`  Logging in as ${label}...`);
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(normalizeUrl('/login'), { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.getByPlaceholder(/email/i).first().fill(email);
    await page.getByPlaceholder(/password/i).first().fill(password);
    await page.getByRole('button', { name: /sign in|log in/i }).first().click();

    const loggedIn = await page
      .waitForURL((u) => !u.pathname.includes('/login'), { timeout: 10000 })
      .then(() => true)
      .catch(() => false);

    if (!loggedIn) {
      console.warn(`  Login as ${label} did not redirect away from /login.`);
      await context.close();
      return undefined;
    }

    await waitForAppSettled(page);
    const statePath = path.join(__dirname, `.chaos-crawler-auth-${label.replace(/\s+/g, '-').toLowerCase()}.json`);
    await context.storageState({ path: statePath });
    await context.close();
    console.log(`  Login as ${label} succeeded.`);
    return statePath;
  } catch (e: any) {
    console.warn(`  Login as ${label} failed:`, e.message);
    await context.close();
    return undefined;
  }
}

interface PhaseResult { visitedCount: number; }

async function crawlPhase(
  browser: Browser,
  phaseName: string,
  seedPaths: string[],
  storageStatePath: string | undefined
): Promise<PhaseResult> {
  const startTime = Date.now();
  const visited = new Set<string>();
  const queue: string[] = seedPaths.map(normalizeUrl);

  while (queue.length > 0 && visited.size < PAGE_LIMIT) {
    if (Date.now() - startTime > MAX_PHASE_RUNTIME_MS) {
      phaseNotes.push({ phase: phaseName, note: `Stopped early — hit the ${MAX_PHASE_RUNTIME_MS / 60000}-minute phase time budget.` });
      break;
    }
    const next = queue.shift()!;
    if (visited.has(next)) continue;
    visited.add(next);
    console.log(`  [${phaseName}] [${visited.size}/${PAGE_LIMIT}] ${next}`);
    await crawlPage(browser, phaseName, next, storageStatePath, visited, queue, startTime);
  }

  return { visitedCount: visited.size };
}

async function crawlPage(
  browser: Browser,
  phaseName: string,
  url: string,
  storageStatePath: string | undefined,
  visited: Set<string>,
  queue: string[],
  phaseStartTime: number
) {
  const context: BrowserContext = await browser.newContext(
    storageStatePath ? { storageState: storageStatePath } : {}
  );
  const page = await context.newPage();

  page.on('dialog', (dialog) => dialog.dismiss().catch(() => {}));
  context.on('page', (popup) => { popup.close().catch(() => {}); });

  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') {
      consoleErrors.push({ phase: phaseName, page: url, message: truncate(msg.text(), 300) });
    }
  });
  page.on('pageerror', (err) => {
    consoleErrors.push({ phase: phaseName, page: url, message: `Uncaught exception: ${truncate(err.message, 300)}` });
  });
  page.on('response', (res) => {
    const status = res.status();
    if (status === 404 || status >= 500) {
      networkErrors.push({ phase: phaseName, page: url, url: res.url(), status });
    }
  });

  const stat: PageStat = { phase: phaseName, url, buttonsClicked: 0, linksClicked: 0, errors: 0 };

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await waitForAppSettled(page);
  } catch (e: any) {
    loadFailures.push({ phase: phaseName, url, reason: truncate(e.message, 300) });
    await context.close();
    return;
  }

  const queueIfNew = (href: string) => {
    if (!isInternal(href)) return;
    const normalized = normalizeUrl(href);
    if (!visited.has(normalized) && !queue.includes(normalized)) {
      queue.push(normalized);
    }
  };

  const collectLinks = async () => {
    const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => (a as HTMLAnchorElement).href)).catch(() => []);
    hrefs.forEach(queueIfNew);
  };

  await collectLinks();

  // Multi-pass clicking: each pass re-scans the current DOM (buttons that
  // only appear after some earlier click — a job card gets selected, a menu
  // opens — are picked up on the next pass) and skips anything already
  // attempted, identified by tag+text+href rather than DOM index, since
  // index shifts as elements are added/removed between passes.
  const clickedSignatures = new Set<string>();
  let totalAttempts = 0;

  for (let pass = 0; pass < MAX_PASSES_PER_PAGE && totalAttempts < MAX_CLICK_ATTEMPTS_PER_PAGE; pass++) {
    const count = await page.locator('button, a').count().catch(() => 0);
    let clickedAnyThisPass = false;

    for (let i = 0; i < count && totalAttempts < MAX_CLICK_ATTEMPTS_PER_PAGE; i++) {
      if (Date.now() - phaseStartTime > MAX_PHASE_RUNTIME_MS) break;

      const currentUrl = page.url();
      const locator = page.locator('button, a').nth(i);
      let desc = '(element vanished before it could be described)';

      try {
        const stillThere = await locator.count().catch(() => 0);
        if (!stillThere) continue;

        const tagName = await locator.evaluate((e) => e.tagName.toLowerCase()).catch(() => '');
        const text = await locator.innerText().catch(() => '');
        const href = tagName === 'a' ? await locator.getAttribute('href').catch(() => null) : null;
        desc = `<${tagName}> "${truncate(text, 60) || '(no visible text)'}"`;

        const signature = `${tagName}::${truncate(text, 80)}::${href ?? ''}`;
        if (clickedSignatures.has(signature)) continue;
        clickedSignatures.add(signature);
        totalAttempts++;

        const isVisible = await locator.isVisible().catch(() => false);
        if (!isVisible) {
          skipped.push({ phase: phaseName, page: url, element: desc, reason: 'not visible / not interactable' });
          continue;
        }

        const lowerText = desc.toLowerCase();
        if (DESTRUCTIVE_KEYWORDS.some((kw) => lowerText.includes(kw))) {
          skipped.push({ phase: phaseName, page: url, element: desc, reason: 'matched a destructive-action keyword — skipped for safety' });
          continue;
        }

        if (tagName === 'a' && href) {
          if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
            skipped.push({ phase: phaseName, page: url, element: desc, reason: `${href.split(':')[0]}: link — not clicked` });
            continue;
          }
          if (!isInternal(href) && !href.startsWith('#')) {
            skipped.push({ phase: phaseName, page: url, element: desc, reason: `external link (${truncate(href, 80)}) — not clicked` });
            continue;
          }
        }

        await locator.click({ timeout: CLICK_TIMEOUT_MS });
        clickedAnyThisPass = true;
        if (tagName === 'button') stat.buttonsClicked++;
        if (tagName === 'a') stat.linksClicked++;

        await page.waitForTimeout(SETTLE_MS);

        const newUrl = page.url();
        if (newUrl !== currentUrl) {
          // Whether this was a plain <a href> or a button that called
          // navigate() programmatically, the effect is identical here: the
          // URL changed. Either way, queue it and go back to keep clicking
          // the rest of this page.
          queueIfNew(newUrl);
          const backOk = await page.goBack({ waitUntil: 'domcontentloaded', timeout: 8000 }).then(() => true).catch(() => false);
          if (!backOk || page.url() !== currentUrl) {
            await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 8000 }).catch(() => {});
          }
          await waitForAppSettled(page);
        }
      } catch (e: any) {
        stat.errors++;
        failedClicks.push({ phase: phaseName, page: url, element: desc, reason: truncate(e.message, 200) });
        if (page.url() !== currentUrl) {
          await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 8000 }).catch(() => {});
          await waitForAppSettled(page);
        }
      }
    }

    if (!clickedAnyThisPass) break; // nothing new appeared — no point in another pass
  }

  await collectLinks();
  pageStats.push(stat);
  await context.close();
}

function table(headers: string[], rows: string[][]): string {
  if (rows.length === 0) return '_None found — clean._\n';
  const esc = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
  const head = `| ${headers.join(' | ')} |`;
  const sep = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((r) => `| ${r.map(esc).join(' | ')} |`).join('\n');
  return `${head}\n${sep}\n${body}\n`;
}

function generateReport(phaseSummaries: { name: string; authenticated: boolean; pages: number }[], totalDurationSec: number) {
  const totalClicks = pageStats.reduce((a, p) => a + p.buttonsClicked + p.linksClicked, 0);
  const lines: string[] = [];

  lines.push('# 🕷️ Chaos Crawler QA Report');
  lines.push('');
  lines.push(`**Target:** ${BASE_URL}`);
  lines.push(`**Run finished:** ${new Date().toISOString()}`);
  lines.push(`**Total duration:** ${Math.floor(totalDurationSec / 60)}m ${totalDurationSec % 60}s`);
  lines.push(`**Page limit per phase:** ${PAGE_LIMIT}`);
  lines.push('');

  lines.push('## Phases');
  lines.push('');
  lines.push(table(
    ['Phase', 'Authenticated', 'Pages crawled'],
    phaseSummaries.map((p) => [p.name, p.authenticated ? 'Yes' : 'No', String(p.pages)])
  ));
  lines.push('');
  if (phaseNotes.length > 0) {
    lines.push(phaseNotes.map((n) => `> **${n.phase}:** ${n.note}`).join('\n'));
    lines.push('');
  }

  lines.push('## Overall Summary');
  lines.push('');
  lines.push(table(
    ['Metric', 'Count'],
    [
      ['Pages crawled (all phases)', String(pageStats.length)],
      ['Pages that failed to load', String(loadFailures.length)],
      ['Buttons/links clicked', String(totalClicks)],
      ['Console errors', String(consoleErrors.length)],
      ['Network errors (404/500)', String(networkErrors.length)],
      ['Failed clicks', String(failedClicks.length)],
      ['Elements skipped (safety)', String(skipped.length)],
    ]
  ));
  lines.push('');

  if (loadFailures.length > 0) {
    lines.push('## 🧱 Pages That Failed To Load');
    lines.push('');
    lines.push(table(['Phase', 'URL', 'Reason'], loadFailures.map((f) => [f.phase, f.url, f.reason])));
    lines.push('');
  }

  lines.push('## 🚨 Console Errors');
  lines.push('');
  lines.push(table(['Phase', 'Page', 'Message'], consoleErrors.map((e) => [e.phase, e.page, e.message])));
  lines.push('');

  lines.push('## 🌐 Network Errors (404 / 5xx)');
  lines.push('');
  lines.push(table(['Phase', 'Page', 'Request URL', 'Status'], networkErrors.map((e) => [e.phase, e.page, e.url, String(e.status)])));
  lines.push('');

  lines.push('## 🖱️ Failed Clicks');
  lines.push('');
  lines.push(table(['Phase', 'Page', 'Element', 'Reason'], failedClicks.map((e) => [e.phase, e.page, e.element, e.reason])));
  lines.push('');

  lines.push('## ⏭️ Skipped Elements (safety guardrails)');
  lines.push('');
  lines.push('_External links, mailto:/tel:/javascript: links, and anything matching a destructive-action keyword (logout, delete, remove, ...) are recorded here instead of being clicked._');
  lines.push('');
  lines.push(table(['Phase', 'Page', 'Element', 'Reason'], skipped.map((e) => [e.phase, e.page, e.element, e.reason])));
  lines.push('');

  lines.push('## 📄 Pages Crawled');
  lines.push('');
  lines.push(table(
    ['Phase', 'URL', 'Buttons clicked', 'Links clicked', 'Errors on this page'],
    pageStats.map((p) => [p.phase, p.url, String(p.buttonsClicked), String(p.linksClicked), String(p.errors)])
  ));
  lines.push('');

  const cleanPages = pageStats.filter((p) => p.errors === 0).map((p) => `${p.phase} — ${p.url}`);
  lines.push('## ✅ Clean Pages');
  lines.push('');
  lines.push(cleanPages.length === 0 ? '_None._' : cleanPages.map((u) => `- ${u}`).join('\n'));
  lines.push('');

  const reportPath = path.join(__dirname, 'qa-report.md');
  fs.writeFileSync(reportPath, lines.join('\n'));
  console.log(`\nReport written to ${reportPath}`);
  console.log(`Pages: ${pageStats.length} | Clicks: ${totalClicks} | Console errors: ${consoleErrors.length} | Network errors: ${networkErrors.length} | Failed clicks: ${failedClicks.length} | Skipped: ${skipped.length}`);
}

async function main() {
  const overallStart = Date.now();
  const browser = await chromium.launch();
  const phaseSummaries: { name: string; authenticated: boolean; pages: number }[] = [];

  // Phase A — Unauthenticated
  console.log('\n=== Phase A: Unauthenticated ===');
  const resultA = await crawlPhase(browser, 'A: Unauthenticated', ['/', '/login', '/signup', '/company-signup', '/reset-password', '/data-request'], undefined);
  phaseSummaries.push({ name: 'A: Unauthenticated', authenticated: false, pages: resultA.visitedCount });

  // Phase B — Employer
  console.log('\n=== Phase B: Employer ===');
  if (QA_EMPLOYER_EMAIL && QA_EMPLOYER_PASSWORD) {
    const employerState = await loginAs(browser, QA_EMPLOYER_EMAIL, QA_EMPLOYER_PASSWORD, 'employer');
    if (employerState) {
      const resultB = await crawlPhase(
        browser,
        'B: Employer',
        ['/', '/companies', '/company-dashboard', '/company-hiring/jobs', '/company-hiring/new', '/company-hiring/applicants',
          '/company-referrals/incoming', '/company-referrals/outgoing', '/company-referrals/partners', '/company-referrals/invite',
          '/company-profile/branding', '/company-profile/careers', '/company-profile/team', '/company-profile/integrations',
          '/company-settings/account', '/company-settings/notifications', '/company-settings/help'],
        employerState
      );
      phaseSummaries.push({ name: 'B: Employer', authenticated: true, pages: resultB.visitedCount });
    } else {
      phaseNotes.push({ phase: 'B: Employer', note: 'Login failed — phase skipped. Check QA_EMPLOYER_EMAIL/QA_EMPLOYER_PASSWORD.' });
      phaseSummaries.push({ name: 'B: Employer', authenticated: false, pages: 0 });
    }
  } else {
    console.log('  No QA_EMPLOYER_EMAIL/QA_EMPLOYER_PASSWORD configured — skipping.');
    phaseNotes.push({ phase: 'B: Employer', note: 'Skipped — no employer credentials were provided (set QA_EMPLOYER_EMAIL/QA_EMPLOYER_PASSWORD in .chaos-crawler.env or the environment).' });
    phaseSummaries.push({ name: 'B: Employer', authenticated: false, pages: 0 });
  }

  // Phase C — Job Seeker
  console.log('\n=== Phase C: Job Seeker ===');
  if (QA_EMAIL && QA_PASSWORD) {
    const seekerState = await loginAs(browser, QA_EMAIL, QA_PASSWORD, 'job-seeker');
    const resultC = await crawlPhase(browser, 'C: Job Seeker', ['/', '/create-referral', '/search-results?q=engineer', '/analytics'], seekerState);
    phaseSummaries.push({ name: 'C: Job Seeker', authenticated: Boolean(seekerState), pages: resultC.visitedCount });
  } else {
    console.log('  No QA_EMAIL/QA_PASSWORD configured — skipping.');
    phaseNotes.push({ phase: 'C: Job Seeker', note: 'Skipped — no job-seeker credentials were provided (set QA_EMAIL/QA_PASSWORD in .chaos-crawler.env or the environment).' });
    phaseSummaries.push({ name: 'C: Job Seeker', authenticated: false, pages: 0 });
  }

  await browser.close();
  generateReport(phaseSummaries, Math.round((Date.now() - overallStart) / 1000));
}

main().catch((e) => {
  console.error('Fatal error in chaos-crawler:', e);
  try {
    generateReport([], 0);
  } catch {
    // ignore — the fatal error above is already logged
  }
  process.exit(1);
});
