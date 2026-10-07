import { test, expect } from '@playwright/test';
async function importPhoto(page: import('@playwright/test').Page) {
  await page.goto('/');
  const picker = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import a food photo', exact: true }).click();
  await (await picker).setFiles('assets/bowl.jpg');
  await expect(
    page.getByRole('button', { name: 'Estimate this photo', exact: true }),
  ).toBeVisible();
}
test('photo estimates need explicit upload and portion confirmation', async ({ page }) => {
  let uploads = 0;
  await page.route('**/analyze', async (route) => {
    uploads += 1;
    const request = route.request().postDataJSON();
    expect(request.mimeType).toBe('image/jpeg');
    expect(request.image.length).toBeGreaterThan(100);
    await route.fulfill({
      json: {
        title: 'Quinoa and greens',
        items: [
          { name: 'Cooked quinoa', portion: '1 cup', carbs: 39.4 },
          { name: 'Vegetables', portion: '1 cup', carbs: 8 },
        ],
        uncertainty: 'Quinoa portion and dressing are approximate.',
      },
    });
  });
  await importPhoto(page);
  expect(uploads).toBe(0);
  await page.getByRole('button', { name: 'Estimate this photo', exact: true }).click();
  await expect(page.getByLabel('Memory name', { exact: true })).toHaveValue('Quinoa and greens');
  await expect(page.getByRole('button', { name: 'Save memory', exact: true })).toBeDisabled();
  await page
    .getByRole('checkbox', { name: 'I checked the portions and carb estimates', exact: true })
    .click();
  await page.getByRole('button', { name: 'Save memory', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Open Quinoa and greens', exact: true }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Snap a meal', exact: true }).click();
  await expect(page.getByText('47.4', { exact: true }).filter({ visible: true })).toBeVisible();
  expect(uploads).toBe(1);
});
test('service failure preserves the photo and manual review', async ({ page }) => {
  await page.route('**/analyze', (route) =>
    route.fulfill({
      status: 503,
      json: {
        error: 'Photo estimates aren’t connected yet. Add the carbs yourself and keep your snap.',
      },
    }),
  );
  await importPhoto(page);
  await page.getByRole('button', { name: 'Estimate this photo', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Photo estimates aren’t connected yet.');
  await expect(page.getByRole('img', { name: 'Food photo', exact: true })).toHaveAttribute(
    'src',
    /^data:image\/jpeg;base64,/,
  );
  await page.getByLabel('Memory name', { exact: true }).fill('My label lunch');
  await page.getByLabel('Food 1 name', { exact: true }).fill('Lunch');
  await page.getByLabel('Food 1 carbs (g / portion)', { exact: true }).fill('32');
  await page.getByRole('button', { name: 'Save memory', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Open My label lunch', exact: true }),
  ).toBeVisible();
});
