# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Authentication >> should show error for invalid credentials
- Location: tests\e2e\auth.spec.ts:19:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.text-destructive')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('.text-destructive')

```

```yaml
- region "Notifications alt+T"
- heading "SpiderSmart IMS" [level=2]
- paragraph: Sign in to manage your inventory
- textbox "Email address"
- textbox "Password"
- button "Sign In"
- paragraph: Phase 1 build • Secured via JWT
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Authentication', () => {
  4  |   test('should login successfully with admin credentials', async ({ page }) => {
  5  |     await page.goto('/login');
  6  | 
  7  |     // Fill credentials
  8  |     await page.fill('input[placeholder="Email address"]', 'admin@spidersmart.com');
  9  |     await page.fill('input[placeholder="Password"]', 'admin123');
  10 | 
  11 |     // Submit
  12 |     await page.click('button:has-text("Sign In")');
  13 | 
  14 |     // Should redirect to dashboard
  15 |     await expect(page).toHaveURL('/');
  16 |     await expect(page.locator('h1')).toContainText('Dashboard');
  17 |   });
  18 | 
  19 |   test('should show error for invalid credentials', async ({ page }) => {
  20 |     await page.goto('/login');
  21 | 
  22 |     await page.fill('input[placeholder="Email address"]', 'wrong@example.com');
  23 |     await page.fill('input[placeholder="Password"]', 'wrongpass');
  24 |     await page.click('button:has-text("Sign In")');
  25 | 
  26 |     // Should show error message
  27 |     const errorAlert = page.locator('.text-destructive');
> 28 |     await expect(errorAlert).toBeVisible();
     |                              ^ Error: expect(locator).toBeVisible() failed
  29 |     await expect(errorAlert).toContainText('Invalid email or password');
  30 |   });
  31 | 
  32 |   test('should redirect unauthenticated users to login', async ({ page }) => {
  33 |     await page.goto('/');
  34 |     // ProtectedRoute should redirect to /login
  35 |     await expect(page).toHaveURL(/\/login/);
  36 |   });
  37 | });
  38 | 
```