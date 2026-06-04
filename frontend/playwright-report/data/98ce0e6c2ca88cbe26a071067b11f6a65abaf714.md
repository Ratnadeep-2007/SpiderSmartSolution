# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: records.spec.ts >> Records Management >> should search and filter records
- Location: tests\e2e\records.spec.ts:49:3

# Error details

```
Error: locator.isVisible: Error: strict mode violation: locator('input[placeholder*="Search"]') resolved to 3 elements:
    1) <input type="text" placeholder="Global Search (Entity, Barcode, etc.)" class="block w-full rounded-md border border-input bg-muted/50 py-1.5 pl-10 pr-3 text-sm placeholder-muted-foreground focus:border-primary focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary"/> aka getByRole('textbox', { name: 'Global Search (Entity,' })
    2) <input value="" type="text" placeholder="Search descriptions, tags..." class="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"/> aka getByRole('textbox', { name: 'Search descriptions, tags...' })
    3) <input value="" type="text" placeholder="Search everything: barcodes, description, entity, department..." class="w-full h-11 rounded-xl border border-input bg-background py-2 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"/> aka getByRole('textbox', { name: 'Search everything: barcodes,' })

Call log:
    - checking visibility of locator('input[placeholder*="Search"]')

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
            - link "Records" [active] [ref=e20] [cursor=pointer]:
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
              - heading "Barcode Lookup" [level=3] [ref=e72]:
                - img [ref=e73]
                - text: Barcode Lookup
              - generic [ref=e76]:
                - textbox "Type barcode..." [ref=e77]
                - button [ref=e78] [cursor=pointer]:
                  - img [ref=e79]
            - generic [ref=e83]:
              - button "Faceted Filters" [ref=e84] [cursor=pointer]:
                - generic [ref=e85]:
                  - img [ref=e86]
                  - text: Faceted Filters
                - img [ref=e88]
              - generic [ref=e90]:
                - generic [ref=e91]:
                  - text: Keyword Search
                  - textbox "Search descriptions, tags..." [ref=e92]
                - generic [ref=e93]:
                  - text: Entity Type
                  - combobox [ref=e94]:
                    - option "All Types" [selected]
                - generic [ref=e95]:
                  - text: Entity
                  - combobox [ref=e96]:
                    - option "All Entities" [selected]
                - generic [ref=e97]:
                  - text: Department
                  - combobox [ref=e98]:
                    - option "All Departments" [selected]
                - generic [ref=e99]:
                  - text: Location
                  - textbox "Filter by location..." [ref=e100]
                - generic [ref=e101]:
                  - text: Record Type
                  - combobox [ref=e102]:
                    - option "All Types" [selected]
                - generic [ref=e103]:
                  - text: Status
                  - combobox [ref=e104]:
                    - option "All Statuses" [selected]
                    - option "Active"
                    - option "Due for Disposition"
                    - option "Disposed"
                    - option "Legal Hold"
                - generic [ref=e105]:
                  - text: Record Date
                  - textbox [ref=e106]
                - generic [ref=e107]:
                  - text: Tags
                  - textbox "e.g. Finance, Vital..." [ref=e108]
                - generic [ref=e109]:
                  - text: Category
                  - combobox [ref=e110]:
                    - option "All Categories" [selected]
                - button "Clear All Filters" [ref=e111] [cursor=pointer]
            - generic [ref=e112]:
              - generic [ref=e113]:
                - img [ref=e114]
                - text: Saved Searches
              - generic [ref=e116]:
                - textbox "Name current search..." [ref=e117]
                - button "Save Current Query" [disabled] [ref=e118]
              - paragraph [ref=e120]: No saved searches yet.
            - generic [ref=e121]:
              - heading "Browse Taxonomy" [level=3] [ref=e122]:
                - img [ref=e123]
                - text: Browse Taxonomy
              - img [ref=e126]
          - generic [ref=e128]:
            - generic [ref=e129]:
              - generic [ref=e130]:
                - heading "Records" [level=1] [ref=e131]
                - paragraph [ref=e132]: Found 0 records matching criteria.
              - generic [ref=e133]:
                - button "Export" [ref=e135] [cursor=pointer]:
                  - img [ref=e136]
                  - text: Export
                - button "Create Record" [ref=e139] [cursor=pointer]:
                  - img [ref=e140]
                  - text: Create Record
            - generic [ref=e141]:
              - img [ref=e142]
              - 'textbox "Search everything: barcodes, description, entity, department..." [ref=e145]'
            - img [ref=e148]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Records Management', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     // Login
  6  |     await page.goto('/login');
  7  |     await page.fill('input[placeholder="Email address"]', 'admin@spidersmart.com');
  8  |     await page.fill('input[placeholder="Password"]', 'admin123');
  9  |     await page.click('button:has-text("Sign In")');
  10 |     await expect(page).toHaveURL('/');
  11 |     
  12 |     // Navigate to Records page
  13 |     await page.click('a[href="/records"]');
  14 |     await expect(page.locator('h1')).toContainText('Records');
  15 |   });
  16 | 
  17 |   test('should create a new inventory record', async ({ page }) => {
  18 |     const boxBarcode = 'BOX' + Math.random().toString(36).substring(2, 9).toUpperCase();
  19 |     const fileBarcode = 'FILE' + Math.random().toString(36).substring(2, 10).toUpperCase();
  20 | 
  21 |     await page.click('button:has-text("Create Record")');
  22 | 
  23 |     // Fill the form
  24 |     // Since names are generated by react-hook-form register, 
  25 |     // we might need to use select based on labels if possible, 
  26 |     // or just use CSS selectors if names are stable.
  27 |     
  28 |     await page.selectOption('select[name="entity_type_id"]', { index: 1 });
  29 |     await page.selectOption('select[name="entity_id"]', { index: 1 });
  30 |     
  31 |     // Wait for departments to load after selecting entity
  32 |     await page.waitForTimeout(500); 
  33 |     await page.selectOption('select[name="department_id"]', { index: 1 });
  34 | 
  35 |     await page.fill('input[name="location"]', 'Test Rack 1');
  36 |     await page.fill('input[name="box_barcode"]', boxBarcode);
  37 |     await page.fill('input[name="file_barcode"]', fileBarcode);
  38 |     await page.fill('textarea[name="description"]', 'E2E Test Record Description');
  39 |     await page.fill('input[name="year"]', '2024');
  40 | 
  41 |     // Submit
  42 |     await page.click('button:has-text("Save Record")');
  43 | 
  44 |     // Verify success - check for toast or return to table
  45 |     // The table should eventually contain the new box barcode
  46 |     await expect(page.locator('table')).toContainText(boxBarcode);
  47 |   });
  48 | 
  49 |   test('should search and filter records', async ({ page }) => {
  50 |     // Assuming there is a search input
  51 |     const searchInput = page.locator('input[placeholder*="Search"]');
> 52 |     if (await searchInput.isVisible()) {
     |                           ^ Error: locator.isVisible: Error: strict mode violation: locator('input[placeholder*="Search"]') resolved to 3 elements:
  53 |       await searchInput.fill('spider');
  54 |       await page.keyboard.press('Enter');
  55 |       // Verify results
  56 |       await expect(page.locator('table')).toContainText(/spider/i);
  57 |     }
  58 |   });
  59 | });
  60 | 
```