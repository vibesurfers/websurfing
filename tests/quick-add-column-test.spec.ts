import { test, expect } from '@playwright/test';

test.describe('Quick Add Column Test', () => {
  const testUserId = 'e1879083-6ac1-4c73-970d-0a01a11f5a3f';

  test('test add column after database fix', async ({ page }) => {
    // Set up authentication bypass
    await page.setExtraHTTPHeaders({
      'x-bypass-user-id': testUserId
    });

    // Navigate to welcome page
    await page.goto('http://localhost:3000/welcome');
    await page.waitForTimeout(2000);

    // Try to create a sheet
    const templateButtons = page.locator('button').filter({ hasText: /🔥|📊|🧬|lucky|marketing|scientific/i });
    const templateCount = await templateButtons.count();
    console.log('Template buttons found:', templateCount);

    if (templateCount > 0) {
      console.log('Creating new sheet...');
      await templateButtons.first().click();
      await page.waitForTimeout(3000);

      const currentUrl = page.url();
      console.log('URL after template click:', currentUrl);

      // Check if we have TipTap table
      const hasTipTap = await page.locator('.ProseMirror').isVisible({ timeout: 5000 });
      console.log('TipTap visible:', hasTipTap);

      if (hasTipTap) {
        // Look for add column button
        const addColumnButtons = page.locator('div').filter({ hasText: '+' });
        const addButtonCount = await addColumnButtons.count();
        console.log('Add buttons found:', addButtonCount);

        // Test if we can add a column
        if (addButtonCount > 0) {
          const addColumnButton = addColumnButtons.first();
          console.log('Clicking add column button...');
          await addColumnButton.click();
          await page.waitForTimeout(1000);

          // Check if column input appeared
          const columnInput = page.locator('input[placeholder*="column"], input[placeholder*="title"]');
          const inputVisible = await columnInput.isVisible({ timeout: 2000 });
          console.log('Column input visible:', inputVisible);

          if (inputVisible) {
            console.log('✅ Add column functionality is working!');
          } else {
            console.log('❌ Column input not visible after click');
          }
        }
      }
    } else {
      // Try navigating directly
      console.log('No template buttons found, trying direct navigation...');
      await page.goto('http://localhost:3000/');
      await page.waitForTimeout(2000);
      console.log('Direct navigation URL:', page.url());
    }
  });
});