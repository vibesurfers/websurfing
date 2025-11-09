import { test, expect } from '@playwright/test';

test.describe('Template Button Functionality', () => {
  const testUserId = 'e1879083-6ac1-4c73-970d-0a01a11f5a3f';

  test.beforeEach(async ({ page }) => {
    // Set up authentication bypass headers for tRPC calls
    await page.setExtraHTTPHeaders({
      'x-bypass-user-id': testUserId
    });
  });

  test('ALL TEMPLATES button navigates to templates page', async ({ page }) => {
    // Go to the new template page
    await page.goto('http://localhost:3003/templates/new');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1:has-text("Create New Template")')).toBeVisible({ timeout: 15000 });

    // Add a column first so buttons appear
    const templateName = `Test Template ${Date.now()}`;
    await page.fill('[placeholder="e.g., LinkedIn Lead Finder"]', templateName);

    // Add a test column by clicking the Add Column button in visual mode
    await page.click('button:has-text("🎨 Visual")');
    await page.click('button:has-text("+ Add Column")');

    // Wait for buttons to appear
    await expect(page.locator('button:has-text("ALL TEMPLATES")')).toBeVisible({ timeout: 5000 });

    // Click ALL TEMPLATES button
    await page.click('button:has-text("ALL TEMPLATES")');

    // Verify we're on the templates list page
    await expect(page.url()).toBe('http://localhost:3003/templates');
    await page.waitForLoadState('networkidle');
  });

  test('USE TEMPLATE button creates new sheet with template columns', async ({ page }) => {
    // Go to the new template page
    await page.goto('http://localhost:3003/templates/new');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1:has-text("Create New Template")')).toBeVisible({ timeout: 15000 });

    // Fill in template details
    const templateName = `Test Sheet Template ${Date.now()}`;
    await page.fill('[placeholder="e.g., LinkedIn Lead Finder"]', templateName);
    await page.fill('[placeholder="Describe what this template does..."]', 'Test template description');

    // Switch to visual mode to add columns manually
    await page.click('button:has-text("🎨 Visual")');

    // Add multiple test columns
    await page.click('button:has-text("+ Add Column")');

    // Fill in first column details
    await page.fill('input[placeholder="Column Title"]', 'Test Column 1');

    // Add another column
    await page.click('button:has-text("+ Add Column")');

    // Wait for the second column form to appear
    await page.waitForTimeout(1000);

    // Fill in second column (should be the last input)
    const columnInputs = page.locator('input[placeholder="Column Title"]');
    await columnInputs.last().fill('Test Column 2');

    // Wait for buttons to appear
    await expect(page.locator('button:has-text("USE TEMPLATE")')).toBeVisible({ timeout: 5000 });

    // Click USE TEMPLATE button
    await page.click('button:has-text("USE TEMPLATE")');

    // Wait for the sheet creation process
    await page.waitForTimeout(5000);

    // Verify we're redirected to a sheet page
    await expect(page.url()).toMatch(/\/sheets\/[a-f0-9-]+$/);

    // Verify the sheet has the template columns
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.ProseMirror table')).toBeVisible({ timeout: 10000 });

    // Check that the column headers exist in the table
    await expect(page.locator('th:has-text("Test Column 1")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('th:has-text("Test Column 2")')).toBeVisible({ timeout: 5000 });
  });

  test('Save Template button saves template and navigates to template view', async ({ page }) => {
    // Go to the new template page
    await page.goto('http://localhost:3003/templates/new');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1:has-text("Create New Template")')).toBeVisible({ timeout: 15000 });

    // Fill in template details
    const templateName = `Saved Template ${Date.now()}`;
    await page.fill('[placeholder="e.g., LinkedIn Lead Finder"]', templateName);
    await page.fill('[placeholder="Describe what this template does..."]', 'Saved template description');

    // Switch to visual mode and add a column
    await page.click('button:has-text("🎨 Visual")');
    await page.click('button:has-text("+ Add Column")');
    await page.fill('input[placeholder="Column Title"]', 'Saved Column');

    // Wait for buttons to appear
    await expect(page.locator('button:has-text("Save Template")')).toBeVisible({ timeout: 5000 });

    // Click Save Template button
    await page.click('button:has-text("Save Template")');

    // Wait for save process
    await page.waitForTimeout(3000);

    // Verify we're redirected to template view page
    await expect(page.url()).toMatch(/\/templates\/[a-f0-9-]+$/);
    await page.waitForLoadState('networkidle');
  });

  test('buttons are properly disabled when template name is empty', async ({ page }) => {
    // Go to the new template page
    await page.goto('http://localhost:3003/templates/new');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1:has-text("Create New Template")')).toBeVisible({ timeout: 15000 });

    // Add a column without filling template name
    await page.click('button:has-text("🎨 Visual")');
    await page.click('button:has-text("+ Add Column")');
    await page.fill('input[placeholder="Column Title"]', 'Test Column');

    // Wait for buttons to appear
    await expect(page.locator('button:has-text("USE TEMPLATE")')).toBeVisible({ timeout: 5000 });

    // Verify USE TEMPLATE button is disabled when no template name
    await expect(page.locator('button:has-text("USE TEMPLATE")')).toBeDisabled();

    // Fill in template name
    await page.fill('[placeholder="e.g., LinkedIn Lead Finder"]', 'Test Template');

    // Verify USE TEMPLATE button is now enabled
    await expect(page.locator('button:has-text("USE TEMPLATE")')).toBeEnabled();
  });
});