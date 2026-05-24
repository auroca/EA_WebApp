import { expect, test } from '@playwright/test';

test('login form validates required email and password steps', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByText('Please enter an email address.')).toBeVisible();

  await page.getByPlaceholder('email@domain.com').fill('judit@example.com');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();

  await expect(page.getByPlaceholder('Password')).toBeVisible();

  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Please enter a password.')).toBeVisible();
});

test('register form validates weak passwords and password confirmation', async ({ page }) => {
  await page.goto('/register');

  await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible();

  await page.getByPlaceholder('email@domain.com').fill('judit@example.com');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();

  await page.getByPlaceholder('First name').fill('Judit');
  await page.getByPlaceholder('Last name').fill('Test');
  await page.getByPlaceholder('Username').fill('judit');
  await page.getByPlaceholder('Password', { exact: true }).fill('weak');
  await page.getByPlaceholder('Confirm password').fill('weak');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(
    page.getByText(
      'The password must have at least 6 characters, one uppercase letter, one number and one special character.'
    )
  ).toBeVisible();

  await page.getByPlaceholder('Password', { exact: true }).fill('Strong1!');
  await page.getByPlaceholder('Confirm password').fill('Strong2!');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByText('Passwords do not match.')).toBeVisible();
});

test('auth pages can switch between login and register', async ({ page }) => {
  await page.goto('/login');

  await page.getByRole('button', { name: 'Sign up' }).click();
  await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible();

  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});
