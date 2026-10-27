// The site's own images (DESIGN §6): the Open Graph image (public/og-image.png,
// 1200 × 630) and the README screenshots (docs/images/). Run it in the CI
// Playwright image whenever the default card or the page's look changes:
//   npm run build && node scripts/site-images.ts
// The OG image is the default front card, exported through the editor's own
// PNG button, centered on the page background. Every file keeps pixel data only.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { preview } from 'vite';
import { stripPng } from './assets.ts';

const OG = { width: 1200, height: 630 };

function save(file: string, png: Buffer) {
  const stripped = stripPng(new Uint8Array(png));
  writeFileSync(file, stripped);
  console.log(`${file}: ${stripped.length} bytes`);
}

const server = await preview({ logLevel: 'warn', preview: { port: 0, open: false } });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, locale: 'en-US', acceptDownloads: true });
  const base = server.resolvedUrls!.local[0]!;

  // README: the top of the page (the profile), then the editor with its default card.
  await page.goto(`${base}?lang=en`);
  await page.evaluate(() => document.fonts.ready);
  mkdirSync('docs/images', { recursive: true });
  save('docs/images/profile.png', await page.screenshot());
  await page.goto(`${base}?lang=en#editor`);
  await page.locator('#ed-png-frente:enabled').waitFor();
  // One screen from the top of the editor: tabs, the start of the panel, both faces.
  await page.locator('#editor').evaluate((el) => el.scrollIntoView({ behavior: 'instant', block: 'start' }));
  save('docs/images/editor.png', await page.screenshot());

  // Open Graph: the exported front card on the page background.
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#ed-png-frente').click()]);
  const card = readFileSync((await download.path())!).toString('base64');
  const og = await browser.newPage({ viewport: OG, deviceScaleFactor: 1 });
  await og.setContent(`<!doctype html>
    <style>
      html, body { margin: 0; width: ${OG.width}px; height: ${OG.height}px; overflow: hidden; }
      body { display: grid; place-items: center; background: #F6F1F7; }
      img { height: ${OG.height - 48}px; border-radius: 18px; box-shadow: 6px 8px 0 0 #FFC8DD; }
    </style>
    <img alt="" src="data:image/png;base64,${card}">`);
  await og.locator('img').evaluate((img: HTMLImageElement) => img.decode());
  save('public/og-image.png', await og.screenshot());
} finally {
  await browser.close();
  await server.close();
}
