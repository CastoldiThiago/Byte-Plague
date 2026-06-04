import { chromium } from 'playwright';

const browser = await chromium.launch({
  headless: false,
  args: ['--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist']
});

const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();

page.on('console', m => console.log('[console]', m.type(), m.text()));
page.on('pageerror', e => console.log('[error]', e.message));

await page.goto('http://localhost:5173');
await page.waitForTimeout(3000);
await page.screenshot({ path: 'C:/Users/casto/AppData/Local/Temp/game_initial.png' });
console.log('Screenshot 1: initial load');

// Click para activar el juego
await page.click('canvas');
await page.waitForTimeout(2000);
await page.screenshot({ path: 'C:/Users/casto/AppData/Local/Temp/game_after_click.png' });
console.log('Screenshot 2: after click');

await browser.close();
