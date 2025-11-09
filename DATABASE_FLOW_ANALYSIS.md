# Database Flow Analysis: Operator Data Persistence

## Executive Summary

This analysis documents the complete database flow for operator data persistence in the VibeCon application. Using parallel agent analysis, we've mapped how data flows from user input through operator processing to final database storage.

## Analysis Methodology

Analysis conducted using parallel Claude agents following `CLAUDE-PARALLEL_AGENTS.md` patterns:
```bash
(claude --model claude-haiku-4-5-20251001 --print "Task. Brief." > output.txt) &
```

**5 Agents Deployed**: operator-writes, sheet-updates, background-ops, cell-router-ops, event-lifecycle

---

## 1. Data Entry Points

### Cell Router Mutations (`src/server/api/routers/cell.ts`)

#### 1.1 User Cell Updates
**Location**: `cell.ts:26-38`
```sql
INSERT INTO cells (sheetid, userid, rowindex, colindex, content)
VALUES (?, ?, ?, ?, ?)
ON CONFLICT (sheetid, userid, rowindex, colindex)
DO UPDATE SET content = ?, updatedat = NOW()
```

#### 1.2 Event Queue Creation
**Location**: `cell.ts:41-53`
```sql
INSERT INTO eventQueue (sheetid, userid, eventtype, payload, status)
VALUES (?, ?, 'user_cell_edit', ?, 'pending')
```

**Payload Structure**:
```json
{
  "spreadsheetId": "uuid",
  "rowindex": 0,
  "columnId": "",
  "colindex": 0,
  "content": "user input"
}
```

---

## 2. Background Processing Flow

### Background Processor (`src/server/background-processor.ts`)

#### 2.1 Event Polling
**Location**: `background-processor.ts:46-50`
- **Poll Interval**: 1000ms
- **Batch Size**: 50 events per cycle
- **Query**: `SELECT * FROM eventQueue WHERE status = 'pending' LIMIT 50`

#### 2.2 Event Grouping & Concurrency
**Location**: `background-processor.ts:58-88`
- Groups events by `sheetid` using Map
- `processingSheets` Set prevents duplicate processing
- Uses `Promise.allSettled()` for concurrent sheet updates

#### 2.3 Sheet Processing Handoff
**Location**: `background-processor.ts:79-80`
```typescript
const promise = this.sheetUpdater
  .updateSheet(userId, sheetId)
  .finally(() => {
    this.processingSheets.delete(sheetId);
  });
```

---

## 3. Sheet Update Pipeline

### Sheet Updater (`src/server/sheet-updater.ts`)

#### 3.1 Transaction Management
**Location**: `sheet-updater.ts:19-44`
- Row locking: `SELECT ... FOR UPDATE`
- Status transition: `pending` → `processing`
- Batch processing: Max 10 events per transaction

#### 3.2 Context Building
**Location**: `sheet-updater.ts:51-109`
```typescript
// Fetch sheet metadata
const sheet = await db.select().from(sheets).where(eq(sheets.id, sheetId)).limit(1);

// Fetch columns
const sheetColumns = await db.select().from(columns).where(eq(columns.sheetid, sheetId));

// Fetch existing row data
const rowCells = await db.select().from(cells).where(
  and(eq(cells.sheetid, sheetId), eq(cells.rowindex, rowIndex))
);
```

#### 3.3 Operator Dispatch
**Location**: `sheet-updater.ts:112-122`
```typescript
const baseEvent: BaseEvent = {
  userid: event.userid,
  eventid: event.id,
  eventtype: event.eventtype as any,
  timestamp: event.createdat ?? new Date(),
  data: event.payload,
  sheetContext,
};

await this.operatorController.dispatch(baseEvent);
```

---

## 4. Operator Controller Data Routing

### Operator Selection (`src/server/operators/operator-controller.ts`)

#### 4.1 Smart Routing
**Location**: `operator-controller.ts:200-280`
```typescript
private selectOperator(eventtype: EventType, data: unknown, sheetContext?: SheetContext): OperatorName {
  switch (eventtype) {
    case "user_cell_edit":
    case "robot_cell_update": {
      const cellData = data as UpdateCellInput;
      const content = cellData.content.toLowerCase().trim();

      // Priority 1: Scientific template → academic_search
      if (sheetContext?.templateType === 'scientific') {
        if (this.isSearchQuery(content) || this.isAcademicSearch(content)) {
          return "academic_search";
        }
      }

      // Priority 2: Academic patterns → academic_search
      if (this.isAcademicSearch(content)) return "academic_search";

      // Priority 3: Search queries → google_search
      if (this.isSearchQuery(content)) return "google_search";

      // Priority 4: URLs → url_context
      if (this.containsUrls(content)) return "url_context";

      // Default: structured_output
      return "structured_output";
    }
  }
}
```

#### 4.2 Status Management
**Location**: `operator-controller.ts:126-133`
```typescript
await ColumnAwareWrapper.updateCellStatus(
  event.sheetContext,
  event.userid,
  targetColIndex,
  'processing',
  operatorName,
  statusMessages[operatorName] || 'Processing...'
);
```

#### 4.3 Result Writing
**Location**: `operator-controller.ts:146-152`
```typescript
const writeResult = await ColumnAwareWrapper.writeToNextColumn(
  event.sheetContext,
  event.userid,
  event.eventid,
  output,
  operatorName
);
```

---

## 5. Data Persistence Layer

### Column-Aware Wrapper (`src/server/operators/column-aware-wrapper.ts`)

#### 5.1 Cell Writing Sequence
**Location**: `column-aware-wrapper.ts:128-175`

**Step 1: Cell Insert/Update**
```sql
INSERT INTO cells (sheetid, userid, rowindex, colindex, content)
VALUES (?, ?, ?, ?, ?)
ON CONFLICT (sheetid, userid, rowindex, colindex)
DO UPDATE SET content = ?, updatedat = NOW()
```

**Step 2: Audit Trail**
```sql
INSERT INTO sheetUpdates (sheetid, userid, rowindex, colindex, content, updatetype)
VALUES (?, ?, ?, ?, ?, 'ai_response')
```

**Step 3: Next Event Queue**
```sql
INSERT INTO eventQueue (sheetid, userid, eventtype, payload, status)
VALUES (?, ?, 'robot_cell_update', ?, 'pending')
```

---

## 6. Event Lifecycle

### Complete Event Flow

#### 6.1 Creation Phase
1. **User Input**: Cell edit via tRPC → `cell.updateCell`
2. **Event Creation**: `eventQueue.insert()` with `status='pending'`
3. **Payload**: Contains cell position and content

#### 6.2 Processing Phase
1. **Polling**: Background processor queries pending events
2. **Grouping**: Events grouped by `sheetid`
3. **Locking**: Row-level locks prevent concurrent processing
4. **Status Update**: `pending` → `processing`
5. **Operator Dispatch**: Based on content analysis
6. **AI Processing**: Gemini operators execute

#### 6.3 Completion Phase
1. **Result Write**: Data written to next column
2. **Status Update**: `processing` → `completed` with `processedat`
3. **Chain Continuation**: New event created for next column
4. **Audit Trail**: All operations logged in `sheetUpdates`

---

## 7. Database Schema Impact

### Tables Involved

| Table | Purpose | Key Operations |
|-------|---------|----------------|
| `cells` | Cell content storage | INSERT/UPDATE on conflict |
| `eventQueue` | Processing pipeline | INSERT → UPDATE status |
| `sheetUpdates` | Audit trail | INSERT for each change |
| `cellProcessingStatus` | Real-time status | UPDATE for UI feedback |
| `sheets` | Sheet metadata | SELECT for context |
| `columns` | Column definitions | SELECT for structure |

### Column Name Changes
**Critical**: All lowercase schema (`sheetid`, `userid`, `rowindex`, `colindex`, `createdat`, `updatedat`)

---

## 8. Concurrency & Safety

### Transaction Isolation
- **Row Locking**: `SELECT ... FOR UPDATE` prevents double processing
- **Atomic Operations**: Multi-table operations wrapped in transactions
- **Status Transitions**: Clear state machine prevents race conditions

### Error Handling
- **Failed Events**: Marked as `status='failed'`
- **Retry Logic**: Operator-level retry with improved prompts
- **Graceful Degradation**: Continues processing other events on failure

---

## 9. Performance Characteristics

### Throughput
- **Batch Size**: 50 events per poll cycle
- **Poll Frequency**: 1000ms intervals
- **Concurrent Sheets**: Multiple sheets processed in parallel
- **Sheet-Level Locking**: Prevents duplicate processing per sheet

### Scalability
- **Horizontal**: Multiple background processor instances possible
- **Vertical**: Configurable batch sizes and poll intervals
- **Database**: Indexed on `(sheetid, userid, status)` for fast queries

---

## 10. Monitoring & Observability

### Logging Points
1. **Event Creation**: `cell.ts:55` - "Cell update complete, event queued"
2. **Processing Start**: `background-processor.ts:56` - Event count per cycle
3. **Operator Dispatch**: `operator-controller.ts:111` - Operator selection
4. **Result Writing**: `operator-controller.ts:142` - Operator output
5. **Completion**: `operator-controller.ts:230` - Event completion

### Error Tracking
- **Background Processor**: `background-processor.ts:38` - Process loop errors
- **Sheet Updater**: `sheet-updater.ts:127` - Event processing errors
- **Operator Controller**: `operator-controller.ts:234` - Operator errors

---

## Summary

The operator data persistence system follows a robust event-driven architecture:

1. **Entry**: User input → cell update → event creation
2. **Processing**: Background polling → operator routing → AI execution
3. **Persistence**: Multi-table writes → audit trails → chain continuation
4. **Safety**: Row locking → transactions → error handling

**Key Strengths**:
- Event-driven decoupling
- Concurrent processing
- Complete audit trails
- Robust error handling
- Horizontal scalability

**Optimization Opportunities**:
- Batch write optimizations
- Connection pooling
- Event compression
- Dead letter queues

---

*Analysis generated using parallel Claude agents following CLAUDE-PARALLEL_AGENTS.md methodology*
*Total analysis time: ~35 seconds across 5 concurrent agents*