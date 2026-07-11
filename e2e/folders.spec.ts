import { test, expect } from '@playwright/test';

/* Folder routes are auth-gated (under the _authed shell). Logged out, they must
   redirect to /auth. Authenticated CRUD is verified via the browser MCP against
   the real Firebase project, not in CI. */

for (const route of ['/folders/new', '/folders/some-id']) {
  test(`logged-out visit to ${route} redirects to /auth`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('wa.onboarded', '1'));
    await page.goto(route);
    await expect(page).toHaveURL(/\/auth/);
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
  });
}
