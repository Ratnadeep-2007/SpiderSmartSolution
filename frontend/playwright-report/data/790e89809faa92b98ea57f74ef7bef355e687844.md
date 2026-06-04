# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: reports.spec.ts >> Reports & Analytics >> should navigate between different report types
- Location: tests\e2e\reports.spec.ts:17:3

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('h3')
Expected substring: "Records by Entity"
Error: strict mode violation: locator('h3') resolved to 3 elements:
    1) <h3 class="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Main Navigation</h3> aka getByRole('heading', { name: 'Main Navigation' })
    2) <h3 class="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Administration</h3> aka getByRole('heading', { name: 'Administration' })
    3) <h3 class="text-lg font-bold mb-8 flex items-center gap-2">…</h3> aka getByRole('heading', { name: 'Records by Entity' })

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for locator('h3')

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - region "Notifications alt+T"
  - generic [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e5]:
        - img [ref=e6]
        - generic [ref=e9]: SpiderSmart IMS
      - generic [ref=e10]:
        - generic [ref=e11]:
          - heading "Main Navigation" [level=3] [ref=e12]
          - navigation [ref=e13]:
            - link "Dashboard" [ref=e14] [cursor=pointer]:
              - /url: /
              - img [ref=e15]
              - text: Dashboard
            - link "Records" [ref=e20] [cursor=pointer]:
              - /url: /records
              - img [ref=e21]
              - text: Records
            - link "Reports" [ref=e25] [cursor=pointer]:
              - /url: /reports
              - img [ref=e26]
              - text: Reports
            - link "Import" [ref=e28] [cursor=pointer]:
              - /url: /import
              - img [ref=e29]
              - text: Import
            - link "Audit Log" [ref=e32] [cursor=pointer]:
              - /url: /audit
              - img [ref=e33]
              - text: Audit Log
        - generic [ref=e36]:
          - heading "Administration" [level=3] [ref=e37]
          - navigation [ref=e38]:
            - link "Users" [ref=e39] [cursor=pointer]:
              - /url: /admin/users
              - img [ref=e40]
              - text: Users
            - link "Master Data" [ref=e45] [cursor=pointer]:
              - /url: /admin/master
              - img [ref=e46]
              - text: Master Data
            - link "Classification" [ref=e49] [cursor=pointer]:
              - /url: /admin/classification
              - img [ref=e50]
              - text: Classification
      - generic [ref=e54]: Spider Smart Solution © 2026
    - generic [ref=e55]:
      - banner [ref=e56]:
        - generic [ref=e57]:
          - generic:
            - img
          - textbox "Global Search (Entity, Barcode, etc.)" [ref=e58]
        - generic [ref=e59]:
          - button [ref=e60] [cursor=pointer]:
            - img
          - button "admin system admin AD" [ref=e62] [cursor=pointer]:
            - generic [ref=e63]:
              - generic [ref=e64]: admin
              - generic [ref=e65]: system admin
            - generic [ref=e67]: AD
      - main [ref=e68]:
        - generic [ref=e69]:
          - generic [ref=e70]:
            - generic [ref=e71]:
              - heading "Analytics & Reports" [level=1] [ref=e72]
              - paragraph [ref=e73]: Real-time inventory insights and compliance metrics.
            - generic [ref=e74]:
              - button "Refresh Data" [ref=e75] [cursor=pointer]:
                - img [ref=e76]
              - generic [ref=e81]:
                - button "Export Report" [ref=e82] [cursor=pointer]:
                  - img [ref=e83]
                  - text: Export Report
                - generic:
                  - button "CSV Format":
                    - img
                    - text: CSV Format
                  - button "PDF Document":
                    - img
                    - text: PDF Document
          - generic [ref=e86]:
            - generic [ref=e87]:
              - button "Records by Entity" [active] [ref=e88] [cursor=pointer]:
                - img [ref=e89]
                - text: Records by Entity
              - button "Records by Department" [ref=e92] [cursor=pointer]:
                - img [ref=e93]
                - text: Records by Department
              - button "Records by Year" [ref=e98] [cursor=pointer]:
                - img [ref=e99]
                - text: Records by Year
              - button "Records by Location" [ref=e101] [cursor=pointer]:
                - img [ref=e102]
                - text: Records by Location
              - button "Retention Compliance" [ref=e105] [cursor=pointer]:
                - img [ref=e106]
                - text: Retention Compliance
              - button "Upcoming Dispositions" [ref=e109] [cursor=pointer]:
                - img [ref=e110]
                - text: Upcoming Dispositions
              - button "Activity by User" [ref=e112] [cursor=pointer]:
                - img [ref=e113]
                - text: Activity by User
              - button "Legal Holds Active" [ref=e118] [cursor=pointer]:
                - img [ref=e119]
                - text: Legal Holds Active
              - button "Custom Report Builder" [ref=e122] [cursor=pointer]:
                - img [ref=e123]
                - text: Custom Report Builder
              - button "Export Schedules" [ref=e126] [cursor=pointer]:
                - img [ref=e127]
                - text: Export Schedules
            - generic [ref=e131]:
              - heading "Records by Entity" [level=3] [ref=e132]:
                - img [ref=e133]
                - text: Records by Entity
              - img [ref=e137]
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
> 27 |       await expect(page.locator('h3')).toContainText(type);
     |                                        ^ Error: expect(locator).toContainText(expected) failed
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
  44 |     await expect(page.locator('h1')).toContainText('System Audit Trail');
  45 |     // Verify table has some content (headers at least)
  46 |     await expect(page.locator('table thead')).toContainText('User');
  47 |     await expect(page.locator('table thead')).toContainText('Action');
  48 |   });
  49 | });
  50 | 
```