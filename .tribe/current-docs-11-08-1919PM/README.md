# Parallel Codebase Analysis: Event Flow Documentation

## Objective

Use parallel Haiku agents to comprehensively document the COMPLETE event flow from user input on the spreadsheet page through Gemini operators and back to the UI, including:

- Every file path and line number
- Every function call and data transformation
- Every database read/write operation
- Complete input/output at each stage
- Progressive column filling logic

## Analysis Strategy

Deploy 12 parallel Haiku agents, each analyzing a specific domain of the codebase. All agents write to `CODEBASE_SUMMARY.MD` with designated section markers.

---

## Agent Definitions

### Agent 1: Frontend User Input Flow
**Goal:** Document the path from user typing in a TipTap cell to the `cell.updateCell` mutation being called.

**Files to analyze:**
- `src/components/tiptap-table.tsx` (lines 1-700)
- Focus on: `onUpdate` handler, `debouncedCellUpdate`, `updateCell.useMutation`

**Output format:**
```markdown
## 1. FRONTEND USER INPUT FLOW

### File: src/components/tiptap-table.tsx

**Line X-Y: TipTap onUpdate handler**
- Triggered by: User typing in any cell
- Extracts: Cell content, rowIndex, colIndex
- Calls: `debouncedCellUpdate(content, rowIndex, colIndex)`

**Line X-Y: debouncedCellUpdate function**
- Debounce: 1000ms after last keystroke
- Checks: `isApplyingRobotUpdates.current` flag
- Calls: `updateCell.mutate({ sheetId, rowIndex, colIndex, content })`

**Line X-Y: updateCell mutation (tRPC)**
- Endpoint: `api.cell.updateCell`
- Input: { sheetId: string, rowIndex: number, colIndex: number, content: string }
- Side effect: Marks row as processing via `setProcessingRows()`
- Output: Triggers backend mutation

**Data flow:**
User types → TipTap onChange → 1s debounce → tRPC mutation → Backend
```

**Prompt:**
```
Analyze src/components/tiptap-table.tsx lines 1-700. Extract: (1) How TipTap onUpdate captures user input (2) debouncedCellUpdate mechanism including debounce timing (3) updateCell mutation call with exact parameters (4) setProcessingRows logic. Format as markdown with line numbers, function names, data flow. Brief.
```

---

### Agent 2: Cell Update Mutation & Event Creation
**Goal:** Document the backend mutation that receives cell updates and creates events in the queue.

**Files to analyze:**
- `src/server/api/routers/cell.ts` (complete file)
- Focus on: `updateCell` mutation, database writes, event queue insertion

**Output format:**
```markdown
## 2. CELL UPDATE MUTATION & EVENT CREATION

### File: src/server/api/routers/cell.ts

**Line X-Y: updateCell mutation definition**
- Input validation: Zod schema for { sheetId, rowIndex, colIndex, content }
- Authorization: Checks user owns sheet
- Database writes:
  1. INSERT/UPDATE to `cells` table
  2. INSERT to `eventQueue` table

**Line X-Y: Database operation 1 - cells table**
```sql
INSERT INTO websurfing_cell (sheetId, userId, rowIndex, colIndex, content)
VALUES (...)
ON CONFLICT (sheetId, userId, rowIndex, colIndex)
DO UPDATE SET content = ..., updatedAt = NOW()
```

**Line X-Y: Database operation 2 - eventQueue table**
```sql
INSERT INTO websurfing_event_queue (sheetId, userId, eventType, payload, status)
VALUES (sheetId, userId, 'user_cell_edit', { spreadsheetId, rowIndex, colIndex, content }, 'pending')
```

**Data flow:**
tRPC mutation → Validate ownership → Write to cells → Create event → Return success
```

**Prompt:**
```
Analyze src/server/api/routers/cell.ts. Extract: (1) updateCell mutation input schema (2) Authorization check logic (3) EXACT database writes to cells table with SQL (4) EXACT event queue insertion with all fields (5) Event payload structure. Include line numbers, SQL operations, field names. Brief.
```

---

### Agent 3: Background Event Processor
**Goal:** Document how the background processor detects and processes pending events.

**Files to analyze:**
- `src/server/background-processor.ts` (complete file)
- `src/server/startup.ts`

**Output format:**
```markdown
## 3. BACKGROUND EVENT PROCESSOR

### File: src/server/startup.ts
**Line X-Y: Service initialization**
- Called from: `src/app/layout.tsx`
- Starts: `BackgroundEventProcessor` on server boot

### File: src/server/background-processor.ts

**Line X-Y: Poll interval configuration**
- `pollInterval = 1000` (1 second)
- Continuous loop using `processLoop()`

**Line X-Y: tick() method - Event detection**
- Database query:
```sql
SELECT * FROM websurfing_event_queue
WHERE status = 'pending'
LIMIT 50
```

**Line X-Y: Event grouping by sheetId**
- Groups events: `Map<sheetId, events[]>`
- Prevents duplicate processing: `processingSheets` Set

**Line X-Y: Calls SheetUpdater**
- Per sheet: `sheetUpdater.updateSheet(userId, sheetId)`
- Parallel processing: `Promise.allSettled()`

**Data flow:**
Server boot → Start processor → 1s loop → Query pending events → Group by sheet → Call updateSheet
```

**Prompt:**
```
Analyze src/server/background-processor.ts and src/server/startup.ts. Extract: (1) How processor starts on server boot (2) Poll interval and loop mechanism (3) SQL query for pending events (4) Event grouping logic (5) How it calls SheetUpdater with exact method names and parameters. Include line numbers, SQL queries. Brief.
```

---

### Agent 4: Sheet Context Building
**Goal:** Document how SheetUpdater fetches all context needed for operators.

**Files to analyze:**
- `src/server/sheet-updater.ts` (lines 1-150)
- Focus on: Metadata fetching, columns fetching, row data aggregation

**Output format:**
```markdown
## 4. SHEET CONTEXT BUILDING

### File: src/server/sheet-updater.ts

**Line X-Y: Sheet metadata fetch**
```sql
SELECT * FROM websurfing_sheet
WHERE id = {sheetId}
LIMIT 1
```
- Extracts: `templateType`, `isAutonomous`, system prompt

**Line X-Y: Columns fetch**
```sql
SELECT * FROM websurfing_column
WHERE sheetid = {sheetId}
ORDER BY position
```
- Extracts: Array of { id, title, position, dataType }

**Line X-Y: Row data fetch**
```sql
SELECT * FROM websurfing_cell
WHERE sheetId = {sheetId} AND rowIndex = {rowIndex}
```
- Builds: `rowData: Record<colIndex, content>`

**Line X-Y: SheetContext object construction**
```typescript
const sheetContext: SheetContext = {
  sheetId,
  templateType,
  systemPrompt,
  columns: [{ id, title, position, dataType }],
  rowIndex,
  currentColumnIndex,
  rowData: { 0: "content", 1: "content" }
}
```

**Data flow:**
Event received → Fetch sheet metadata → Fetch columns → Fetch row cells → Build context object
```

**Prompt:**
```
Analyze src/server/sheet-updater.ts lines 1-150. Extract: (1) SQL query for sheet metadata (2) SQL query for columns with ORDER BY (3) SQL query for row cells (4) How rowData object is built (5) Complete SheetContext interface with all fields. Include line numbers, SQL, TypeScript types. Brief.
```

---

### Agent 5: Operator Selection Logic
**Goal:** Document how the system decides which operator to use for each event.

**Files to analyze:**
- `src/server/operators/operator-controller.ts` (lines 1-320)
- Focus on: `selectOperator` method, decision logic

**Output format:**
```markdown
## 5. OPERATOR SELECTION LOGIC

### File: src/server/operators/operator-controller.ts

**Line X-Y: dispatch() method**
- Input: `BaseEvent` with `sheetContext`
- Calls: `selectOperator(eventType, data)`

**Line X-Y: selectOperator() decision tree**
```
if (eventType === 'user_cell_edit' || 'robot_cell_update'):
  if isSearchQuery(content):
    return 'google_search'
  else if containsUrls(content):
    return 'url_context'
  else:
    return 'structured_output'
```

**Line X-Y: isSearchQuery() logic**
- Regex: `/^(search:|find:|query:|what is|who is|where is|when is|how to)/i`

**Line X-Y: containsUrls() logic**
- Regex: URL detection pattern

**Line X-Y: prepareInput() for each operator**
- google_search: Builds contextual query with column title
- url_context: Extracts URLs + adds extraction prompt
- structured_output: Uses rowData + contextual prompt

**Data flow:**
Event → selectOperator → Determine type → prepareInput with context → Return operator name
```

**Prompt:**
```
Analyze src/server/operators/operator-controller.ts lines 1-320. Extract: (1) selectOperator decision logic with exact conditions (2) isSearchQuery and containsUrls regex patterns (3) prepareInput method for each operator type showing how context is used (4) Operator names returned. Include line numbers, regex, conditionals. Brief.
```

---

### Agent 6: Context-Aware Input Preparation
**Goal:** Document how operator inputs are enhanced with sheet context.

**Files to analyze:**
- `src/server/operators/operator-controller.ts` (lines 220-320)
- `src/server/operators/column-aware-wrapper.ts`
- Focus on: `prepareInput`, `buildContextualPrompt`

**Output format:**
```markdown
## 6. CONTEXT-AWARE INPUT PREPARATION

### File: src/server/operators/operator-controller.ts

**Line X-Y: prepareInput for google_search**
- Base query: Cell content
- Context addition: `buildContextualPrompt(ctx, nextCol.title)`
- Final query: `${contextPrompt}\n\nSearch query: Find info for "${nextCol.title}" based on: ${content}`

**Line X-Y: prepareInput for structured_output**
- Row data aggregation: Concatenates all non-empty cells as "Column: Value"
- Context prompt: Full system prompt + column structure + target column
- Output: `{ rawData: rowData, prompt: contextPrompt, outputSchema: {} }`

### File: src/server/operators/column-aware-wrapper.ts

**Line X-Y: buildContextualPrompt() method**
```
GOAL:
{systemPrompt}

COLUMN STRUCTURE:
  Column 0: Business Name (current: "squarespace")
  Column 1: Website (current: "")
→ Column 2: Description (TARGET)
  Column 3: Estimated Team Size (current: "")
  Column 4: Contact Links/Emails (current: "")

TASK: Fill "Description" based on the data in this row.
```

**Data flow:**
BaseEvent + SheetContext → buildContextualPrompt → Inject into operator input → Enhanced context
```

**Prompt:**
```
Analyze src/server/operators/operator-controller.ts lines 220-320 and src/server/operators/column-aware-wrapper.ts. Extract: (1) How prepareInput builds queries for google_search with context (2) How structured_output aggregates rowData (3) buildContextualPrompt exact format with GOAL, COLUMN STRUCTURE, TASK sections (4) How target column is identified. Include line numbers, exact string formats. Brief.
```

---

### Agent 7: Gemini Operator Execution
**Goal:** Document how each Gemini operator processes its input and returns output.

**Files to analyze:**
- `src/server/operators/google-search-operator.ts`
- `src/server/operators/url-context-operator.ts`
- `src/server/operators/structured-output-operator.ts`

**Output format:**
```markdown
## 7. GEMINI OPERATOR EXECUTION

### File: src/server/operators/google-search-operator.ts

**Line X-Y: operation() method**
- Input: `{ query: string, maxResults: number }`
- Gemini config: `{ tools: [{ googleSearch: {} }] }`
- API call: `client.models.generateContent({ model: DEFAULT_MODEL, contents: query, config })`
- Output extraction: `groundingMetadata.groundingChunks` → SearchResult[]
- Output structure: `{ results: [{ title, url, snippet }], webSearchQueries, groundingMetadata }`

### File: src/server/operators/url-context-operator.ts

**Line X-Y: operation() method**
- Input: `{ urls: string[], extractionPrompt?: string }`
- Fetches: Page content for each URL
- API call: Gemini with page content + extraction prompt
- Output: `{ summary: string, extractedText: string }`

### File: src/server/operators/structured-output-operator.ts

**Line X-Y: operation() method**
- Input: `{ rawData: string, prompt: string, outputSchema: object }`
- Gemini config: `{ responseMimeType: "application/json", responseJsonSchema: schema }`
- API call: Gemini with prompt + rawData
- Output: `{ structuredData: Record<string, unknown>, confidence: number, rawResponse: string }`

**Data flow:**
Operator input → Gemini API call → Parse response → Structure output → Return result
```

**Prompt:**
```
Analyze google-search-operator.ts, url-context-operator.ts, structured-output-operator.ts. Extract: (1) Input interface for each operator (2) Gemini API configuration (3) How results are extracted from response (4) Output structure with exact field names. Include line numbers, types, API config. Brief.
```

---

### Agent 8: Result Writing to Next Column
**Goal:** Document how operator results are written to the cells table.

**Files to analyze:**
- `src/server/operators/column-aware-wrapper.ts` (writeToNextColumn method)
- Focus on: Content extraction, database writes, next event creation

**Output format:**
```markdown
## 8. RESULT WRITING TO NEXT COLUMN

### File: src/server/operators/column-aware-wrapper.ts

**Line X-Y: writeToNextColumn() method**
- Calculates: `nextColIndex = currentColumnIndex + 1`
- Validates: `nextColIndex < columns.length`

**Line X-Y: Content extraction by operator type**
```typescript
switch (operatorName) {
  case 'google_search':
    content = output.results?.[0]?.url || output.results?.[0]?.title || ''
  case 'url_context':
    content = output.summary || output.extractedText || ''
  case 'structured_output':
    content = Object.values(output.structuredData)[0] || JSON.stringify(output)
}
```

**Line X-Y: Direct write to cells table**
```sql
INSERT INTO websurfing_cell (sheetId, userId, rowIndex, colIndex, content)
VALUES ({sheetId}, {userId}, {rowIndex}, {nextColIndex}, {content})
ON CONFLICT (sheetId, userId, rowIndex, colIndex)
DO UPDATE SET content = {content}, updatedAt = NOW()
```

**Line X-Y: Audit trail to sheetUpdates**
```sql
INSERT INTO websurfing_sheet_update (sheetId, userId, rowIndex, colIndex, content, updateType, appliedAt)
VALUES ({sheetId}, {userId}, {rowIndex}, {nextColIndex}, {content}, 'ai_response', NOW())
```

**Line X-Y: Next event creation (progressive filling)**
```sql
INSERT INTO websurfing_event_queue (sheetId, userId, eventType, payload, status)
VALUES ({sheetId}, {userId}, 'robot_cell_update', { rowIndex, colIndex: nextColIndex, content }, 'pending')
```
- Condition: Only if `nextColIndex + 1 < columns.length`

**Data flow:**
Operator output → Extract content → Write to cells → Log to sheetUpdates → Create next event
```

**Prompt:**
```
Analyze src/server/operators/column-aware-wrapper.ts writeToNextColumn method. Extract: (1) How content is extracted from each operator type (2) EXACT SQL for cells table write with ON CONFLICT (3) EXACT SQL for sheetUpdates write (4) EXACT SQL for next event creation (5) Stop condition for progressive filling. Include line numbers, SQL, switch cases. Brief.
```

---

### Agent 9: Event Completion & Marking
**Goal:** Document how events are marked as completed in the queue.

**Files to analyze:**
- `src/server/sheet-updater.ts` (event processing loop)
- `src/server/operators/operator-controller.ts` (dispatch completion)

**Output format:**
```markdown
## 9. EVENT COMPLETION & MARKING

### File: src/server/sheet-updater.ts

**Line X-Y: Event status transitions**
1. Initial: `status = 'pending'`
2. Before processing: `status = 'processing'`
3. After success: `status = 'completed'`
4. On error: `status = 'failed'`

**Line X-Y: Mark as processing (transaction)**
```sql
UPDATE websurfing_event_queue
SET status = 'processing'
WHERE id IN ({eventIds})
```
- Uses: Database transaction with `FOR UPDATE` lock

**Line X-Y: Mark as completed**
```sql
UPDATE websurfing_event_queue
SET status = 'completed', processedAt = NOW()
WHERE id = {eventId}
```

**Line X-Y: Skip condition - row already complete**
```
if (colIndex >= sheetColumns.length - 1):
  Mark event as completed
  Skip processing
```

### File: src/server/operators/operator-controller.ts

**Line X-Y: Post-dispatch completion**
- After operator returns: Calls `writeToNextColumn()`
- After write: Marks event as completed

**Data flow:**
Event pending → Lock & mark processing → Execute operator → Write result → Mark completed
```

**Prompt:**
```
Analyze src/server/sheet-updater.ts and operator-controller.ts. Extract: (1) Event status transition states (2) SQL to mark as processing with FOR UPDATE (3) SQL to mark as completed (4) Skip logic when row is complete (5) Transaction handling. Include line numbers, SQL, state transitions. Brief.
```

---

### Agent 10: UI Cell Update Mechanism
**Goal:** Document how the frontend polls for new cell data and renders it.

**Files to analyze:**
- `src/components/tiptap-table.tsx` (lines 80-450)
- Focus on: `getCells` query, refetch interval, cell rendering effect

**Output format:**
```markdown
## 10. UI CELL UPDATE MECHANISM

### File: src/components/tiptap-table.tsx

**Line X-Y: getCells query configuration**
- tRPC query: `api.cell.getCells.useQuery({ sheetId })`
- Refetch interval: `2000ms` (2 seconds)
- Refetch on focus: `false`

**Line X-Y: Cell rendering useEffect**
- Dependencies: `[cells, editor, columnCount]`
- Guard: Skips if `editor.isFocused` (prevents interruption while typing)

**Line X-Y: Cell content comparison & update**
```typescript
cells.forEach(cell => {
  const currentContent = td.textContent?.trim() || ''
  const dbContent = (cell.content || '').trim()

  if (dbContent !== currentContent) {
    td.textContent = dbContent
    hasChanges = true
    lastContentRef.current.set(cellKey, dbContent)
  }
})
```

**Line X-Y: Editor content replacement**
- If hasChanges: `editor.commands.setContent(newHtml)`
- Preserves: Table structure with updated cell content

**Line X-Y: Processing row state**
- Query: Checks `processingRows` Set
- Effect: Applies `processing-row` CSS class
- Visual: Opacity 0.6 + spinning loader in each cell

**Data flow:**
2s interval → Fetch cells from DB → Compare with current → Update if different → Apply to editor
```

**Prompt:**
```
Analyze src/components/tiptap-table.tsx lines 80-450. Extract: (1) getCells query refetch interval (2) Cell rendering effect dependencies and guard conditions (3) Cell comparison logic (4) How editor content is updated (5) Processing row CSS application. Include line numbers, code snippets. Brief.
```

---

### Agent 11: Database Schema & Relationships
**Goal:** Document all relevant database tables, columns, and relationships.

**Files to analyze:**
- `src/server/db/schema.ts`
- `drizzle/0002_add_columns_and_templates.sql`

**Output format:**
```markdown
## 11. DATABASE SCHEMA & RELATIONSHIPS

### Table: websurfing_sheet
```sql
CREATE TABLE websurfing_sheet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userid VARCHAR(255) NOT NULL REFERENCES websurfing_user(id),
  name VARCHAR(255) NOT NULL DEFAULT 'Untitled Sheet',
  templatetype VARCHAR(50),
  isautonomous BOOLEAN DEFAULT false,
  createdat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

### Table: websurfing_column
```sql
CREATE TABLE websurfing_column (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheetid UUID NOT NULL REFERENCES websurfing_sheet(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  position INTEGER NOT NULL,
  datatype VARCHAR(50) DEFAULT 'text',
  createdat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sheetid, position)
)
```
- Indexes: `(sheetid)`, `(sheetid, position)`

### Table: websurfing_cell
```sql
CREATE TABLE websurfing_cell (
  id UUID PRIMARY KEY,
  sheetid UUID NOT NULL REFERENCES websurfing_sheet(id),
  userid VARCHAR(255) NOT NULL,
  rowindex INTEGER NOT NULL,
  colindex INTEGER NOT NULL,
  content TEXT,
  createdat TIMESTAMP,
  updatedat TIMESTAMP,
  UNIQUE(sheetid, userid, rowindex, colindex)
)
```

### Table: websurfing_event_queue
```sql
CREATE TABLE websurfing_event_queue (
  id UUID PRIMARY KEY,
  sheetid UUID NOT NULL REFERENCES websurfing_sheet(id),
  userid VARCHAR(255) NOT NULL,
  eventtype VARCHAR(50) NOT NULL,
  payload JSONB,
  status VARCHAR(20) DEFAULT 'pending',
  createdat TIMESTAMP,
  processedat TIMESTAMP
)
```
- Status values: 'pending', 'processing', 'completed', 'failed'

### Table: websurfing_sheet_update
```sql
CREATE TABLE websurfing_sheet_update (
  id UUID PRIMARY KEY,
  sheetid UUID NOT NULL,
  userid VARCHAR(255) NOT NULL,
  rowindex INTEGER,
  colindex INTEGER,
  content TEXT,
  updatetype VARCHAR(50),
  createdat TIMESTAMP,
  appliedat TIMESTAMP
)
```

**Relationships:**
- sheet → columns (1:many, CASCADE delete)
- sheet → cells (1:many)
- sheet → event_queue (1:many)
- sheet → sheet_updates (1:many)
```

**Prompt:**
```
Analyze src/server/db/schema.ts and drizzle/0002_add_columns_and_templates.sql. Extract: (1) Complete CREATE TABLE statements for sheets, columns, cells, event_queue, sheet_updates (2) All column types and constraints (3) Foreign key relationships with CASCADE (4) Unique constraints (5) Indexes. Include SQL DDL. Brief.
```

---

### Agent 12: Complete Flow Summary & Timing
**Goal:** Create a consolidated timeline of the entire flow with approximate timings.

**Output format:**
```markdown
## 12. COMPLETE FLOW TIMELINE

### T+0ms: User Input
- **Action:** User types "squarespace" in cell (0,0)
- **Component:** TipTap editor `onUpdate` handler
- **File:** `src/components/tiptap-table.tsx:214`

### T+1000ms: Debounce Complete
- **Action:** `debouncedCellUpdate` fires
- **Triggers:** `updateCell.mutate()`
- **File:** `src/components/tiptap-table.tsx:141-199`

### T+1050ms: Backend Mutation
- **Action:** tRPC mutation received
- **Database Write 1:** INSERT to `cells` table
- **Database Write 2:** INSERT to `event_queue` table with status='pending'
- **File:** `src/server/api/routers/cell.ts:14-56`

### T+1100ms: UI State Update
- **Action:** Row marked as processing
- **Visual:** Row fades to 60% opacity, spinners appear
- **File:** `src/components/tiptap-table.tsx:58-61`

### T+2000ms: Background Processor Detects Event
- **Action:** Polling tick finds pending event
- **Database Read:** SELECT from `event_queue` WHERE status='pending'
- **File:** `src/server/background-processor.ts:45-50`

### T+2010ms: SheetUpdater Processes Event
- **Database Read 1:** Fetch sheet metadata
- **Database Read 2:** Fetch columns (5 columns)
- **Database Read 3:** Fetch row cells (rowIndex=0)
- **File:** `src/server/sheet-updater.ts:50-98`

### T+2020ms: Build SheetContext
- **Action:** Aggregate metadata, columns, rowData
- **Context:** `{ sheetId, templateType, columns[], rowData: {0: "squarespace"} }`
- **File:** `src/server/sheet-updater.ts:100-109`

### T+2030ms: Operator Selection
- **Action:** `selectOperator()` determines "google_search"
- **Reason:** Content matches search pattern
- **File:** `src/server/operators/operator-controller.ts:296-313`

### T+2040ms: Prepare Input
- **Action:** Build contextual search query
- **Input:** `{ query: "GOAL: Find business info...\n\nSearch: Find 'Website' for squarespace", maxResults: 10 }`
- **File:** `src/server/operators/operator-controller.ts:222-245`

### T+2050ms: Call Google Search Operator
- **Action:** Gemini API call with Google Search grounding
- **API:** `client.models.generateContent({ model: DEFAULT_MODEL, ... })`
- **File:** `src/server/operators/google-search-operator.ts:29-44`

### T+4000ms: Gemini Response Received
- **Output:** `{ results: [{ url: "https://squarespace.com", title: "Squarespace" }], ... }`
- **File:** `src/server/operators/google-search-operator.ts:46-75`

### T+4010ms: Write Result to Column 1 (Website)
- **Database Write 1:** INSERT to `cells` (rowIndex=0, colIndex=1, content="https://squarespace.com")
- **Database Write 2:** INSERT to `sheet_updates` (audit trail)
- **File:** `src/server/operators/column-aware-wrapper.ts:87-105`

### T+4020ms: Create Next Event
- **Database Write:** INSERT to `event_queue` (eventType='robot_cell_update', colIndex=1)
- **Purpose:** Trigger column 2 filling
- **File:** `src/server/operators/column-aware-wrapper.ts:119-137`

### T+4030ms: Mark Original Event Complete
- **Database Write:** UPDATE `event_queue` SET status='completed'
- **File:** `src/server/sheet-updater.ts:111-123`

### T+5000ms: Background Processor Detects New Event
- **Action:** Processes robot_cell_update for column 2
- **Repeats:** Steps 2000ms-4030ms for next column
- **File:** `src/server/background-processor.ts:45-88`

### T+6000ms: UI Polls for Updates
- **Action:** `getCells` refetch interval triggers
- **Database Read:** SELECT from `cells` WHERE sheetId={id}
- **File:** `src/components/tiptap-table.tsx:81-91`

### T+6010ms: UI Updates Cell Content
- **Action:** Detect dbContent !== currentContent
- **Update:** Set `td.textContent = "https://squarespace.com"`
- **Render:** Apply to editor
- **File:** `src/components/tiptap-table.tsx:369-401`

### T+6020ms: Check Row Completion
- **Action:** Count filled columns vs total columns
- **Result:** 2 of 5 filled → Keep processing
- **File:** `src/components/tiptap-table.tsx:405-429`

### T+N: Progressive Column Filling
- **Pattern:** Repeat every ~2 seconds until all 5 columns filled
- **Column 0:** Business Name (user input)
- **Column 1:** Website (google_search)
- **Column 2:** Description (url_context or structured_output)
- **Column 3:** Team Size (structured_output)
- **Column 4:** Contact Links (structured_output)

### T+Final: Row Complete
- **Action:** All columns filled
- **Database Write:** No new event created (stop condition)
- **UI Update:** Remove processing-row class, remove spinners
- **File:** `src/components/tiptap-table.tsx:421-429`

**Total Time:** ~10-15 seconds for 5 columns
**Database Operations:** ~15-20 total (reads + writes)
**API Calls:** 4-5 Gemini calls (one per column)
```

**Prompt:**
```
Create complete timeline from user typing to row complete. Include: (1) Timestamp estimates (2) Every database operation type (3) Every file and line triggering action (4) Progressive column filling pattern (5) Stop condition. Format chronologically with T+ notation, file paths, operation types. Brief.
```

---

## Execution Plan

### Step 1: Prepare Output File
```bash
cd /Users/almorris/hackathons/yc-vibecon
touch .tribe/current-docs-11-08-1919PM/CODEBASE_SUMMARY.MD
```

### Step 2: Execute All Agents in Parallel
```bash
OUTPUT_DIR=".tribe/current-docs-11-08-1919PM"

# Agent 1: Frontend User Input
(claude --model claude-haiku-4-5-20251001 --print "Analyze src/components/tiptap-table.tsx lines 1-700. Extract: (1) How TipTap onUpdate captures user input (2) debouncedCellUpdate mechanism including debounce timing (3) updateCell mutation call with exact parameters (4) setProcessingRows logic. Format as markdown with section header '## 1. FRONTEND USER INPUT FLOW', include line numbers, function names, data flow. Brief." >> "$OUTPUT_DIR/CODEBASE_SUMMARY.MD") &

# Agent 2: Cell Mutation
(claude --model claude-haiku-4-5-20251001 --print "Analyze src/server/api/routers/cell.ts. Extract: (1) updateCell mutation input schema (2) Authorization check logic (3) EXACT database writes to cells table with SQL (4) EXACT event queue insertion with all fields (5) Event payload structure. Format as markdown with section header '## 2. CELL UPDATE MUTATION & EVENT CREATION', include line numbers, SQL operations, field names. Brief." >> "$OUTPUT_DIR/CODEBASE_SUMMARY.MD") &

# Agent 3: Background Processor
(claude --model claude-haiku-4-5-20251001 --print "Analyze src/server/background-processor.ts and src/server/startup.ts. Extract: (1) How processor starts on server boot (2) Poll interval and loop mechanism (3) SQL query for pending events (4) Event grouping logic (5) How it calls SheetUpdater with exact method names and parameters. Format as markdown with section header '## 3. BACKGROUND EVENT PROCESSOR', include line numbers, SQL queries. Brief." >> "$OUTPUT_DIR/CODEBASE_SUMMARY.MD") &

# Agent 4: Context Building
(claude --model claude-haiku-4-5-20251001 --print "Analyze src/server/sheet-updater.ts lines 1-150. Extract: (1) SQL query for sheet metadata (2) SQL query for columns with ORDER BY (3) SQL query for row cells (4) How rowData object is built (5) Complete SheetContext interface with all fields. Format as markdown with section header '## 4. SHEET CONTEXT BUILDING', include line numbers, SQL, TypeScript types. Brief." >> "$OUTPUT_DIR/CODEBASE_SUMMARY.MD") &

# Agent 5: Operator Selection
(claude --model claude-haiku-4-5-20251001 --print "Analyze src/server/operators/operator-controller.ts lines 1-320. Extract: (1) selectOperator decision logic with exact conditions (2) isSearchQuery and containsUrls regex patterns (3) prepareInput method for each operator type showing how context is used (4) Operator names returned. Format as markdown with section header '## 5. OPERATOR SELECTION LOGIC', include line numbers, regex, conditionals. Brief." >> "$OUTPUT_DIR/CODEBASE_SUMMARY.MD") &

# Agent 6: Input Preparation
(claude --model claude-haiku-4-5-20251001 --print "Analyze src/server/operators/operator-controller.ts lines 220-320 and src/server/operators/column-aware-wrapper.ts. Extract: (1) How prepareInput builds queries for google_search with context (2) How structured_output aggregates rowData (3) buildContextualPrompt exact format with GOAL, COLUMN STRUCTURE, TASK sections (4) How target column is identified. Format as markdown with section header '## 6. CONTEXT-AWARE INPUT PREPARATION', include line numbers, exact string formats. Brief." >> "$OUTPUT_DIR/CODEBASE_SUMMARY.MD") &

# Agent 7: Operator Execution
(claude --model claude-haiku-4-5-20251001 --print "Analyze google-search-operator.ts, url-context-operator.ts, structured-output-operator.ts. Extract: (1) Input interface for each operator (2) Gemini API configuration (3) How results are extracted from response (4) Output structure with exact field names. Format as markdown with section header '## 7. GEMINI OPERATOR EXECUTION', include line numbers, types, API config. Brief." >> "$OUTPUT_DIR/CODEBASE_SUMMARY.MD") &

# Agent 8: Result Writing
(claude --model claude-haiku-4-5-20251001 --print "Analyze src/server/operators/column-aware-wrapper.ts writeToNextColumn method. Extract: (1) How content is extracted from each operator type (2) EXACT SQL for cells table write with ON CONFLICT (3) EXACT SQL for sheetUpdates write (4) EXACT SQL for next event creation (5) Stop condition for progressive filling. Format as markdown with section header '## 8. RESULT WRITING TO NEXT COLUMN', include line numbers, SQL, switch cases. Brief." >> "$OUTPUT_DIR/CODEBASE_SUMMARY.MD") &

# Agent 9: Event Completion
(claude --model claude-haiku-4-5-20251001 --print "Analyze src/server/sheet-updater.ts and operator-controller.ts. Extract: (1) Event status transition states (2) SQL to mark as processing with FOR UPDATE (3) SQL to mark as completed (4) Skip logic when row is complete (5) Transaction handling. Format as markdown with section header '## 9. EVENT COMPLETION & MARKING', include line numbers, SQL, state transitions. Brief." >> "$OUTPUT_DIR/CODEBASE_SUMMARY.MD") &

# Agent 10: UI Updates
(claude --model claude-haiku-4-5-20251001 --print "Analyze src/components/tiptap-table.tsx lines 80-450. Extract: (1) getCells query refetch interval (2) Cell rendering effect dependencies and guard conditions (3) Cell comparison logic (4) How editor content is updated (5) Processing row CSS application. Format as markdown with section header '## 10. UI CELL UPDATE MECHANISM', include line numbers, code snippets. Brief." >> "$OUTPUT_DIR/CODEBASE_SUMMARY.MD") &

# Agent 11: Database Schema
(claude --model claude-haiku-4-5-20251001 --print "Analyze src/server/db/schema.ts and drizzle/0002_add_columns_and_templates.sql. Extract: (1) Complete CREATE TABLE statements for sheets, columns, cells, event_queue, sheet_updates (2) All column types and constraints (3) Foreign key relationships with CASCADE (4) Unique constraints (5) Indexes. Format as markdown with section header '## 11. DATABASE SCHEMA & RELATIONSHIPS', include SQL DDL. Brief." >> "$OUTPUT_DIR/CODEBASE_SUMMARY.MD") &

# Agent 12: Complete Timeline
(claude --model claude-haiku-4-5-20251001 --print "Create complete timeline from user typing to row complete. Include: (1) Timestamp estimates (2) Every database operation type (3) Every file and line triggering action (4) Progressive column filling pattern (5) Stop condition. Format as markdown with section header '## 12. COMPLETE FLOW TIMELINE', format chronologically with T+ notation, file paths, operation types. Brief." >> "$OUTPUT_DIR/CODEBASE_SUMMARY.MD") &

echo "✨ Spawned 12 parallel analysis agents..."
sleep 40
echo "✅ Analysis complete! Results in $OUTPUT_DIR/CODEBASE_SUMMARY.MD"
```

### Step 3: Review Aggregated Results
```bash
cat .tribe/current-docs-11-08-1919PM/CODEBASE_SUMMARY.MD
```

---

## Expected Output Structure

The `CODEBASE_SUMMARY.MD` file will contain 12 sections, each documenting a specific part of the event flow:

1. Frontend user input capture
2. Backend mutation and event creation
3. Background processor polling
4. Context aggregation from database
5. Operator selection decision tree
6. Context-aware input preparation
7. Gemini operator execution details
8. Result writing to cells
9. Event completion marking
10. UI polling and rendering
11. Complete database schema
12. End-to-end timeline with timings

Each section includes:
- File paths with line numbers
- Exact SQL queries
- Function signatures and logic
- Data structures and transformations
- Input/output at each stage

---

## Success Criteria

✅ All 12 agents complete within 40 seconds
✅ Each section contains file paths with line numbers
✅ All database operations documented with SQL
✅ Complete data flow from input to output
✅ Progressive column filling logic fully explained
✅ Timing estimates for each stage
✅ No gaps in the event loop documentation

---

## Notes

- **Parallel execution** reduces analysis time from ~8 minutes (sequential) to ~40 seconds
- Each agent writes to the same file using `>>` (append mode)
- Agents are independent and don't block each other
- Results may appear out of order in the file (sections can be reordered manually)
- The markdown structure allows easy navigation by section headers
