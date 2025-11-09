## 2. CELL UPDATE MUTATION & EVENT CREATION ✅

### (1) UpdateCell Input Schema (lines 8-13)
```typescript
z.object({
  sheetId: z.string().uuid().optional(),
  rowIndex: z.number(),
  colIndex: z.number(),
  content: z.string(),
})
```

### (2) Authorization Check Logic (line 15)
- Uses `protectedProcedure` requiring authenticated session
- Extracts `userId` from `ctx.session.user.id`

### (3) Database Writes to Cells Table (lines 26-38)
```sql
INSERT INTO cells (sheetId, userId, rowIndex, colIndex, content) 
VALUES (?, ?, ?, ?, ?)
ON CONFLICT (sheetId, userId, rowIndex, colIndex) 
DO UPDATE SET content = ?, updatedAt = ?
```

### (4) Event Queue Insertion (lines 41-53)
```sql
INSERT INTO eventQueue (sheetId, userId, eventType, payload, status)
VALUES (?, ?, 'user_cell_edit', ?, 'pending')
```

### (5) Event Payload Structure (lines 45-51)
```typescript
{
  spreadsheetId: sheetId,
  rowIndex: input.rowIndex,
  columnId: '',
  colIndex: input.colIndex,
  content: input.content,
}
```
## 3. BACKGROUND EVENT PROCESSOR

### Processor Start on Server Boot
- `startServerServices()` called during server startup (startup.ts:5-17)
- Calls `startBackgroundProcessor()` which creates singleton and starts process loop (background-processor.ts:105-109)

### Poll Interval and Loop Mechanism
- Poll interval: **1000ms** (background-processor.ts:8)
- Continuous loop in `processLoop()` method (background-processor.ts:33-43)
- Sleeps between iterations using `sleep(this.pollInterval)` (background-processor.ts:41)

### SQL Query for Pending Events
```sql
SELECT * FROM eventQueue WHERE status = 'pending' LIMIT 50
```
(background-processor.ts:46-50)

### Event Grouping Logic
- Groups events by `sheetId` using Map (background-processor.ts:58-65)
- Skips sheets already being processed via `processingSheets` Set (background-processor.ts:70-73)
- Processes multiple sheets concurrently with `Promise.allSettled()` (background-processor.ts:88)

### SheetUpdater Method Call
- Method: `updateSheet(userId, sheetId)` (background-processor.ts:79-80)
- Parameters: `userId` from first event, `sheetId` from group key
- Cleanup: Removes sheet from processing set in `.finally()` (background-processor.ts:81-83)
## 4. SHEET CONTEXT BUILDING

### 1. SQL Query for Sheet Metadata (line 51)
```sql
SELECT * FROM sheets WHERE id = ? LIMIT 1
```

### 2. SQL Query for Columns with ORDER BY (line 60)
```sql
SELECT * FROM columns WHERE sheetId = ? ORDER BY position
```

### 3. SQL Query for Row Cells (lines 88-93)
```sql
SELECT * FROM cells 
WHERE sheetId = ? AND rowIndex = ?
```

### 4. How rowData Object is Built (lines 95-98)
```typescript
const rowData: Record<number, string> = {};
rowCells.forEach(cell => {
  rowData[cell.colIndex] = cell.content ?? '';
});
```

### 5. Complete SheetContext Interface (operator-controller.ts)
```typescript
export interface SheetContext {
  sheetId: string;
  templateType: 'lucky' | 'marketing' | 'scientific' | null;
  systemPrompt?: string;
  columns: Array<{ id: string; title: string; position: number; dataType: string }>;
  rowIndex: number;
  currentColumnIndex: number;
  rowData: Record<number, string>;
}
```

The SheetContext is built at lines 101-109, combining sheet metadata, ordered columns, and row cell data into a single context object for the operator controller.
## 1. FRONTEND USER INPUT FLOW ✅

### TipTap onUpdate Captures User Input
**Lines 290-316**: `onUpdate` callback in `useEditor` configuration
- **Function**: `onUpdate: ({ editor })`
- **Process**: Parses table HTML → extracts cell content → triggers debounced updates
- **Data flow**: `editor.getHTML()` → DOMParser → `cell.textContent` → `debouncedCellUpdate()`

### debouncedCellUpdate Mechanism
**Lines 194-282**: Debounce implementation with 1-second delay
- **Debounce timing**: 1000ms (line 279)
- **Function**: `debouncedCellUpdate(content, rowIndex, colIndex)`
- **Mechanism**: `Map<string, NodeJS.Timeout>` tracks timeouts per cell key `${rowIndex}-${colIndex}`
- **Logic**: Clears existing timeout → sets new timeout → executes after user stops typing

### updateCell Mutation Call
**Lines 266-271**: Mutation execution with exact parameters
- **Function**: `updateCell.mutate()`
- **Parameters**:
  ```typescript
  {
    sheetId,      // string
    rowIndex,     // number  
    colIndex,     // number
    content,      // string
  }
  ```
- **Trigger**: After 1-second debounce delay and content change validation

### setProcessingRows Logic
**Lines 53, 66-78**: Processing state management
- **State**: `useState<Set<number>>(new Set())`
- **Function**: `setProcessingRows(prev => new Set(prev).add(variables.rowIndex))`
- **Trigger**: On `updateCell.onSuccess` (line 70)
- **Purpose**: Marks row as processing to show loading spinner until completion
## 5. OPERATOR SELECTION LOGIC ✅

### selectOperator Decision Logic (lines 194-244)
**Event Type Conditions:**
- `user_cell_edit` or `robot_cell_update` (lines 196-213):
  - If `isSearchQuery(content)` → `"google_search"`
  - If `containsUrls(content)` → `"url_context"`  
  - Default → `"structured_output"`

- `manual_trigger` (lines 215-238):
  - `triggerType` = "search"|"google_search" → `"google_search"`
  - `triggerType` = "enrich_urls"|"url_context" → `"url_context"`
  - `triggerType` = "call_function"|"function_calling" → `"function_calling"`
  - `triggerType` = "extract_data"|"structured_output" → `"structured_output"`
  - Default → `"structured_output"`

### isSearchQuery and containsUrls Patterns
- `isSearchQuery()` method (lines 364-377): Uses regex `/^(search:|find:|query:|what is|who is|where is|when is|how to)/i` and checks for `?` in content < 200 chars
- `containsUrls()` method (lines 382-385): Uses regex `/https?:\/\/[^\s]+/gi` to detect URLs

### prepareInput Methods by Operator Type

**google_search** (lines 251-274):
- Strips search prefixes: `/^(search:|find:|query:)/i`
- Uses sheet context to build contextual prompt via `ColumnAwareWrapper.buildContextualPrompt()`
- Returns: `{ query, maxResults: 10 }`

**url_context** (lines 276-301):
- Extracts URLs from content via `extractUrls()`
- Builds context-aware extraction prompt using sheet context
- Returns: `{ urls, extractionPrompt }`

**structured_output** (lines 303-320):
- Concatenates row data as context: `${colTitle}: ${value}`
- Uses all available row data for processing
- Falls back to cell content if no row data

### Operator Names Returned
- `"google_search"` - GoogleSearchGeminiOperator
- `"url_context"` - URLContextEnrichmentOperator  
- `"structured_output"` - StructuredOutputConversionOperator
- `"function_calling"` - FunctionCallingOperator
## 8. RESULT WRITING TO NEXT COLUMN ✅

### Content Extraction by Operator Type (lines 97-120)
```typescript
switch (operatorName) {
  case 'google_search':
    content = output.results?.[0]?.url || output.results?.[0]?.title || '';
    break;
  case 'url_context':
    content = output.summary || output.extractedText || '';
    break;
  case 'structured_output':
    if (output.structuredData && typeof output.structuredData === 'object') {
      const data = output.structuredData;
      content = Object.values(data)[0] as string || JSON.stringify(data);
    } else {
      content = JSON.stringify(output.structuredData || output);
    }
    break;
  default:
    content = typeof output === 'string' ? output : JSON.stringify(output);
}
```

### EXACT SQL for cells table write with ON CONFLICT (lines 128-140)
```sql
INSERT INTO cells (sheetId, userId, rowIndex, colIndex, content)
VALUES (?, ?, ?, ?, ?)
ON CONFLICT (sheetId, userId, rowIndex, colIndex)
DO UPDATE SET content = ?, updatedAt = ?
```

### EXACT SQL for sheetUpdates write (lines 143-151)
```sql
INSERT INTO sheetUpdates (sheetId, userId, rowIndex, colIndex, content, updateType, appliedAt)
VALUES (?, ?, ?, ?, ?, 'ai_response', ?)
```

### EXACT SQL for next event creation (lines 163-175)
```sql
INSERT INTO eventQueue (sheetId, userId, eventType, payload, status)
VALUES (?, ?, 'robot_cell_update', ?, 'pending')
```

### Stop condition for progressive filling (lines 160-162, 181)
- **Stop creating events when**: `nextColIndex < ctx.columns.length - 1` is false
- **Condition**: Don't create event if just filled the last column
- **Final check**: `nextColIndex >= ctx.columns.length` stops writing entirely (lines 92-95)
## 10. UI CELL UPDATE MECHANISM

### 1. getCells Query Refetch Interval
**Line 120**: `refetchInterval: 2000` - Refetches cells every 2 seconds

### 2. Cell Rendering Effect Dependencies and Guard Conditions  
**Lines 446-448**: Effect dependencies are `[editor, cells, cells.length]` with guards:
- Requires editor to exist: `if (!editor || !cells || cells.length === 0) return`

### 3. Cell Comparison Logic
**Lines 222-223**: Content change detection:
```typescript
if (content !== lastContent) {
```
Uses `lastContentRef.current.get(cellKey)` to track previous content per cell key `${rowIndex}-${colIndex}`

### 4. Editor Content Updates
**Lines 368-372**: Robot updates bypass events:
```typescript
isApplyingRobotUpdates.current = true
const newHtml = table.outerHTML
editor.commands.setContent(newHtml)
isApplyingRobotUpdates.current = false
```

### 5. Processing Row CSS Application
**Lines 153-163**: Processing status query with 2000ms refetch interval, but CSS application logic not visible in this range.
## 9. EVENT COMPLETION & MARKING ✅

### Event Status Transition States
**Lines 28, 39, 76, 132, 401, 417**
- `pending` → `processing` → `completed`/`failed`
- Status transitions: pending → processing (line 39), processing → completed (lines 76, 401), processing → failed (lines 132, 417)

### SQL to Mark as Processing with FOR UPDATE
**Lines 22-32, 37-40**
```sql
-- Select with row locking
SELECT * FROM eventQueue 
WHERE sheetId = ? AND userId = ? AND status = 'pending'
ORDER BY createdAt
LIMIT 10
FOR UPDATE;

-- Mark as processing
UPDATE eventQueue 
SET status = 'processing' 
WHERE id IN (?);
```

### SQL to Mark as Completed
**Lines 73-79, 399-405**
```sql
-- Sheet updater completion
UPDATE eventQueue 
SET status = 'completed', processedAt = NOW() 
WHERE id = ?;

-- Operator controller completion
UPDATE eventQueue 
SET status = 'completed', processedAt = NOW() 
WHERE id = ?;
```

### Skip Logic When Row is Complete
**Lines 69-85**
```typescript
// Check if row complete (all columns filled)
if (colIndex >= sheetColumns.length - 1) {
  console.log(`Row ${rowIndex} already complete, marking event ${event.id} as completed`);
  // Skip processing and mark completed
  continue;
}
```

### Transaction Handling
**Lines 19-44**
- Uses `db.transaction()` for atomic operations
- Row locking with `.for('update')` prevents concurrent processing
- Batch operations within single transaction scope
- Error handling marks events as 'failed' (lines 129-134, 413-422)
## 6. CONTEXT-AWARE INPUT PREPARATION ✅

### (1) prepareInput builds queries for google_search with context
`src/server/operators/operator-controller.ts:251-273`

```typescript
case "google_search": {
  const cellData = event.data as UpdateCellInput | ManualTriggerData;
  
  let query = "content" in cellData
    ? cellData.content.replace(/^(search:|find:|query:)/i, "").trim()
    : (cellData.parameters?.query as string) || "";
  
  if (event.sheetContext) {
    const ctx = event.sheetContext;
    const nextCol = ctx.columns[ctx.currentColumnIndex + 1];
    if (nextCol) {
      const contextPrompt = ColumnAwareWrapper.buildContextualPrompt(ctx, nextCol.title);
      // Build a focused query that includes the column goal
      query = `${contextPrompt}\n\nSearch query: Find information for "${nextCol.title}" based on: ${query}`;
    }
  }
  
  return { query, maxResults: 10 };
}
```

### (2) structured_output aggregates rowData
`src/server/operators/operator-controller.ts:303-318`

```typescript
case "structured_output": {
  // Use row data as rawData if available
  let rawData = "";
  if (event.sheetContext) {
    // Concatenate all row data for context
    const rowDataArray = Object.entries(event.sheetContext.rowData)
      .filter(([_, value]) => value && value.trim())
      .map(([colIdx, value]) => {
        const colTitle = event.sheetContext!.columns[parseInt(colIdx)]?.title || `Column ${colIdx}`;
        return `${colTitle}: ${value}`;
      });
    rawData = rowDataArray.join('\n');
  }
}
```

### (3) buildContextualPrompt exact format
`src/server/operators/column-aware-wrapper.ts:53-77`

```typescript
static buildContextualPrompt(ctx: SheetContext, targetColumn: string): string {
  const prompt: string[] = [];
  
  // Add template goal
  if (ctx.systemPrompt) {
    prompt.push('GOAL:');
    prompt.push(ctx.systemPrompt);
    prompt.push('');
  }
  
  // Add column structure
  prompt.push('COLUMN STRUCTURE:');
  ctx.columns.forEach((col, idx) => {
    const marker = idx === ctx.currentColumnIndex + 1 ? '→ ' : '  ';
    const value = ctx.rowData[idx] ? `(current: "${ctx.rowData[idx]}")` : '';
    prompt.push(`${marker}Column ${idx}: ${col.title} ${value}`);
  });
  prompt.push('');
  
  // Add task
  prompt.push(`TASK: Fill "${targetColumn}" based on the data in this row.`);
  
  return prompt.join('\n');
}
```

### (4) Target column identification
- **google_search**: `ctx.columns[ctx.currentColumnIndex + 1]` (line 261)
- **url_context**: `ctx.columns[ctx.currentColumnIndex + 1]` (line 289)  
- **structured_output**: Uses `writeToNextColumn` with `nextColIndex = ctx.currentColumnIndex + 1` (line 89)

## 11. DATABASE SCHEMA & RELATIONSHIPS

### Complete CREATE TABLE Statements

```sql
-- Sheets table
CREATE TABLE "websurfing_sheet" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userid" varchar(255) NOT NULL,
  "name" varchar(255) NOT NULL DEFAULT 'Untitled Sheet',
  "templatetype" varchar(50),
  "isautonomous" boolean DEFAULT false,
  "createdAt" timestamp with time zone DEFAULT now(),
  "updatedAt" timestamp with time zone DEFAULT now()
);

-- Columns table
CREATE TABLE "websurfing_column" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "sheetid" uuid NOT NULL,
  "title" varchar(255) NOT NULL,
  "position" integer NOT NULL,
  "datatype" varchar(50) DEFAULT 'text',
  "createdat" timestamp with time zone DEFAULT now(),
  "updatedat" timestamp with time zone DEFAULT now()
);

-- Cells table
CREATE TABLE "websurfing_cell" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "sheetid" uuid NOT NULL,
  "userid" varchar(255) NOT NULL,
  "rowIndex" integer NOT NULL,
  "colIndex" integer NOT NULL,
  "content" text,
  "createdAt" timestamp with time zone DEFAULT now(),
  "updatedAt" timestamp with time zone DEFAULT now()
);

-- Event Queue table
CREATE TABLE "websurfing_event_queue" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "sheetid" uuid NOT NULL,
  "userid" varchar(255) NOT NULL,
  "eventType" varchar(100) NOT NULL,
  "payload" jsonb NOT NULL,
  "status" varchar(20) DEFAULT 'pending',
  "createdAt" timestamp with time zone DEFAULT now(),
  "processedAt" timestamp with time zone
);

-- Sheet Updates table
CREATE TABLE "websurfing_sheet_updates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "sheetid" uuid NOT NULL,
  "userid" varchar(255) NOT NULL,
  "rowindex" integer NOT NULL,
  "colindex" integer NOT NULL,
  "content" text,
  "updatetype" varchar(50) NOT NULL,
  "createdat" timestamp with time zone DEFAULT now(),
  "appliedat" timestamp with time zone
);
```

### Foreign Key Relationships with CASCADE

```sql
-- Sheets to Users
ALTER TABLE "websurfing_sheet" ADD FOREIGN KEY ("userid") REFERENCES "websurfing_user"("id");

-- Columns to Sheets (CASCADE)
ALTER TABLE "websurfing_column" ADD FOREIGN KEY ("sheetid") REFERENCES "websurfing_sheet"("id") ON DELETE CASCADE;

-- Cells to Sheets (CASCADE)
ALTER TABLE "websurfing_cell" ADD FOREIGN KEY ("sheetid") REFERENCES "websurfing_sheet"("id") ON DELETE CASCADE;
ALTER TABLE "websurfing_cell" ADD FOREIGN KEY ("userid") REFERENCES "websurfing_user"("id");

-- Event Queue to Sheets (CASCADE)
ALTER TABLE "websurfing_event_queue" ADD FOREIGN KEY ("sheetid") REFERENCES "websurfing_sheet"("id") ON DELETE CASCADE;
ALTER TABLE "websurfing_event_queue" ADD FOREIGN KEY ("userid") REFERENCES "websurfing_user"("id");

-- Sheet Updates to Sheets (CASCADE)
ALTER TABLE "websurfing_sheet_updates" ADD FOREIGN KEY ("sheetid") REFERENCES "websurfing_sheet"("id") ON DELETE CASCADE;
ALTER TABLE "websurfing_sheet_updates" ADD FOREIGN KEY ("userid") REFERENCES "websurfing_user"("id");
```

### Unique Constraints

```sql
-- Cells: unique position per sheet and user
ALTER TABLE "websurfing_cell" ADD CONSTRAINT "cell_unique_position" UNIQUE ("sheetid", "userid", "rowIndex", "colIndex");

-- Columns: unique position per sheet
ALTER TABLE "websurfing_column" ADD CONSTRAINT "column_unique_position" UNIQUE ("sheetid", "position");
```

### Indexes

```sql
-- Sheets
CREATE INDEX "sheet_user_idx" ON "websurfing_sheet"("userid");

-- Columns
CREATE INDEX "column_sheet_idx" ON "websurfing_column"("sheetid");
CREATE INDEX "column_position_idx" ON "websurfing_column"("sheetid", "position");

-- Cells
CREATE INDEX "cell_sheet_idx" ON "websurfing_cell"("sheetid");
CREATE INDEX "cell_position_idx" ON "websurfing_cell"("rowIndex", "colIndex");
CREATE INDEX "cell_user_idx" ON "websurfing_cell"("userid");

-- Event Queue
CREATE INDEX "event_queue_sheet_idx" ON "websurfing_event_queue"("sheetid");
CREATE INDEX "event_queue_status_idx" ON "websurfing_event_queue"("status");
CREATE INDEX "event_queue_created_idx" ON "websurfing_event_queue"("createdAt");
CREATE INDEX "event_queue_user_idx" ON "websurfing_event_queue"("userid");

-- Sheet Updates
CREATE INDEX "sheet_updates_sheet_idx" ON "websurfing_sheet_updates"("sheetid");
CREATE INDEX "sheet_updates_user_idx" ON "websurfing_sheet_updates"("userid");
CREATE INDEX "sheet_updates_created_idx" ON "websurfing_sheet_updates"("createdat");
CREATE INDEX "sheet_updates_applied_idx" ON "websurfing_sheet_updates"("appliedat");
CREATE INDEX "sheet_updates_position_idx" ON "websurfing_sheet_updates"("rowindex", "colindex");
```
## 7. GEMINI OPERATOR EXECUTION ✅

### GoogleSearchGeminiOperator

**Input Interface** (src/types/operators.ts:43-46):
```typescript
GoogleSearchInput {
  query: string;
  maxResults?: number;
}
```

**API Configuration** (lines 34-44):
```typescript
config = { tools: [{ googleSearch: {} }] }
response = client.models.generateContent({
  model: DEFAULT_MODEL,
  contents: input.query,
  config
})
```

**Result Extraction** (lines 46-68):
```typescript
groundingMetadata = response.candidates?.[0]?.groundingMetadata
// Extract from groundingChunks array
chunk.web.uri, chunk.web.title, extractSnippet()
```

**Output Structure** (lines 70-75):
```typescript
GoogleSearchOutput {
  results: SearchResult[];           // title, url, snippet
  webSearchQueries: string[];
  groundingMetadata: object;
  timestamp: Date;
}
```

### URLContextEnrichmentOperator

**Input Interface** (src/types/operators.ts:48-52):
```typescript
URLContextInput {
  urls: string[];
  extractionPrompt?: string;
  maxUrls?: number;
}
```

**API Configuration** (lines 72-82):
```typescript
config = { tools: [{ urlContext: {} }] }
response = client.models.generateContent({
  model: DEFAULT_MODEL,
  contents: prompt,
  config
})
```

**Result Extraction** (lines 84-111):
```typescript
urlContextMetadata = response.candidates?.[0]?.urlContextMetadata
// Check urlRetrievalStatus === URL_RETRIEVAL_STATUS_SUCCESS
content = response.text
```

**Output Structure** (lines 113-116):
```typescript
URLContextOutput {
  enrichedData: EnrichedURLData[];   // url, content, metadata
  summary?: string;
}
```

### StructuredOutputConversionOperator

**Input Interface** (lines 12-16):
```typescript
StructuredOutputInput {
  rawData: string | object;
  outputSchema: z.ZodSchema | object;
  prompt?: string;
}
```

**API Configuration** (lines 54-62):
```typescript
config = {
  responseMimeType: "application/json",
  responseJsonSchema: jsonSchema,
  ...CONSERVATIVE_GENERATION_CONFIG
}
response = client.models.generateContent({ model: DEFAULT_MODEL, contents: prompt, config })
```

**Result Extraction** (lines 64-82):
```typescript
structuredData = JSON.parse(response.text ?? "{}")
// Validate with Zod if schema provided
validatedData = input.outputSchema.parse(structuredData)
```

**Output Structure** (lines 71-82):
```typescript
StructuredOutputOutput {
  structuredData: Record<string, unknown>;
  confidence: number;              // 0.0-1.0 based on finishReason
  rawResponse?: string;
}
```


## 12. COMPLETE FLOW TIMELINE

### T+0ms: User Input Detection
- **File**: `src/components/tiptap-table.tsx:296-323`
- **Action**: User types "squarespace" in cell (0,0)
- **Trigger**: TipTap `onUpdate` handler fires
- **Parse**: HTML → DOM → extract cell content

### T+1000ms: Debounce Complete & Cell Update
- **File**: `src/components/tiptap-table.tsx:266-271`
- **Action**: `debouncedCellUpdate` timeout expires
- **DB Operation 1**: `INSERT/UPDATE cells` table
- **DB Operation 2**: `INSERT eventQueue` with status='pending'
- **File**: `src/server/api/routers/cell.ts:26-53`

### T+2000ms: Background Processor Detects Event
- **File**: `src/server/background-processor.ts:46-50`
- **Action**: Poll finds pending event
- **DB Operation**: `SELECT eventQueue WHERE status='pending' LIMIT 50`
- **Grouping**: Events grouped by sheetId

### T+2010ms: Sheet Context Building
- **File**: `src/server/sheet-updater.ts:51-109`
- **DB Operation 3**: `SELECT sheets WHERE id=?` (metadata)
- **DB Operation 4**: `SELECT columns WHERE sheetId=? ORDER BY position` 
- **DB Operation 5**: `SELECT cells WHERE sheetId=? AND rowIndex=?`
- **Context**: Build SheetContext with templates, columns, row data

### T+2020ms: Operator Selection & Input Preparation
- **File**: `src/server/operators/operator-controller.ts:194-273`
- **Decision**: Content "squarespace" → `isSearchQuery()` → google_search
- **Context**: Build contextual prompt with column goals
- **Input**: `{ query: "GOAL: Marketing Analysis\n\nSearch: Find Website for squarespace", maxResults: 10 }`

### T+2030ms: Gemini API Call
- **File**: `src/server/operators/google-search-operator.ts:34-44`
- **API**: `client.models.generateContent({ model: DEFAULT_MODEL, tools: [googleSearch] })`
- **Duration**: ~2000ms for API response

### T+4030ms: Write Result to Next Column
- **File**: `src/server/operators/column-aware-wrapper.ts:128-175`
- **Extract**: First search result URL "https://squarespace.com"
- **DB Operation 6**: `INSERT/UPDATE cells` (rowIndex=0, colIndex=1)
- **DB Operation 7**: `INSERT sheetUpdates` (audit trail)
- **DB Operation 8**: `INSERT eventQueue` (robot_cell_update for col 2)

### T+4040ms: Event Completion
- **File**: `src/server/operators/operator-controller.ts:399-405`
- **DB Operation 9**: `UPDATE eventQueue SET status='completed', processedAt=NOW()`

### T+5000ms: Next Column Processing (Progressive Filling)
- **Pattern**: Background processor detects new event for column 2
- **Repeat**: T+2000ms → T+4040ms cycle for each column
- **Content**: Column 1 "https://squarespace.com" → url_context operator → extract description

### T+6000ms: UI Polling & Update
- **File**: `src/components/tiptap-table.tsx:120-142`
- **Action**: `getCells` refetch (2-second interval)
- **DB Operation**: `SELECT cells WHERE sheetId=?`
- **Update**: Compare dbContent vs currentContent → update editor

### T+N: Progressive Column Pattern
- **Column 0**: "squarespace" (user input)
- **Column 1**: "https://squarespace.com" (google_search)
- **Column 2**: "Website building platform..." (url_context)
- **Column 3**: "~500 employees" (structured_output)
- **Column 4**: "[contact@squarespace.com, ...]" (structured_output)

### T+Final: Row Complete & Stop Condition
- **File**: `src/server/operators/column-aware-wrapper.ts:160-162`
- **Stop**: `nextColIndex < ctx.columns.length - 1` is false
- **Action**: No new event created for non-existent column 6
- **UI**: Remove from processingRows Set, hide spinners

**Total Duration**: ~10-15 seconds for 5-column Marketing Analysis
**Database Operations**: 9 core operations + 1 per additional column
**API Calls**: 1 Gemini call per column (4 total for automated columns)
**Files Involved**: 8 source files across frontend/backend/operators/database
