# PROJECT-ARCHITECTURE.md

## Overview

This document defines the architecture for a spreadsheet-based automation system with event-driven processing. The system allows users to interact with a spreadsheet UI, trigger events through cell edits or manual "Go" buttons, and process those events through a queue-based operator system.

---

## Spreadsheet Component

**Location**: `src/app/spreadsheet/[id]/page.tsx`

UI Component managing the user's spreadsheet with Tiptap-based table rendering.

### Key Features:
- Default: 2 columns × 8 rows
- Real-time cell editing with hook system
- Dynamic column addition (with required title validation)
- "Go" button support for manual event triggering

### Cell Edit Events
Fires automatically whenever a user edits a cell.

**Type Reference**: `UpdateCellInput` (defined in `src/types/spreadsheet.ts`)

```typescript
// From src/types/spreadsheet.ts
interface UpdateCellInput {
  spreadsheetId: string;  // UUID of spreadsheet
  rowIndex: number;       // 0-indexed row (0-7 for default)
  columnId: string;       // UUID of column
  content: string;        // New cell content
}
```

**Flow**:
1. User edits cell in Tiptap table
2. `useCellEdit()` hook fires with `CellEditEvent`
3. Zustand store triggers `updateCell()`
4. tRPC mutation sends `UpdateCellInput` to server
5. Server creates entry in `event_queue` table
6. Server updates `cells` table and logs to `cell_edit_events`

**Related Types**:
- `CellEditEvent` - Client-side hook event (includes before/after content)
- `UpdateCellResponse` - Server response after successful update
- `Cell` - Database entity for cell data

---

## Event Queue

**Database Table**: `event_queue` (defined in `src/server/db/schema.ts`)

PostgreSQL table storing all events to be processed by Operators.

### Schema Structure:
```typescript
export const eventQueue = pgTable('event_queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  eventType: text('event_type').notNull(), // 'user_cell_edit', 'robot_cell_update', 'manual_trigger'
  status: text('status').notNull().default('pending'), // 'pending', 'processing', 'completed', 'failed'
  priority: integer('priority').notNull().default(0),
  data: jsonb('data').notNull(), // Event-specific JSON data
  createdAt: timestamp('created_at').notNull().defaultNow(),
  processedAt: timestamp('processed_at'),
  completedAt: timestamp('completed_at'),
  error: text('error'),
  retryCount: integer('retry_count').notNull().default(0),
});
```

### Event Types in Queue:
1. **User Cell Edit** - `data` contains `UpdateCellInput`
2. **Robot Cell Update** - `data` contains `RobotUpdateCellInput`
3. **Manual Trigger** - `data` contains custom trigger payload

---

## Event Types

**Type Definitions**: `src/types/spreadsheet.ts` and `src/types/events.ts`

All events use a standard base type with nested JSON for event-specific data.

### Base Event Structure

```typescript
// Standard event envelope
interface BaseEvent<T = unknown> {
  userId: string;           // User who triggered the event
  eventId: string;          // Unique event ID from database (UUID)
  eventType: EventType;     // Type discriminator
  timestamp: Date;          // When event was created
  data: T;                  // Event-specific payload (JSONB in database)
}

type EventType =
  | 'user_cell_edit'
  | 'robot_cell_update'
  | 'manual_trigger'
  | 'operator_result';
```

### User Cell Edit Event

```typescript
interface UserCellEditEvent extends BaseEvent<UpdateCellInput> {
  eventType: 'user_cell_edit';
  data: UpdateCellInput; // From src/types/spreadsheet.ts
}

// Example:
{
  userId: 'user-123',
  eventId: '550e8400-e29b-41d4-a716-446655440000',
  eventType: 'user_cell_edit',
  timestamp: '2025-11-08T12:00:00Z',
  data: {
    spreadsheetId: 'sheet-456',
    rowIndex: 2,
    columnId: 'col-789',
    content: 'New value'
  }
}
```

### Robot Cell Update Event

```typescript
interface RobotCellUpdateEvent extends BaseEvent<RobotUpdateCellInput> {
  eventType: 'robot_cell_update';
  data: RobotUpdateCellInput; // From src/types/spreadsheet.ts
}

// Example:
{
  userId: 'system',
  eventId: '660e8400-e29b-41d4-a716-446655440001',
  eventType: 'robot_cell_update',
  timestamp: '2025-11-08T12:01:00Z',
  data: {
    spreadsheetId: 'sheet-456',
    rowIndex: 3,
    columnId: 'col-789',
    content: 'Automated result',
    automationType: 'api_import',
    automationJobId: 'job-999',
    confidence: 0.95,
    metadata: {
      description: 'Fetched from external API',
      source: 'https://api.example.com/data',
      durationMs: 1250
    }
  }
}
```

### Manual Trigger Event

```typescript
interface ManualTriggerEvent extends BaseEvent<ManualTriggerData> {
  eventType: 'manual_trigger';
  data: ManualTriggerData;
}

interface ManualTriggerData {
  spreadsheetId: string;
  triggerType: string; // e.g., 'go_button', 'refresh_data'
  selectedCells?: {
    rowIndex: number;
    columnId: string;
  }[];
  parameters?: Record<string, unknown>;
}
```

---

## Operators

**Location**: `src/server/operators/`

Core functionality containers for API calls and event processing.

### Operator Base Class

```typescript
// src/server/operators/base-operator.ts

abstract class BaseOperator<TInput, TOutput> {
  abstract readonly name: string;
  abstract readonly inputType: string;
  abstract readonly outputType: string;

  /**
   * Main operation logic
   */
  abstract operation(input: TInput): Promise<TOutput>;

  /**
   * Post-processing hook (optional)
   * Called after operation() completes
   * Can dispatch to another operator or update spreadsheet
   */
  async next?(output: TOutput): Promise<void>;

  /**
   * Error handling hook (optional)
   */
  async onError?(error: Error, input: TInput): Promise<void>;
}
```

### Operator Type Definitions

```typescript
// src/types/operators.ts

interface OperatorInput<T = unknown> {
  eventId: string;
  userId: string;
  data: T;
}

interface OperatorOutput<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  nextOperator?: string; // Name of next operator to call
}
```

### Three Core Operators

#### 1. Google Search Gemini Operator

**File**: `src/server/operators/google-search-operator.ts`

```typescript
interface GoogleSearchInput {
  query: string;
  maxResults?: number;
}

interface GoogleSearchOutput {
  results: {
    title: string;
    url: string;
    snippet: string;
  }[];
  timestamp: Date;
}

class GoogleSearchGeminiOperator extends BaseOperator<GoogleSearchInput, GoogleSearchOutput> {
  name = 'google_search_gemini';
  inputType = 'GoogleSearchInput';
  outputType = 'GoogleSearchOutput';

  async operation(input: GoogleSearchInput): Promise<GoogleSearchOutput> {
    // Implementation: Call Google Search API via Gemini
    // Reference: .tribe/snippets/GEMINI-GOOGLE_SEARCH.md
  }

  async next(output: GoogleSearchOutput): Promise<void> {
    // Option 1: Pass to URL Context Enrichment Operator
    // Option 2: Update spreadsheet with results
  }
}
```

#### 2. Google URL Context Enrichment Gemini Operator

**File**: `src/server/operators/url-context-operator.ts`

```typescript
interface URLContextInput {
  urls: string[];
  extractionPrompt?: string;
}

interface URLContextOutput {
  enrichedData: {
    url: string;
    content: string;
    metadata: Record<string, unknown>;
  }[];
}

class URLContextEnrichmentOperator extends BaseOperator<URLContextInput, URLContextOutput> {
  name = 'url_context_enrichment';
  inputType = 'URLContextInput';
  outputType = 'URLContextOutput';

  async operation(input: URLContextInput): Promise<URLContextOutput> {
    // Implementation: Fetch and extract URL content via Gemini
    // Reference: .tribe/snippets/GEMINI-URL_CONTEXT.md
  }

  async next(output: URLContextOutput): Promise<void> {
    // Pass to Structured Output Conversion Operator
  }
}
```

#### 3. Google Gemini Structured Output Conversion Operator

**File**: `src/server/operators/structured-output-operator.ts`

```typescript
interface StructuredOutputInput {
  rawData: string | object;
  outputSchema: object; // JSON Schema
}

interface StructuredOutputOutput {
  structuredData: Record<string, unknown>;
  confidence: number;
}

class StructuredOutputConversionOperator extends BaseOperator<StructuredOutputInput, StructuredOutputOutput> {
  name = 'structured_output_conversion';
  inputType = 'StructuredOutputInput';
  outputType = 'StructuredOutputOutput';

  async operation(input: StructuredOutputInput): Promise<StructuredOutputOutput> {
    // Implementation: Convert to structured format via Gemini
    // Reference: .tribe/snippets/GEMINI-STRUCTURED_OUTPUT.md
  }

  async next(output: StructuredOutputOutput): Promise<void> {
    // Update spreadsheet cells with structured data
    // Create RobotUpdateCellInput events
  }
}
```

---

## Operator Controller

**Location**: `src/server/operators/operator-controller.ts`

Ingests events from `event_queue` and dispatches appropriate operators.

### Controller Implementation

```typescript
class OperatorController {
  private operators: Map<string, BaseOperator<any, any>>;

  constructor() {
    this.operators = new Map([
      ['google_search', new GoogleSearchGeminiOperator()],
      ['url_context', new URLContextEnrichmentOperator()],
      ['structured_output', new StructuredOutputConversionOperator()],
    ]);
  }

  /**
   * Main dispatch logic
   * Determines which operator to use based on event type
   */
  async dispatch(event: BaseEvent): Promise<void> {
    const operatorName = this.selectOperator(event.eventType, event.data);
    const operator = this.operators.get(operatorName);

    if (!operator) {
      throw new Error(`No operator found for: ${operatorName}`);
    }

    try {
      const input = this.prepareInput(event);
      const output = await operator.operation(input);

      // Call next() hook if defined
      if (operator.next) {
        await operator.next(output);
      }

      // Mark event as completed
      await this.completeEvent(event.eventId, output);
    } catch (error) {
      if (operator.onError) {
        await operator.onError(error as Error, input);
      }
      await this.failEvent(event.eventId, error as Error);
    }
  }

  /**
   * Simple switch-based operator selection
   * Matches architecture requirement for hardcoded processing directions
   */
  private selectOperator(eventType: string, data: unknown): string {
    switch (eventType) {
      case 'user_cell_edit':
        // Check if cell content is a search query
        if (this.isSearchQuery(data)) {
          return 'google_search';
        }
        return 'structured_output'; // Default processing

      case 'manual_trigger':
        const trigger = data as ManualTriggerData;
        if (trigger.triggerType === 'search') {
          return 'google_search';
        }
        if (trigger.triggerType === 'enrich_urls') {
          return 'url_context';
        }
        return 'structured_output';

      default:
        throw new Error(`Unknown event type: ${eventType}`);
    }
  }

  private isSearchQuery(data: unknown): boolean {
    // Logic to detect if cell content is a search query
    // e.g., starts with "search:", contains "?", etc.
    return false; // Placeholder
  }

  private prepareInput(event: BaseEvent): OperatorInput {
    return {
      eventId: event.eventId,
      userId: event.userId,
      data: event.data,
    };
  }

  private async completeEvent(eventId: string, output: unknown): Promise<void> {
    // Update event_queue: status = 'completed', completedAt = now
  }

  private async failEvent(eventId: string, error: Error): Promise<void> {
    // Update event_queue: status = 'failed', error = error.message
  }
}
```

### Queue Processing Worker

```typescript
// src/server/workers/event-processor.ts

class EventProcessor {
  private controller: OperatorController;

  constructor() {
    this.controller = new OperatorController();
  }

  /**
   * Main worker loop
   * Polls event_queue for pending events and processes them
   */
  async start(): Promise<void> {
    while (true) {
      const events = await this.fetchPendingEvents();

      for (const event of events) {
        await this.controller.dispatch(event);
      }

      await this.sleep(1000); // Poll every second
    }
  }

  private async fetchPendingEvents(): Promise<BaseEvent[]> {
    // Query event_queue WHERE status = 'pending' ORDER BY priority DESC, createdAt ASC LIMIT 10
    return [];
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

---

## dTransformer (Dynamic Transformer)

**Location**: `src/server/transformers/`

Multi-step operator chains that require intermediate user input.

### dTransformer Base Class

```typescript
// src/server/transformers/base-transformer.ts

abstract class DynamicTransformer<
  TInputA,
  TOutputA,
  TInputB,
  TOutputB
> {
  abstract readonly name: string;
  abstract readonly operatorA: BaseOperator<TInputA, TOutputA>;
  abstract readonly operatorB: BaseOperator<
    { inputA: TInputA; outputA: TOutputA; inputB: TInputB },
    TOutputB
  >;

  /**
   * Step 1: Process initial user input
   */
  async stepA(inputA: TInputA): Promise<TOutputA> {
    return await this.operatorA.operation(inputA);
  }

  /**
   * Step 2: Process user response with context
   */
  async stepB(
    inputA: TInputA,
    outputA: TOutputA,
    inputB: TInputB
  ): Promise<TOutputB> {
    return await this.operatorB.operation({
      inputA,
      outputA,
      inputB,
    });
  }

  /**
   * Helper to manage state between steps
   */
  async execute(
    inputA: TInputA,
    getUserInput: (clarification: TOutputA) => Promise<TInputB>
  ): Promise<TOutputB> {
    const outputA = await this.stepA(inputA);
    const inputB = await getUserInput(outputA);
    const outputB = await this.stepB(inputA, outputA, inputB);
    return outputB;
  }
}
```

### Example: Search Clarification Transformer

```typescript
// src/server/transformers/search-clarification-transformer.ts

interface SearchInputA {
  query: string;
}

interface SearchOutputA {
  clarifyingQuestion: string;
  suggestedOptions: string[];
}

interface SearchInputB {
  selectedOption: string;
  additionalContext?: string;
}

interface SearchOutputB {
  results: GoogleSearchOutput['results'];
  refinedQuery: string;
}

class SearchClarificationTransformer extends DynamicTransformer<
  SearchInputA,
  SearchOutputA,
  SearchInputB,
  SearchOutputB
> {
  name = 'search_clarification';

  operatorA = new ClarifySearchOperator(); // Generates clarifying questions
  operatorB = new RefinedSearchOperator(); // Performs refined search with context

  // Inherits stepA(), stepB(), execute() from base class
}
```

### dTransformer State Management

```typescript
// Database table for tracking transformer state
export const transformerSessions = pgTable('transformer_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  transformerName: text('transformer_name').notNull(),
  eventId: text('event_id').notNull(),
  currentStep: text('current_step').notNull(), // 'awaiting_input_b', 'completed'
  inputA: jsonb('input_a'),
  outputA: jsonb('output_a'),
  inputB: jsonb('input_b'),
  outputB: jsonb('output_b'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at'),
});
```

---

## Type Mapping Summary

### Core Types by Module

| Type | Location | Purpose |
|------|----------|---------|
| `UpdateCellInput` | `src/types/spreadsheet.ts` | User cell edit payload |
| `RobotUpdateCellInput` | `src/types/spreadsheet.ts` | Automation cell update payload |
| `BaseEvent<T>` | `src/types/events.ts` | Standard event envelope |
| `OperatorInput<T>` | `src/types/operators.ts` | Operator input wrapper |
| `OperatorOutput<T>` | `src/types/operators.ts` | Operator output wrapper |
| `GoogleSearchInput` | `src/types/operators.ts` | Google Search operator input |
| `URLContextInput` | `src/types/operators.ts` | URL enrichment operator input |
| `StructuredOutputInput` | `src/types/operators.ts` | Structured conversion input |

### Database Tables

| Table | Schema Location | Purpose |
|-------|----------------|---------|
| `spreadsheets` | `src/server/db/schema.ts` | Spreadsheet metadata |
| `columns` | `src/server/db/schema.ts` | Column definitions |
| `cells` | `src/server/db/schema.ts` | Cell data |
| `cell_edit_events` | `src/server/db/schema.ts` | User edit audit log |
| `robot_input_events` | `src/server/db/schema.ts` | Automation audit log |
| `event_queue` | `src/server/db/schema.ts` | Pending events for operators |
| `transformer_sessions` | `src/server/db/schema.ts` | dTransformer state |

---

## Data Flow Example

### User Edits Cell → Google Search → Update Spreadsheet

1. **User Action**: User types "weather in NYC" in cell (row 2, column A)

2. **Client Event**:
```typescript
// Fires useCellEdit hook
const event: CellEditEvent = {
  cellId: 'cell-123',
  rowIndex: 2,
  columnId: 'col-a',
  columnTitle: 'Search Query',
  previousContent: '',
  newContent: 'weather in NYC',
  timestamp: new Date(),
};
```

3. **tRPC Mutation**:
```typescript
// Client sends to server
const input: UpdateCellInput = {
  spreadsheetId: 'sheet-456',
  rowIndex: 2,
  columnId: 'col-a',
  content: 'weather in NYC',
};
```

4. **Event Queue Entry**:
```typescript
// Server creates event in event_queue
{
  userId: 'user-123',
  eventType: 'user_cell_edit',
  status: 'pending',
  data: input, // UpdateCellInput as JSONB
}
```

5. **Operator Controller Dispatch**:
```typescript
// Controller detects search query, dispatches to GoogleSearchGeminiOperator
const operatorInput: OperatorInput<GoogleSearchInput> = {
  eventId: 'evt-789',
  userId: 'user-123',
  data: {
    query: 'weather in NYC',
    maxResults: 5,
  },
};
```

6. **Operator Execution**:
```typescript
// GoogleSearchGeminiOperator processes
const output: GoogleSearchOutput = {
  results: [
    { title: 'NYC Weather', url: 'https://...', snippet: '72°F...' },
    // ... more results
  ],
  timestamp: new Date(),
};
```

7. **Update Spreadsheet (via next() hook)**:
```typescript
// Operator creates RobotUpdateCellInput to write results back
const robotInput: RobotUpdateCellInput = {
  spreadsheetId: 'sheet-456',
  rowIndex: 2,
  columnId: 'col-b', // Results column
  content: 'NYC Weather: 72°F, sunny',
  automationType: 'google_search',
  automationJobId: 'job-999',
  confidence: 1.0,
  metadata: {
    description: 'Google Search result for "weather in NYC"',
    source: 'https://www.google.com/search',
    durationMs: 850,
  },
};
```

8. **Database Updates**:
   - `cells` table updated with search result
   - `robot_input_events` logs automation
   - `event_queue` marked as completed

9. **Client Update**:
   - WebSocket/polling updates UI
   - Cell displays search result
   - User sees automation indicator

---

## Architecture Validation Checklist

### ✅ Requirements Met:

1. **Spreadsheet with cell edit events** → `UpdateCellInput` type, `useCellEdit()` hook
2. **"Go" button support** → `ManualTriggerEvent` with custom trigger types
3. **Event queue with JSON data** → `event_queue` table with JSONB `data` field
4. **Standard event type** → `BaseEvent<T>` with `userId`, `eventId`, `data`
5. **Three operator types** → All implemented with base class
6. **Standard input/output** → `OperatorInput<T>` and `OperatorOutput<T>`
7. **Operator controller dispatch** → Switch-based routing by event type
8. **dTransformer with two operators** → Base class with `stepA()`, `stepB()`

### ✅ Type System Validation:

- User cell edits: `UpdateCellInput` → matches architecture ✓
- Robot updates: `RobotUpdateCellInput` → extends architecture ✓
- Event queue: `BaseEvent<T>` → matches architecture ✓
- Operators: Type-safe input/output → matches architecture ✓
- dTransformers: Multi-step with intermediate input → matches architecture ✓

---

## Next Steps for Implementation

1. **Create type files** → `src/types/events.ts`, `src/types/operators.ts`
2. **Update database schema** → Add `event_queue`, `transformer_sessions` tables
3. **Implement base classes** → `BaseOperator`, `DynamicTransformer`
4. **Build three operators** → Google Search, URL Context, Structured Output
5. **Build operator controller** → Event dispatch and routing logic
6. **Create event processor worker** → Background job to process queue
7. **Connect to spreadsheet UI** → Hook system integration
8. **Add WebSocket updates** → Real-time result display

---

## References

- **Type Definitions**: `src/types/spreadsheet.ts`
- **Sample App Plan**: `.tribe/tiptap-docs/SAMPLE-APP-PLAN.md`
- **Tiptap Documentation**: `.tribe/tiptap-docs/1-tables-basics.md`
- **Event System**: `.tribe/tiptap-docs/6-event-types.md`
- **Queue Manager**: `.tribe/tiptap-docs/9-queue-manager-backend.md`
- **Gemini Operators**: `.tribe/snippets/GEMINI-*.md`
