# Neon PostgreSQL Database Schema for Tiptap Table Events

This document provides a complete database schema for storing Tiptap table events and data in a PostgreSQL database (Neon).

## Database Schema Overview

The schema consists of 7 main tables designed to efficiently store and query table data, events, and operational queues:

1. **tables** - Table metadata and configuration
2. **cells** - Cell data with versioning
3. **events** - Master events table (partitioned by date)
4. **user_input_events** - User interaction details
5. **robot_input_events** - Automated operation details
6. **cell_update_events** - Cell change history
7. **event_queue** - Pending robot operations

## SQL Schema Definition

### 1. Tables Table

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tables metadata
CREATE TABLE tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    row_count INTEGER DEFAULT 0,
    col_count INTEGER DEFAULT 0,
    version INTEGER DEFAULT 1
);

-- Indexes for tables
CREATE INDEX idx_tables_user_id ON tables(user_id);
CREATE INDEX idx_tables_created_at ON tables(created_at);
CREATE INDEX idx_tables_updated_at ON tables(updated_at);
CREATE INDEX idx_tables_active ON tables(is_active);
CREATE INDEX idx_tables_config_gin ON tables USING gin(config);
```

### 2. Cells Table

```sql
-- Cell data storage
CREATE TABLE cells (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
    row_index INTEGER NOT NULL,
    col_index INTEGER NOT NULL,
    content TEXT,
    format JSONB DEFAULT '{}',
    data_type VARCHAR(50) DEFAULT 'text',
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by VARCHAR(255),

    -- Ensure unique cell positions per table
    UNIQUE(table_id, row_index, col_index)
);

-- Indexes for cells
CREATE INDEX idx_cells_table_id ON cells(table_id);
CREATE INDEX idx_cells_position ON cells(table_id, row_index, col_index);
CREATE INDEX idx_cells_updated_at ON cells(updated_at);
CREATE INDEX idx_cells_updated_by ON cells(updated_by);
CREATE INDEX idx_cells_data_type ON cells(data_type);
CREATE INDEX idx_cells_format_gin ON cells USING gin(format);
```

### 3. Events Table (Partitioned)

```sql
-- Master events table (partitioned by date)
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id VARCHAR(255),
    session_id VARCHAR(255),
    table_id UUID REFERENCES tables(id) ON DELETE CASCADE,
    sequence_number BIGSERIAL,
    metadata JSONB DEFAULT '{}'
) PARTITION BY RANGE (timestamp);

-- Create monthly partitions for events
CREATE TABLE events_2024_01 PARTITION OF events
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE events_2024_02 PARTITION OF events
FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Continue creating partitions as needed...
-- Note: In production, use automated partition management

-- Indexes for events (applied to all partitions)
CREATE INDEX idx_events_timestamp ON events(timestamp);
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_user_id ON events(user_id);
CREATE INDEX idx_events_session_id ON events(session_id);
CREATE INDEX idx_events_table_id ON events(table_id);
CREATE INDEX idx_events_sequence ON events(sequence_number);
CREATE INDEX idx_events_payload_gin ON events USING gin(payload);
CREATE INDEX idx_events_metadata_gin ON events USING gin(metadata);
```

### 4. User Input Events Table

```sql
-- User input event details
CREATE TABLE user_input_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    input_type VARCHAR(50) NOT NULL, -- 'keyboard', 'mouse', 'paste', 'drag'
    target_cell_row INTEGER,
    target_cell_col INTEGER,
    input_data JSONB NOT NULL DEFAULT '{}',
    selection_start JSONB, -- {row: int, col: int}
    selection_end JSONB,   -- {row: int, col: int}
    modifier_keys JSONB DEFAULT '{}', -- {ctrl: bool, shift: bool, alt: bool}
    device_info JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for user_input_events
CREATE INDEX idx_user_input_events_event_id ON user_input_events(event_id);
CREATE INDEX idx_user_input_events_type ON user_input_events(input_type);
CREATE INDEX idx_user_input_events_target ON user_input_events(target_cell_row, target_cell_col);
CREATE INDEX idx_user_input_events_created_at ON user_input_events(created_at);
CREATE INDEX idx_user_input_events_data_gin ON user_input_events USING gin(input_data);
```

### 5. Robot Input Events Table

```sql
-- Robot/automated input event details
CREATE TABLE robot_input_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    robot_type VARCHAR(100) NOT NULL, -- 'ai_assistant', 'automation', 'import'
    operation_type VARCHAR(100) NOT NULL, -- 'insert', 'update', 'delete', 'format'
    target_range JSONB, -- {start: {row, col}, end: {row, col}}
    operation_data JSONB NOT NULL DEFAULT '{}',
    processing_time_ms INTEGER,
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    model_version VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for robot_input_events
CREATE INDEX idx_robot_input_events_event_id ON robot_input_events(event_id);
CREATE INDEX idx_robot_input_events_robot_type ON robot_input_events(robot_type);
CREATE INDEX idx_robot_input_events_operation_type ON robot_input_events(operation_type);
CREATE INDEX idx_robot_input_events_created_at ON robot_input_events(created_at);
CREATE INDEX idx_robot_input_events_confidence ON robot_input_events(confidence_score);
CREATE INDEX idx_robot_input_events_data_gin ON robot_input_events USING gin(operation_data);
```

### 6. Cell Update Events Table

```sql
-- Cell update history with before/after states
CREATE TABLE cell_update_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
    row_index INTEGER NOT NULL,
    col_index INTEGER NOT NULL,
    before_content TEXT,
    after_content TEXT,
    before_format JSONB DEFAULT '{}',
    after_format JSONB DEFAULT '{}',
    change_type VARCHAR(50) NOT NULL, -- 'content', 'format', 'both', 'delete', 'insert'
    diff_data JSONB, -- Detailed diff information
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for cell_update_events
CREATE INDEX idx_cell_update_events_event_id ON cell_update_events(event_id);
CREATE INDEX idx_cell_update_events_table_id ON cell_update_events(table_id);
CREATE INDEX idx_cell_update_events_position ON cell_update_events(table_id, row_index, col_index);
CREATE INDEX idx_cell_update_events_change_type ON cell_update_events(change_type);
CREATE INDEX idx_cell_update_events_created_at ON cell_update_events(created_at);
CREATE INDEX idx_cell_update_events_diff_gin ON cell_update_events USING gin(diff_data);
```

### 7. Event Queue Table

```sql
-- Queue for pending robot operations
CREATE TABLE event_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
    operation_type VARCHAR(100) NOT NULL,
    priority INTEGER DEFAULT 5, -- 1 (highest) to 10 (lowest)
    payload JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for event_queue
CREATE INDEX idx_event_queue_table_id ON event_queue(table_id);
CREATE INDEX idx_event_queue_status ON event_queue(status);
CREATE INDEX idx_event_queue_priority ON event_queue(priority);
CREATE INDEX idx_event_queue_scheduled_for ON event_queue(scheduled_for);
CREATE INDEX idx_event_queue_created_at ON event_queue(created_at);
CREATE INDEX idx_event_queue_processing ON event_queue(status, priority, scheduled_for)
WHERE status IN ('pending', 'processing');
```

## Triggers for Auto-updating Timestamps

```sql
-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for timestamp updates
CREATE TRIGGER update_tables_updated_at
    BEFORE UPDATE ON tables
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_cells_updated_at
    BEFORE UPDATE ON cells
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_event_queue_updated_at
    BEFORE UPDATE ON event_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
```

## Partitioning Management

```sql
-- Function to create monthly partitions automatically
CREATE OR REPLACE FUNCTION create_monthly_partition(table_name TEXT, start_date DATE)
RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
    end_date DATE;
BEGIN
    partition_name := table_name || '_' || to_char(start_date, 'YYYY_MM');
    end_date := start_date + INTERVAL '1 month';

    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF %I
                   FOR VALUES FROM (%L) TO (%L)',
                   partition_name, table_name, start_date, end_date);
END;
$$ LANGUAGE plpgsql;

-- Create partitions for the next 12 months
SELECT create_monthly_partition('events', date_trunc('month', CURRENT_DATE + (generate_series(0,11) || ' month')::interval)::date);
```

## Sample Queries

### Common Read Operations

```sql
-- Get table with recent activity
SELECT t.*,
       COUNT(e.id) as event_count,
       MAX(e.timestamp) as last_activity
FROM tables t
LEFT JOIN events e ON t.id = e.table_id
WHERE t.user_id = 'user123'
GROUP BY t.id
ORDER BY last_activity DESC;

-- Get all cells for a table
SELECT * FROM cells
WHERE table_id = 'table-uuid'
ORDER BY row_index, col_index;

-- Get recent events for a table
SELECT e.*,
       uie.input_type,
       rie.robot_type,
       cue.change_type
FROM events e
LEFT JOIN user_input_events uie ON e.id = uie.event_id
LEFT JOIN robot_input_events rie ON e.id = rie.event_id
LEFT JOIN cell_update_events cue ON e.id = cue.event_id
WHERE e.table_id = 'table-uuid'
  AND e.timestamp >= NOW() - INTERVAL '1 day'
ORDER BY e.timestamp DESC;

-- Get cell update history
SELECT cue.*, e.timestamp, e.user_id
FROM cell_update_events cue
JOIN events e ON cue.event_id = e.id
WHERE cue.table_id = 'table-uuid'
  AND cue.row_index = 5
  AND cue.col_index = 3
ORDER BY e.timestamp DESC;
```

### Write Operations

```sql
-- Insert a new table
INSERT INTO tables (name, description, user_id, config)
VALUES ('My Table', 'Description here', 'user123', '{"theme": "default"}');

-- Update cell content
UPDATE cells
SET content = 'New content',
    format = '{"bold": true}',
    version = version + 1,
    updated_by = 'user123'
WHERE table_id = 'table-uuid'
  AND row_index = 1
  AND col_index = 1;

-- Insert event with related data
WITH new_event AS (
    INSERT INTO events (type, payload, user_id, session_id, table_id)
    VALUES ('cell_update', '{"action": "edit"}', 'user123', 'session456', 'table-uuid')
    RETURNING id
),
cell_update AS (
    INSERT INTO cell_update_events (event_id, table_id, row_index, col_index,
                                   before_content, after_content, change_type)
    SELECT id, 'table-uuid', 1, 1, 'old content', 'new content', 'content'
    FROM new_event
    RETURNING *
)
SELECT * FROM cell_update;
```

### Queue Operations

```sql
-- Add item to queue
INSERT INTO event_queue (table_id, operation_type, priority, payload)
VALUES ('table-uuid', 'ai_suggest', 3, '{"context": "data analysis"}');

-- Get next queue item to process
UPDATE event_queue
SET status = 'processing',
    started_at = NOW()
WHERE id = (
    SELECT id FROM event_queue
    WHERE status = 'pending'
      AND scheduled_for <= NOW()
    ORDER BY priority ASC, created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
)
RETURNING *;

-- Mark queue item as completed
UPDATE event_queue
SET status = 'completed',
    completed_at = NOW()
WHERE id = 'queue-item-uuid';
```

## TypeScript Types (Drizzle ORM)

```typescript
import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  timestamp,
  boolean,
  integer,
  serial,
  decimal
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Tables
export const tables = pgTable('tables', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  config: jsonb('config').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  isActive: boolean('is_active').default(true),
  rowCount: integer('row_count').default(0),
  colCount: integer('col_count').default(0),
  version: integer('version').default(1),
});

// Cells
export const cells = pgTable('cells', {
  id: uuid('id').primaryKey().defaultRandom(),
  tableId: uuid('table_id').notNull().references(() => tables.id, { onDelete: 'cascade' }),
  rowIndex: integer('row_index').notNull(),
  colIndex: integer('col_index').notNull(),
  content: text('content'),
  format: jsonb('format').default({}),
  dataType: varchar('data_type', { length: 50 }).default('text'),
  version: integer('version').default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  updatedBy: varchar('updated_by', { length: 255 }),
});

// Events
export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: varchar('type', { length: 100 }).notNull(),
  payload: jsonb('payload').notNull().default({}),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow(),
  userId: varchar('user_id', { length: 255 }),
  sessionId: varchar('session_id', { length: 255 }),
  tableId: uuid('table_id').references(() => tables.id, { onDelete: 'cascade' }),
  sequenceNumber: serial('sequence_number'),
  metadata: jsonb('metadata').default({}),
});

// User Input Events
export const userInputEvents = pgTable('user_input_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  inputType: varchar('input_type', { length: 50 }).notNull(),
  targetCellRow: integer('target_cell_row'),
  targetCellCol: integer('target_cell_col'),
  inputData: jsonb('input_data').notNull().default({}),
  selectionStart: jsonb('selection_start'),
  selectionEnd: jsonb('selection_end'),
  modifierKeys: jsonb('modifier_keys').default({}),
  deviceInfo: jsonb('device_info').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Robot Input Events
export const robotInputEvents = pgTable('robot_input_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  robotType: varchar('robot_type', { length: 100 }).notNull(),
  operationType: varchar('operation_type', { length: 100 }).notNull(),
  targetRange: jsonb('target_range'),
  operationData: jsonb('operation_data').notNull().default({}),
  processingTimeMs: integer('processing_time_ms'),
  confidenceScore: decimal('confidence_score', { precision: 3, scale: 2 }),
  modelVersion: varchar('model_version', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Cell Update Events
export const cellUpdateEvents = pgTable('cell_update_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  tableId: uuid('table_id').notNull().references(() => tables.id, { onDelete: 'cascade' }),
  rowIndex: integer('row_index').notNull(),
  colIndex: integer('col_index').notNull(),
  beforeContent: text('before_content'),
  afterContent: text('after_content'),
  beforeFormat: jsonb('before_format').default({}),
  afterFormat: jsonb('after_format').default({}),
  changeType: varchar('change_type', { length: 50 }).notNull(),
  diffData: jsonb('diff_data'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Event Queue
export const eventQueue = pgTable('event_queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  tableId: uuid('table_id').notNull().references(() => tables.id, { onDelete: 'cascade' }),
  operationType: varchar('operation_type', { length: 100 }).notNull(),
  priority: integer('priority').default(5),
  payload: jsonb('payload').notNull().default({}),
  status: varchar('status', { length: 50 }).default('pending'),
  retryCount: integer('retry_count').default(0),
  maxRetries: integer('max_retries').default(3),
  scheduledFor: timestamp('scheduled_for', { withTimezone: true }).defaultNow(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Relations
export const tablesRelations = relations(tables, ({ many }) => ({
  cells: many(cells),
  events: many(events),
  cellUpdateEvents: many(cellUpdateEvents),
  eventQueue: many(eventQueue),
}));

export const cellsRelations = relations(cells, ({ one }) => ({
  table: one(tables, {
    fields: [cells.tableId],
    references: [tables.id],
  }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  table: one(tables, {
    fields: [events.tableId],
    references: [tables.id],
  }),
  userInputEvent: one(userInputEvents),
  robotInputEvent: one(robotInputEvents),
  cellUpdateEvents: many(cellUpdateEvents),
}));

// TypeScript types
export type Table = typeof tables.$inferSelect;
export type NewTable = typeof tables.$inferInsert;
export type Cell = typeof cells.$inferSelect;
export type NewCell = typeof cells.$inferInsert;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type UserInputEvent = typeof userInputEvents.$inferSelect;
export type NewUserInputEvent = typeof userInputEvents.$inferInsert;
export type RobotInputEvent = typeof robotInputEvents.$inferSelect;
export type NewRobotInputEvent = typeof robotInputEvents.$inferInsert;
export type CellUpdateEvent = typeof cellUpdateEvents.$inferSelect;
export type NewCellUpdateEvent = typeof cellUpdateEvents.$inferInsert;
export type EventQueueItem = typeof eventQueue.$inferSelect;
export type NewEventQueueItem = typeof eventQueue.$inferInsert;
```

## Migration Files

### Initial Migration (0001_initial.sql)

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables
-- (Include all CREATE TABLE statements from above)

-- Create indexes
-- (Include all CREATE INDEX statements from above)

-- Create functions and triggers
-- (Include all trigger functions from above)
```

### Partition Management Migration (0002_partitions.sql)

```sql
-- Create partition management function
-- (Include partition function from above)

-- Create initial partitions
-- (Include partition creation from above)
```

## Seed Data Examples

```sql
-- Sample table
INSERT INTO tables (id, name, description, user_id, config, row_count, col_count)
VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Sales Data 2024', 'Monthly sales tracking', 'user123',
 '{"theme": "professional", "auto_save": true}', 10, 5);

-- Sample cells
INSERT INTO cells (table_id, row_index, col_index, content, format, data_type, updated_by)
VALUES
('550e8400-e29b-41d4-a716-446655440000', 0, 0, 'Month', '{"header": true, "bold": true}', 'text', 'user123'),
('550e8400-e29b-41d4-a716-446655440000', 0, 1, 'Revenue', '{"header": true, "bold": true}', 'text', 'user123'),
('550e8400-e29b-41d4-a716-446655440000', 1, 0, 'January', '{}', 'text', 'user123'),
('550e8400-e29b-41d4-a716-446655440000', 1, 1, '$50,000', '{"format": "currency"}', 'number', 'user123');

-- Sample events
INSERT INTO events (type, payload, user_id, session_id, table_id)
VALUES
('table_created', '{"name": "Sales Data 2024"}', 'user123', 'sess456', '550e8400-e29b-41d4-a716-446655440000'),
('cell_updated', '{"row": 1, "col": 1, "action": "edit"}', 'user123', 'sess456', '550e8400-e29b-41d4-a716-446655440000');

-- Sample queue item
INSERT INTO event_queue (table_id, operation_type, priority, payload)
VALUES
('550e8400-e29b-41d4-a716-446655440000', 'ai_format_suggestion', 3,
 '{"context": "financial_data", "target_columns": [1, 2]}');
```

## Performance Considerations

1. **Partitioning**: Events table is partitioned by month for better query performance
2. **Indexing**: Strategic indexes on frequently queried columns
3. **JSONB**: Use GIN indexes on JSONB columns for efficient querying
4. **Queue Processing**: `FOR UPDATE SKIP LOCKED` for efficient queue processing
5. **Archival**: Consider archiving old events to separate tables

## Security Considerations

1. **Row Level Security**: Implement RLS policies to ensure users can only access their own data
2. **API Keys**: Store sensitive configuration in separate encrypted fields
3. **Audit Trail**: All changes are tracked through the events system
4. **Data Validation**: Use CHECK constraints for critical data integrity

This schema provides a robust foundation for storing Tiptap table events with comprehensive tracking, efficient querying, and scalable architecture suitable for production use with Neon PostgreSQL.