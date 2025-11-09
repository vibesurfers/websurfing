import { test, expect } from '@playwright/test';

test.use({
  baseURL: 'http://localhost:3000',
  ignoreHTTPSErrors: true
});

test.describe('Loading Spinner Visual Test', () => {
  test('shows loading spinner when typing in a cell', async ({ page }) => {
    // Navigate to the sheet directly (auth bypass should be in middleware)
    await page.goto('/sheets/8c6fc9a1-96e1-4076-b9f1-7db43dc25928');

    // Wait for table to load
    await expect(page.locator('.ProseMirror table')).toBeVisible({ timeout: 10000 });

    // Get the first row
    const firstRow = page.locator('.ProseMirror table tbody tr').first();
    const firstCell = firstRow.locator('td').first();

    // Click and type in the first cell
    await firstCell.click();
    await page.keyboard.type('test company');

    // Wait for debounce (1 second)
    await page.waitForTimeout(1500);

    // Check if the row has the processing-row class
    const hasProcessingClass = await firstRow.evaluate((el) => {
      return el.classList.contains('processing-row');
    });

    console.log('Row has processing-row class:', hasProcessingClass);

    // Take a screenshot to see the spinner
    await page.screenshot({
      path: '/tmp/loading-spinner-test.png',
      fullPage: false
    });

    console.log('Screenshot saved to /tmp/loading-spinner-test.png');

    // Check for spinner pseudo-element by checking computed styles
    const cellWithSpinner = firstRow.locator('td').first();
    const cellStyles = await cellWithSpinner.evaluate((el) => {
      const after = window.getComputedStyle(el, '::after');
      return {
        display: after.display,
        content: after.content,
        animation: after.animation,
      };
    });

    console.log('Cell ::after styles:', cellStyles);

    // Wait a bit to observe the spinner
    await page.waitForTimeout(3000);

    // Take another screenshot after cells are filled
    await page.screenshot({
      path: '/tmp/loading-spinner-after.png',
      fullPage: false
    });

    console.log('After screenshot saved to /tmp/loading-spinner-after.png');
  });
});
