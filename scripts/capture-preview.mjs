import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
await mkdir('docs/screenshots', { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
  await page.goto('http://localhost:8081');
  await page.getByText('Good food. Less guesswork.').waitFor();
  await page.screenshot({ path: 'docs/screenshots/desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'docs/screenshots/phone.png' });
  await page.getByRole('button', { name: 'Try a sample snap', exact: true }).last().click();
  await page.getByLabel('Memory name', { exact: true }).waitFor();
  await page.screenshot({ path: 'docs/screenshots/review-phone.png' });
  await page.setViewportSize({ width: 1250, height: 950 });
  await page.screenshot({ path: 'docs/screenshots/review-desktop.png' });
} finally {
  await browser.close();
}
