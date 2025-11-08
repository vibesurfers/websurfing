import { test, expect } from '@playwright/test';

test.describe('Complete Tiptap Table Flow', () => {
  const testUserId = 'e1879083-6ac1-4c73-970d-0a01a11f5a3f';

  test.beforeEach(async ({ page }) => {
    // Set up authentication bypass headers for tRPC calls
    await page.setExtraHTTPHeaders({
      'x-bypass-user-id': testUserId
    });

    await page.goto('http://localhost:3003');

    // Wait for table to fully load
    await expect(page.locator('.ProseMirror table')).toBeVisible({ timeout: 10000 });
  });

  test('cell edit creates event in queue and sheet updates flow', async ({ page }) => {
    // Create a unique test string to track through the flow
    const uniqueContent = `test-${Date.now()}`;

    // Step 1: Edit a cell to create an event
    console.log('Step 1: Editing cell with content:', uniqueContent);
    const firstCell = page.locator('.ProseMirror table td').first();
    await firstCell.click();
    await firstCell.fill(uniqueContent);

    // Wait for debouncing and event creation
    await page.waitForTimeout(2000);

    // Step 2: Verify event was created in the queue
    console.log('Step 2: Verifying event was created');
    await expect(page.locator('.bg-white').filter({ hasText: uniqueContent })).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.bg-white').filter({ hasText: uniqueContent }).locator('text=pending')).toBeVisible();

    // Step 3: Trigger sheet update processing via API with bypass userId
    console.log('Step 3: Triggering sheet update via API');
    const response = await page.evaluate(async (userId) => {
      return fetch(`/api/update-sheet?userId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    }, testUserId);

    // Wait for processing to complete
    await page.waitForTimeout(3000);

    // Step 4: Refresh events to see processing results
    console.log('Step 4: Refreshing events to see results');
    await page.click('button:has-text("Refresh Events")');
    await page.waitForTimeout(1000);

    // Step 5: Verify event was marked as completed
    console.log('Step 5: Verifying event completion');
    await expect(page.locator('.bg-white').filter({ hasText: uniqueContent }).locator('text=completed')).toBeVisible({ timeout: 5000 });

    // Step 6: CRITICAL TEST - Verify content appears in the cell to the right
    console.log('Step 6: Checking if content was copied to adjacent cell');

    // Get the second cell (to the right of the first cell)
    const secondCell = page.locator('.ProseMirror table td').nth(1);

    // The SheetUpdater should have applied the sheet update, putting the same content in the adjacent cell
    await expect(secondCell).toContainText(uniqueContent, { timeout: 10000 });

    console.log('✅ Complete flow verified: Cell edit → Event queue → Processing → Adjacent cell update');
  });

  test('multiple cells process independently', async ({ page }) => {
    const content1 = `test-1-${Date.now()}`;
    const content2 = `test-2-${Date.now()}`;

    // Edit first cell
    console.log('Editing first cell:', content1);
    const firstCell = page.locator('.ProseMirror table td').first();
    await firstCell.click();
    await firstCell.fill(content1);
    await page.waitForTimeout(1000);

    // Edit third cell (skip second cell which will receive copy of first)
    console.log('Editing third cell:', content2);
    const thirdCell = page.locator('.ProseMirror table td').nth(2);
    await thirdCell.click();
    await thirdCell.fill(content2);
    await page.waitForTimeout(2000);

    // Verify both events were created
    await expect(page.locator('.bg-white').filter({ hasText: content1 })).toBeVisible();
    await expect(page.locator('.bg-white').filter({ hasText: content2 })).toBeVisible();

    // Process events via API with bypass userId
    await page.evaluate(async (userId) => {
      return fetch(`/api/update-sheet?userId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    }, testUserId);
    await page.waitForTimeout(3000);
    await page.click('button:has-text("Refresh Events")');
    await page.waitForTimeout(1000);

    // Verify both events completed
    await expect(page.locator('.bg-white').filter({ hasText: content1 }).locator('text=completed')).toBeVisible();
    await expect(page.locator('.bg-white').filter({ hasText: content2 }).locator('text=completed')).toBeVisible();

    // Verify content was copied to adjacent cells
    const secondCell = page.locator('.ProseMirror table td').nth(1); // Right of first cell
    const fourthCell = page.locator('.ProseMirror table td').nth(3); // Right of third cell

    await expect(secondCell).toContainText(content1, { timeout: 5000 });
    await expect(fourthCell).toContainText(content2, { timeout: 5000 });

    console.log('✅ Multiple cell processing verified');
  });

  test('event count appears in adjacent cell', async ({ page }) => {
    const testContent = `weather-${Date.now()}`;

    // Edit cell and wait for event
    const targetCell = page.locator('.ProseMirror table td').nth(4); // Use 5th cell
    await targetCell.click();
    await targetCell.fill(testContent);
    await page.waitForTimeout(2000);

    // Verify event exists
    await expect(page.locator('.bg-white').filter({ hasText: testContent })).toBeVisible();

    // Process the event via API with bypass userId
    await page.evaluate(async (userId) => {
      return fetch(`/api/update-sheet?userId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    }, testUserId);
    await page.waitForTimeout(3000);

    // The content should now appear in the cell to the right (6th cell)
    const adjacentCell = page.locator('.ProseMirror table td').nth(5);
    await expect(adjacentCell).toContainText(testContent, { timeout: 8000 });

    // Verify original cell still has the content
    await expect(targetCell).toContainText(testContent);

    console.log('✅ Content successfully copied from original cell to adjacent cell');
  });
});