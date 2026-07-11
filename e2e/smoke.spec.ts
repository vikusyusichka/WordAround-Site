import { test, expect } from '@playwright/test';

test('onboarding gate shows the hero for a first-time visitor', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
  await expect(page).toHaveURL(/\/onboarding/);
  await expect(page.getByRole('heading', { name: /WordAround/i })).toBeVisible();
});
