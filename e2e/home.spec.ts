import { test, expect } from '@playwright/test';

/* The whole signed-in area lives under the `_authed` shell layout, which is
   auth-gated. Logged out, every authed route must redirect to /auth. The
   authenticated shell (sidebar nav, URL changes, deep-links, back/forward) is
   verified via the browser MCP with a session override, not in CI. */

const authedRoutes = ['/home', '/folders', '/sets', '/practice/reading', '/profile'];

for (const route of authedRoutes) {
  test(`logged-out visit to ${route} redirects to /auth`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('wa.onboarded', '1'));
    await page.goto(route);
    await expect(page).toHaveURL(/\/auth/);
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
  });
}
