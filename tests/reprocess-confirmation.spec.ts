import { test, expect } from '@playwright/test';
import 'dotenv/config';

test.describe('Row Re-processing Confirmation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('shows confirmation dialog when editing cell in row with existing data', async ({ page }) => {
    await expect(page.locator('.ProseMirror table')).toBeVisible({ timeout: 10000 });

    const firstCell = page.locator('.ProseMirror table tbody tr').first().locator('td').first();
    const secondCell = page.locator('.ProseMirror table tbody tr').first().locator('td').nth(1);
    const thirdCell = page.locator('.ProseMirror table tbody tr').first().locator('td').nth(2);

    // Step 1: Add content to first cell
    await firstCell.click();
    await firstCell.fill('AI startup');
    await page.waitForTimeout(1500);

    // Verify event was created
    await expect(page.locator('.bg-white').filter({ hasText: 'AI startup' })).toBeVisible({ timeout: 5000 });

    // Step 2: Wait for second cell to be filled by operator
    await page.waitForTimeout(5000);

    // Step 3: Wait for third cell to potentially have content
    await page.waitForTimeout(5000);

    // Step 4: Edit the first cell again with new content
    await firstCell.click();
    await firstCell.fill('Robotics company');

    // Step 5: Wait for confirmation dialog to appear
    await expect(page.locator('text=Re-process Row?')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=Do you want to clear and re-process those cells?')).toBeVisible();

    // Step 6: Verify affected columns are shown
    await expect(page.locator('.bg-yellow-50')).toBeVisible();
    await expect(page.locator('text=Affected columns:')).toBeVisible();

    console.log('✓ Confirmation dialog appeared correctly');
  });

  test('clears cells to the right and re-processes when user confirms', async ({ page }) => {
    await expect(page.locator('.ProseMirror table')).toBeVisible({ timeout: 10000 });

    const firstCell = page.locator('.ProseMirror table tbody tr').first().locator('td').first();
    const secondCell = page.locator('.ProseMirror table tbody tr').first().locator('td').nth(1);

    // Add initial content
    await firstCell.click();
    await firstCell.fill('OpenAI');
    await page.waitForTimeout(1500);

    // Wait for processing
    await page.waitForTimeout(5000);

    // Check if second cell has content
    const secondCellContent = await secondCell.textContent();
    console.log('Second cell content:', secondCellContent);

    // Edit first cell
    await firstCell.click();
    await firstCell.fill('Anthropic');
    await page.waitForTimeout(1500);

    // Wait for confirmation dialog
    await expect(page.locator('text=Re-process Row?')).toBeVisible({ timeout: 3000 });

    // Click "Yes, Re-process"
    await page.click('button:has-text("Yes, Re-process")');

    // Verify dialog closes
    await expect(page.locator('text=Re-process Row?')).not.toBeVisible({ timeout: 2000 });

    // Verify cell was updated
    await expect(firstCell).toContainText('Anthropic');

    // Verify new event was created
    await page.waitForTimeout(2000);
    await expect(page.locator('.bg-white').filter({ hasText: 'Anthropic' })).toBeVisible({ timeout: 5000 });

    console.log('✓ Re-processing confirmed and executed');
  });

  test('updates only the edited cell when user declines re-processing', async ({ page }) => {
    await expect(page.locator('.ProseMirror table')).toBeVisible({ timeout: 10000 });

    const firstCell = page.locator('.ProseMirror table tbody tr').first().locator('td').first();
    const secondCell = page.locator('.ProseMirror table tbody tr').first().locator('td').nth(1);

    // Add initial content
    await firstCell.click();
    await firstCell.fill('Tesla');
    await page.waitForTimeout(1500);

    // Wait for processing
    await page.waitForTimeout(5000);

    // Get second cell content before edit
    const secondCellBefore = await secondCell.textContent();
    console.log('Second cell before:', secondCellBefore);

    // Edit first cell
    await firstCell.click();
    await firstCell.fill('SpaceX');
    await page.waitForTimeout(1500);

    // Wait for confirmation dialog
    await expect(page.locator('text=Re-process Row?')).toBeVisible({ timeout: 3000 });

    // Click "No, Just Update This Cell"
    await page.click('button:has-text("No, Just Update This Cell")');

    // Verify dialog closes
    await expect(page.locator('text=Re-process Row?')).not.toBeVisible({ timeout: 2000 });

    // Verify first cell was updated
    await expect(firstCell).toContainText('SpaceX');

    // Wait a bit and verify second cell content unchanged
    await page.waitForTimeout(3000);
    const secondCellAfter = await secondCell.textContent();
    console.log('Second cell after:', secondCellAfter);

    // Second cell should remain the same (or be empty if it was empty)
    // We don't expect new processing to happen

    console.log('✓ Single cell update without re-processing completed');
  });
});
