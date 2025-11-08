// Keeping for legacy compatibility only

export class EventProcessor {
  async processPendingEvents() {
    console.log('EventProcessor: No longer used - SheetUpdater handles event processing directly');

    // Return empty result since SheetUpdater now handles this
    return { processed: 0 };
  }
}