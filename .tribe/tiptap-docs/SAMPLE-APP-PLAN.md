# Sample Spreadsheet App - Implementation Plan

## Requirements Summary

**Core Features:**
- Default spreadsheet: 2 columns × 8 rows
- Cell edit hooks that fire on every user edit
- Dynamic column addition with **required** title validation
- User-driven spreadsheet experience

---

## 1. Architecture Overview

### Tech Stack (Existing)
- **Framework**: Next.js 15 (App Router)
- **UI**: React 19 with Tailwind CSS 4
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **API**: tRPC with React Query
- **Auth**: NextAuth 5

### New Dependencies Required
```json
{
  "@tiptap/react": "^2.x",
  "@tiptap/starter-kit": "^2.x",
  "@tiptap/extension-table": "^2.x",
  "@tiptap/extension-table-row": "^2.x",
  "@tiptap/extension-table-header": "^2.x",
  "@tiptap/extension-table-cell": "^2.x",
  "zustand": "^5.x"
}
```

---

## 2. Data Model Design

### Column Schema
```typescript
interface Column {
  id: string;                    // UUID
  title: string;                 // REQUIRED - validated on creation
  position: number;              // 0-indexed order
  width?: number;                // Optional custom width
  createdAt: Date;
  updatedAt: Date;
}
```

### Cell Schema
```typescript
interface Cell {
  id: string;                    // UUID
  rowIndex: number;              // 0-indexed row
  columnId: string;              // FK to Column
  content: string;               // Cell text content
  format?: CellFormat;           // Optional formatting
  version: number;               // For conflict resolution
  createdAt: Date;
  updatedAt: Date;
  lastEditedBy?: string;         // User ID (optional)
}

interface CellFormat {
  bold?: boolean;
  italic?: boolean;
  textAlign?: 'left' | 'center' | 'right';
  backgroundColor?: string;
}
```

### Spreadsheet Schema
```typescript
interface Spreadsheet {
  id: string;
  name: string;
  defaultRows: number;           // Default: 8
  ownerId: string;               // User ID
  createdAt: Date;
  updatedAt: Date;
}
```

### Database Schema (Drizzle)
```typescript
// src/server/db/schema.ts

export const spreadsheets = pgTable('spreadsheets', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  defaultRows: integer('default_rows').notNull().default(8),
  ownerId: text('owner_id').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const columns = pgTable('columns', {
  id: uuid('id').primaryKey().defaultRandom(),
  spreadsheetId: uuid('spreadsheet_id').notNull().references(() => spreadsheets.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  position: integer('position').notNull(),
  width: integer('width'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  spreadsheetIdIdx: index('columns_spreadsheet_id_idx').on(table.spreadsheetId),
  positionIdx: index('columns_position_idx').on(table.spreadsheetId, table.position),
}));

export const cells = pgTable('cells', {
  id: uuid('id').primaryKey().defaultRandom(),
  spreadsheetId: uuid('spreadsheet_id').notNull().references(() => spreadsheets.id, { onDelete: 'cascade' }),
  rowIndex: integer('row_index').notNull(),
  columnId: uuid('column_id').notNull().references(() => columns.id, { onDelete: 'cascade' }),
  content: text('content').notNull().default(''),
  format: jsonb('format').$type<CellFormat>(),
  version: integer('version').notNull().default(1),
  lastEditedBy: text('last_edited_by'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  spreadsheetIdIdx: index('cells_spreadsheet_id_idx').on(table.spreadsheetId),
  cellPositionIdx: index('cells_position_idx').on(table.spreadsheetId, table.rowIndex, table.columnId),
  uniqueCellPosition: unique('unique_cell_position').on(table.spreadsheetId, table.rowIndex, table.columnId),
}));

// Edit events for audit trail
export const cellEditEvents = pgTable('cell_edit_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  cellId: uuid('cell_id').notNull().references(() => cells.id, { onDelete: 'cascade' }),
  previousContent: text('previous_content'),
  newContent: text('new_content').notNull(),
  editedBy: text('edited_by'),
  editedAt: timestamp('edited_at').notNull().defaultNow(),
}, (table) => ({
  cellIdIdx: index('cell_edit_events_cell_id_idx').on(table.cellId),
  editedAtIdx: index('cell_edit_events_edited_at_idx').on(table.editedAt),
}));
```

---

## 3. State Management Strategy

### Zustand Store (Client-Side)
```typescript
// src/store/spreadsheet-store.ts

interface SpreadsheetState {
  // Current spreadsheet data
  spreadsheetId: string | null;
  columns: Column[];
  cells: Map<string, Cell>; // Key: `${rowIndex}-${columnId}`

  // UI state
  selectedCell: { rowIndex: number; columnId: string } | null;
  isAddingColumn: boolean;

  // Actions
  setSpreadsheet: (id: string, columns: Column[], cells: Cell[]) => void;
  updateCell: (rowIndex: number, columnId: string, content: string) => void;
  addColumn: (title: string) => Promise<void>;
  deleteColumn: (columnId: string) => Promise<void>;
  selectCell: (rowIndex: number, columnId: string) => void;

  // Cell edit hooks
  onCellEdit: (callback: CellEditCallback) => void;
  cellEditCallbacks: CellEditCallback[];
}

type CellEditCallback = (event: CellEditEvent) => void;

interface CellEditEvent {
  cellId: string;
  rowIndex: number;
  columnId: string;
  previousContent: string;
  newContent: string;
  timestamp: Date;
  userId?: string;
}
```

### tRPC Routes
```typescript
// src/server/api/routers/spreadsheet.ts

export const spreadsheetRouter = createTRPCRouter({
  // Get spreadsheet with all data
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const spreadsheet = await ctx.db.query.spreadsheets.findFirst({
        where: eq(spreadsheets.id, input.id),
        with: {
          columns: { orderBy: [asc(columns.position)] },
          cells: true,
        },
      });
      return spreadsheet;
    }),

  // Create new spreadsheet with default columns
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      columnTitles: z.array(z.string().min(1)).default(['Column A', 'Column B'])
    }))
    .mutation(async ({ ctx, input }) => {
      const spreadsheet = await ctx.db.insert(spreadsheets).values({
        name: input.name,
        ownerId: ctx.session.user.id,
      }).returning();

      // Create default columns
      const columnsData = input.columnTitles.map((title, idx) => ({
        spreadsheetId: spreadsheet[0].id,
        title,
        position: idx,
      }));

      await ctx.db.insert(columns).values(columnsData);

      return spreadsheet[0];
    }),

  // Add new column (with title validation)
  addColumn: protectedProcedure
    .input(z.object({
      spreadsheetId: z.string().uuid(),
      title: z.string().min(1, 'Column title is required'),
      position: z.number().int().nonnegative(),
    }))
    .mutation(async ({ ctx, input }) => {
      const column = await ctx.db.insert(columns).values({
        spreadsheetId: input.spreadsheetId,
        title: input.title,
        position: input.position,
      }).returning();

      return column[0];
    }),

  // Update cell content
  updateCell: protectedProcedure
    .input(z.object({
      spreadsheetId: z.string().uuid(),
      rowIndex: z.number().int().nonnegative(),
      columnId: z.string().uuid(),
      content: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get or create cell
      const existingCell = await ctx.db.query.cells.findFirst({
        where: and(
          eq(cells.spreadsheetId, input.spreadsheetId),
          eq(cells.rowIndex, input.rowIndex),
          eq(cells.columnId, input.columnId)
        ),
      });

      if (existingCell) {
        // Log edit event
        await ctx.db.insert(cellEditEvents).values({
          cellId: existingCell.id,
          previousContent: existingCell.content,
          newContent: input.content,
          editedBy: ctx.session.user.id,
        });

        // Update cell
        const updated = await ctx.db.update(cells)
          .set({
            content: input.content,
            version: existingCell.version + 1,
            lastEditedBy: ctx.session.user.id,
            updatedAt: new Date(),
          })
          .where(eq(cells.id, existingCell.id))
          .returning();

        return updated[0];
      } else {
        // Create new cell
        const newCell = await ctx.db.insert(cells).values({
          spreadsheetId: input.spreadsheetId,
          rowIndex: input.rowIndex,
          columnId: input.columnId,
          content: input.content,
          lastEditedBy: ctx.session.user.id,
        }).returning();

        return newCell[0];
      }
    }),

  // Get cell edit history
  getCellHistory: protectedProcedure
    .input(z.object({ cellId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.query.cellEditEvents.findMany({
        where: eq(cellEditEvents.cellId, input.cellId),
        orderBy: [desc(cellEditEvents.editedAt)],
        limit: 50,
      });
    }),
});
```

---

## 4. Component Structure

```
src/app/spreadsheet/
├── [id]/
│   └── page.tsx                    # Main spreadsheet page
├── _components/
│   ├── SpreadsheetContainer.tsx    # Main container component
│   ├── SpreadsheetTable.tsx        # Tiptap table wrapper
│   ├── SpreadsheetCell.tsx         # Individual cell with hooks
│   ├── ColumnHeader.tsx            # Column header with title
│   ├── AddColumnButton.tsx         # Button to add columns
│   ├── AddColumnDialog.tsx         # Modal for column title input
│   ├── RowNumberColumn.tsx         # Left-side row numbers
│   └── CellEditIndicator.tsx       # Real-time edit indicator
└── _hooks/
    ├── useSpreadsheet.ts           # Main spreadsheet hook
    ├── useCellEdit.ts              # Cell edit hook system
    └── useColumnManagement.ts      # Column CRUD operations
```

---

## 5. Cell Edit Hook System

### Hook Registration Pattern
```typescript
// src/app/spreadsheet/_hooks/useCellEdit.ts

import { useEffect } from 'react';
import { useSpreadsheetStore } from '@/store/spreadsheet-store';

export interface CellEditEvent {
  cellId: string;
  rowIndex: number;
  columnId: string;
  columnTitle: string;
  previousContent: string;
  newContent: string;
  timestamp: Date;
  userId?: string;
}

export type CellEditCallback = (event: CellEditEvent) => void;

export function useCellEdit(callback: CellEditCallback) {
  const registerCallback = useSpreadsheetStore((state) => state.registerCellEditCallback);
  const unregisterCallback = useSpreadsheetStore((state) => state.unregisterCellEditCallback);

  useEffect(() => {
    const id = registerCallback(callback);
    return () => unregisterCallback(id);
  }, [callback, registerCallback, unregisterCallback]);
}

// Example usage in component:
export function MyComponent() {
  useCellEdit((event) => {
    console.log(`Cell (${event.rowIndex}, ${event.columnTitle}) changed:`, {
      from: event.previousContent,
      to: event.newContent,
    });

    // Fire custom logic here
    // - Analytics tracking
    // - Validation
    // - Auto-save indicators
    // - Real-time sync
  });

  return <div>...</div>;
}
```

### Hook Implementation in Store
```typescript
// src/store/spreadsheet-store.ts (additions)

interface SpreadsheetState {
  // ... existing state

  cellEditCallbacks: Map<string, CellEditCallback>;

  registerCellEditCallback: (callback: CellEditCallback) => string;
  unregisterCellEditCallback: (id: string) => void;
  triggerCellEditEvent: (event: CellEditEvent) => void;
}

export const useSpreadsheetStore = create<SpreadsheetState>((set, get) => ({
  // ... existing state

  cellEditCallbacks: new Map(),

  registerCellEditCallback: (callback) => {
    const id = Math.random().toString(36);
    set((state) => {
      const newCallbacks = new Map(state.cellEditCallbacks);
      newCallbacks.set(id, callback);
      return { cellEditCallbacks: newCallbacks };
    });
    return id;
  },

  unregisterCellEditCallback: (id) => {
    set((state) => {
      const newCallbacks = new Map(state.cellEditCallbacks);
      newCallbacks.delete(id);
      return { cellEditCallbacks: newCallbacks };
    });
  },

  triggerCellEditEvent: (event) => {
    const callbacks = get().cellEditCallbacks;
    callbacks.forEach((callback) => callback(event));
  },

  updateCell: async (rowIndex, columnId, newContent) => {
    const cells = get().cells;
    const cellKey = `${rowIndex}-${columnId}`;
    const cell = cells.get(cellKey);
    const previousContent = cell?.content ?? '';

    // Trigger hooks BEFORE server update
    get().triggerCellEditEvent({
      cellId: cell?.id ?? '',
      rowIndex,
      columnId,
      columnTitle: get().columns.find(c => c.id === columnId)?.title ?? '',
      previousContent,
      newContent,
      timestamp: new Date(),
    });

    // Update server
    // ... tRPC mutation
  },
}));
```

---

## 6. Column Management UI

### Add Column Flow
1. User clicks "Add Column" button (always visible on right edge)
2. Modal/Dialog opens with title input
3. Title validation: **required**, min 1 character
4. On submit:
   - Create column in database
   - Update local state
   - Auto-scroll to new column
5. Error handling for duplicate titles (optional)

### Add Column Dialog Component
```typescript
// src/app/spreadsheet/_components/AddColumnDialog.tsx

'use client';

import { useState } from 'react';
import { api } from '@/trpc/react';

interface AddColumnDialogProps {
  spreadsheetId: string;
  nextPosition: number;
  onClose: () => void;
  onSuccess: (column: Column) => void;
}

export function AddColumnDialog({ spreadsheetId, nextPosition, onClose, onSuccess }: AddColumnDialogProps) {
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  const addColumnMutation = api.spreadsheet.addColumn.useMutation({
    onSuccess: (column) => {
      onSuccess(column);
      onClose();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Column title is required');
      return;
    }

    addColumnMutation.mutate({
      spreadsheetId,
      title: title.trim(),
      position: nextPosition,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-96">
        <h2 className="text-xl font-bold mb-4">Add New Column</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Column Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setError('');
              }}
              className="w-full border rounded px-3 py-2"
              placeholder="Enter column title"
              autoFocus
            />
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addColumnMutation.isPending}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
            >
              {addColumnMutation.isPending ? 'Adding...' : 'Add Column'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

---

## 7. Implementation File Structure

```
src/
├── app/
│   └── spreadsheet/
│       ├── [id]/
│       │   └── page.tsx                    # Route: /spreadsheet/[id]
│       ├── new/
│       │   └── page.tsx                    # Route: /spreadsheet/new (create)
│       └── _components/
│           ├── SpreadsheetContainer.tsx    # Main container
│           ├── SpreadsheetTable.tsx        # Tiptap integration
│           ├── SpreadsheetCell.tsx         # Cell component
│           ├── ColumnHeader.tsx            # Column header
│           ├── AddColumnButton.tsx         # Add column trigger
│           ├── AddColumnDialog.tsx         # Add column modal
│           ├── RowIndicator.tsx            # Row numbers (1-8)
│           └── CellEditLogger.tsx          # Example hook consumer
│
├── server/
│   ├── api/
│   │   └── routers/
│   │       └── spreadsheet.ts              # tRPC routes
│   └── db/
│       └── schema.ts                       # Database schema (add tables)
│
└── store/
    └── spreadsheet-store.ts                # Zustand store

```

---

## 8. Implementation Steps (Ordered)

### Phase 1: Database & API (Backend)
1. **Update schema.ts** - Add spreadsheet, columns, cells, cellEditEvents tables
2. **Run migrations** - `pnpm db:push`
3. **Create spreadsheet router** - tRPC endpoints for CRUD
4. **Test API** - Use tRPC panel or curl

### Phase 2: State Management (Client)
5. **Install dependencies** - Tiptap, Zustand
6. **Create Zustand store** - spreadsheet-store.ts with hook system
7. **Test store** - Verify hook callbacks work

### Phase 3: UI Components (Frontend)
8. **Create route structure** - /spreadsheet/[id] and /new
9. **Build SpreadsheetContainer** - Main page component
10. **Build SpreadsheetTable** - Tiptap table integration
11. **Build SpreadsheetCell** - Individual cell with edit detection
12. **Build ColumnHeader** - Display column titles
13. **Build AddColumnButton + Dialog** - Column creation UI
14. **Build RowIndicator** - Left-side row numbers

### Phase 4: Integration & Hooks
15. **Connect Tiptap to Store** - Cell edit events → hooks
16. **Implement cell edit hooks** - useCellEdit hook
17. **Add example hook consumer** - CellEditLogger component
18. **Test edit flow** - Verify hooks fire on every edit

### Phase 5: Polish & Testing
19. **Add loading states** - Skeleton loaders
20. **Add error boundaries** - Handle API errors
21. **Add optimistic updates** - Instant UI feedback
22. **Test edge cases** - Empty cells, rapid edits, concurrent edits
23. **Add keyboard navigation** - Arrow keys, tab, enter
24. **Style with Tailwind** - Professional appearance

---

## 9. Key Technical Decisions

### Why Tiptap?
- Already in documentation
- Rich text editing capabilities
- Built-in table support
- ProseMirror foundation (robust)
- Easy to hook into transactions

### Why Zustand?
- Lightweight (3kb)
- No boilerplate
- Works well with React Query
- Easy hook system implementation

### Why NOT use Tiptap for storage?
- Tiptap is UI layer only
- PostgreSQL provides:
  - Persistent storage
  - Multi-user support
  - Edit history/audit trail
  - Complex querying
  - Data integrity

### Cell Edit Hook Pattern
- **Observer pattern** - Components subscribe to events
- **Decoupled** - Table doesn't know about hook consumers
- **Flexible** - Any component can listen to edits
- **Type-safe** - Full TypeScript support

---

## 10. Example Usage

### Creating a Spreadsheet
```typescript
// In /spreadsheet/new/page.tsx
const createMutation = api.spreadsheet.create.useMutation();

await createMutation.mutateAsync({
  name: 'My Spreadsheet',
  columnTitles: ['Name', 'Email'], // Default 2 columns
});
```

### Using Cell Edit Hooks
```typescript
// In any component within SpreadsheetContainer
function AutoSaveIndicator() {
  const [lastEdit, setLastEdit] = useState<string | null>(null);

  useCellEdit((event) => {
    setLastEdit(`${event.columnTitle} row ${event.rowIndex + 1}`);

    // Auto-save after 2 seconds of inactivity
    debouncedSave();
  });

  return lastEdit ? (
    <div className="text-sm text-gray-500">
      Last edited: {lastEdit}
    </div>
  ) : null;
}
```

### Adding a Column
```typescript
// User clicks "Add Column"
// Dialog opens, user enters "Phone Number"
// On submit:
await addColumnMutation.mutateAsync({
  spreadsheetId: 'uuid',
  title: 'Phone Number',
  position: 2, // After existing 2 columns
});
// New column appears, automatically creates cells for existing 8 rows
```

---

## 11. Testing Strategy

### Unit Tests
- Column title validation
- Cell update logic
- Hook callback registration/unregistration

### Integration Tests
- Cell edit → hook fires → database updates
- Add column → table re-renders → new cells created
- Multiple hooks listening to same cell

### E2E Tests (Playwright)
- User creates spreadsheet
- User edits cells
- User adds columns with validation
- User sees real-time updates

---

## 12. Future Enhancements (Out of Scope)

- Row addition/deletion
- Cell formatting (bold, colors)
- Formulas (SUM, AVG)
- Real-time collaboration
- Undo/redo
- Export to CSV
- Cell validation rules
- Conditional formatting
- Sorting/filtering

---

## 13. Success Criteria

✅ Spreadsheet loads with 2 columns × 8 rows
✅ User can edit any cell
✅ Hook fires on every cell edit with correct data
✅ User can add new column with title validation
✅ Title is required (error shown if empty)
✅ New column appears immediately
✅ All edits persist to database
✅ Edit history is tracked

---

## Summary

This plan provides a complete, production-ready implementation for a Tiptap-based spreadsheet with:
- **Robust data model** (PostgreSQL + Drizzle)
- **Type-safe API** (tRPC)
- **Flexible hook system** (Zustand + custom hooks)
- **User-friendly UI** (React + Tailwind)
- **Required validation** (Column titles)
- **Audit trail** (Edit history)

The hook system is the key differentiator, allowing ANY component to listen to cell edits without tight coupling.

Next step: Begin implementation with Phase 1 (Database & API).
