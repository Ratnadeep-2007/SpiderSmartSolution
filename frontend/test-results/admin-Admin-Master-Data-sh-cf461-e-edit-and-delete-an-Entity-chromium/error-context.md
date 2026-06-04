# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin.spec.ts >> Admin Master Data >> should create, edit, and delete an Entity
- Location: tests\e2e\admin.spec.ts:17:3

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('table')
Expected substring: "Test Entity 1779382962693"
Received string:    "NameStatusActionsMicrosoft22 ActiveGoogle33 Activeexprivia44 ActiveTest Entity 1779382849524 Updated99 Active"
Timeout: 5000ms

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for locator('table')
    5 × locator resolved to <table class="w-full text-left text-sm border-collapse">…</table>
      - unexpected value "NameStatusActionsMicrosoft22 ActiveGoogle33 Activeexprivia44 ActiveTest Entity 1779382849524 Updated99 Active"

```

```yaml
- table:
  - rowgroup:
    - row "Name Status Actions":
      - columnheader "Name"
      - columnheader "Status"
      - columnheader "Actions"
  - rowgroup:
    - row "Microsoft22 Active":
      - cell "Microsoft22"
      - cell "Active"
      - cell:
        - button
        - button
    - row "Google33 Active":
      - cell "Google33"
      - cell "Active"
      - cell:
        - button
        - button
    - row "exprivia44 Active":
      - cell "exprivia44"
      - cell "Active"
      - cell:
        - button
        - button
    - row "Test Entity 1779382849524 Updated99 Active":
      - cell "Test Entity 1779382849524 Updated99"
      - cell "Active"
      - cell:
        - button
        - button
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Admin Master Data', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     // Login before each test
  6  |     await page.goto('/login');
  7  |     await page.fill('input[placeholder="Email address"]', 'admin@spidersmart.com');
  8  |     await page.fill('input[placeholder="Password"]', 'admin123');
  9  |     await page.click('button:has-text("Sign In")');
  10 |     await expect(page).toHaveURL('/');
  11 |     
  12 |     // Navigate to Admin page
  13 |     await page.click('a[href="/admin/master"]');
  14 |     await expect(page.locator('h1')).toContainText('Master Data Management');
  15 |   });
  16 | 
  17 |   test('should create, edit, and delete an Entity', async ({ page }) => {
  18 |     const entityName = `Test Entity ${Date.now()}`;
  19 |     const entityCode = '99';
  20 | 
  21 |     // 1. Create
  22 |     await page.click('button:has-text("Add Entity")');
  23 |     await page.fill('input[placeholder="Enter name..."]', entityName);
  24 |     await page.fill('input[placeholder="e.g. 10"]', entityCode);
  25 |     await page.click('button:has-text("Save Entry")');
  26 | 
  27 |     // Verify in table
> 28 |     await expect(page.locator('table')).toContainText(entityName);
     |                                         ^ Error: expect(locator).toContainText(expected) failed
  29 | 
  30 |     // 2. Edit
  31 |     // Find the row with our entity and click edit
  32 |     const row = page.locator('tr', { hasText: entityName });
  33 |     await row.locator('button').first().click(); // First button is usually edit in the UI logic provided
  34 |     
  35 |     const updatedName = entityName + ' Updated';
  36 |     await page.fill('input[placeholder="Enter name..."]', updatedName);
  37 |     await page.click('button:has-text("Update Entry")');
  38 | 
  39 |     await expect(page.locator('table')).toContainText(updatedName);
  40 | 
  41 |     // 3. Delete
  42 |     // Need to handle browser confirm dialog
  43 |     page.on('dialog', dialog => dialog.accept());
  44 |     await row.locator('button').last().click(); // Last button is delete
  45 | 
  46 |     await expect(page.locator('table')).not.toContainText(updatedName);
  47 |   });
  48 | 
  49 |   test('should navigate between master data tabs', async ({ page }) => {
  50 |     const tabs = ['Entity Types', 'Entities', 'Departments', 'Categories', 'Record Types', 'Field Schemas'];
  51 |     
  52 |     for (const tab of tabs) {
  53 |       await page.click(`button:has-text("${tab}")`);
  54 |       // Verify tab is active (often has a border-primary class)
  55 |       await expect(page.locator(`button:has-text("${tab}")`)).toHaveClass(/text-primary/);
  56 |     }
  57 |   });
  58 | });
  59 | 
```