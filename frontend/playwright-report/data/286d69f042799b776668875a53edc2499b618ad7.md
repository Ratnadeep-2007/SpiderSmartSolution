# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: reports.spec.ts >> Reports & Analytics >> should verify audit trail page loads
- Location: tests\e2e\reports.spec.ts:42:3

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('h1')
Expected substring: "System Audit Trail"
Received string:    "Compliance Audit Trail"
Timeout: 5000ms

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for locator('h1')
    - locator resolved to <h1 class="text-3xl font-bold tracking-tight">Analytics & Reports</h1>
    - unexpected value "Analytics & Reports"
    13 × locator resolved to <h1 class="text-3xl font-bold tracking-tight">Compliance Audit Trail</h1>
       - unexpected value "Compliance Audit Trail"

```

```yaml
- heading "Compliance Audit Trail" [level=1]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Reports & Analytics', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     // Login
  6  |     await page.goto('/login');
  7  |     await page.fill('input[placeholder="Email address"]', 'admin@spidersmart.com');
  8  |     await page.fill('input[placeholder="Password"]', 'admin123');
  9  |     await page.click('button:has-text("Sign In")');
  10 |     await expect(page).toHaveURL('/');
  11 |     
  12 |     // Navigate to Reports page
  13 |     await page.click('a[href="/reports"]');
  14 |     await expect(page.locator('h1')).toContainText('Analytics & Reports');
  15 |   });
  16 | 
  17 |   test('should navigate between different report types', async ({ page }) => {
  18 |     const reportTypes = [
  19 |       'Records by Entity', 
  20 |       'Records by Department', 
  21 |       'Retention Compliance',
  22 |       'Export Schedules'
  23 |     ];
  24 |     
  25 |     for (const type of reportTypes) {
  26 |       await page.click(`button:has-text("${type}")`);
  27 |       await expect(page.locator('h3')).toContainText(type);
  28 |       // Wait for loader to disappear if any
  29 |       await expect(page.locator('.animate-spin')).not.toBeVisible();
  30 |     }
  31 |   });
  32 | 
  33 |   test('should open create schedule modal', async ({ page }) => {
  34 |     await page.click('button:has-text("Export Schedules")');
  35 |     await page.click('button:has-text("Create New Schedule")');
  36 |     
  37 |     await expect(page.locator('h3:has-text("Schedule Recurring Export")')).toBeVisible();
  38 |     await page.click('button >> .lucide-x'); // Close modal
  39 |     await expect(page.locator('h3:has-text("Schedule Recurring Export")')).not.toBeVisible();
  40 |   });
  41 | 
  42 |   test('should verify audit trail page loads', async ({ page }) => {
  43 |     await page.click('a[href="/audit"]');
> 44 |     await expect(page.locator('h1')).toContainText('System Audit Trail');
     |                                      ^ Error: expect(locator).toContainText(expected) failed
  45 |     // Verify table has some content (headers at least)
  46 |     await expect(page.locator('table thead')).toContainText('User');
  47 |     await expect(page.locator('table thead')).toContainText('Action');
  48 |   });
  49 | });
  50 | 
```