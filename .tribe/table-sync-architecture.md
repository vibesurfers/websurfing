# Table Sync Architecture

## Overview
This document describes the current architecture for syncing between the database and the client-side Tiptap table, including all connection points and data flows.

---

## Database Schema

### Tables

#### 1. `cells` Table
**Purpose:** Stores the current state of all cells in the spreadsheet

```typescript
{
  id: UUID (primary key)
  userid: string (references users.id)
  rowindex: integer
  colindex: integer
  content: text
  createdat: timestamp
  updatedat: timestamp

  UNIQUE constraint on (userid, rowindex, colindex)
}
```

#### 2. `eventQueue` Table
**Purpose:** Queue of user actions that trigger automated updates

```typescript
{
  id: UUID (primary key)
  userid: string (references users.id)
  eventType: string ('cell_update')
  payload: jsonb {rowIndex: number, colIndex: number, content: string}
  status: string ('pending' | 'processing' | 'completed' | 'cancelled' | 'failed')
  createdAt: timestamp
  processedAt: timestamp
}
```

#### 3. `sheetUpdates` Table
**Purpose:** Queue of pending cell updates to be applied (created by processing events)

```typescript
{
  id: UUID (primary key)
  userid: string (references users.id)
  rowindex: integer
  colindex: integer
  content: text
  updatetype: string ('user_edit' | 'ai_response' | 'auto_copy')
  createdat: timestamp
  appliedat: timestamp (null when pending)
}
```

---

## Client-Side Table

### Tiptap Editor State
**Technology:** TipTap with Table extension
**Structure:** HTML table with dynamic rows/columns

```html
<table>
  <tbody>
    <tr>
      <td>Cell content at (0,0)</td>
      <td>Cell content at (0,1)</td>
      ...
    </tr>
    <tr>
      <td>Cell content at (1,0)</td>
      ...
    </tr>
  </tbody>
</table>
```

### React State
- **`cells`**: Array of cell data from database (fetched via tRPC)
- **`events`**: Array of event queue items (for debugging display)
- **`lastUpdate`**: Timestamp of last sheet update (triggers refetch)
- **`debounceRefs`**: Map of active debounce timers per cell
- **`lastContentRef`**: Map tracking last known content per cell

---

## Data Flow Connections

### 1. User Types in Cell → Database
**Flow:** Client → tRPC → Database

```
User types in cell (rowIndex: 0, colIndex: 0, content: "hello")
  ↓
Debounce 1 second
  ↓
TiptapTable.debouncedCellUpdate()
  ↓
api.cell.updateCell.mutate() [tRPC]
  ↓
cellRouter.updateCell [Server]
  ↓
┌─────────────────────────────────┐
│ 1. Insert/update cells table    │
│    (0, 0) = "hello"              │
│                                  │
│ 2. Insert into eventQueue        │
│    eventType: 'cell_update'      │
│    payload: {0, 0, "hello"}      │
│    status: 'pending'             │
└─────────────────────────────────┘
```

### 2. User Deletes Cell Content → Database
**Flow:** Client → tRPC → Database

```
User deletes content from cell (rowIndex: 0, colIndex: 0)
  ↓
Debounce 1 second
  ↓
TiptapTable.debouncedCellUpdate() detects empty content
  ↓
api.cell.clearCell.mutate() [tRPC]
  ↓
cellRouter.clearCell [Server]
  ↓
┌─────────────────────────────────┐
│ 1. Update cells table            │
│    (0, 0) = ""                   │
│                                  │
│ 2. Cancel pending events         │
│    Find events with              │
│    payload.rowIndex = 0 AND      │
│    payload.colIndex = 0          │
│    Set status = 'cancelled'      │
└─────────────────────────────────┘
```

### 3. Automatic Sheet Updates (Every 5 seconds)
**Flow:** Timer → API → SheetUpdater → Database

```
CountdownTimer triggers (every 5s)
  ↓
SheetManager.handleUpdateTick()
  ↓
POST /api/update-sheet
  ↓
SheetUpdater.updateSheet()
  ↓
┌─────────────────────────────────────────────────┐
│ TRANSACTION:                                    │
│   1. Lock pending events (FOR UPDATE)           │
│   2. Mark events as 'processing'                │
│                                                 │
│ For each event:                                 │
│   - If eventType = 'cell_update'                │
│   - payload = {rowIndex: 0, colIndex: 0}        │
│   - Create sheetUpdate:                         │
│     (rowIndex: 0, colIndex: 1) ← cell to RIGHT  │
│     content: same as source cell                │
│     updateType: 'auto_copy'                     │
│   - Mark event as 'completed'                   │
│                                                 │
│ Apply all pending sheetUpdates:                 │
│   - Insert/update cells table                   │
│   - Mark sheetUpdate as applied                 │
└─────────────────────────────────────────────────┘
  ↓
Return {success, appliedUpdates, totalApplied}
  ↓
SheetManager updates lastUpdate state
  ↓
Triggers cell refetch via useEffect
```

### 4. Database Updates → Client Table
**Flow:** Database → tRPC Query → React State → Tiptap Editor

```
lastUpdate state changes (from step 3)
  ↓
useEffect([lastUpdate]) triggers
  ↓
┌─────────────────────────────────┐
│ 1. refetch() - get events       │
│ 2. refetchCells() - get cells   │
└─────────────────────────────────┘
  ↓
api.cell.getCells.useQuery() updates
  ↓
useEffect([cells, editor]) triggers
  ↓
┌─────────────────────────────────────────────────┐
│ Parse current editor HTML                       │
│ Build cellMap from database cells               │
│                                                 │
│ For each cell in database:                      │
│   - Find corresponding <td> in table            │
│   - Compare content                             │
│   - Skip if user recently edited this cell      │
│   - Update <td> if content differs              │
│                                                 │
│ Add rows/columns if needed                      │
│ Apply updated HTML back to editor               │
└─────────────────────────────────────────────────┘
```

---

## Current Issues

### Problem: Database as Source of Truth Disconnects User

**Issue:** The current implementation treats the database as the single source of truth, which causes:

1. **User input being overwritten**: When `cells` state updates, the entire editor content is replaced via `editor.commands.setContent()`, which can overwrite what the user is currently typing

2. **Race conditions**:
   - User types "hello" at (0,0)
   - Debounce timer starts
   - Before timer fires, a sheet update fetches cells
   - Old cell data (empty) overwrites the editor
   - User's "hello" disappears

3. **Lag/stuttering**: Every 5 seconds when sheet updates run, the table content is replaced, causing a visual flash and potential cursor position loss

4. **No optimistic updates**: User edits don't immediately appear in their own view - they must wait for the round trip to database

### Why This Happens

The problem occurs in `useEffect([cells, editor])` in `TiptapTable`:

```typescript
// This replaces the ENTIRE table content
if (hasChanges) {
  const newHtml = table.outerHTML
  editor.commands.setContent(newHtml, false) // ← DESTRUCTIVE
}
```

This operation:
- Destroys all existing editor state
- Recreates the entire table from scratch
- Loses cursor position
- Interrupts user input
- Overrides any local changes not yet saved

---

## Proposed Solutions

### Option 1: Optimistic Updates with Conflict Resolution
**Approach:** Client state is source of truth, sync to DB in background

- Maintain local editor state as primary
- Track "dirty" cells that haven't been saved yet
- Only apply DB updates to "clean" cells
- Merge conflicts by preferring user input over DB state
- Use version numbers or timestamps to detect conflicts

### Option 2: Operational Transform (OT) / CRDT
**Approach:** Use proven collaborative editing algorithms

- Implement OT or CRDT for cell updates
- Transform incoming updates based on local state
- Guarantee eventual consistency
- Handle concurrent edits properly

### Option 3: Cell-Level Locking
**Approach:** Prevent updates to cells being edited

- Track which cell has focus/is being edited
- Never overwrite the active cell from DB updates
- Apply DB updates only to inactive cells
- Use a "grace period" after editing before applying updates

### Option 4: Editor Commands Instead of setContent
**Approach:** Use granular Tiptap commands for updates

Instead of replacing entire table:
```typescript
// Bad (current):
editor.commands.setContent(newHtml, false)

// Better:
editor.chain()
  .focus()
  .setCellContent({row: 0, col: 1}, 'new content')
  .run()
```

This preserves:
- Cursor position
- Selection state
- User input in other cells
- Editor history

---

## Recommended Immediate Fix

**Hybrid Approach:** Combine Options 3 & 4

### Implementation Steps:

1. **Track editing state per cell**
   ```typescript
   const editingCell = useRef<{row: number, col: number} | null>(null)
   const recentlyEditedCells = useRef<Set<string>>(new Set())
   ```

2. **Skip updates to edited cells**
   ```typescript
   cells.forEach(cell => {
     const cellKey = `${cell.rowIndex}-${cell.colIndex}`

     // Skip if user is editing or recently edited
     if (editingCell.current?.row === cell.rowIndex &&
         editingCell.current?.col === cell.colIndex) {
       return
     }
     if (recentlyEditedCells.current.has(cellKey)) {
       return
     }

     // Apply update using granular command
     updateCellContent(cell.rowIndex, cell.colIndex, cell.content)
   })
   ```

3. **Use transaction for updates**
   ```typescript
   const tr = editor.state.tr
   // Make all cell updates in one transaction
   // Dispatch once at the end
   editor.view.dispatch(tr)
   ```

4. **Add debounce to DB updates effect**
   ```typescript
   useEffect(() => {
     const timer = setTimeout(() => {
       applyCellUpdates(cells)
     }, 100) // Small delay to batch updates

     return () => clearTimeout(timer)
   }, [cells])
   ```

This maintains user control while still syncing database updates.
