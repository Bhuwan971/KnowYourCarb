import { test, expect, Page } from '@playwright/test';
const estimate = {
  title: 'Quinoa and greens',
  items: [
    {
      name: 'Cooked quinoa',
      portion: '1 cup',
      carbs: 39.4,
      calories: 222,
      portionGrams: 185,
      protein: 8.1,
      fat: 3.6,
      sugar: 1.6,
      fiber: 5.2,
      carbsRange: { min: 32, max: 47 },
    },
    {
      name: 'Vegetables',
      portion: '1 cup',
      carbs: 8,
      calories: 50,
      protein: 2,
      fat: 1,
      sugar: 3,
      fiber: 2,
      carbsRange: { min: 6, max: 10 },
    },
  ],
  uncertainty: 'Quinoa portion and dressing are approximate.',
};
async function importPhoto(page: Page) {
  await page.goto('/');
  const picker = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import a food photo', exact: true }).click();
  await (await picker).setFiles('assets/bowl.jpg');
}
test('import automatically fills nutrition; edits and portions persist without rescanning saved meals', async ({
  page,
}) => {
  let uploads = 0;
  await page.route('**/analyze', async (route) => {
    uploads += 1;
    const request = route.request().postDataJSON();
    expect(request.mimeType).toBe('image/jpeg');
    expect(request.image.length).toBeGreaterThan(100);
    await route.fulfill({ json: estimate });
  });
  await importPhoto(page);
  await expect(page.getByText(estimate.title, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit meal details', exact: true }).click();
  await expect(page.getByLabel('Memory name', { exact: true })).toHaveValue(estimate.title);
  await expect(page.getByLabel('Food 1 calories (kcal / portion)', { exact: true })).toHaveValue(
    '222',
  );
  await expect(page.getByText('272 kcal', { exact: true })).toBeVisible();
  await page.getByLabel('Food 1 calories (kcal / portion)', { exact: true }).fill('230');
  await page.getByLabel('Food 1 portions eaten', { exact: true }).fill('1.5');
  await expect(page.getByText('395 kcal', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save memory', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Save memory', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Open Quinoa and greens', exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Open Quinoa and greens', exact: true }).click();
  await page.getByRole('button', { name: 'Edit meal details', exact: true }).click();
  await expect(page.getByLabel('Food 1 calories (kcal / portion)', { exact: true })).toHaveValue(
    '230',
  );
  await expect(page.getByLabel('Food 1 portions eaten', { exact: true })).toHaveValue('1.5');
  expect(uploads).toBe(1);
});
test('camera shutter automatically scans a captured photo', async ({ page, context }) => {
  await context.grantPermissions(['camera']);
  let uploads = 0;
  await page.route('**/analyze', async (route) => {
    uploads += 1;
    await route.fulfill({ json: estimate });
  });
  await page.goto('/');
  await expect(page.getByText('YOUR PLATE, IN FOCUS')).toBeVisible();
  const shutter = page.getByRole('button', { name: 'Snap a meal', exact: true });
  await expect(shutter).toBeEnabled();
  await expect
    .poll(() => page.locator('video').evaluate((video: HTMLVideoElement) => video.readyState))
    .toBe(4);
  await shutter.click();
  await expect(page.getByText(estimate.title, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit meal details', exact: true }).click();
  await expect(page.getByLabel('Memory name', { exact: true })).toHaveValue(estimate.title);
  await expect(page.getByText('272 kcal', { exact: true })).toBeVisible();
  expect(uploads).toBe(1);
});
test('service failure preserves the photo and manual review; retry fills nutrition', async ({
  page,
}) => {
  let uploads = 0;
  await page.route('**/analyze', (route) => {
    uploads += 1;
    return uploads === 1
      ? route.fulfill({ status: 503, json: { error: 'The photo service is unavailable.' } })
      : route.fulfill({ json: estimate });
  });
  await importPhoto(page);
  await expect(page.getByRole('alert')).toContainText('The photo service is unavailable.');
  await expect(page.getByRole('img', { name: 'Food photo', exact: true })).toHaveAttribute(
    'src',
    /^data:image\/jpeg;base64,/,
  );
  await page.getByLabel('Memory name', { exact: true }).fill('My label lunch');
  await page.getByLabel('Food 1 name', { exact: true }).fill('Lunch');
  await page.getByLabel('Food 1 carbs (g / portion)', { exact: true }).fill('32');
  await expect(page.getByRole('button', { name: 'Save memory', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Retry scan', exact: true }).click();
  await expect(page.getByText(estimate.title, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit meal details', exact: true }).click();
  await expect(page.getByLabel('Memory name', { exact: true })).toHaveValue(estimate.title);
  await expect(page.getByLabel('Food 1 calories (kcal / portion)', { exact: true })).toHaveValue(
    '222',
  );
  expect(uploads).toBe(2);
});
test('cancelled scan cannot overwrite manual edits, and a fresh retry still works', async ({
  page,
}) => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let uploads = 0;
  await page.route('**/analyze', async (route) => {
    uploads += 1;
    if (uploads === 1) await pending;
    await route.fulfill({ json: estimate }).catch(() => {});
  });
  await importPhoto(page);
  await expect.poll(() => uploads).toBe(1);
  await page.getByRole('button', { name: 'Cancel and review manually', exact: true }).click();
  await page.getByLabel('Memory name', { exact: true }).fill('My manual lunch');
  await page.getByLabel('Food 1 name', { exact: true }).fill('Rice');
  await page.getByLabel('Food 1 carbs (g / portion)', { exact: true }).fill('32');
  release();
  await expect(page.getByLabel('Memory name', { exact: true })).toHaveValue('My manual lunch');
  await page.getByRole('button', { name: 'Retry scan', exact: true }).click();
  await expect(page.getByText(estimate.title, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit meal details', exact: true }).click();
  await expect(page.getByLabel('Memory name', { exact: true })).toHaveValue(estimate.title);
  expect(uploads).toBe(2);
});
test('incomplete calorie results fall back to editable manual nutrition', async ({ page }) => {
  await page.route('**/analyze', (route) =>
    route.fulfill({
      json: {
        ...estimate,
        items: [{ name: 'Quinoa', portion: '1 cup', carbs: 39.4 }],
      },
    }),
  );
  await importPhoto(page);
  await expect(page.getByRole('alert')).toContainText('The estimate was incomplete.');
  await page.getByLabel('Memory name', { exact: true }).fill('Manual quinoa');
  await page.getByLabel('Food 1 name', { exact: true }).fill('Quinoa');
  await page.getByLabel('Food 1 carbs (g / portion)', { exact: true }).fill('39.4');
  await page.getByLabel('Food 1 calories (kcal / portion)', { exact: true }).fill('222');
  await page.getByRole('button', { name: 'Save memory', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open Manual quinoa', exact: true })).toBeVisible();
});

test('a stalled scan times out, preserves manual edits and allows a fresh retry', async ({
  page,
}) => {
  await page.clock.install();
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let uploads = 0;
  await page.route('**/analyze', async (route) => {
    uploads += 1;
    if (uploads === 1) await pending;
    await route.fulfill({ json: estimate }).catch(() => {});
  });
  await importPhoto(page);
  await expect.poll(() => uploads).toBe(1);
  await page.clock.fastForward(15_000);
  await expect(
    page.getByText('Still waiting for your estimate. You can review manually below.'),
  ).toBeVisible();
  await page.clock.fastForward(30_001);
  await expect(page.getByRole('alert')).toContainText('That estimate took too long.');
  await expect(page.getByText('Reading your plate…')).toHaveCount(0);
  await expect(page.getByRole('img', { name: 'Food photo', exact: true })).toBeVisible();
  await page.getByLabel('Memory name', { exact: true }).fill('My manual lunch');
  release();
  await expect(page.getByLabel('Memory name', { exact: true })).toHaveValue('My manual lunch');
  await page.getByRole('button', { name: 'Retry scan', exact: true }).click();
  await expect(page.getByText(estimate.title, { exact: true })).toBeVisible();
  expect(uploads).toBe(2);
});

test('scan results stay minimal; extra nutrients, portion corrections and unknown values persist', async ({
  page,
}) => {
  await page.route('**/analyze', (route) => route.fulfill({ json: estimate }));
  await importPhoto(page);
  await expect(page.getByText(estimate.title, { exact: true })).toBeVisible();
  await expect(page.getByText('Your scan is ready.')).toHaveCount(0);
  await expect(page.getByLabel('Memory name', { exact: true })).toHaveCount(0);
  await expect(page.getByText('10.1 g', { exact: true })).toBeVisible();
  await expect(page.getByText('Estimated carbs: 38–57 g')).toBeVisible();
  await page.screenshot({ path: 'test-results/ai/clean-scan-phone.png', fullPage: true });
  await page.getByRole('button', { name: 'More nutrition', exact: true }).click();
  await expect(
    page.getByText('Sugar', { exact: true }).locator('..').getByText('4.6 g', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('— means unknown. Sugar and fiber are included in total carbs.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Edit meal details', exact: true }).click();
  await page.getByLabel('Food 1 weight (g)', { exact: true }).fill('92.5');
  await expect(page.getByLabel('Food 1 carbs (g / portion)', { exact: true })).toHaveValue('19.7');
  await expect(page.getByText('161 kcal', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'More nutrients for food 1', exact: true }).click();
  await expect(page.getByLabel('Food 1 sugar (g / portion)', { exact: true })).toHaveValue('0.8');
  await page.getByLabel('Food 1 sugar (g / portion)', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Save memory', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Open Quinoa and greens', exact: true }).click();
  await page.getByRole('button', { name: 'More nutrition', exact: true }).click();
  await expect(page.getByText('4 g', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.getByRole('button', { name: 'More nutrition', exact: true }).click();
  await page.screenshot({ path: 'test-results/ai/clean-scan-desktop.png', fullPage: true });
});
