import { test, expect } from '@playwright/test';

test.describe('Admin Master Data', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[placeholder="Email address"]', 'admin@spidersmart.com');
    await page.fill('input[placeholder="Password"]', 'admin123');
    await page.click('button:has-text("Sign In")');
    await expect(page).toHaveURL('/');
    
    // Navigate to Admin page
    await page.click('a[href="/admin/master"]');
    await expect(page.locator('h1')).toContainText('Master Data Management');
  });

  test('should create, edit, and delete an Entity', async ({ page }) => {
    const entityName = `Test Entity ${Date.now()}`;
    const entityCode = '99';

    // 1. Create
    await page.click('button:has-text("Add Entity")');
    await page.fill('input[placeholder="Enter name..."]', entityName);
    await page.fill('input[placeholder="e.g. 10"]', entityCode);
    await page.click('button:has-text("Save Entry")');

    // Verify in table
    await expect(page.locator('table')).toContainText(entityName);

    // 2. Edit
    // Find the row with our entity and click edit
    const row = page.locator('tr', { hasText: entityName });
    await row.locator('button').first().click(); // First button is usually edit in the UI logic provided
    
    const updatedName = entityName + ' Updated';
    await page.fill('input[placeholder="Enter name..."]', updatedName);
    await page.click('button:has-text("Update Entry")');

    await expect(page.locator('table')).toContainText(updatedName);

    // 3. Delete
    // Need to handle browser confirm dialog
    page.on('dialog', dialog => dialog.accept());
    await row.locator('button').last().click(); // Last button is delete

    await expect(page.locator('table')).not.toContainText(updatedName);
  });

  test('should navigate between master data tabs', async ({ page }) => {
    const tabs = ['Entity Types', 'Entities', 'Departments', 'Categories', 'Record Types', 'Field Schemas'];
    
    for (const tab of tabs) {
      await page.click(`button:has-text("${tab}")`);
      // Verify tab is active (often has a border-primary class)
      await expect(page.locator(`button:has-text("${tab}")`)).toHaveClass(/text-primary/);
    }
  });
});
