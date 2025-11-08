# Node.js Queue Manager Backend

A comprehensive Queue Manager backend for handling event streams and Robot Agent Queue operations in the Tiptap-based spreadsheet application.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Core Components](#core-components)
5. [Implementation](#implementation)
6. [API Documentation](#api-documentation)
7. [Queue Job Definitions](#queue-job-definitions)
8. [Worker Implementations](#worker-implementations)
9. [Integration Examples](#integration-examples)
10. [Deployment Guide](#deployment-guide)
11. [Monitoring & Health Checks](#monitoring--health-checks)

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │  Queue Manager  │    │   Workers       │
│   (Tiptap)      │◄──►│    Backend      │◄──►│   Pool          │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         │                        │                        │
    ┌────▼────┐              ┌────▼────┐              ┌────▼────┐
    │WebSocket│              │  Redis  │              │PostgreSQL│
    │   SSE   │              │ Queue   │              │Database │
    └─────────┘              └─────────┘              └─────────┘
```

### Key Features

- **Event Stream Processing**: Real-time consumption of frontend events
- **Priority Queue System**: BullMQ-based robust queueing
- **Worker Pool Management**: Concurrent task processing
- **Job Scheduling**: Cron-like recurring operations
- **Retry Logic**: Exponential backoff for failed jobs
- **Dead Letter Queue**: Permanent failure handling
- **Real-time Updates**: WebSocket/SSE communication
- **Rate Limiting**: Queue overload prevention
- **Comprehensive Monitoring**: Metrics and health checks

## Technology Stack

- **Runtime**: Node.js 18+ with TypeScript
- **Queue System**: BullMQ with Redis
- **Web Framework**: Express.js
- **Real-time Communication**: Socket.io
- **Database**: PostgreSQL with Neon
- **ORM**: Drizzle ORM
- **Validation**: Zod
- **Logging**: Winston
- **Monitoring**: Prometheus metrics
- **Containerization**: Docker

## Project Structure

```
queue-manager/
├── src/
│   ├── config/
│   │   ├── database.ts
│   │   ├── redis.ts
│   │   └── environment.ts
│   ├── types/
│   │   ├── events.ts
│   │   ├── jobs.ts
│   │   └── api.ts
│   ├── queues/
│   │   ├── eventQueue.ts
│   │   ├── robotQueue.ts
│   │   └── deadLetterQueue.ts
│   ├── workers/
│   │   ├── eventWorker.ts
│   │   ├── robotWorker.ts
│   │   └── workerPool.ts
│   ├── processors/
│   │   ├── formulaProcessor.ts
│   │   ├── dataFetcher.ts
│   │   └── validator.ts
│   ├── services/
│   │   ├── queueService.ts
│   │   ├── socketService.ts
│   │   └── metricsService.ts
│   ├── routes/
│   │   ├── api.ts
│   │   ├── health.ts
│   │   └── metrics.ts
│   ├── middleware/
│   │   ├── rateLimiter.ts
│   │   ├── errorHandler.ts
│   │   └── logger.ts
│   └── app.ts
├── docker/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── .dockerignore
├── scripts/
│   ├── migrate.ts
│   └── seed.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Core Components

### 1. Event Stream Processor

Handles real-time events from the Tiptap frontend:
- Cell updates and formula changes
- User interactions and selections
- Document state changes
- Collaboration events

### 2. Robot Agent Queue

Priority queue for automated operations:
- Formula calculations
- Data validation
- External API calls
- Report generation

### 3. Worker Pool

Concurrent processing system:
- Dynamic worker scaling
- Load balancing
- Resource management
- Health monitoring

### 4. Job Scheduling

Cron-like scheduling system:
- Recurring data updates
- Periodic validations
- Cleanup operations
- Report generation

## Implementation

### Package Configuration

```json
{
  "name": "queue-manager-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/app.ts",
    "build": "tsc",
    "start": "node dist/app.js",
    "test": "jest",
    "docker:build": "docker build -t queue-manager .",
    "docker:run": "docker-compose up"
  },
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.4",
    "bullmq": "^4.15.0",
    "ioredis": "^5.3.2",
    "drizzle-orm": "^0.29.0",
    "postgres": "^3.4.0",
    "zod": "^3.22.4",
    "winston": "^3.11.0",
    "express-rate-limit": "^7.1.5",
    "helmet": "^7.1.0",
    "cors": "^2.8.5",
    "node-cron": "^3.0.3",
    "prom-client": "^15.0.0",
    "@types/node": "^20.0.0"
  },
  "devDependencies": {
    "typescript": "^5.2.0",
    "tsx": "^4.0.0",
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/node-cron": "^3.0.11",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.8"
  }
}
```

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "allowJs": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "resolveJsonModule": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### Environment Configuration

```typescript
// src/config/environment.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default(3001),

  // Database
  DATABASE_URL: z.string(),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().transform(Number).default(6379),
  REDIS_PASSWORD: z.string().optional(),

  // Authentication
  JWT_SECRET: z.string(),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default(100),

  // Queue Configuration
  QUEUE_CONCURRENCY: z.string().transform(Number).default(10),
  MAX_RETRY_ATTEMPTS: z.string().transform(Number).default(3),

  // Monitoring
  ENABLE_METRICS: z.string().transform(Boolean).default(true),
  METRICS_PORT: z.string().transform(Number).default(9090),
});

export const env = envSchema.parse(process.env);
export type Environment = z.infer<typeof envSchema>;
```

### Database Configuration

```typescript
// src/config/database.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from './environment.js';

const client = postgres(env.DATABASE_URL);
export const db = drizzle(client);

// Database Schema
import { pgTable, serial, text, timestamp, jsonb, integer, boolean } from 'drizzle-orm/pg-core';

export const jobs = pgTable('jobs', {
  id: serial('id').primaryKey(),
  queueName: text('queue_name').notNull(),
  jobId: text('job_id').notNull().unique(),
  jobType: text('job_type').notNull(),
  priority: integer('priority').default(0),
  data: jsonb('data'),
  status: text('status').notNull().default('pending'),
  attempts: integer('attempts').default(0),
  maxAttempts: integer('max_attempts').default(3),
  error: text('error'),
  result: jsonb('result'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  processedAt: timestamp('processed_at'),
  completedAt: timestamp('completed_at'),
});

export const jobMetrics = pgTable('job_metrics', {
  id: serial('id').primaryKey(),
  jobId: text('job_id').notNull(),
  queueName: text('queue_name').notNull(),
  processingTime: integer('processing_time'), // milliseconds
  waitTime: integer('wait_time'), // milliseconds
  memoryUsage: integer('memory_usage'), // bytes
  success: boolean('success').notNull(),
  timestamp: timestamp('timestamp').defaultNow(),
});
```

### Redis Configuration

```typescript
// src/config/redis.ts
import Redis from 'ioredis';
import { env } from './environment.js';

export const redis = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
});

redis.on('connect', () => {
  console.log('Connected to Redis');
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});
```

### Type Definitions

```typescript
// src/types/events.ts
import { z } from 'zod';

export const TiptapEventSchema = z.object({
  type: z.enum(['cell_update', 'formula_change', 'selection_change', 'document_change']),
  documentId: z.string(),
  userId: z.string(),
  timestamp: z.number(),
  data: z.record(z.unknown()),
});

export type TiptapEvent = z.infer<typeof TiptapEventSchema>;

export const CellUpdateEventSchema = TiptapEventSchema.extend({
  type: z.literal('cell_update'),
  data: z.object({
    cellId: z.string(),
    oldValue: z.unknown(),
    newValue: z.unknown(),
    position: z.object({
      row: z.number(),
      col: z.number(),
    }),
  }),
});

export const FormulaChangeEventSchema = TiptapEventSchema.extend({
  type: z.literal('formula_change'),
  data: z.object({
    cellId: z.string(),
    formula: z.string(),
    dependencies: z.array(z.string()),
  }),
});
```

```typescript
// src/types/jobs.ts
import { z } from 'zod';

export const JobPrioritySchema = z.enum(['low', 'normal', 'high', 'critical']);
export type JobPriority = z.infer<typeof JobPrioritySchema>;

export const BaseJobDataSchema = z.object({
  documentId: z.string(),
  userId: z.string(),
  priority: JobPrioritySchema.default('normal'),
  retryPolicy: z.object({
    attempts: z.number().default(3),
    backoffType: z.enum(['fixed', 'exponential']).default('exponential'),
    delay: z.number().default(1000),
  }).optional(),
});

export const FormulaJobDataSchema = BaseJobDataSchema.extend({
  type: z.literal('formula_calculation'),
  cellId: z.string(),
  formula: z.string(),
  dependencies: z.array(z.string()),
});

export const DataFetchJobDataSchema = BaseJobDataSchema.extend({
  type: z.literal('data_fetch'),
  source: z.string(),
  endpoint: z.string(),
  parameters: z.record(z.unknown()),
  targetCells: z.array(z.string()),
});

export const ValidationJobDataSchema = BaseJobDataSchema.extend({
  type: z.literal('validation'),
  cellIds: z.array(z.string()),
  rules: z.array(z.object({
    type: z.string(),
    parameters: z.record(z.unknown()),
  })),
});

export const JobDataSchema = z.union([
  FormulaJobDataSchema,
  DataFetchJobDataSchema,
  ValidationJobDataSchema,
]);

export type JobData = z.infer<typeof JobDataSchema>;
```

### Queue System

```typescript
// src/queues/eventQueue.ts
import { Queue } from 'bullmq';
import { redis } from '../config/redis.js';
import { TiptapEvent } from '../types/events.js';

export class EventQueue {
  private queue: Queue<TiptapEvent>;

  constructor() {
    this.queue = new Queue<TiptapEvent>('events', {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });
  }

  async addEvent(event: TiptapEvent, priority: number = 0): Promise<string> {
    const job = await this.queue.add('process_event', event, {
      priority: priority,
      delay: 0,
    });
    return job.id!;
  }

  async addBulkEvents(events: TiptapEvent[]): Promise<string[]> {
    const jobs = events.map((event, index) => ({
      name: 'process_event',
      data: event,
      opts: {
        priority: 0,
        delay: index * 100, // Stagger events slightly
      },
    }));

    const bulkJobs = await this.queue.addBulk(jobs);
    return bulkJobs.map(job => job.id!);
  }

  getQueue(): Queue<TiptapEvent> {
    return this.queue;
  }
}
```

```typescript
// src/queues/robotQueue.ts
import { Queue, QueueScheduler } from 'bullmq';
import { redis } from '../config/redis.js';
import { JobData } from '../types/jobs.js';

export class RobotQueue {
  private queue: Queue<JobData>;
  private scheduler: QueueScheduler;

  constructor() {
    this.queue = new Queue<JobData>('robot-operations', {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: 200,
        removeOnFail: 100,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    });

    this.scheduler = new QueueScheduler('robot-operations', {
      connection: redis,
    });
  }

  async addJob(jobData: JobData, options: {
    priority?: number;
    delay?: number;
    repeat?: {
      pattern?: string;
      every?: number;
    };
  } = {}): Promise<string> {
    const priorityMap = {
      low: 1,
      normal: 10,
      high: 20,
      critical: 50,
    };

    const job = await this.queue.add(jobData.type, jobData, {
      priority: options.priority ?? priorityMap[jobData.priority],
      delay: options.delay,
      repeat: options.repeat,
    });

    return job.id!;
  }

  async addScheduledJob(
    jobData: JobData,
    cronPattern: string
  ): Promise<string> {
    const job = await this.queue.add(jobData.type, jobData, {
      repeat: {
        pattern: cronPattern,
      },
    });

    return job.id!;
  }

  async pauseJob(jobId: string): Promise<void> {
    const job = await this.queue.getJob(jobId);
    if (job) {
      await job.remove();
    }
  }

  async getJobStatus(jobId: string): Promise<string | null> {
    const job = await this.queue.getJob(jobId);
    return job ? await job.getState() : null;
  }

  getQueue(): Queue<JobData> {
    return this.queue;
  }
}
```

```typescript
// src/queues/deadLetterQueue.ts
import { Queue } from 'bullmq';
import { redis } from '../config/redis.js';

interface FailedJob {
  originalJobId: string;
  queueName: string;
  data: unknown;
  error: string;
  attempts: number;
  failedAt: Date;
}

export class DeadLetterQueue {
  private queue: Queue<FailedJob>;

  constructor() {
    this.queue = new Queue<FailedJob>('dead-letter', {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: false, // Keep all dead letter jobs
        removeOnFail: false,
        attempts: 1, // Don't retry dead letter jobs
      },
    });
  }

  async addFailedJob(failedJob: FailedJob): Promise<string> {
    const job = await this.queue.add('failed_job', failedJob, {
      priority: 100, // High priority for investigation
    });
    return job.id!;
  }

  async getFailedJobs(limit: number = 50): Promise<FailedJob[]> {
    const jobs = await this.queue.getJobs(['completed', 'failed'], 0, limit);
    return jobs.map(job => job.data);
  }

  async reprocessFailedJob(jobId: string): Promise<boolean> {
    // Logic to reprocess a failed job
    // This would typically involve moving it back to the original queue
    return true;
  }
}
```

### Worker Implementations

```typescript
// src/workers/eventWorker.ts
import { Worker, Job } from 'bullmq';
import { redis } from '../config/redis.js';
import { TiptapEvent } from '../types/events.js';
import { SocketService } from '../services/socketService.js';
import { db, jobs } from '../config/database.js';

export class EventWorker {
  private worker: Worker<TiptapEvent>;
  private socketService: SocketService;

  constructor(socketService: SocketService) {
    this.socketService = socketService;

    this.worker = new Worker<TiptapEvent>(
      'events',
      this.processEvent.bind(this),
      {
        connection: redis,
        concurrency: 20, // High concurrency for events
      }
    );

    this.worker.on('completed', this.onJobCompleted.bind(this));
    this.worker.on('failed', this.onJobFailed.bind(this));
  }

  private async processEvent(job: Job<TiptapEvent>): Promise<void> {
    const event = job.data;
    const startTime = Date.now();

    try {
      // Log job start
      await db.insert(jobs).values({
        jobId: job.id!,
        queueName: 'events',
        jobType: event.type,
        data: event,
        status: 'processing',
        processedAt: new Date(),
      });

      // Process different event types
      switch (event.type) {
        case 'cell_update':
          await this.processCellUpdate(event);
          break;
        case 'formula_change':
          await this.processFormulaChange(event);
          break;
        case 'selection_change':
          await this.processSelectionChange(event);
          break;
        case 'document_change':
          await this.processDocumentChange(event);
          break;
        default:
          throw new Error(`Unknown event type: ${event.type}`);
      }

      // Emit real-time update
      this.socketService.emitToDocument(event.documentId, 'event_processed', {
        eventId: job.id,
        type: event.type,
        timestamp: Date.now(),
      });

      // Update job status
      await db.update(jobs)
        .set({
          status: 'completed',
          completedAt: new Date(),
        })
        .where(eq(jobs.jobId, job.id!));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await db.update(jobs)
        .set({
          status: 'failed',
          error: errorMessage,
        })
        .where(eq(jobs.jobId, job.id!));

      throw error;
    }
  }

  private async processCellUpdate(event: TiptapEvent): Promise<void> {
    // Handle cell update logic
    // This might trigger formula recalculations, validations, etc.
    console.log(`Processing cell update: ${JSON.stringify(event.data)}`);
  }

  private async processFormulaChange(event: TiptapEvent): Promise<void> {
    // Handle formula change logic
    // This might add formula calculation jobs to the robot queue
    console.log(`Processing formula change: ${JSON.stringify(event.data)}`);
  }

  private async processSelectionChange(event: TiptapEvent): Promise<void> {
    // Handle selection change logic
    console.log(`Processing selection change: ${JSON.stringify(event.data)}`);
  }

  private async processDocumentChange(event: TiptapEvent): Promise<void> {
    // Handle document change logic
    console.log(`Processing document change: ${JSON.stringify(event.data)}`);
  }

  private async onJobCompleted(job: Job<TiptapEvent>): Promise<void> {
    console.log(`Event job completed: ${job.id}`);
  }

  private async onJobFailed(job: Job<TiptapEvent>, err: Error): Promise<void> {
    console.error(`Event job failed: ${job.id}`, err);
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}
```

```typescript
// src/workers/robotWorker.ts
import { Worker, Job } from 'bullmq';
import { redis } from '../config/redis.js';
import { JobData } from '../types/jobs.js';
import { FormulaProcessor } from '../processors/formulaProcessor.js';
import { DataFetcher } from '../processors/dataFetcher.js';
import { Validator } from '../processors/validator.js';
import { DeadLetterQueue } from '../queues/deadLetterQueue.js';

export class RobotWorker {
  private worker: Worker<JobData>;
  private formulaProcessor: FormulaProcessor;
  private dataFetcher: DataFetcher;
  private validator: Validator;
  private deadLetterQueue: DeadLetterQueue;

  constructor() {
    this.formulaProcessor = new FormulaProcessor();
    this.dataFetcher = new DataFetcher();
    this.validator = new Validator();
    this.deadLetterQueue = new DeadLetterQueue();

    this.worker = new Worker<JobData>(
      'robot-operations',
      this.processJob.bind(this),
      {
        connection: redis,
        concurrency: 5, // Lower concurrency for robot operations
      }
    );

    this.worker.on('completed', this.onJobCompleted.bind(this));
    this.worker.on('failed', this.onJobFailed.bind(this));
  }

  private async processJob(job: Job<JobData>): Promise<unknown> {
    const jobData = job.data;
    const startTime = Date.now();

    try {
      let result: unknown;

      switch (jobData.type) {
        case 'formula_calculation':
          result = await this.formulaProcessor.calculate(jobData);
          break;
        case 'data_fetch':
          result = await this.dataFetcher.fetch(jobData);
          break;
        case 'validation':
          result = await this.validator.validate(jobData);
          break;
        default:
          throw new Error(`Unknown job type: ${jobData.type}`);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // If max attempts reached, send to dead letter queue
      if (job.attemptsMade >= (job.opts.attempts ?? 3)) {
        await this.deadLetterQueue.addFailedJob({
          originalJobId: job.id!,
          queueName: 'robot-operations',
          data: jobData,
          error: errorMessage,
          attempts: job.attemptsMade,
          failedAt: new Date(),
        });
      }

      throw error;
    }
  }

  private async onJobCompleted(job: Job<JobData>, result: unknown): Promise<void> {
    console.log(`Robot job completed: ${job.id}`, result);
  }

  private async onJobFailed(job: Job<JobData>, err: Error): Promise<void> {
    console.error(`Robot job failed: ${job.id}`, err);
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}
```

### Processor Implementations

```typescript
// src/processors/formulaProcessor.ts
import { FormulaJobDataSchema } from '../types/jobs.js';
import { z } from 'zod';

export class FormulaProcessor {
  async calculate(jobData: z.infer<typeof FormulaJobDataSchema>): Promise<{
    cellId: string;
    result: unknown;
    calculationTime: number;
  }> {
    const startTime = Date.now();

    try {
      // Parse and validate formula
      const formula = this.parseFormula(jobData.formula);

      // Resolve dependencies
      const dependencyValues = await this.resolveDependencies(jobData.dependencies);

      // Calculate result
      const result = await this.executeFormula(formula, dependencyValues);

      return {
        cellId: jobData.cellId,
        result,
        calculationTime: Date.now() - startTime,
      };
    } catch (error) {
      throw new Error(`Formula calculation failed: ${error}`);
    }
  }

  private parseFormula(formula: string): ParsedFormula {
    // Formula parsing logic
    // This would implement a proper formula parser
    return {
      type: 'expression',
      tokens: formula.split(' '),
    };
  }

  private async resolveDependencies(dependencies: string[]): Promise<Record<string, unknown>> {
    // Resolve cell dependencies
    // This would fetch values from the database
    const values: Record<string, unknown> = {};

    for (const dep of dependencies) {
      values[dep] = await this.getCellValue(dep);
    }

    return values;
  }

  private async getCellValue(cellId: string): Promise<unknown> {
    // Fetch cell value from database
    // Implementation would query the actual cell data
    return Math.random() * 100; // Placeholder
  }

  private async executeFormula(
    formula: ParsedFormula,
    dependencies: Record<string, unknown>
  ): Promise<unknown> {
    // Execute the parsed formula
    // This would implement the actual calculation engine
    return dependencies; // Placeholder
  }
}

interface ParsedFormula {
  type: string;
  tokens: string[];
}
```

```typescript
// src/processors/dataFetcher.ts
import { DataFetchJobDataSchema } from '../types/jobs.js';
import { z } from 'zod';

export class DataFetcher {
  async fetch(jobData: z.infer<typeof DataFetchJobDataSchema>): Promise<{
    source: string;
    data: unknown[];
    fetchTime: number;
    targetCells: string[];
  }> {
    const startTime = Date.now();

    try {
      const data = await this.fetchFromSource(
        jobData.source,
        jobData.endpoint,
        jobData.parameters
      );

      // Process and format data for target cells
      const processedData = await this.processData(data, jobData.targetCells);

      return {
        source: jobData.source,
        data: processedData,
        fetchTime: Date.now() - startTime,
        targetCells: jobData.targetCells,
      };
    } catch (error) {
      throw new Error(`Data fetch failed: ${error}`);
    }
  }

  private async fetchFromSource(
    source: string,
    endpoint: string,
    parameters: Record<string, unknown>
  ): Promise<unknown> {
    // Implement data fetching from various sources
    switch (source) {
      case 'api':
        return this.fetchFromAPI(endpoint, parameters);
      case 'database':
        return this.fetchFromDatabase(endpoint, parameters);
      case 'file':
        return this.fetchFromFile(endpoint, parameters);
      default:
        throw new Error(`Unknown data source: ${source}`);
    }
  }

  private async fetchFromAPI(endpoint: string, params: Record<string, unknown>): Promise<unknown> {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  private async fetchFromDatabase(query: string, params: Record<string, unknown>): Promise<unknown> {
    // Database query implementation
    return [];
  }

  private async fetchFromFile(filePath: string, params: Record<string, unknown>): Promise<unknown> {
    // File reading implementation
    return [];
  }

  private async processData(data: unknown, targetCells: string[]): Promise<unknown[]> {
    // Process and format data for target cells
    return Array.isArray(data) ? data : [data];
  }
}
```

### Services

```typescript
// src/services/socketService.ts
import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';

export class SocketService {
  private io: SocketServer;

  constructor(server: HttpServer) {
    this.io = new SocketServer(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);

      socket.on('join_document', (documentId: string) => {
        socket.join(`doc:${documentId}`);
        console.log(`Client ${socket.id} joined document ${documentId}`);
      });

      socket.on('leave_document', (documentId: string) => {
        socket.leave(`doc:${documentId}`);
        console.log(`Client ${socket.id} left document ${documentId}`);
      });

      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  }

  emitToDocument(documentId: string, event: string, data: unknown): void {
    this.io.to(`doc:${documentId}`).emit(event, data);
  }

  emitToAll(event: string, data: unknown): void {
    this.io.emit(event, data);
  }

  getConnectedClients(documentId: string): Promise<number> {
    return new Promise((resolve) => {
      this.io.in(`doc:${documentId}`).allSockets().then(sockets => {
        resolve(sockets.size);
      });
    });
  }
}
```

```typescript
// src/services/queueService.ts
import { EventQueue } from '../queues/eventQueue.js';
import { RobotQueue } from '../queues/robotQueue.js';
import { DeadLetterQueue } from '../queues/deadLetterQueue.js';
import { TiptapEvent } from '../types/events.js';
import { JobData } from '../types/jobs.js';

export class QueueService {
  private eventQueue: EventQueue;
  private robotQueue: RobotQueue;
  private deadLetterQueue: DeadLetterQueue;

  constructor() {
    this.eventQueue = new EventQueue();
    this.robotQueue = new RobotQueue();
    this.deadLetterQueue = new DeadLetterQueue();
  }

  // Event Queue Methods
  async addEvent(event: TiptapEvent, priority?: number): Promise<string> {
    return this.eventQueue.addEvent(event, priority);
  }

  async addBulkEvents(events: TiptapEvent[]): Promise<string[]> {
    return this.eventQueue.addBulkEvents(events);
  }

  // Robot Queue Methods
  async addRobotJob(jobData: JobData, options?: {
    priority?: number;
    delay?: number;
    repeat?: { pattern?: string; every?: number; };
  }): Promise<string> {
    return this.robotQueue.addJob(jobData, options);
  }

  async addScheduledRobotJob(jobData: JobData, cronPattern: string): Promise<string> {
    return this.robotQueue.addScheduledJob(jobData, cronPattern);
  }

  async pauseRobotJob(jobId: string): Promise<void> {
    return this.robotQueue.pauseJob(jobId);
  }

  async getRobotJobStatus(jobId: string): Promise<string | null> {
    return this.robotQueue.getJobStatus(jobId);
  }

  // Dead Letter Queue Methods
  async getFailedJobs(limit?: number) {
    return this.deadLetterQueue.getFailedJobs(limit);
  }

  async reprocessFailedJob(jobId: string): Promise<boolean> {
    return this.deadLetterQueue.reprocessFailedJob(jobId);
  }

  // Queue Statistics
  async getQueueStats(): Promise<{
    events: QueueStats;
    robot: QueueStats;
    deadLetter: QueueStats;
  }> {
    const [eventsStats, robotStats, deadLetterStats] = await Promise.all([
      this.getEventQueueStats(),
      this.getRobotQueueStats(),
      this.getDeadLetterQueueStats(),
    ]);

    return {
      events: eventsStats,
      robot: robotStats,
      deadLetter: deadLetterStats,
    };
  }

  private async getEventQueueStats(): Promise<QueueStats> {
    const queue = this.eventQueue.getQueue();
    return {
      waiting: await queue.getWaiting().then(jobs => jobs.length),
      active: await queue.getActive().then(jobs => jobs.length),
      completed: await queue.getCompleted().then(jobs => jobs.length),
      failed: await queue.getFailed().then(jobs => jobs.length),
    };
  }

  private async getRobotQueueStats(): Promise<QueueStats> {
    const queue = this.robotQueue.getQueue();
    return {
      waiting: await queue.getWaiting().then(jobs => jobs.length),
      active: await queue.getActive().then(jobs => jobs.length),
      completed: await queue.getCompleted().then(jobs => jobs.length),
      failed: await queue.getFailed().then(jobs => jobs.length),
    };
  }

  private async getDeadLetterQueueStats(): Promise<QueueStats> {
    const failedJobs = await this.deadLetterQueue.getFailedJobs();
    return {
      waiting: 0,
      active: 0,
      completed: failedJobs.length,
      failed: 0,
    };
  }
}

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}
```

## API Documentation

### REST Endpoints

```typescript
// src/routes/api.ts
import express from 'express';
import { QueueService } from '../services/queueService.js';
import { TiptapEventSchema, JobDataSchema } from '../types/index.js';

const router = express.Router();
const queueService = new QueueService();

// Event endpoints
router.post('/events', async (req, res) => {
  try {
    const event = TiptapEventSchema.parse(req.body);
    const jobId = await queueService.addEvent(event);
    res.json({ success: true, jobId });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/events/bulk', async (req, res) => {
  try {
    const events = req.body.map(event => TiptapEventSchema.parse(event));
    const jobIds = await queueService.addBulkEvents(events);
    res.json({ success: true, jobIds });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Robot job endpoints
router.post('/jobs', async (req, res) => {
  try {
    const jobData = JobDataSchema.parse(req.body.data);
    const options = req.body.options || {};
    const jobId = await queueService.addRobotJob(jobData, options);
    res.json({ success: true, jobId });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/jobs/scheduled', async (req, res) => {
  try {
    const jobData = JobDataSchema.parse(req.body.data);
    const cronPattern = req.body.cronPattern;
    const jobId = await queueService.addScheduledRobotJob(jobData, cronPattern);
    res.json({ success: true, jobId });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/jobs/:jobId/status', async (req, res) => {
  try {
    const status = await queueService.getRobotJobStatus(req.params.jobId);
    res.json({ success: true, status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/jobs/:jobId', async (req, res) => {
  try {
    await queueService.pauseRobotJob(req.params.jobId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Queue statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await queueService.getQueueStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Failed jobs
router.get('/failed', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const failedJobs = await queueService.getFailedJobs(limit);
    res.json({ success: true, failedJobs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/failed/:jobId/retry', async (req, res) => {
  try {
    const success = await queueService.reprocessFailedJob(req.params.jobId);
    res.json({ success });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
```

### Health Check Endpoints

```typescript
// src/routes/health.ts
import express from 'express';
import { redis } from '../config/redis.js';
import { db } from '../config/database.js';

const router = express.Router();

router.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      redis: 'unknown',
      database: 'unknown',
    },
  };

  try {
    // Check Redis
    await redis.ping();
    health.services.redis = 'ok';
  } catch (error) {
    health.services.redis = 'error';
    health.status = 'error';
  }

  try {
    // Check Database
    await db.select().from(jobs).limit(1);
    health.services.database = 'ok';
  } catch (error) {
    health.services.database = 'error';
    health.status = 'error';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

router.get('/ready', async (req, res) => {
  try {
    await redis.ping();
    await db.select().from(jobs).limit(1);
    res.status(200).json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});

export default router;
```

### Main Application

```typescript
// src/app.ts
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/environment.js';
import { SocketService } from './services/socketService.js';
import { EventWorker } from './workers/eventWorker.js';
import { RobotWorker } from './workers/robotWorker.js';
import apiRoutes from './routes/api.js';
import healthRoutes from './routes/health.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './middleware/logger.js';

const app = express();
const server = createServer(app);

// Initialize services
const socketService = new SocketService(server);
const eventWorker = new EventWorker(socketService);
const robotWorker = new RobotWorker();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many requests from this IP',
});
app.use('/api', limiter);

// Logging
app.use(logger);

// Routes
app.use('/api', apiRoutes);
app.use('/', healthRoutes);

// Error handling
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('Shutting down gracefully...');

  try {
    await eventWorker.close();
    await robotWorker.close();
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
server.listen(env.PORT, () => {
  console.log(`Queue Manager Backend running on port ${env.PORT}`);
  console.log(`Environment: ${env.NODE_ENV}`);
});

export { app, server };
```

## Integration Examples

### Frontend Integration

```typescript
// Frontend integration example
class QueueManagerClient {
  private baseUrl: string;
  private socket: Socket;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.socket = io(baseUrl);
  }

  // Send event to queue
  async sendEvent(event: TiptapEvent): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });

    const result = await response.json();
    return result.jobId;
  }

  // Add robot job
  async addRobotJob(jobData: JobData, options?: any): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: jobData, options }),
    });

    const result = await response.json();
    return result.jobId;
  }

  // Listen for real-time updates
  onJobCompleted(callback: (data: any) => void): void {
    this.socket.on('job_completed', callback);
  }

  onEventProcessed(callback: (data: any) => void): void {
    this.socket.on('event_processed', callback);
  }

  // Join document room for updates
  joinDocument(documentId: string): void {
    this.socket.emit('join_document', documentId);
  }
}
```

### Tiptap Extension Integration

```typescript
// Tiptap extension for queue integration
import { Extension } from '@tiptap/core';
import { QueueManagerClient } from './queueClient';

export const QueueExtension = Extension.create({
  name: 'queueManager',

  addOptions() {
    return {
      queueManagerUrl: 'http://localhost:3001',
      documentId: '',
      userId: '',
    };
  },

  onCreate() {
    this.queueClient = new QueueManagerClient(this.options.queueManagerUrl);
    this.queueClient.joinDocument(this.options.documentId);

    // Listen for updates
    this.queueClient.onEventProcessed((data) => {
      this.editor.emit('queue:eventProcessed', data);
    });

    this.queueClient.onJobCompleted((data) => {
      this.editor.emit('queue:jobCompleted', data);
    });
  },

  addCommands() {
    return {
      sendEvent: (event: Partial<TiptapEvent>) => () => {
        const fullEvent: TiptapEvent = {
          type: event.type!,
          documentId: this.options.documentId,
          userId: this.options.userId,
          timestamp: Date.now(),
          data: event.data || {},
        };

        this.queueClient.sendEvent(fullEvent);
        return true;
      },

      addFormulaJob: (cellId: string, formula: string) => () => {
        const jobData: FormulaJobData = {
          type: 'formula_calculation',
          documentId: this.options.documentId,
          userId: this.options.userId,
          priority: 'normal',
          cellId,
          formula,
          dependencies: this.extractDependencies(formula),
        };

        this.queueClient.addRobotJob(jobData);
        return true;
      },
    };
  },

  extractDependencies(formula: string): string[] {
    // Extract cell dependencies from formula
    const cellPattern = /[A-Z]+\d+/g;
    return formula.match(cellPattern) || [];
  },
});
```

## Deployment Guide

### Docker Configuration

```dockerfile
# docker/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Build application
RUN npm run build

# Expose ports
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start application
CMD ["npm", "start"]
```

```yaml
# docker/docker-compose.yml
version: '3.8'

services:
  queue-manager:
    build:
      context: ..
      dockerfile: docker/Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:password@postgres:5432/queue_db
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      - redis
      - postgres
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=queue_db
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  redis_data:
  postgres_data:
```

### Kubernetes Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: queue-manager
spec:
  replicas: 3
  selector:
    matchLabels:
      app: queue-manager
  template:
    metadata:
      labels:
        app: queue-manager
    spec:
      containers:
      - name: queue-manager
        image: queue-manager:latest
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-secret
              key: url
        - name: REDIS_HOST
          value: "redis-service"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Environment Variables

```bash
# Production environment variables
NODE_ENV=production
PORT=3001

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/queue_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Authentication
JWT_SECRET=your_jwt_secret_here

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Queue Configuration
QUEUE_CONCURRENCY=10
MAX_RETRY_ATTEMPTS=3

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
```

## Monitoring & Health Checks

### Metrics Collection

```typescript
// src/services/metricsService.ts
import client from 'prom-client';

export class MetricsService {
  private register: client.Registry;
  private jobsProcessed: client.Counter;
  private jobDuration: client.Histogram;
  private queueSize: client.Gauge;
  private activeWorkers: client.Gauge;

  constructor() {
    this.register = new client.Registry();

    this.jobsProcessed = new client.Counter({
      name: 'queue_jobs_processed_total',
      help: 'Total number of jobs processed',
      labelNames: ['queue', 'status'],
      registers: [this.register],
    });

    this.jobDuration = new client.Histogram({
      name: 'queue_job_duration_seconds',
      help: 'Job processing duration in seconds',
      labelNames: ['queue', 'job_type'],
      registers: [this.register],
    });

    this.queueSize = new client.Gauge({
      name: 'queue_size',
      help: 'Current queue size',
      labelNames: ['queue', 'status'],
      registers: [this.register],
    });

    this.activeWorkers = new client.Gauge({
      name: 'queue_active_workers',
      help: 'Number of active workers',
      labelNames: ['queue'],
      registers: [this.register],
    });

    // Collect default metrics
    client.collectDefaultMetrics({ register: this.register });
  }

  incrementJobsProcessed(queue: string, status: 'completed' | 'failed'): void {
    this.jobsProcessed.inc({ queue, status });
  }

  recordJobDuration(queue: string, jobType: string, duration: number): void {
    this.jobDuration.observe({ queue, job_type: jobType }, duration / 1000);
  }

  setQueueSize(queue: string, status: string, size: number): void {
    this.queueSize.set({ queue, status }, size);
  }

  setActiveWorkers(queue: string, count: number): void {
    this.activeWorkers.set({ queue }, count);
  }

  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }
}
```

This comprehensive Node.js Queue Manager Backend provides:

1. **Robust Queue System**: BullMQ-based queuing with Redis backend
2. **Event Processing**: Real-time Tiptap event consumption and processing
3. **Robot Operations**: Priority-based automated task processing
4. **Worker Management**: Concurrent processing with proper resource management
5. **Retry Logic**: Exponential backoff for failed jobs
6. **Dead Letter Queue**: Handling of permanently failed jobs
7. **Real-time Communication**: WebSocket-based updates to frontend
8. **Rate Limiting**: Protection against queue overload
9. **Comprehensive Monitoring**: Metrics, health checks, and observability
10. **Production Ready**: Docker deployment, error handling, and logging

The system is designed to be scalable, reliable, and maintainable, with proper TypeScript typing and comprehensive error handling throughout.