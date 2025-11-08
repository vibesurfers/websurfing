# Database Documentation

## Overview
This project uses **PostgreSQL** with **Drizzle ORM** for type-safe database operations. The database supports a Tiptap table interface with an event queue system for processing user interactions.

## Database Provider
- **Provider**: Neon (PostgreSQL)
- **ORM**: Drizzle ORM
- **Migration Tool**: Drizzle Kit
- **Schema Location**: `src/server/db/schema.ts`

---

## Schema Tables

### 1. Authentication Tables (T3 Stack Default)

#### `websurfing_user`
```typescript
export const users = createTable("user", (d) => ({
  id: d.varchar({ length: 255 }).notNull().primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: d.varchar({ length: 255 }),
  email: d.varchar({ length: 255 }).notNull(),
  emailVerified: d.timestamp({ mode: "date", withTimezone: true }).$defaultFn(() => new Date()),
  image: d.varchar({ length: 255 }),
}));
```

#### `websurfing_account`
```typescript
export const accounts = createTable("account", (d) => ({
  userId: d.varchar({ length: 255 }).notNull().references(() => users.id),
  type: d.varchar({ length: 255 }).$type<AdapterAccount["type"]>().notNull(),
  provider: d.varchar({ length: 255 }).notNull(),
  providerAccountId: d.varchar({ length: 255 }).notNull(),
  refresh_token: d.text(),
  access_token: d.text(),
  expires_at: d.integer(),
  token_type: d.varchar({ length: 255 }),
  scope: d.varchar({ length: 255 }),
  id_token: d.text(),
  session_state: d.varchar({ length: 255 }),
}));
```

#### `websurfing_session`
```typescript
export const sessions = createTable("session", (d) => ({
  sessionToken: d.varchar({ length: 255 }).notNull().primaryKey(),
  userId: d.varchar({ length: 255 }).notNull().references(() => users.id),
  expires: d.timestamp({ mode: "date", withTimezone: true }).notNull(),
}));
```

### 2. Application Tables

#### `websurfing_cell`
**Purpose**: Store individual cell data from the Tiptap table
```typescript
export const cells = createTable("cell", (d) => ({
  id: d.uuid().primaryKey().defaultRandom(),
  rowIndex: d.integer().notNull(),
  colIndex: d.integer().notNull(),
  content: d.text(),
  createdAt: d.timestamp({ withTimezone: true }).defaultNow(),
  updatedAt: d.timestamp({ withTimezone: true }).defaultNow().$onUpdate(() => new Date()),
}), (t) => [
  index("cell_position_idx").on(t.rowIndex, t.colIndex),
  unique("cell_unique_position").on(t.rowIndex, t.colIndex),
]);
```

**Constraints**:
- Unique constraint on `(rowIndex, colIndex)` - prevents duplicate cell positions
- Composite index for efficient position-based queries

#### `websurfing_event_queue`
**Purpose**: PostgreSQL-based task queue for processing cell edit events
```typescript
export const eventQueue = createTable("event_queue", (d) => ({
  id: d.uuid().primaryKey().defaultRandom(),
  eventType: d.varchar({ length: 100 }).notNull(),
  payload: d.jsonb().notNull(),
  status: d.varchar({ length: 20 }).default('pending'),
  createdAt: d.timestamp({ withTimezone: true }).defaultNow(),
  processedAt: d.timestamp({ withTimezone: true }),
}), (t) => [
  index("event_queue_status_idx").on(t.status),
  index("event_queue_created_idx").on(t.createdAt),
]);
```

**Event Types**:
- `cell_update` - User edited a cell

**Statuses**:
- `pending` - Event awaiting processing
- `completed` - Event successfully processed
- `failed` - Event processing failed

**Payload Structure** (JSONB):
```typescript
interface CellUpdatePayload {
  rowIndex: number;
  colIndex: number;
  content: string;
}
```

---

## Database Operations

### Setup Commands
```bash
# Install dependencies
pnpm install

# Push schema to database (development)
pnpm db:push

# Generate migration files
pnpm db:generate

# Run migrations (production)
pnpm db:migrate

# Open Drizzle Studio (database GUI)
pnpm db:studio
```

### Environment Configuration
Required environment variables in `.env`:
```bash
DATABASE_URL="postgresql://username:password@host:port/database"
```

### Drizzle Studio
Access database GUI at: `https://local.drizzle.studio?port=5555`
- View all tables and data
- Run custom queries
- Inspect relationships
- Monitor performance

---

## Event Queue System

### How It Works
1. **User edits cell** → Tiptap `onUpdate` triggers
2. **Debounced processing** → Wait 1 second after typing stops
3. **tRPC mutation** → `cell.updateCell` API called
4. **Database writes**:
   - Insert/update record in `cells` table
   - Create new record in `event_queue` table with status `pending`
5. **Background processing** → `/api/process-events` endpoint processes queue
6. **Event completion** → Status updated to `completed`

### Queue Processing Pattern
```typescript
// Simplified queue processing flow
const pendingEvents = await db
  .select()
  .from(eventQueue)
  .where(eq(eventQueue.status, 'pending'))
  .limit(10);

for (const event of pendingEvents) {
  try {
    await processEvent(event);
    await markEventCompleted(event.id);
  } catch (error) {
    await markEventFailed(event.id, error);
  }
}
```

### Queue Monitoring
- **Current events**: Query `cell.getEvents` via tRPC
- **Processing stats**: Check `/api/process-events` response
- **Database inspection**: Use Drizzle Studio

---

## Performance Considerations

### Indexes
- `cell_position_idx` - Fast cell lookups by position
- `event_queue_status_idx` - Efficient queue processing
- `event_queue_created_idx` - Chronological event ordering

### Query Patterns
```typescript
// Efficient cell updates (upsert pattern)
await db.insert(cells).values(newCell)
  .onConflictDoUpdate({
    target: [cells.rowIndex, cells.colIndex],
    set: { content: newCell.content, updatedAt: new Date() }
  });

// Batch event processing
await db.select().from(eventQueue)
  .where(eq(eventQueue.status, 'pending'))
  .orderBy(eventQueue.createdAt)
  .limit(10);
```

### Debouncing Strategy
- **Client-side debouncing** - 1 second delay per cell
- **Per-cell timeouts** - Independent debouncing for each table cell
- **Content deduplication** - Skip events if content unchanged

---

## Migration History

### Initial Schema (0000_initial.sql)
- Created authentication tables (`users`, `accounts`, `sessions`)
- Added demo `posts` table

### Event Queue Addition
- Added `cells` table for storing cell data
- Added `event_queue` table for task processing
- Created indexes for performance optimization

### Future Migrations
Planned additions:
- Audit tables for edit history
- User collaboration features
- Advanced operator processing tables

---

## Troubleshooting

### Common Issues

**Connection Problems**:
```bash
# Check environment variables
echo $DATABASE_URL

# Test connection
pnpm db:studio
```

**Schema Sync Issues**:
```bash
# Reset development database
pnpm db:push

# Generate new migration
pnpm db:generate
```

**Query Performance**:
```sql
-- Check index usage
EXPLAIN ANALYZE SELECT * FROM websurfing_event_queue WHERE status = 'pending';

-- Monitor active queries
SELECT * FROM pg_stat_activity;
```

### Database Maintenance
```sql
-- Clean up old completed events (run periodically)
DELETE FROM websurfing_event_queue
WHERE status = 'completed'
AND created_at < NOW() - INTERVAL '7 days';

-- Analyze table statistics
ANALYZE websurfing_cells;
ANALYZE websurfing_event_queue;
```

---

## Related Documentation
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Neon Documentation](https://neon.tech/docs)
- [Project Architecture](.tribe/PROJECT-ARCHITECTURE.md)
- [Implementation Plan](.tribe/FOCUSED-IMPLEMENTATION-PLAN.md)