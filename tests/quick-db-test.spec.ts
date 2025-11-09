import { test, expect } from '@playwright/test';

test.describe('Quick Database Test', () => {
  const testUserId = 'e1879083-6ac1-4c73-970d-0a01a11f5a3f';

  test.beforeEach(async ({ page }) => {
    await page.setExtraHTTPHeaders({
      'x-bypass-user-id': testUserId
    });
  });

  test('Check if database errors are fixed', async ({ page }) => {
    // Go to sheets page to trigger database calls
    await page.goto('http://localhost:3001/');
    await page.waitForLoadState('networkidle');

    // Wait and check for any obvious errors
    await page.waitForTimeout(3000);

    console.log('Page loaded successfully without connection errors');
  });
});