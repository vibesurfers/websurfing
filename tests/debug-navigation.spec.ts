import { test, expect } from '@playwright/test';

test.describe('Debug Navigation', () => {
  const testUserId = 'e1879083-6ac1-4c73-970d-0a01a11f5a3f';

  test.beforeEach(async ({ page }) => {
    // Set up authentication bypass headers for tRPC calls
    await page.setExtraHTTPHeaders({
      'x-bypass-user-id': testUserId
    });
  });

  test('Debug ALL TEMPLATES button click', async ({ page }) => {
    // Go to the new template page
    await page.goto('http://localhost:3003/templates/new');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1:has-text("Create New Template")')).toBeVisible({ timeout: 15000 });

    // Fill template name
    const templateName = `Debug Template ${Date.now()}`;
    await page.fill('[placeholder="e.g., LinkedIn Lead Finder"]', templateName);

    // Add a test column
    await page.click('button:has-text("🎨 Visual")');
    await page.click('button:has-text("+ Add Column")');

    // Wait for buttons to appear and take a screenshot
    await expect(page.locator('button:has-text("ALL TEMPLATES")')).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'before-click.png' });

    // Log current URL
    console.log('URL before click:', page.url());

    // Listen for navigation events
    page.on('framenavigated', (frame) => {
      console.log('Frame navigated to:', frame.url());
    });

    // Click ALL TEMPLATES button with debug info
    const button = page.locator('button:has-text("ALL TEMPLATES")');
    await expect(button).toBeEnabled();

    console.log('Clicking ALL TEMPLATES button...');
    await button.click();

    // Wait a moment and check URL
    await page.waitForTimeout(2000);
    console.log('URL after click:', page.url());

    // Take screenshot after click
    await page.screenshot({ path: 'after-click.png' });

    // Try waiting for navigation
    try {
      await page.waitForURL('**/templates', { timeout: 5000 });
      console.log('Successfully navigated to templates page');
    } catch (e) {
      console.log('Navigation did not occur:', e);
    }
  });
});