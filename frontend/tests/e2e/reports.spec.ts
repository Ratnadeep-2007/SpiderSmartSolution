import { test, expect } from '@playwright/test';

test.describe('Reports & Analytics', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[placeholder="Email address"]', 'admin@spidersmart.com');
    await page.fill('input[placeholder="Password"]', 'admin123');
    await page.click('button:has-text("Sign In")');
    await expect(page).toHaveURL('/');
    
    // Navigate to Reports page
    await page.click('a[href="/reports"]');
    await expect(page.locator('h1')).toContainText('Analytics & Reports');
  });

  test('should navigate between different report types', async ({ page }) => {
    const reportTypes = [
      'Records by Entity', 
      'Records by Department', 
      'Retention Compliance',
      'Export Schedules'
    ];
    
    for (const type of reportTypes) {
      await page.click(`button:has-text("${type}")`);
      await expect(page.locator('h3')).toContainText(type);
      // Wait for loader to disappear if any
      await expect(page.locator('.animate-spin')).not.toBeVisible();
    }
  });

  test('should open create schedule modal', async ({ page }) => {
    await page.click('button:has-text("Export Schedules")');
    await page.click('button:has-text("Create New Schedule")');
    
    await expect(page.locator('h3:has-text("Schedule Recurring Export")')).toBeVisible();
    await page.click('button >> .lucide-x'); // Close modal
    await expect(page.locator('h3:has-text("Schedule Recurring Export")')).not.toBeVisible();
  });

  test('should verify audit trail page loads', async ({ page }) => {
    await page.click('a[href="/audit"]');
    await expect(page.locator('h1')).toContainText('System Audit Trail');
    // Verify table has some content (headers at least)
    await expect(page.locator('table thead')).toContainText('User');
    await expect(page.locator('table thead')).toContainText('Action');
  });
});
