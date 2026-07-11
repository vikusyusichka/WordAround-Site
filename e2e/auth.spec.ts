import { test, expect } from '@playwright/test';

/* Phase 1 auth flow — UI behavior only; real sign-in/Google are exercised
   manually against the live Firebase project, not in CI. */

test('onboarding "Let’s Start" navigates to /auth', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
  await expect(page).toHaveURL(/\/onboarding/);

  await expect(page.getByRole('heading', { name: 'WordAround' })).toBeVisible();
  await expect(page.getByText('Hola')).toBeVisible();

  await page.getByRole('button', { name: /Let’s Start/ }).click();
  await expect(page).toHaveURL(/\/auth/);
  await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
});

test('empty sign-in submit shows "Email is required"', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('wa.onboarded', '1'));
  await page.goto('/auth');

  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.getByRole('alert')).toHaveText('Email is required');
});

test('malformed email shows "Enter a valid email"', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('wa.onboarded', '1'));
  await page.goto('/auth');

  await page.getByPlaceholder('Enter your email').fill('not-an-email');
  await page.getByPlaceholder('Enter your password').fill('secret1');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.getByRole('alert')).toHaveText('Enter a valid email');
});

test('create account with a short password shows the length error', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('wa.onboarded', '1'));
  await page.goto('/auth');

  await page.getByPlaceholder('Enter your email').fill('someone@example.com');
  await page.getByPlaceholder('Enter your password').fill('12345');
  await page.getByRole('button', { name: 'Create Account' }).click();
  await expect(page.getByRole('alert')).toHaveText('Password must be at least 6 characters');
});
