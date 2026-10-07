import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1024, height: 1024 },
    deviceScaleFactor: 1,
  });
  const svg = await readFile(new URL('../assets/icon.svg', import.meta.url), 'utf8');
  await page.setContent(
    `<style>body{margin:0}svg{display:block;width:100vw;height:100vh}</style>${svg}`,
  );
  await page.screenshot({ path: 'assets/icon.png' });
  await page.setViewportSize({ width: 64, height: 64 });
  await page.screenshot({ path: 'assets/favicon.png' });
} finally {
  await browser.close();
}
