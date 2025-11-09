import { test, expect } from '@playwright/test';

test.describe('Debug Navigation', () => {
  const testUserId = 'e1879083-6ac1-4c73-970d-0a01a11f5a3f';

  test.beforeEach(async ({ page }) => {
    // Set up authentication bypass headers for tRPC calls
    await page.setExtraHTTPHeaders({
      'x-bypass-user-id': testUserId
    });
  });

  test('debug current page state', async ({ page }) => {
    // Try navigating directly to root
    await page.goto('http://localhost:3000/');
    await page.waitForTimeout(3000);

    console.log('After goto root URL:', page.url());
    const h1Text = await page.locator('h1').first().textContent();
    console.log('H1 Text:', h1Text);

    // Check if we have sheets listed on the welcome page
    const hasWebsets = await page.locator('text=🌊 Your Websets').isVisible();
    const hasCreateWebset = await page.locator('text=🏄 Catch a Wave').isVisible();

    console.log('Has "🌊 Your Websets" section:', hasWebsets);
    console.log('Has "🏄 Catch a Wave" section:', hasCreateWebset);

    // Print page content for debugging
    const pageContent = await page.content();
    console.log('Page contains "Websets":', pageContent.includes('Websets'));
    console.log('Page contains "Catch":', pageContent.includes('Catch'));

    // Look for any h2 elements
    const h2Elements = await page.locator('h2').allTextContents();
    console.log('H2 elements:', h2Elements);

    // If we're on welcome page, check for existing sheets
    if (hasWebsets) {
      // Look for sheet buttons more broadly
      const sheetButtons = page.locator('[class*="bg-gray-50 hover:bg-blue-50"]').or(
        page.locator('button').filter({ hasText: /sheet|webset/i })
      );
      const sheetCount = await sheetButtons.count();
      console.log('Sheet buttons found:', sheetCount);

      if (sheetCount > 0) {
        console.log('Found existing sheet, clicking...');
        await sheetButtons.first().click();
        await page.waitForTimeout(2000);
        console.log('After click URL:', page.url());

        const hasTipTap = await page.locator('.ProseMirror').isVisible();
        console.log('TipTap visible after navigation:', hasTipTap);
      }
    }

    // Try creating a sheet if we're still on welcome
    if (hasCreateWebset) {
      const templateButtons = page.locator('button').filter({ hasText: /🔥|📊|🧬/ });
      const templateCount = await templateButtons.count();
      console.log('Template buttons found:', templateCount);

      if (templateCount > 0) {
        console.log('Clicking template button...');
        await templateButtons.first().click();
        await page.waitForTimeout(3000);
        console.log('After template click URL:', page.url());

        const hasTipTap = await page.locator('.ProseMirror').isVisible();
        console.log('TipTap visible after creating sheet:', hasTipTap);
      }
    }
  });

  test('try creating new sheet', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);

    // Try to create a new sheet
    const templateButtons = page.locator('button').filter({ hasText: /Lucky|Marketing|Scientific/ });
    const buttonCount = await templateButtons.count();
    console.log('Template buttons found:', buttonCount);

    if (buttonCount > 0) {
      console.log('Clicking first template button...');
      await templateButtons.first().click();
      await page.waitForTimeout(3000);

      console.log('After template click URL:', page.url());
      const hasTipTap = await page.locator('.ProseMirror').isVisible();
      console.log('TipTap visible after creating sheet:', hasTipTap);

      if (hasTipTap) {
        // Check for add column button
        const addColumnButton = page.locator('div').filter({ hasText: '+' }).first();
        const addColumnVisible = await addColumnButton.isVisible();
        console.log('Add column button visible:', addColumnVisible);

        if (addColumnVisible) {
          const addColumnBox = await addColumnButton.boundingBox();
          console.log('Add column button position:', addColumnBox);
        }
      }
    }
  });
});