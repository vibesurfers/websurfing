import { test, expect } from '@playwright/test';

test.describe('Add Column Functionality', () => {
  const testUserId = 'e1879083-6ac1-4c73-970d-0a01a11f5a3f';

  test.beforeEach(async ({ page }) => {
    // Set up authentication bypass headers for tRPC calls
    await page.setExtraHTTPHeaders({
      'x-bypass-user-id': testUserId
    });

    // First navigate to welcome to create/find a sheet
    await page.goto('http://localhost:3000/welcome');
    await page.waitForTimeout(2000);

    // Try to find existing sheet button or create one
    const existingSheets = page.locator('button').filter({ hasText: /\d{1,2}\/\d{1,2}\/\d{4}/ });
    const existingSheetCount = await existingSheets.count();

    if (existingSheetCount > 0) {
      console.log('Found existing sheet, clicking...');
      await existingSheets.first().click();
    } else {
      // Create new sheet by clicking template button
      console.log('Creating new sheet...');
      // Look for template buttons with emojis
      const templateButton = page.locator('button').filter({ hasText: /🔥|📊|🧬/ }).first();
      if (await templateButton.isVisible()) {
        await templateButton.click();
      } else {
        // Fallback: look for any button that might create a sheet
        const createButtons = page.locator('button').filter({ hasText: /lucky|marketing|scientific/i });
        if (await createButtons.count() > 0) {
          await createButtons.first().click();
        } else {
          // Direct navigation if welcome flow isn't working
          console.log('Trying direct sheet navigation...');
          await page.goto('http://localhost:3000/?sheetId=test-sheet-id');
        }
      }
    }

    // Wait for navigation and table to load
    await page.waitForTimeout(3000);

    // Check if we successfully got to a sheet page
    const currentUrl = page.url();
    console.log('Current URL after setup:', currentUrl);

    // Wait for table to load completely
    await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.ProseMirror table')).toBeVisible();
  });

  test('add column button is visible and clickable', async ({ page }) => {
    // Check add column button exists
    const addColumnButton = page.locator('div').filter({ hasText: '+' }).nth(0);
    await expect(addColumnButton).toBeVisible();

    // Verify it's in the right position (should be on the right side)
    const buttonBox = await addColumnButton.boundingBox();
    const tableBox = await page.locator('.ProseMirror table').boundingBox();
    expect(buttonBox).toBeTruthy();
    expect(tableBox).toBeTruthy();

    if (buttonBox && tableBox) {
      // Button should be to the right of the table
      expect(buttonBox.x).toBeGreaterThan(tableBox.x + tableBox.width - 100);
    }
  });

  test('clicking add column button triggers column addition', async ({ page }) => {
    // Count initial columns
    const initialColumns = await page.locator('.ProseMirror table colgroup col').count();
    console.log('Initial column count:', initialColumns);

    // Count initial cells in first row
    const initialCells = await page.locator('.ProseMirror table tbody tr').first().locator('td').count();
    console.log('Initial cells in first row:', initialCells);

    // Click add column button
    const addColumnButton = page.locator('div').filter({ hasText: '+' }).nth(0);
    await addColumnButton.click();

    // Wait for TipTap command to execute
    await page.waitForTimeout(500);

    // Check if column was added
    const newColumns = await page.locator('.ProseMirror table colgroup col').count();
    const newCells = await page.locator('.ProseMirror table tbody tr').first().locator('td').count();

    console.log('New column count:', newColumns);
    console.log('New cells in first row:', newCells);

    // Verify column was added
    expect(newColumns).toBe(initialColumns + 1);
    expect(newCells).toBe(initialCells + 1);

    // Check if column input dialog appears
    await expect(page.locator('input[placeholder*="column"]')).toBeVisible({ timeout: 2000 });
  });

  test('column title input and submission works', async ({ page }) => {
    // Click add column button
    const addColumnButton = page.locator('div').filter({ hasText: '+' }).nth(0);
    await addColumnButton.click();

    // Wait for input dialog
    const columnInput = page.locator('input[placeholder*="column"]');
    await expect(columnInput).toBeVisible({ timeout: 2000 });

    // Type column title
    const columnTitle = `TestColumn_${Date.now()}`;
    await columnInput.fill(columnTitle);

    // Submit (press Enter or find submit button)
    await columnInput.press('Enter');

    // Wait for submission to complete
    await page.waitForTimeout(1000);

    // Verify input dialog is gone
    await expect(columnInput).not.toBeVisible();

    // Check if column header was added (look for the title in the header row)
    const headerRows = page.locator('table thead tr');
    if (await headerRows.count() > 0) {
      await expect(headerRows.first().locator('th').last()).toContainText(columnTitle);
    }
  });

  test('cancel column addition removes temporary column', async ({ page }) => {
    // Count initial columns
    const initialColumns = await page.locator('.ProseMirror table colgroup col').count();

    // Click add column button
    const addColumnButton = page.locator('div').filter({ hasText: '+' }).nth(0);
    await addColumnButton.click();

    // Wait for column to be added
    await page.waitForTimeout(500);

    // Verify column was temporarily added
    const tempColumns = await page.locator('.ProseMirror table colgroup col').count();
    expect(tempColumns).toBe(initialColumns + 1);

    // Find and clear the input (simulate cancel)
    const columnInput = page.locator('input[placeholder*="column"]');
    await expect(columnInput).toBeVisible({ timeout: 2000 });

    // Clear input and press Enter to cancel
    await columnInput.clear();
    await columnInput.press('Enter');

    // Wait for cancellation to complete
    await page.waitForTimeout(1000);

    // Verify column count returned to original
    const finalColumns = await page.locator('.ProseMirror table colgroup col').count();
    expect(finalColumns).toBe(initialColumns);
  });

  test('table structure integrity after column operations', async ({ page }) => {
    // Get initial table structure
    const initialRows = await page.locator('.ProseMirror table tbody tr').count();
    const initialColumns = await page.locator('.ProseMirror table colgroup col').count();

    // Add a column
    const addColumnButton = page.locator('div').filter({ hasText: '+' }).nth(0);
    await addColumnButton.click();

    // Submit with valid title
    const columnInput = page.locator('input[placeholder*="column"]');
    await expect(columnInput).toBeVisible({ timeout: 2000 });
    await columnInput.fill('TestColumn');
    await columnInput.press('Enter');

    // Wait for completion
    await page.waitForTimeout(1000);

    // Verify table structure
    const finalRows = await page.locator('.ProseMirror table tbody tr').count();
    const finalColumns = await page.locator('.ProseMirror table colgroup col').count();

    // Row count should be same, column count should increase
    expect(finalRows).toBe(initialRows);
    expect(finalColumns).toBe(initialColumns + 1);

    // Verify all rows have the correct number of cells
    const rows = page.locator('.ProseMirror table tbody tr');
    const rowCount = await rows.count();

    for (let i = 0; i < rowCount; i++) {
      const cellCount = await rows.nth(i).locator('td').count();
      expect(cellCount).toBe(finalColumns);
    }

    // Check for any trailing paragraph elements (the spacer issue)
    const trailingP = page.locator('.ProseMirror > p').last();
    const trailingPText = await trailingP.textContent();

    // Should not have visible trailing paragraph with just breaks
    if (trailingPText && trailingPText.trim() === '') {
      console.warn('Found empty trailing paragraph - this might be the spacer issue');
    }
  });

  test('verify TipTap editor state after column addition', async ({ page }) => {
    // Get the editor's HTML content before
    const initialHTML = await page.locator('.ProseMirror').innerHTML();
    const initialTableHTML = await page.locator('.ProseMirror table').innerHTML();

    console.log('Initial table structure:');
    console.log(initialTableHTML.substring(0, 200) + '...');

    // Add column
    const addColumnButton = page.locator('div').filter({ hasText: '+' }).nth(0);
    await addColumnButton.click();

    // Submit with title
    const columnInput = page.locator('input[placeholder*="column"]');
    await expect(columnInput).toBeVisible({ timeout: 2000 });
    await columnInput.fill('NewColumn');
    await columnInput.press('Enter');

    // Wait for changes
    await page.waitForTimeout(1000);

    // Get final HTML content
    const finalHTML = await page.locator('.ProseMirror').innerHTML();
    const finalTableHTML = await page.locator('.ProseMirror table').innerHTML();

    console.log('Final table structure:');
    console.log(finalTableHTML.substring(0, 200) + '...');

    // Verify changes occurred
    expect(finalHTML).not.toBe(initialHTML);
    expect(finalTableHTML).not.toBe(initialTableHTML);

    // Check for proper tableWrapper structure
    await expect(page.locator('.ProseMirror .tableWrapper')).toBeVisible();
    await expect(page.locator('.ProseMirror .tableWrapper table')).toBeVisible();

    // Verify no orphaned elements
    const proseMirrorChildren = await page.locator('.ProseMirror').evaluate(el => {
      return Array.from(el.children).map(child => ({
        tagName: child.tagName,
        className: child.className,
        textContent: child.textContent?.trim().substring(0, 50)
      }));
    });

    console.log('ProseMirror children after column addition:', proseMirrorChildren);

    // Should primarily contain tableWrapper, minimal other elements
    const nonTableElements = proseMirrorChildren.filter(child => !child.className.includes('tableWrapper'));
    expect(nonTableElements.length).toBeLessThanOrEqual(1); // Allow for at most one other element
  });
});