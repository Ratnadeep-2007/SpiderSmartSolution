import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should login successfully with admin credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill credentials
    await page.fill('input[placeholder="Email address"]', 'admin@spidersmart.com');
    await page.fill('input[placeholder="Password"]', 'admin123');

    // Submit
    await page.click('button:has-text("Sign In")');

    // Should redirect to dashboard
    await expect(page).toHaveURL('/');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[placeholder="Email address"]', 'wrong@example.com');
    await page.fill('input[placeholder="Password"]', 'wrongpass');
    await page.click('button:has-text("Sign In")');

    // Should show error message
    const errorAlert = page.locator('.text-destructive');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText('Invalid email or password');
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/');
    // ProtectedRoute should redirect to /login
    await expect(page).toHaveURL(/\/login/);
  });
});
