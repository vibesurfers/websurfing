import { test, expect } from '@playwright/test';

test.describe('Basic Table Event Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('table loads and is functional', async ({ page }) => {
    // Check page loads
    await expect(page.locator('h1')).toContainText('Event Queue Test - Tiptap Table');

    // Wait for table to load
    await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.ProseMirror table')).toBeVisible();

    // Check table has proper borders
    const firstCell = page.locator('.ProseMirror table td').first();
    await expect(firstCell).toBeVisible();

    // Verify table cells are editable
    await firstCell.click();
    await expect(firstCell).toBeFocused();

    // Type some content
    const uniqueText = `test-${Date.now()}`;
    await firstCell.fill(uniqueText);

    // Verify content was entered
    await expect(firstCell).toContainText(uniqueText);

    // Check that buttons are present and functional
    await expect(page.locator('button:has-text("Process Events")')).toBeVisible();
    await expect(page.locator('button:has-text("Refresh Events")')).toBeVisible();

    // Check events section exists
    await expect(page.locator('h3').filter({ hasText: 'Events' })).toBeVisible();

    // Verify our content created an event (wait for it to appear)
    await page.waitForTimeout(2000);
    await expect(page.locator('.bg-white').filter({ hasText: uniqueText })).toBeVisible({ timeout: 5000 });
  });

  test('process events functionality works', async ({ page }) => {
    // Wait for table
    await expect(page.locator('.ProseMirror table')).toBeVisible({ timeout: 10000 });

    // Add unique content to a cell
    const uniqueText = `weather-${Date.now()}`;
    const cell = page.locator('.ProseMirror table td').first();
    await cell.click();
    await cell.fill(uniqueText);

    // Wait for event to be created
    await page.waitForTimeout(2000);

    // Verify event exists
    await expect(page.locator('.bg-white').filter({ hasText: uniqueText })).toBeVisible();

    // Click process events
    await page.click('button:has-text("Process Events")');

    // Wait for processing
    await page.waitForTimeout(3000);

    // Check if processing completed (look for completed status)
    await page.click('button:has-text("Refresh Events")');
    await page.waitForTimeout(1000);

    // The event should show as completed
    const eventBlock = page.locator('.bg-white').filter({ hasText: uniqueText });
    await expect(eventBlock.locator('text=completed')).toBeVisible({ timeout: 5000 });

    console.log('Event processing test completed successfully!');
  });
});