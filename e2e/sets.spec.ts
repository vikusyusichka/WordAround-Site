import { test, expect } from '@playwright/test';

/* Set routes are auth-gated. Logged out → /auth. Authenticated create/list is
   verified via the browser MCP against the live Firebase project, not in CI. */

for (const route of ['/sets/new', '/sets/some-id']) {
  test(`logged-out visit to ${route} redirects to /auth`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('wa.onboarded', '1'));
    await page.goto(route);
    await expect(page).toHaveURL(/\/auth/);
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
  });
}
