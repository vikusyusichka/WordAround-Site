import { test, expect } from '@playwright/test';

/* Writing routes are auth-gated. Logged out → /auth. Authenticated flow
   (SetSelection → WriteWords game) is verified via the browser MCP against
   the live Firebase project, not in CI. */

for (const route of [
  '/practice/writing',
  '/practice/writing/write-words/some-id',
  '/practice/writing/essays',
  '/practice/writing/grammar',
  '/practice/writing/grammar/topic-id/note-id/quiz',
  '/practice/writing/grammar/review',
  '/practice/reading',
  '/practice/reading/my-texts',
  '/practice/reading/my-texts/new',
  '/practice/reading/from-sets',
  '/practice/reading/speed',
  '/practice/reading/story',
  '/practice/listening',
  '/practice/listening/from-text',
  '/practice/listening/import-audio',
  '/practice/listening/import-video',
  '/practice/listening/saved',
  '/practice/speaking',
  '/practice/speaking/conversation',
  '/practice/speaking/free',
]) {
  test(`logged-out visit to ${route} redirects to /auth`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('wa.onboarded', '1'));
    await page.goto(route);
    await expect(page).toHaveURL(/\/auth/);
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
  });
}
