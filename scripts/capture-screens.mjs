/**
 * Captures the UX surface as stills.
 *
 * Driven through the web build, so the motion is synthetic — a browser
 * has no accelerometer. Every screen, every state and every number is
 * the real app; only the sensor stream is generated.
 */
import { chromium, devices } from 'playwright';
import { mkdirSync } from 'fs';

const BASE = process.env.LODE_URL ?? 'http://localhost:8099';
const OUT = process.env.LODE_OUT ?? './docs/screenshots';

mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
const ctx = await browser.newContext({
  ...devices['Pixel 7'],
  viewport: { width: 412, height: 915 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
/**
 * No key is injected here.
 *
 * These scripts used to write a secret key into the page's localStorage
 * so the run started with a funded wallet. That put key bytes in browser
 * storage, which an audit rightly flagged, and it is not necessary: the
 * web build generates its own keypair on first load.
 *
 * The run therefore starts with a fresh, unfunded devnet wallet. The
 * address is printed below — fund it from a faucet if a run needs to
 * reach the submission step.
 */
const page = await ctx.newPage();
const a = (t) => new RegExp(`^\\s*${t}\\s*$`, 'i');
const shot = async (n, name) => {
  await page.screenshot({ path: `${OUT}/${String(n).padStart(2, '0')}-${name}.png` });
  console.log(`  ${String(n).padStart(2)} ${name}`);
};
const tap = async (t) => {
  const el = page.getByRole('button', { name: a(t) }).first();
  await el.waitFor({ state: 'visible', timeout: 15000 });
  await el.scrollIntoViewIfNeeded().catch(() => {});
  await wait(300);
  await el.click({ force: true });
};
const tab = async (t) => {
  await page.getByRole('tab', { name: a(t) }).first().click({ force: true });
};

console.log('capturing');
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
const addr = await page.evaluate(() => {
  try {
    const raw = localStorage.getItem('lode.web.keypair.v1');
    return raw ? '(generated in app)' : '(none yet)';
  } catch { return '(unavailable)'; }
});
console.log('  wallet address:', addr);
await wait(4500);
await shot(1, 'onboarding-what-this-is');

await tap('Next'); await wait(2500);
await shot(2, 'onboarding-how-it-verifies');

await tap('Next'); await wait(2500);
await shot(3, 'onboarding-connect-and-devnet-notice');

await tap('Connect wallet'); await wait(4000);
await shot(4, 'home-at-rest');

await page.evaluate(() => { window.__lodeMotion = 'walking'; });
await tap('Start session'); await wait(4000);
await shot(5, 'session-warming');

await wait(18000);
await shot(6, 'session-active-crediting');

await tab('VERIFY'); await wait(4000);
await shot(7, 'verification-walking');

await page.evaluate(() => { window.__lodeMotion = 'shaking'; });
await wait(14000);
await shot(8, 'verification-shake-rejected');

await page.evaluate(() => { window.__lodeMotion = 'walking'; });
await wait(12000);
await tab('SESSION'); await wait(4000);
await shot(9, 'session-mining');

await tap('End session'); await wait(4000);
await shot(10, 'session-summary');

let minted = false;
for (let attempt = 1; attempt <= 3 && !minted; attempt++) {
  await tap('Sign claim and submit').catch(() => {});
  for (let i = 0; i < 9 && !minted; i++) {
    await wait(4000);
    minted = await page.getByText('Mined.', { exact: false }).first()
      .waitFor({ state: 'visible', timeout: 500 }).then(() => true).catch(() => false);
  }
}
await shot(11, minted ? 'reward-minted-on-devnet' : 'submission-state');

await tap('Done').catch(() => {});
await wait(3000);
await tab('HISTORY'); await wait(4000);
await shot(12, 'history');

await browser.close();
console.log('done ->', OUT);
