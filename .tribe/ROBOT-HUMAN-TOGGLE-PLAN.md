# Robot vs Human Event Processing Toggle - Implementation Plan

## Overview
Add a toggle switch "Treat Robots as Humans" that controls whether automated sheet updates (robot events) create new events in the queue or not.

## Current Behavior
- User edits cell → Creates event in queue
- UpdateSheet processes event → Creates sheet update → Updates adjacent cell
- **Problem**: This update to adjacent cell ALSO creates a new event, causing cascading updates

## Desired Behavior
- **Toggle ON (Treat Robots as Humans = true)**: Current behavior, all updates create events
- **Toggle OFF (Treat Robots as Humans = false)**: Only human edits create events, robot updates don't propagate

## Minimal Implementation Plan

### 1. Add Toggle State (Frontend)
**File**: `src/components/countdown-timer.tsx`
- Add new prop: `treatRobotsAsHumans: boolean` and `onToggleRobotMode: () => void`
- Add toggle switch UI next to Play/Pause button
- Style to match existing controls

### 2. Update SheetManager State
**File**: `src/components/sheet-manager.tsx`
- Add state: `const [treatRobotsAsHumans, setTreatRobotsAsHumans] = useState(true)`
- Pass toggle state to CountdownTimer
- Pass toggle state to API call in `handleUpdateTick`

### 3. Pass Flag to API
**File**: `src/components/sheet-manager.tsx`
- Modify the update-sheet API call:
```javascript
const response = await fetch('/api/update-sheet', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ treatRobotsAsHumans })
});
```

### 4. Update API Route
**File**: `src/app/api/update-sheet/route.ts`
- Extract `treatRobotsAsHumans` from request body
- Pass to SheetUpdater

### 5. Modify SheetUpdater Logic
**File**: `src/server/sheet-updater.ts`
- Accept `treatRobotsAsHumans` parameter in `updateSheet(userId, treatRobotsAsHumans = true)`
- When applying sheet updates to cells:
  - If `treatRobotsAsHumans === false`: Just update the cell content WITHOUT creating a new event
  - If `treatRobotsAsHumans === true`: Current behavior (updates may trigger new events)

### 6. Key Implementation Detail
The critical change is in `SheetUpdater.updateSheet()` when applying updates:

**Current behavior** (lines 100-111):
```typescript
await db.insert(cells).values({
  userId: update.userId,
  rowIndex: update.rowIndex,
  colIndex: update.colIndex,
  content: update.content,
}).onConflictDoUpdate({...})
// This triggers the TiptapTable's onUpdate, which creates new events
```

**New behavior when treatRobotsAsHumans = false**:
- Need to mark these updates as "robot updates" somehow
- Option 1: Add metadata to the cell update
- Option 2: Use a context/flag that TiptapTable can check
- **Recommended**: Add a session storage flag that TiptapTable checks

### 7. Prevent Robot Updates from Creating Events
**File**: `src/components/tiptap-table.tsx`
- Before creating an event in `debouncedCellUpdate`:
  - Check if this is a robot update (via session storage flag or update metadata)
  - Only create event if it's a human update OR if treatRobotsAsHumans is true

## Minimal Change Summary

1. **UI**: Add toggle switch (1 file)
2. **State Management**: Add boolean state and pass through components (2 files)
3. **API**: Pass flag through API route to SheetUpdater (2 files)
4. **Logic**: Conditionally prevent event creation for robot updates (1-2 files)

## Benefits of This Approach
- Minimal changes to existing code
- Toggle is reversible without data loss
- Clear user control over propagation behavior
- Preserves all existing functionality when toggle is ON

## Alternative Approaches Considered
1. **Add "source" field to events** - More complex, requires schema changes
2. **Separate robot vs human queues** - Too complex for minimal implementation
3. **Client-side only filtering** - Would still create events, just not process them

## Testing Strategy
1. Toggle OFF: Edit cell A1 → Should update B1 but NOT create new event for B1
2. Toggle ON: Edit cell A1 → Should update B1 AND create new event for B1
3. Verify toggle persists across pause/play cycles
4. Ensure manual "Process Events" button respects toggle state