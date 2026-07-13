import { test, expect } from '@playwright/test';

/* Writing routes are auth-gated. Logged out → /auth. Authenticated flow
   (SetSelection → WriteWords game) is verified via the browser MCP against
   the live Firebase project, not in CI. */

for (const route of [
  '/practice/writing',
  '/practice/writing/write-words/some-id',
  '/practice/writing/essays',
]) {
  test(`logged-out visit to ${route} redirects to /auth`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('wa.onboarded', '1'));
    await page.goto(route);
    await expect(page).toHaveURL(/\/auth/);
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
  });
}
