import { test, expect, Page } from '@playwright/test';
const estimate = {
  title: 'Quinoa and greens',
  items: [
    { name: 'Cooked quinoa', portion: '1 cup', carbs: 39.4, calories: 222 },
    { name: 'Vegetables', portion: '1 cup', carbs: 8, calories: 50 },
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
  await expect(page.getByLabel('Memory name', { exact: true })).toHaveValue(estimate.title);
  await expect(page.getByLabel('Food 1 calories (kcal / portion)', { exact: true })).toHaveValue(
    '222',
  );
  await expect(page.getByText('272 kcal', { exact: true })).toBeVisible();
  await page.getByLabel('Food 1 calories (kcal / portion)', { exact: true }).fill('230');
  await page.getByLabel('Food 1 portions eaten', { exact: true }).fill('1.5');
  await expect(page.getByText('395 kcal', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save memory', exact: true })).toBeDisabled();
  await page
    .getByRole('checkbox', { name: 'I checked the portions and nutrition estimates', exact: true })
    .click();
  await page.getByRole('button', { name: 'Save memory', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Open Quinoa and greens', exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Open Quinoa and greens', exact: true }).click();
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
