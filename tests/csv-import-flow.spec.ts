import { test, expect } from '@playwright/test';
import { readFile } from 'fs/promises';
import path from 'path';

test.describe('CSV Import Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3004/welcome');

    // Set bypass headers for testing
    await page.setExtraHTTPHeaders({
      'x-bypass-user-id': 'e1879083-6ac1-4c73-970d-0a01a11f5a3f'
    });
  });

  test('Complete CSV import and template prompt flow', async ({ page }) => {
    // Navigate to welcome page
    await expect(page.locator('h1')).toContainText('VibeSurfing');

    // Click Import CSV button in header
    await page.click('text=Import CSV');

    // Verify modal opens
    await expect(page.locator('[data-testid="csv-modal"]')).toBeVisible();

    // Upload CSV file
    const csvPath = path.join(process.cwd(), 'test-companies.csv');
    const csvContent = await readFile(csvPath, 'utf-8');

    // Create a file input and upload
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);

    // Wait for preview to appear
    await expect(page.locator('text=Preview')).toBeVisible();
    await expect(page.locator('text=Company Name')).toBeVisible();
    await expect(page.locator('text=OpenAI')).toBeVisible();

    // Enter sheet name
    await page.fill('[placeholder="Enter sheet name"]', 'Test Companies Import');

    // Click import button
    await page.click('text=Import CSV');

    // Wait for redirect to sheet page with template prompt
    await page.waitForURL(/\/sheets\/.+\?createTemplate=true/);

    // Verify sheet is loaded with imported data
    await expect(page.locator('h1')).toContainText('VibeSurfing');
    await expect(page.locator('text=Company Name')).toBeVisible();
    await expect(page.locator('text=OpenAI')).toBeVisible();

    // Verify template creation prompt banner appears
    await expect(page.locator('text=Great! Your CSV data is imported')).toBeVisible();
    await expect(page.locator('text=Create Enrichment Template')).toBeVisible();

    // Test clicking "Create Enrichment Template" button
    await page.click('text=Create Enrichment Template');

    // Verify navigation to template creation page
    await page.waitForURL(/\/templates\/new/);
  });

  test('CSV import validation', async ({ page }) => {
    // Click Import CSV button
    await page.click('text=Import CSV');

    // Try to import without file
    await page.click('text=Import CSV');

    // Should show validation error or stay on modal
    await expect(page.locator('[data-testid="csv-modal"]')).toBeVisible();
  });

  test('Template prompt dismissal', async ({ page }) => {
    // Create a sheet by navigating directly with createTemplate=true
    await page.goto('http://localhost:3004/sheets/test-id?createTemplate=true');
    await page.setExtraHTTPHeaders({
      'x-bypass-user-id': 'e1879083-6ac1-4c73-970d-0a01a11f5a3f'
    });

    // Wait for page to load
    await page.waitForTimeout(1000);

    // Check if template prompt banner is visible
    const banner = page.locator('text=Great! Your CSV data is imported');
    if (await banner.isVisible()) {
      // Test "Later" button
      await page.click('text=Later');

      // Verify banner disappears
      await expect(banner).not.toBeVisible();
    }
  });
});