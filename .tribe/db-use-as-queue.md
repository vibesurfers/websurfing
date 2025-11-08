# Using PostgreSQL as a Task Queue

## Overview
PostgreSQL can be used as a reliable task queue for multi-worker environments by leveraging `SELECT ... FOR UPDATE SKIP LOCKED` within transactions to avoid race conditions and ensure tasks are processed exactly once.

## Core Pattern
The pattern involves two main operations:
1. **Enqueue Tasks** - Add tasks to the queue
2. **Dequeue and Process Tasks** - Workers claim and process tasks atomically

## Table Schema
```sql
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for efficient task selection
CREATE INDEX idx_tasks_status_created
ON tasks (status, created_at)
WHERE status = 'pending';

-- Trigger function for notifications
CREATE OR REPLACE FUNCTION notify_new_task() RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('new_task', NEW.id::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to notify workers of new tasks
CREATE TRIGGER task_insert_trigger
    AFTER INSERT ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_task();
```

## 1. Enqueue Tasks
Adding tasks is a simple INSERT operation:

```sql
INSERT INTO tasks (payload, status)
VALUES ('{"task_type": "process_data", "data": 123}', 'pending');
```

## 2. Dequeue and Process Tasks
Workers use this atomic pattern to claim and process tasks:

```sql
BEGIN;

-- Claim the next available task
SELECT id, payload FROM tasks
WHERE status = 'pending'
ORDER BY created_at ASC
LIMIT 1
FOR UPDATE SKIP LOCKED;

-- Process the task in application code
-- Then mark as completed or delete
DELETE FROM tasks WHERE id = <task_id>;
-- OR UPDATE tasks SET status = 'completed' WHERE id = <task_id>;

COMMIT;
```

## Worker Implementation with LISTEN/NOTIFY

```javascript
// Basic worker with polling + LISTEN/NOTIFY
class TaskWorker {
    constructor(client) {
        this.client = client;
        this.processing = false;
    }

    async start() {
        // Listen for new task notifications
        await this.client.query('LISTEN new_task');

        this.client.on('notification', (msg) => {
            if (msg.channel === 'new_task' && !this.processing) {
                this.processNextTask();
            }
        });

        // Initial check for existing tasks
        this.processNextTask();
    }

    async processNextTask() {
        if (this.processing) return;
        this.processing = true;

        try {
            while (true) {
                const result = await this.client.query(`
                    BEGIN;
                    SELECT id, payload FROM tasks
                    WHERE status = 'pending'
                    ORDER BY created_at ASC
                    LIMIT 1
                    FOR UPDATE SKIP LOCKED;
                `);

                if (result.rows.length === 0) {
                    await this.client.query('ROLLBACK');
                    break; // No tasks available
                }

                const task = result.rows[0];

                try {
                    // Process the task
                    await this.handleTask(task.payload);

                    // Mark as completed
                    await this.client.query(
                        'DELETE FROM tasks WHERE id = $1',
                        [task.id]
                    );

                    await this.client.query('COMMIT');
                } catch (error) {
                    await this.client.query('ROLLBACK');
                    console.error('Task processing failed:', error);
                    // Task remains available for retry
                }
            }
        } finally {
            this.processing = false;
        }
    }

    async handleTask(payload) {
        // Your task processing logic here
        console.log('Processing task:', payload);
    }
}
```

## Key Considerations

**Transaction Isolation**: Use READ COMMITTED (PostgreSQL default). Avoid SERIALIZABLE as it can conflict with `SELECT FOR UPDATE SKIP LOCKED`.

**Error Handling**: Failed transactions automatically rollback, making tasks available again for other workers.

**Performance**:
- Index on `(status, created_at)` for efficient task selection
- Use partial index with `WHERE status = 'pending'` to reduce index size

**Reliability**:
- Tasks are processed exactly once due to row-level locking
- Worker failures don't cause task loss due to transaction rollback
- LISTEN/NOTIFY provides efficient real-time notifications

**Scaling**: Multiple workers can run concurrently without conflicts thanks to `SKIP LOCKED`.



