// Opens one page of the running dev server in headless Chromium at iPhone size,
// waits for some text, screenshots it and prints the page text plus any errors.
//
//   node .claude/skills/run-app/drive.cjs <out-dir> <url> [text-to-wait-for]
//
// space.localhost (the Church Space address) is pointed at 127.0.0.1 here.
const { chromium } = require('playwright');

const [outDir, url, waitText] = process.argv.slice(2);
if (!outDir || !url) {
  console.error('usage: drive.cjs <out-dir> <url> [text-to-wait-for]');
  process.exit(2);
}

(async () => {
  const browser = await chromium.launch({
    args: ['--no-sandbox', '--host-resolver-rules=MAP space.localhost 127.0.0.1'],
  });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)); });
  page.on('requestfailed', (r) => errors.push('request failed: ' + r.url().slice(0, 120) + ' ' + (r.failure()?.errorText || '')));

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  if (waitText) await page.getByText(waitText).first().waitFor({ timeout: 30000 });
  else await page.waitForTimeout(8000);

  const name = new URL(url).hostname.replace(/\W+/g, '-') + new URL(url).pathname.replace(/\W+/g, '-');
  const shot = `${outDir}/${name.replace(/-+$/, '')}.png`;
  await page.screenshot({ path: shot });
  const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 500);
  console.log(`== ${page.url()}\nscreenshot: ${shot}\ntext: ${text}\nerrors (${errors.length}):\n${errors.slice(0, 15).join('\n')}`);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
