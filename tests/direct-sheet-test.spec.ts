import { test, expect } from '@playwright/test';

test.describe('Direct Sheet Test', () => {
  const testUserId = 'e1879083-6ac1-4c73-970d-0a01a11f5a3f';

  test('test direct navigation to sheet URL', async ({ page }) => {
    // Set up authentication bypass
    await page.setExtraHTTPHeaders({
      'x-bypass-user-id': testUserId
    });

    // Create a test sheet ID
    const testSheetId = 'test-sheet-' + Date.now();

    // Try direct navigation to a sheet URL (this should trigger sheet creation if needed)
    await page.goto(`http://localhost:3000/?sheetId=${testSheetId}`);
    await page.waitForTimeout(3000);

    console.log('URL after navigation:', page.url());

    // Check if we see TipTap table
    const hasTipTap = await page.locator('.ProseMirror').isVisible({ timeout: 8000 });
    console.log('TipTap visible:', hasTipTap);

    if (hasTipTap) {
      console.log('✅ Successfully loaded TipTap table');

      // Look for add column button specifically
      const addColumnButton = page.locator('div:has-text("+")').first();
      const addButtonVisible = await addColumnButton.isVisible();
      console.log('Add column button visible:', addButtonVisible);

      if (addButtonVisible) {
        // Test clicking the add column button
        console.log('Testing add column click...');
        await addColumnButton.click();
        await page.waitForTimeout(1000);

        // Check if anything happened (input dialog, column added, etc.)
        const hasInput = await page.locator('input').count();
        console.log('Input fields after click:', hasInput);

        // Check table structure
        const tableHTML = await page.locator('.ProseMirror table').innerHTML();
        console.log('Table structure (first 200 chars):', tableHTML.substring(0, 200));

        // Check if we can see any column-related UI
        const columnElements = await page.locator('col, colgroup col').count();
        console.log('Column elements found:', columnElements);

        console.log('✅ Add column button is clickable');
      } else {
        console.log('❌ Add column button not visible');

        // Debug: log all elements that contain "+"
        const plusElements = await page.locator('*:has-text("+")').count();
        console.log('Elements containing "+" found:', plusElements);
      }
    } else {
      console.log('❌ TipTap table not visible');

      // Debug: Check what's on the page
      const pageTitle = await page.locator('h1').textContent();
      console.log('Page title:', pageTitle);

      const bodyText = await page.locator('body').textContent();
      console.log('Page content (first 200 chars):', bodyText?.substring(0, 200));
    }
  });

  test('test with known working sheet URL pattern', async ({ page }) => {
    // Set up authentication bypass
    await page.setExtraHTTPHeaders({
      'x-bypass-user-id': testUserId
    });

    // Try the URL pattern from working tests
    await page.goto('http://localhost:3000/sheets/test-sheet-123');
    await page.waitForTimeout(3000);

    console.log('URL after sheets navigation:', page.url());

    const hasTipTap = await page.locator('.ProseMirror').isVisible({ timeout: 5000 });
    console.log('TipTap visible with /sheets/ URL:', hasTipTap);

    if (hasTipTap) {
      console.log('✅ /sheets/ URL pattern works');
    }
  });
});