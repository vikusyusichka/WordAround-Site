import { test, expect } from '@playwright/test';

/* Auth flow — UI behavior only; real sign-in/Google/email links are exercised
   manually against the live Firebase project, not in CI. */

test('onboarding "Let’s Start" navigates to the sign-in screen', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
  await expect(page).toHaveURL(/\/onboarding/);

  await expect(page.getByRole('heading', { name: 'WordAround' })).toBeVisible();
  await expect(page.getByText('Hola')).toBeVisible();

  await page.getByRole('button', { name: /Let’s Start/ }).click();
  await expect(page).toHaveURL(/\/auth\/sign-in/);
  await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
});

test('/auth redirects to the sign-in screen', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('wa.onboarded', '1'));
  await page.goto('/auth');
  await expect(page).toHaveURL(/\/auth\/sign-in/);
});

test('the tabs switch between signing in and signing up', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('wa.onboarded', '1'));
  await page.goto('/auth/sign-in');

  await page.getByRole('link', { name: 'Sign up' }).click();
  await expect(page).toHaveURL(/\/auth\/sign-up/);
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
  /* The name field only exists on sign-up — that is the whole point of the split. */
  await expect(page.getByPlaceholder('What should we call you?')).toBeVisible();

  await page.getByRole('link', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/auth\/sign-in/);
});

test('empty sign-in submit reports the missing email on the field', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('wa.onboarded', '1'));
  await page.goto('/auth/sign-in');

  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.getByRole('alert').first()).toHaveText('Email is required');
  await expect(page.getByText('Password is required')).toBeVisible();
});

test('malformed email shows "Enter a valid email"', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('wa.onboarded', '1'));
  await page.goto('/auth/sign-in');

  await page.getByPlaceholder('Enter your email').fill('not-an-email');
  await page.getByPlaceholder('Enter your password').fill('secret1');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.getByRole('alert').first()).toHaveText('Enter a valid email');
});

test('sign-up rejects a password under 8 characters', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('wa.onboarded', '1'));
  await page.goto('/auth/sign-up');

  await page.getByPlaceholder('What should we call you?').fill('Anna');
  await page.getByPlaceholder('Enter your email').fill('someone@example.com');
  await page.getByPlaceholder('Enter your password').fill('1234567');
  await page.getByRole('button', { name: 'Create Account' }).click();
  await expect(page.getByRole('alert').first()).toHaveText(
    'Password must be at least 8 characters',
  );
});

test('the sign-in screen links to passwordless sign-in', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('wa.onboarded', '1'));
  await page.goto('/auth/sign-in');

  await page.getByRole('link', { name: 'Sign in with an email link' }).click();
  await expect(page).toHaveURL(/\/auth\/link/);
  await expect(page.getByRole('heading', { name: 'Sign in with a link' })).toBeVisible();
});
