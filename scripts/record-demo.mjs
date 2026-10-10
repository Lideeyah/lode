/**
 * Drives the web build through a full session and records it.
 *
 * The motion signal is synthetic — a browser has no accelerometer — but
 * everything it feeds is the real pipeline: the same feature extractor,
 * the same confidence scorer, the same mining loop, and real devnet
 * transactions. The walk is simulated; the verdicts are not.
 */
import { chromium, devices } from 'playwright';
import { readFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const BASE = process.env.LODE_URL ?? 'http://localhost:8099';
const OUT = process.env.LODE_OUT ?? './demo';
const KEYPAIR = process.env.LODE_KEYPAIR;

const phone = devices['Pixel 7'];
const VIEWPORT = { width: 412, height: 915 };

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const step = (n, msg) => console.log(`  [${String(n).padStart(2)}] ${msg}`);

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const context = await browser.newContext({
  ...phone,
  viewport: VIEWPORT,
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  recordVideo: { dir: OUT, size: VIEWPORT },
});

// Seed the wallet before any app code runs, and start the session fresh so
// onboarding is shown.
if (KEYPAIR) {
  const secret = JSON.parse(readFileSync(KEYPAIR, 'utf8'));
  await context.addInitScript((sk) => {
    try {
      localStorage.setItem('lode.web.keypair.v1', JSON.stringify(sk));
      localStorage.removeItem('lode.onboarded.v1');
      localStorage.removeItem('lode.sessions.v1');
    } catch {}
  }, secret);
}

const page = await context.newPage();
page.on('pageerror', (e) => console.log('  !! page error:', e.message.slice(0, 160)));
page.on('console', (m) => {
  if (m.type() === 'error') console.log('  !! console:', m.text().slice(0, 160));
});

const tapText = async (text, timeout = 15000) => {
  // Prefer the real button: react-native-web wraps a Pressable's label in
  // nested divs, so getByText().first() can land on an outer container
  // whose click never reaches the handler.
  // Anchored: a loose /SESSION/i also matches "End session" and "Start
  // session", so tapping the tab bar was hitting the wrong control.
  const exact = new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');
  const byRole = page.getByRole('button', { name: exact }).first();
  const el = (await byRole.count()) > 0
    ? byRole
    : page.getByText(text, { exact: false }).first();
  await el.waitFor({ state: 'visible', timeout });
  // react-native-web renders ScrollView as an overflow div, and controls
  // below the fold are "visible" to Playwright while still off-screen, so
  // scroll explicitly rather than trusting auto-scroll.
  await el.scrollIntoViewIfNeeded().catch(() => {});
  await wait(400);
  await el.tap({ force: true }).catch(async () => { await el.click({ force: true }); });
};

/**
 * Tabs render as <a role="tab">, not buttons, so they need their own
 * locator. Matching them by loose text instead hit "End session" and
 * "Start session", which silently drove the wrong control.
 */
const tapTab = async (name, timeout = 15000) => {
  const el = page.getByRole('tab', { name: new RegExp(`^\\s*${name}\\s*$`, 'i') }).first();
  await el.waitFor({ state: 'visible', timeout });
  await el.click({ force: true });
};

/** True once the given text appears, without throwing if it never does. */
const sees = async (text, timeout = 8000) =>
  page.getByText(text, { exact: false }).first()
    .waitFor({ state: 'visible', timeout }).then(() => true).catch(() => false);

const setMotion = (mode) => page.evaluate((m) => { window.__lodeMotion = m; }, mode);

const readout = async () => page.evaluate(() => {
  const txt = document.body.innerText;
  return txt.replace(/\n{2,}/g, ' | ').slice(0, 180);
});

console.log('Recording Lode demo');
console.log('  url:', BASE);

// ---- Onboarding --------------------------------------------------------
step(1, 'cold open on first run');
await page.goto(BASE, { waitUntil: 'networkidle' });
await wait(4500);

for (const label of ['Next', 'Next']) {
  step(2, `advance onboarding (${label})`);
  await tapText(label);
  await wait(5000);
}

step(3, 'connect wallet');
await tapText('Connect wallet');
await wait(4000);

// ---- Home --------------------------------------------------------------
step(4, 'home at rest');
await wait(4000);
console.log('      ', await readout());

// ---- Session -----------------------------------------------------------
await setMotion('walking');
step(5, 'start session');
await tapText('Start session');
await wait(9000);
console.log('       warming:', await readout());

step(6, 'walking — confidence climbing, effort accruing');
await wait(22000);
console.log('       active:', await readout());

// ---- Verification ------------------------------------------------------
step(7, 'open verification tab');
await tapTab('VERIFY');
await wait(9000);

step(8, 'shake the phone — the classifier should reject it');
await setMotion('shaking');
await wait(18000);
console.log('       shaking:', await readout());

step(9, 'resume walking — it should recover');
await setMotion('walking');
await wait(14000);

// ---- Close out ---------------------------------------------------------
step(10, 'back to session');
await tapTab('SESSION');
await wait(6000);

step(11, 'end session');
await tapText('End session');
await wait(3000);
if (!(await sees('Session complete', 6000))) {
  console.log('      summary did not open; retrying');
  await tapText('End session').catch(() => {});
  await wait(4000);
}
console.log('       on summary:', await sees('Session complete', 3000));

step(12, 'sign the effort claim and submit');
await tapText('Sign claim and submit').catch(() => console.log('      (submit unavailable)'));
await wait(16000);
console.log('       summary:', await readout());

step(13, 'reward landing');
await wait(7000);

step(14, 'history');
await tapText('Done').catch(() => {});
await wait(3000);
await tapTab('HISTORY').catch(() => {});
await wait(6000);

await context.close();
await browser.close();
console.log('done — video written to', OUT);
