import { test, expect } from '@playwright/test';

test.describe('Tiptap Table Event Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage before each test
    await page.goto('http://localhost:3000');
  });

  test('page loads with correct title and table component', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Create T3 App/);

    // Check main heading
    await expect(page.locator('h1')).toContainText('Event Queue Test - Tiptap Table');

    // Wait for Tiptap table to load (it loads after hydration)
    await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 10000 });

    // Check that table is present
    await expect(page.locator('.ProseMirror table')).toBeVisible();

    // Check that process events button is present
    await expect(page.locator('button:has-text("Process Events")')).toBeVisible();

    // Check that events section is present
    await expect(page.locator('h3').filter({ hasText: 'Events' })).toBeVisible();
  });

  test('cell edit creates event in queue', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('.ProseMirror table', { timeout: 10000 });

    // Check initial events count
    const initialEventsText = await page.locator('h3:has-text("Events")').textContent();
    console.log('Initial events:', initialEventsText);

    // Click on first cell and type content
    const firstCell = page.locator('.ProseMirror table td').first();
    await firstCell.click();

    // Clear cell and type new content
    await firstCell.selectText();
    await firstCell.fill('test search query');

    // Wait for debounce (1s) + mutation + polling interval (2s) = ~3.5s
    await page.waitForTimeout(3500);

    // Check that events count increased
    await expect(page.locator('h3:has-text("Events")')).toContainText('Events (1)');

    // Check that the event appears in the events list
    await expect(page.locator('text=cell_update')).toBeVisible();
    await expect(page.locator('text=test search query')).toBeVisible();
  });

  test('process events button triggers server processing', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('.ProseMirror table', { timeout: 10000 });

    // First, create an event by editing a cell
    const firstCell = page.locator('.ProseMirror table td').first();
    await firstCell.click();
    await firstCell.selectText();
    await firstCell.fill('weather NYC');

    // Wait for event to be created
    await page.waitForTimeout(2000);
    await expect(page.locator('text=cell_update')).toBeVisible();

    // Click process events button
    await page.click('button:has-text("Process Events")');

    // Wait for processing to complete
    await page.waitForTimeout(3000);

    // Refresh events to see the processed status
    await page.click('button:has-text("Refresh Events")');
    await page.waitForTimeout(1000);

    // Check that event status changed to completed
    await expect(page.locator('text=completed')).toBeVisible();

    // The processed result should appear in adjacent cell
    // Note: This tests the complete flow from cell edit -> queue -> processing -> result
  });

  test('events display with correct information', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('.ProseMirror table', { timeout: 10000 });

    // Create an event
    const firstCell = page.locator('.ProseMirror table td').first();
    await firstCell.click();
    await firstCell.selectText();
    await firstCell.fill('test content');

    // Wait for event to appear
    await page.waitForTimeout(2000);

    // Check event information
    await expect(page.locator('text=cell_update')).toBeVisible();
    await expect(page.locator('text=pending')).toBeVisible();

    // Check that payload contains the correct data
    const eventPayload = page.locator('.text-xs.text-gray-500');
    await expect(eventPayload).toContainText('test content');
    await expect(eventPayload).toContainText('rowIndex');
    await expect(eventPayload).toContainText('colIndex');
  });

  test('multiple events can be created and processed', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('.ProseMirror table', { timeout: 10000 });

    // Create first event
    const firstCell = page.locator('.ProseMirror table td').first();
    await firstCell.click();
    await firstCell.selectText();
    await firstCell.fill('first query');
    await page.waitForTimeout(1000);

    // Create second event
    const secondCell = page.locator('.ProseMirror table td').nth(1);
    await secondCell.click();
    await secondCell.selectText();
    await secondCell.fill('second query');
    await page.waitForTimeout(1000);

    // Check that we have 2 events
    await expect(page.locator('h3:has-text("Events")')).toContainText('Events (2)');

    // Process all events
    await page.click('button:has-text("Process Events")');
    await page.waitForTimeout(3000);

    // Refresh to see results
    await page.click('button:has-text("Refresh Events")');
    await page.waitForTimeout(1000);

    // All events should be completed
    const completedEvents = page.locator('text=completed');
    await expect(completedEvents).toHaveCount(2);
  });
});