// End-to-end smoke test: drive the real app in Chromium, build a deck,
// verify the Dobble property from the on-page state, and export a PDF.
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

mkdirSync(fileURLToPath(new URL('../.cache/', import.meta.url)), { recursive: true });

const APP_URL = process.env.URL || 'http://localhost:4188/';
const EXEC = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const shot = (name) => fileURLToPath(new URL(`../.cache/${name}`, import.meta.url));

const browser = await chromium.launch({ executablePath: EXEC });
const ctx = await browser.newContext({
  viewport: { width: 1200, height: 900 },
  acceptDownloads: true,
});
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(APP_URL, { waitUntil: 'networkidle' });

// Clear any persisted deck so the run is deterministic.
await page.evaluate(async () => {
  localStorage.clear();
  await new Promise((res) => {
    const r = indexedDB.deleteDatabase('cardgamebuilder');
    r.onsuccess = r.onerror = r.onblocked = () => res();
  });
});
await page.reload({ waitUntil: 'networkidle' });

// 1) Pick order 3 (needs 13 symbols) on the Deck tab, then fill vocab.
await page.getByRole('button', { name: /Vocabulary/ }).click();
await page.getByRole('button', { name: /Fill to \d+ with samples/ }).click();

// 2) Generate.
await page.getByRole('button', { name: /Generate deck/ }).click();
await page.waitForTimeout(400);

// 3) Read the deck out of localStorage and verify the invariant here.
const deck = await page.evaluate(() => JSON.parse(localStorage.getItem('cardgamebuilder:deck:v1')));
let shared = { min: Infinity, max: -Infinity, bad: 0 };
for (let i = 0; i < deck.cards.length; i++) {
  const si = new Set(deck.cards[i].symbols);
  for (let j = i + 1; j < deck.cards.length; j++) {
    let c = 0;
    for (const s of deck.cards[j].symbols) if (si.has(s)) c++;
    shared.min = Math.min(shared.min, c);
    shared.max = Math.max(shared.max, c);
    if (c !== 1) shared.bad++;
  }
}
const dobbleOK = shared.min === 1 && shared.max === 1 && shared.bad === 0;
console.log(`cards=${deck.cards.length} symbolsPerCard=${deck.cards[0].symbols.length} sharedMin=${shared.min} sharedMax=${shared.max} bad=${shared.bad} -> ${dobbleOK ? 'DOBBLE OK' : 'DOBBLE FAIL'}`);

// 4) Cards render (canvas present with non-blank pixels).
const cardCanvases = await page.locator('canvas').count();
const nonBlank = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  if (!c) return false;
  const ctx = c.getContext('2d');
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  let ink = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 0) ink++;
  return ink > 1000;
});
console.log(`canvasCount=${cardCanvases} rendersInk=${nonBlank}`);
await page.screenshot({ path: shot('cards.png') });

// 5) Export PDF and confirm a real PDF downloads.
await page.getByRole('button', { name: /Print/ }).first().click();
await page.waitForTimeout(200);
const dl = await Promise.all([
  page.waitForEvent('download', { timeout: 30000 }),
  page.getByRole('button', { name: /Download PDF/ }).click(),
]).then((r) => r[0]);
const pdfPath = shot('deck.pdf');
await dl.saveAs(pdfPath);
const head = readFileSync(pdfPath).subarray(0, 5).toString('latin1');
const pdfBytes = readFileSync(pdfPath).length;
console.log(`pdf=${dl.suggestedFilename()} bytes=${pdfBytes} header=${head} -> ${head === '%PDF-' ? 'PDF OK' : 'PDF FAIL'}`);
await page.screenshot({ path: shot('print.png') });

console.log(`consoleErrors=${errors.length}`);
if (errors.length) console.log(errors.slice(0, 8).join('\n'));

const pass = dobbleOK && nonBlank && head === '%PDF-' && errors.length === 0;
await browser.close();
writeFileSync(shot('result.txt'), pass ? 'PASS' : 'FAIL');
console.log(pass ? '\nALL CHECKS PASSED ✔' : '\nCHECKS FAILED ✗');
process.exit(pass ? 0 : 1);
