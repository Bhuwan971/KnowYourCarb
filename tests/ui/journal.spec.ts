import { test, expect } from '@playwright/test';
test('manual fractional portions persist, update totals, and can be deleted', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: /Good (morning|afternoon|evening)/ }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Add carbs manually', exact: true }).click();
  await page.getByLabel('Memory name', { exact: true }).fill('Lunch with rice');
  await page.getByLabel('Food 1 name', { exact: true }).fill('Cooked rice');
  await page.getByLabel('Food 1 portion', { exact: true }).fill('100 g');
  await expect(page.getByRole('button', { name: 'Save memory', exact: true })).toBeDisabled();
  await page.getByLabel('Food 1 carbs (g / portion)', { exact: true }).fill('28.2');
  // Portions eaten step by a quarter: 1 → 1.5.
  await page.getByRole('button', { name: 'More of Cooked rice', exact: true }).click();
  await page.getByRole('button', { name: 'More of Cooked rice', exact: true }).click();
  await page.getByRole('button', { name: 'Save memory', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Open Lunch with rice', exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Open Lunch with rice', exact: true }).click();
  await expect(page.getByText('100 g · ×1½', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'More of Cooked rice', exact: true }).click();
  await page.getByRole('button', { name: 'More of Cooked rice', exact: true }).click();
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.getByRole('tab', { name: 'Snap a meal', exact: true }).click();
  await expect(page.getByText('56.4', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Memories', exact: true }).click();
  await page.getByRole('button', { name: 'Open Lunch with rice', exact: true }).click();
  await page.getByRole('button', { name: 'Remove memory', exact: true }).click();
  await page.getByRole('button', { name: 'Keep my memory', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Remove memory', exact: true }).click();
  await page.getByRole('button', { name: 'Yes, remove this memory', exact: true }).click();
  await expect(
    page.getByText('Your first memory starts here.').filter({ visible: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test('sample snap animates, stores a memory, and stays out of real totals', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try a sample snap', exact: true }).last().click();
  await expect(page.getByText('Reading your plate…')).toBeVisible();
  await expect(page.getByText('A bowl of good things', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save memory', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Open A bowl of good things', exact: true }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Snap a meal', exact: true }).click();
  await expect(page.getByText('0', { exact: true }).filter({ visible: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Memories', exact: true }).click();
  await page.getByLabel('Search memories', { exact: true }).fill('does not exist');
  await expect(page.getByText('No little matches yet.').filter({ visible: true })).toBeVisible();
  await page.getByRole('button', { name: 'Show all memories', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Open A bowl of good things', exact: true }),
  ).toBeVisible();
});
test('imported photo persists after reload; discarded snaps do not save', async ({ page }) => {
  await page.goto('/');
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import a food photo', exact: true }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles('assets/bowl.jpg');
  await expect(page.getByText('Add nutrition from a label.')).toBeVisible();
  await page.getByLabel('Memory name', { exact: true }).fill('My photo lunch');
  await page.getByLabel('Food 1 name', { exact: true }).fill('Lunch');
  await page.getByLabel('Food 1 carbs (g / portion)', { exact: true }).fill('35');
  await page.getByRole('button', { name: 'Save memory', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Open My photo lunch', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Food photo', exact: true })).toHaveAttribute(
    'src',
    /^data:image\/jpeg;base64,/,
  );
  await page.getByRole('button', { name: 'Back to memories', exact: true }).click();
  await page.getByRole('tab', { name: 'Snap a meal', exact: true }).click();
  await page.getByRole('button', { name: 'Add carbs manually', exact: true }).click();
  await page.getByLabel('Memory name', { exact: true }).fill('Unsaved meal');
  await page.getByRole('button', { name: 'Discard snap', exact: true }).last().click();
  await page.getByRole('tab', { name: 'Memories', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open Unsaved meal', exact: true })).toHaveCount(0);
});
test('preferences persist and all main screens fit the viewport', async ({ page }, testInfo) => {
  await page.goto('/');
  for (const tab of ['Snap a meal', 'Memories', 'Your rhythm', 'Your space']) {
    await page.getByRole('tab', { name: tab, exact: true }).click();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/${testInfo.project.name}-${tab.replaceAll(' ', '-')}.png`,
    });
  }
  await page.getByLabel('What should we call you?', { exact: true }).fill('Alex');
  await page.getByLabel('Daily carb reference (optional)', { exact: true }).fill('150');
  await page.getByRole('button', { name: 'Save preferences', exact: true }).click();
  await page.reload();
  await expect(page.getByLabel('What should we call you?', { exact: true })).toHaveValue('Alex');
  await expect(page.getByLabel('Daily carb reference (optional)', { exact: true })).toHaveValue(
    '150',
  );
  await page.getByRole('tab', { name: 'Snap a meal', exact: true }).click();
  await expect(page.getByText(/Good (morning|afternoon|evening), Alex/)).toBeVisible();
});
