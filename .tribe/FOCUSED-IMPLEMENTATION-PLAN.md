# Focused Implementation Plan: Tiptap Table → Event Queue → Server Response

## Goal
Implement the minimal viable flow: User edits cell → Event goes to queue → Server processes → Client updates.

**Success Criteria**:
- User types in a Tiptap table cell
- Event gets written to Neon database queue
- Server processes the event (mock response)
- Client receives update and displays it
- All verified by Playwright test

---

## Phase 1: Setup Dependencies & Basic Table

### 1.1 Install Required Dependencies
```bash
pnpm add @tiptap/react @tiptap/starter-kit @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-header @tiptap/extension-table-cell
```

### 1.2 Replace Homepage with Tiptap Table
**Target**: `src/app/page.tsx`

```typescript
// Simple 2x8 table on homepage
import { TiptapTable } from '@/components/tiptap-table'

export default function HomePage() {
  return (
    <main className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Event Queue Test</h1>
      <TiptapTable />
    </main>
  )
}
```

### 1.3 Create Basic Tiptap Table Component
**Target**: `src/components/tiptap-table.tsx`

```typescript
'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'

const initialContent = `
  <table>
    <tbody>
      <tr><td>Cell 1</td><td>Cell 2</td></tr>
      <tr><td></td><td></td></tr>
      <tr><td></td><td></td></tr>
      <tr><td></td><td></td></tr>
      <tr><td></td><td></td></tr>
      <tr><td></td><td></td></tr>
      <tr><td></td><td></td></tr>
      <tr><td></td><td></td></tr>
    </tbody>
  </table>
`

export function TiptapTable() {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      // TODO: This will trigger our event queue
      console.log('Table updated:', editor.getHTML())
    },
  })

  if (!editor) return null

  return (
    <div className="border rounded p-4">
      <EditorContent editor={editor} />
    </div>
  )
}
```

---

## Phase 2: Minimal Database Schema

### 2.1 Add Basic Tables to Schema
**Target**: `src/server/db/schema.ts`

```typescript
// Add to existing schema.ts
export const cells = createTable(
  "cell",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    rowIndex: d.integer().notNull(),
    colIndex: d.integer().notNull(),
    content: d.text(),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow(),
    updatedAt: d.timestamp({ withTimezone: true }).defaultNow().$onUpdate(() => new Date()),
  }),
  (t) => [
    index("cell_position_idx").on(t.rowIndex, t.colIndex),
    unique("cell_unique_position").on(t.rowIndex, t.colIndex),
  ]
);

export const eventQueue = createTable(
  "event_queue",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    eventType: d.varchar({ length: 100 }).notNull(),
    payload: d.jsonb().notNull(),
    status: d.varchar({ length: 20 }).default('pending'),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow(),
    processedAt: d.timestamp({ withTimezone: true }),
  }),
  (t) => [
    index("event_queue_status_idx").on(t.status),
    index("event_queue_created_idx").on(t.createdAt),
  ]
);
```

### 2.2 Generate and Run Migration
```bash
pnpm db:generate
pnpm db:migrate
```

---

## Phase 3: Event Flow Implementation

### 3.1 Create tRPC Router for Cell Updates
**Target**: `src/server/api/routers/cell.ts`

```typescript
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { cells, eventQueue } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

export const cellRouter = createTRPCRouter({
  updateCell: publicProcedure
    .input(z.object({
      rowIndex: z.number(),
      colIndex: z.number(),
      content: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. Update/insert cell
      await ctx.db.insert(cells).values({
        rowIndex: input.rowIndex,
        colIndex: input.colIndex,
        content: input.content,
      }).onConflictDoUpdate({
        target: [cells.rowIndex, cells.colIndex],
        set: {
          content: input.content,
          updatedAt: new Date(),
        }
      });

      // 2. Add event to queue
      await ctx.db.insert(eventQueue).values({
        eventType: 'cell_update',
        payload: input,
        status: 'pending',
      });

      return { success: true };
    }),

  getEvents: publicProcedure
    .query(async ({ ctx }) => {
      return await ctx.db.select().from(eventQueue).orderBy(eventQueue.createdAt);
    }),
});
```

### 3.2 Add Router to Root
**Target**: `src/server/api/root.ts`

```typescript
// Add to existing routers
import { cellRouter } from "./routers/cell";

export const appRouter = createCallerFactory(createTRPCRouter({
  post: postRouter,
  cell: cellRouter, // Add this line
}));
```

### 3.3 Update Tiptap Component to Use tRPC
**Target**: `src/components/tiptap-table.tsx`

```typescript
'use client'

import { api } from "@/trpc/react";
// ... existing imports

export function TiptapTable() {
  const updateCell = api.cell.updateCell.useMutation();
  const { data: events } = api.cell.getEvents.useQuery();

  const editor = useEditor({
    // ... existing config
    onUpdate: ({ editor }) => {
      // Parse table and find changed cell
      const html = editor.getHTML();
      // TODO: Parse HTML to detect which cell changed
      // For now, mock it:
      updateCell.mutate({
        rowIndex: 0,
        colIndex: 0,
        content: 'test content',
      });
    },
  });

  return (
    <div className="space-y-4">
      <div className="border rounded p-4">
        <EditorContent editor={editor} />
      </div>

      {/* Debug: Show events */}
      <div className="text-sm text-gray-600">
        <h3>Events ({events?.length || 0}):</h3>
        {events?.slice(-3).map(event => (
          <div key={event.id} className="bg-gray-100 p-2 rounded">
            {event.eventType}: {JSON.stringify(event.payload)}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Phase 4: Playwright Test

### 4.1 Install Playwright
```bash
pnpm add -D @playwright/test
npx playwright install
```

### 4.2 Create Test File
**Target**: `tests/cell-event-flow.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test('cell edit creates queue event and processes response', async ({ page }) => {
  // 1. Navigate to homepage
  await page.goto('http://localhost:3000');

  // 2. Wait for Tiptap table to load
  await page.waitForSelector('.ProseMirror table');

  // 3. Click on first cell and type
  const firstCell = page.locator('.ProseMirror table td').first();
  await firstCell.click();
  await firstCell.fill('test search query');

  // 4. Wait for event to appear in debug section
  await page.waitForSelector('text=Events (1):', { timeout: 5000 });

  // 5. Verify event was created
  await expect(page.locator('text=cell_update')).toBeVisible();
  await expect(page.locator('text=test search query')).toBeVisible();

  // 6. TODO: Verify server processing and response
  // For now, just verify the event was queued
});

test('server processes event and updates client', async ({ page }) => {
  // TODO: Test the complete round-trip:
  // - User types in cell
  // - Event goes to queue
  // - Server processes (mock Google search)
  // - Result appears in adjacent cell
});
```

### 4.3 Add Test Script
**Target**: `package.json`

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

---

## Phase 5: Server-Side Event Processing

### 5.1 Create Simple Event Processor
**Target**: `src/server/event-processor.ts`

```typescript
import { db } from "@/server/db";
import { eventQueue, cells } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export class EventProcessor {
  async processPendingEvents() {
    const pendingEvents = await db
      .select()
      .from(eventQueue)
      .where(eq(eventQueue.status, 'pending'))
      .limit(10);

    for (const event of pendingEvents) {
      await this.processEvent(event);
    }
  }

  private async processEvent(event: any) {
    try {
      // Mock processing based on event type
      if (event.eventType === 'cell_update') {
        const payload = event.payload as { rowIndex: number, colIndex: number, content: string };

        // Mock "Google search" - just append " (processed)" to content
        const processedContent = payload.content + ' (processed)';

        // Update adjacent cell (colIndex + 1)
        await db.insert(cells).values({
          rowIndex: payload.rowIndex,
          colIndex: payload.colIndex + 1,
          content: processedContent,
        }).onConflictDoUpdate({
          target: [cells.rowIndex, cells.colIndex],
          set: {
            content: processedContent,
            updatedAt: new Date(),
          }
        });
      }

      // Mark event as processed
      await db
        .update(eventQueue)
        .set({
          status: 'completed',
          processedAt: new Date(),
        })
        .where(eq(eventQueue.id, event.id));

    } catch (error) {
      await db
        .update(eventQueue)
        .set({ status: 'failed' })
        .where(eq(eventQueue.id, event.id));
    }
  }
}
```

### 5.2 Create API Route to Trigger Processing
**Target**: `src/app/api/process-events/route.ts`

```typescript
import { EventProcessor } from "@/server/event-processor";
import { NextResponse } from "next/server";

export async function POST() {
  const processor = new EventProcessor();
  await processor.processPendingEvents();
  return NextResponse.json({ success: true });
}
```

### 5.3 Add Client-Side Processing Trigger
**Target**: `src/components/tiptap-table.tsx`

```typescript
// Add to component
const triggerProcessing = async () => {
  await fetch('/api/process-events', { method: 'POST' });
  // Refetch events to see results
  await utils.cell.getEvents.invalidate();
};

// Add button to UI
<button
  onClick={triggerProcessing}
  className="bg-blue-500 text-white px-4 py-2 rounded"
>
  Process Events
</button>
```

---

## Phase 6: Real-time Updates (Optional)

### 6.1 Add Polling for Real-time Feel
**Target**: `src/components/tiptap-table.tsx`

```typescript
// Add polling to see processed results
const { data: events } = api.cell.getEvents.useQuery(undefined, {
  refetchInterval: 2000, // Poll every 2 seconds
});
```

### 6.2 Enhanced Test with Processing
**Target**: `tests/cell-event-flow.spec.ts`

```typescript
test('complete flow: edit -> queue -> process -> update', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Type in first cell
  const firstCell = page.locator('.ProseMirror table td').first();
  await firstCell.click();
  await firstCell.fill('weather NYC');

  // Click process button
  await page.click('text=Process Events');

  // Wait for processing to complete and UI to update
  await page.waitForTimeout(3000);

  // Verify processed result appears in second cell
  const secondCell = page.locator('.ProseMirror table td').nth(1);
  await expect(secondCell).toContainText('weather NYC (processed)');
});
```

---

## Implementation Order

### Day 1: Basic Setup
1. ✅ Install Tiptap dependencies
2. ✅ Create basic table component
3. ✅ Replace homepage
4. ✅ Test table renders and accepts input

### Day 2: Database & Events
1. ✅ Add schema tables (cells, eventQueue)
2. ✅ Run migrations
3. ✅ Create tRPC cell router
4. ✅ Connect table to tRPC mutations

### Day 3: Processing & Tests
1. ✅ Create event processor
2. ✅ Add processing API route
3. ✅ Write Playwright tests
4. ✅ Verify complete flow works

### Day 4: Polish & Validation
1. ✅ Add real-time polling
2. ✅ Enhance test coverage
3. ✅ Debug any issues
4. ✅ Document the working flow

---

## Success Metrics

### Functional Requirements
- ✅ User can type in Tiptap table cells
- ✅ Cell edits create database events
- ✅ Events can be processed server-side
- ✅ Results update the table
- ✅ All verified by Playwright test

### Technical Requirements
- ✅ Uses existing T3 stack (tRPC, Drizzle, Next.js)
- ✅ Minimal schema changes (2 tables only)
- ✅ No external dependencies (Redis, etc.)
- ✅ Works with existing Neon database

### Test Coverage
- ✅ E2E test for cell edit → event creation
- ✅ E2E test for event processing → cell update
- ✅ Integration test for complete flow
- ✅ Visual verification in browser

This focused plan delivers the core value proposition in 3-4 days with a working, testable system that can be incrementally enhanced.