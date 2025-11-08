# Database Schema Implementation Plan

## Overview
This plan details the implementation of PostgreSQL-based task queue system and spreadsheet schema to bridge the 100% implementation gap identified in the architectural review.

## Current State Analysis
- **Database**: PostgreSQL (Neon) connected ✅
- **ORM**: Drizzle with pgTableCreator ✅
- **Schema**: Only basic auth tables (4/11 required tables) ❌
- **Queue System**: Not implemented (0% complete) ❌

## Target Architecture
Implement comprehensive schema supporting:
1. **Spreadsheet System** - Core data model for spreadsheets, columns, cells
2. **Event Queue System** - PostgreSQL-based task queue with LISTEN/NOTIFY
3. **Audit & History** - Complete edit trails and automation logs
4. **Operator Processing** - Background task processing infrastructure

---

## Phase 1: Core Spreadsheet Schema

### 1.1 Spreadsheets Table
**Purpose**: Store spreadsheet metadata and configuration

```sql
CREATE TABLE websurfing_spreadsheet (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id VARCHAR(255) NOT NULL REFERENCES websurfing_user(id),
    is_public BOOLEAN DEFAULT false,
    default_columns INTEGER DEFAULT 2,
    default_rows INTEGER DEFAULT 8,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Drizzle Implementation**:
```typescript
export const spreadsheets = createTable(
  "spreadsheet",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    name: d.varchar({ length: 255 }).notNull(),
    description: d.text(),
    ownerId: d.varchar({ length: 255 }).notNull().references(() => users.id),
    isPublic: d.boolean().default(false),
    defaultColumns: d.integer().default(2),
    defaultRows: d.integer().default(8),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow(),
    updatedAt: d.timestamp({ withTimezone: true }).defaultNow().$onUpdate(() => new Date()),
  }),
  (t) => [
    index("spreadsheet_owner_idx").on(t.ownerId),
    index("spreadsheet_name_idx").on(t.name),
  ]
);
```

### 1.2 Columns Table
**Purpose**: Store column definitions with titles and validation

```sql
CREATE TABLE websurfing_column (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spreadsheet_id UUID NOT NULL REFERENCES websurfing_spreadsheet(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    width INTEGER DEFAULT 150,
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(spreadsheet_id, position)
);
```

**Drizzle Implementation**:
```typescript
export const columns = createTable(
  "column",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    spreadsheetId: d.uuid().notNull().references(() => spreadsheets.id, { onDelete: "cascade" }),
    position: d.integer().notNull(),
    title: d.varchar({ length: 255 }).notNull(),
    width: d.integer().default(150),
    isVisible: d.boolean().default(true),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow(),
  }),
  (t) => [
    index("column_spreadsheet_idx").on(t.spreadsheetId),
    unique("column_spreadsheet_position").on(t.spreadsheetId, t.position),
  ]
);
```

### 1.3 Cells Table
**Purpose**: Store cell data with content and formatting

```sql
CREATE TABLE websurfing_cell (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spreadsheet_id UUID NOT NULL REFERENCES websurfing_spreadsheet(id) ON DELETE CASCADE,
    column_id UUID NOT NULL REFERENCES websurfing_column(id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL,
    content TEXT,
    formatted_content JSONB,
    cell_type VARCHAR(50) DEFAULT 'text',
    is_formula BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(spreadsheet_id, column_id, row_number)
);
```

**Drizzle Implementation**:
```typescript
export const cells = createTable(
  "cell",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    spreadsheetId: d.uuid().notNull().references(() => spreadsheets.id, { onDelete: "cascade" }),
    columnId: d.uuid().notNull().references(() => columns.id, { onDelete: "cascade" }),
    rowNumber: d.integer().notNull(),
    content: d.text(),
    formattedContent: d.jsonb(),
    cellType: d.varchar({ length: 50 }).default('text'),
    isFormula: d.boolean().default(false),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow(),
    updatedAt: d.timestamp({ withTimezone: true }).defaultNow().$onUpdate(() => new Date()),
  }),
  (t) => [
    index("cell_spreadsheet_idx").on(t.spreadsheetId),
    index("cell_column_idx").on(t.columnId),
    unique("cell_unique_position").on(t.spreadsheetId, t.columnId, t.rowNumber),
  ]
);
```

---

## Phase 2: Event Queue System (PostgreSQL-based)

### 2.1 Task Queue Table
**Purpose**: PostgreSQL-based task queue with SKIP LOCKED support

```sql
CREATE TABLE websurfing_task_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    priority INTEGER DEFAULT 5,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    worker_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Optimized index for queue processing
CREATE INDEX idx_task_queue_processing
ON websurfing_task_queue (status, priority DESC, scheduled_for ASC)
WHERE status = 'pending';

-- Index for worker monitoring
CREATE INDEX idx_task_queue_worker
ON websurfing_task_queue (worker_id, status, started_at);
```

**Drizzle Implementation**:
```typescript
export const taskQueue = createTable(
  "task_queue",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    taskType: d.varchar({ length: 100 }).notNull(),
    payload: d.jsonb().notNull(),
    status: d.varchar({ length: 20 }).default('pending'),
    priority: d.integer().default(5),
    attempts: d.integer().default(0),
    maxAttempts: d.integer().default(3),
    scheduledFor: d.timestamp({ withTimezone: true }).defaultNow(),
    startedAt: d.timestamp({ withTimezone: true }),
    completedAt: d.timestamp({ withTimezone: true }),
    failedAt: d.timestamp({ withTimezone: true }),
    errorMessage: d.text(),
    workerId: d.varchar({ length: 255 }),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow(),
    updatedAt: d.timestamp({ withTimezone: true }).defaultNow().$onUpdate(() => new Date()),
  }),
  (t) => [
    index("task_queue_processing_idx").on(t.status, t.priority, t.scheduledFor)
      .where(sql`${t.status} = 'pending'`),
    index("task_queue_worker_idx").on(t.workerId, t.status, t.startedAt),
    index("task_queue_type_idx").on(t.taskType),
  ]
);
```

### 2.2 Queue Notification Setup
**Purpose**: LISTEN/NOTIFY for real-time task processing

```sql
-- Trigger function for task notifications
CREATE OR REPLACE FUNCTION notify_new_task() RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify(
        'new_task',
        json_build_object(
            'id', NEW.id,
            'task_type', NEW.task_type,
            'priority', NEW.priority
        )::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for new tasks
CREATE TRIGGER task_queue_notify_trigger
    AFTER INSERT ON websurfing_task_queue
    FOR EACH ROW
    WHEN (NEW.status = 'pending')
    EXECUTE FUNCTION notify_new_task();
```

---

## Phase 3: Audit & History Tables

### 3.1 Cell Edit Events
**Purpose**: Audit trail for user cell modifications

```sql
CREATE TABLE websurfing_cell_edit_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cell_id UUID NOT NULL REFERENCES websurfing_cell(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL REFERENCES websurfing_user(id),
    old_content TEXT,
    new_content TEXT,
    edit_type VARCHAR(50) DEFAULT 'manual',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Drizzle Implementation**:
```typescript
export const cellEditEvents = createTable(
  "cell_edit_event",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    cellId: d.uuid().notNull().references(() => cells.id, { onDelete: "cascade" }),
    userId: d.varchar({ length: 255 }).notNull().references(() => users.id),
    oldContent: d.text(),
    newContent: d.text(),
    editType: d.varchar({ length: 50 }).default('manual'),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow(),
  }),
  (t) => [
    index("cell_edit_cell_idx").on(t.cellId),
    index("cell_edit_user_idx").on(t.userId),
    index("cell_edit_time_idx").on(t.createdAt),
  ]
);
```

### 3.2 Robot Input Events
**Purpose**: Audit trail for automated system modifications

```sql
CREATE TABLE websurfing_robot_input_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cell_id UUID NOT NULL REFERENCES websurfing_cell(id) ON DELETE CASCADE,
    task_id UUID REFERENCES websurfing_task_queue(id),
    operator_type VARCHAR(100) NOT NULL,
    input_data JSONB,
    output_data JSONB,
    processing_time_ms INTEGER,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Drizzle Implementation**:
```typescript
export const robotInputEvents = createTable(
  "robot_input_event",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    cellId: d.uuid().notNull().references(() => cells.id, { onDelete: "cascade" }),
    taskId: d.uuid().references(() => taskQueue.id),
    operatorType: d.varchar({ length: 100 }).notNull(),
    inputData: d.jsonb(),
    outputData: d.jsonb(),
    processingTimeMs: d.integer(),
    success: d.boolean().default(true),
    errorMessage: d.text(),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow(),
  }),
  (t) => [
    index("robot_input_cell_idx").on(t.cellId),
    index("robot_input_task_idx").on(t.taskId),
    index("robot_input_operator_idx").on(t.operatorType),
    index("robot_input_time_idx").on(t.createdAt),
  ]
);
```

---

## Phase 4: Advanced Features

### 4.1 Transformer Sessions
**Purpose**: Track multi-step dTransformer processes

```sql
CREATE TABLE websurfing_transformer_session (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_name VARCHAR(255) NOT NULL,
    initial_input JSONB NOT NULL,
    current_step INTEGER DEFAULT 1,
    total_steps INTEGER,
    step_data JSONB,
    is_completed BOOLEAN DEFAULT false,
    requires_user_input BOOLEAN DEFAULT false,
    user_input_prompt TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);
```

**Drizzle Implementation**:
```typescript
export const transformerSessions = createTable(
  "transformer_session",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    sessionName: d.varchar({ length: 255 }).notNull(),
    initialInput: d.jsonb().notNull(),
    currentStep: d.integer().default(1),
    totalSteps: d.integer(),
    stepData: d.jsonb(),
    isCompleted: d.boolean().default(false),
    requiresUserInput: d.boolean().default(false),
    userInputPrompt: d.text(),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow(),
    updatedAt: d.timestamp({ withTimezone: true }).defaultNow().$onUpdate(() => new Date()),
    completedAt: d.timestamp({ withTimezone: true }),
  }),
  (t) => [
    index("transformer_session_name_idx").on(t.sessionName),
    index("transformer_session_status_idx").on(t.isCompleted, t.requiresUserInput),
    index("transformer_session_time_idx").on(t.createdAt),
  ]
);
```

---

## Relations Setup

### Table Relations
```typescript
// Spreadsheet Relations
export const spreadsheetsRelations = relations(spreadsheets, ({ one, many }) => ({
  owner: one(users, { fields: [spreadsheets.ownerId], references: [users.id] }),
  columns: many(columns),
  cells: many(cells),
}));

export const columnsRelations = relations(columns, ({ one, many }) => ({
  spreadsheet: one(spreadsheets, { fields: [columns.spreadsheetId], references: [spreadsheets.id] }),
  cells: many(cells),
}));

export const cellsRelations = relations(cells, ({ one, many }) => ({
  spreadsheet: one(spreadsheets, { fields: [cells.spreadsheetId], references: [spreadsheets.id] }),
  column: one(columns, { fields: [cells.columnId], references: [columns.id] }),
  editEvents: many(cellEditEvents),
  robotEvents: many(robotInputEvents),
}));

// Event Relations
export const cellEditEventsRelations = relations(cellEditEvents, ({ one }) => ({
  cell: one(cells, { fields: [cellEditEvents.cellId], references: [cells.id] }),
  user: one(users, { fields: [cellEditEvents.userId], references: [users.id] }),
}));

export const robotInputEventsRelations = relations(robotInputEvents, ({ one }) => ({
  cell: one(cells, { fields: [robotInputEvents.cellId], references: [cells.id] }),
  task: one(taskQueue, { fields: [robotInputEvents.taskId], references: [taskQueue.id] }),
}));

// Queue Relations
export const taskQueueRelations = relations(taskQueue, ({ many }) => ({
  robotEvents: many(robotInputEvents),
}));
```

---

## Migration Strategy

### Step 1: Update Schema File
```typescript
// src/server/db/schema.ts - Add all new tables
import { sql } from "drizzle-orm";
import { relations, sql as drizzleSql } from "drizzle-orm";
import {
  index,
  pgTableCreator,
  primaryKey,
  unique,
  uuid,
  varchar,
  text,
  jsonb,
  integer,
  boolean,
  timestamp
} from "drizzle-orm/pg-core";

// Add all table definitions here...
```

### Step 2: Generate Migration
```bash
pnpm db:generate
```

### Step 3: Run Migration
```bash
pnpm db:migrate
```

### Step 4: Create Triggers/Functions
```sql
-- Run these SQL commands manually after migration
-- Or add to a post-migration script

-- LISTEN/NOTIFY trigger function
CREATE OR REPLACE FUNCTION notify_new_task() RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('new_task', NEW.id::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Task queue trigger
CREATE TRIGGER task_queue_notify_trigger
    AFTER INSERT ON websurfing_task_queue
    FOR EACH ROW
    WHEN (NEW.status = 'pending')
    EXECUTE FUNCTION notify_new_task();
```

---

## Queue Worker Implementation

### Basic Worker Pattern
```typescript
// src/server/workers/task-processor.ts
export class TaskProcessor {
  async processNextTask() {
    const task = await this.db.transaction(async (tx) => {
      const [task] = await tx
        .select()
        .from(taskQueue)
        .where(
          and(
            eq(taskQueue.status, 'pending'),
            lte(taskQueue.scheduledFor, new Date())
          )
        )
        .orderBy(desc(taskQueue.priority), asc(taskQueue.scheduledFor))
        .limit(1)
        .for('update', { skipLocked: true });

      if (!task) return null;

      await tx
        .update(taskQueue)
        .set({
          status: 'processing',
          startedAt: new Date(),
          workerId: this.workerId,
        })
        .where(eq(taskQueue.id, task.id));

      return task;
    });

    if (task) {
      await this.executeTask(task);
    }
  }
}
```

---

## Testing Strategy

### Database Tests
```typescript
// Test schema integrity
describe('Database Schema', () => {
  test('should create all tables successfully', async () => {
    // Test table creation
  });

  test('should enforce foreign key constraints', async () => {
    // Test relationship integrity
  });

  test('should support queue operations with SKIP LOCKED', async () => {
    // Test concurrent queue processing
  });
});
```

---

## Performance Considerations

### Indexes for Queue Performance
```sql
-- Most important index for queue processing
CREATE INDEX CONCURRENTLY idx_task_queue_processing
ON websurfing_task_queue (status, priority DESC, scheduled_for ASC)
WHERE status = 'pending';

-- Index for cleanup operations
CREATE INDEX CONCURRENTLY idx_task_queue_cleanup
ON websurfing_task_queue (status, created_at)
WHERE status IN ('completed', 'failed');
```

### Connection Pool Configuration
```typescript
// For high-throughput queue processing
const poolConfig = {
  max: 20,        // Maximum connections
  idleTimeout: 30000,
  connectionTimeout: 2000,
};
```

---

## Implementation Timeline

### Week 1: Core Schema
- [ ] Update schema.ts with spreadsheet tables
- [ ] Generate and run migrations
- [ ] Test basic CRUD operations
- [ ] Create seed data

### Week 2: Queue System
- [ ] Add task queue table
- [ ] Implement LISTEN/NOTIFY triggers
- [ ] Build basic task processor
- [ ] Test concurrent processing

### Week 3: Integration
- [ ] Connect cell edits to task queue
- [ ] Implement audit tables
- [ ] Add event relations
- [ ] Performance testing

### Week 4: Advanced Features
- [ ] Add transformer sessions
- [ ] Implement cleanup jobs
- [ ] Add monitoring queries
- [ ] Documentation updates

---

## Success Metrics

### Functional Requirements
- ✅ All 7 tables created successfully
- ✅ Queue processes tasks with no race conditions
- ✅ LISTEN/NOTIFY triggers work for real-time processing
- ✅ Audit trail captures all cell modifications
- ✅ Foreign key constraints enforce data integrity

### Performance Requirements
- ✅ Queue can process 100+ tasks/second
- ✅ Cell edits respond within 100ms
- ✅ Concurrent workers don't block each other
- ✅ Database queries complete within 50ms average

### Integration Requirements
- ✅ Works seamlessly with existing tRPC/Drizzle setup
- ✅ Maintains T3 stack conventions
- ✅ Supports real-time WebSocket updates
- ✅ Scales to multiple worker processes

---

This implementation plan provides a comprehensive roadmap for implementing the PostgreSQL-based task queue system while maintaining architectural consistency and performance requirements.