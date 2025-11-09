import { test, expect } from '@playwright/test';

test.describe('Simple Template Test', () => {
  const testUserId = 'e1879083-6ac1-4c73-970d-0a01a11f5a3f';

  test.beforeEach(async ({ page }) => {
    // Set up authentication bypass headers for tRPC calls
    await page.setExtraHTTPHeaders({
      'x-bypass-user-id': testUserId
    });
  });

  test('Can load templates/new page', async ({ page }) => {
    // Go to the new template page
    await page.goto('http://localhost:3003/templates/new');

    // Wait a moment and take a screenshot to debug
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-debug.png' });

    // Check what's actually on the page
    const title = await page.title();
    console.log('Page title:', title);

    const body = await page.locator('body').textContent();
    console.log('Page body text:', body);

    // Try to find any h1 element first
    const h1 = await page.locator('h1').first();
    if (await h1.isVisible()) {
      const h1Text = await h1.textContent();
      console.log('H1 text:', h1Text);
    } else {
      console.log('No h1 element found');
    }
  });
});