import { db } from "@/server/db";
import { eventQueue } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { SheetUpdater } from "./sheet-updater";

class BackgroundEventProcessor {
  private isRunning = false;
  private pollInterval = 1000;
  private processingSheets = new Set<string>();
  private sheetUpdater: SheetUpdater;

  constructor() {
    this.sheetUpdater = new SheetUpdater();
  }

  async start() {
    if (this.isRunning) {
      console.log('[BackgroundProcessor] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[BackgroundProcessor] Started');

    void this.processLoop();
  }

  async stop() {
    this.isRunning = false;
    console.log('[BackgroundProcessor] Stopped');
  }

  private async processLoop() {
    while (this.isRunning) {
      try {
        await this.tick();
      } catch (error) {
        console.error('[BackgroundProcessor] Error in process loop:', error);
      }

      await this.sleep(this.pollInterval);
    }
  }

  private async tick() {
    const pendingEvents = await db
      .select()
      .from(eventQueue)
      .where(eq(eventQueue.status, 'pending'))
      .limit(50);

    if (pendingEvents.length === 0) {
      return;
    }

    console.log(`[BackgroundProcessor] Found ${pendingEvents.length} pending events`);

    const sheetGroups = new Map<string, typeof pendingEvents>();

    for (const event of pendingEvents) {
      if (!sheetGroups.has(event.sheet_id)) {
        sheetGroups.set(event.sheet_id, []);
      }
      sheetGroups.get(event.sheet_id)!.push(event);
    }

    const processingPromises: Promise<unknown>[] = [];

    for (const [sheetId, events] of sheetGroups) {
      if (this.processingSheets.has(sheetId)) {
        console.log(`[BackgroundProcessor] Sheet ${sheetId} already processing, skipping`);
        continue;
      }

      this.processingSheets.add(sheetId);

      const userId = events[0]!.user_id;

      const promise = this.sheetUpdater
        .updateSheet(userId, sheetId)
        .finally(() => {
          this.processingSheets.delete(sheetId);
        });

      processingPromises.push(promise);
    }

    await Promise.allSettled(processingPromises);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

let processorInstance: BackgroundEventProcessor | null = null;

export function getBackgroundProcessor(): BackgroundEventProcessor {
  if (!processorInstance) {
    processorInstance = new BackgroundEventProcessor();
  }
  return processorInstance;
}

export function startBackgroundProcessor() {
  const processor = getBackgroundProcessor();
  void processor.start();
  return processor;
}
