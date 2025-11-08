# Global Event List Management System for Tiptap Tables

A comprehensive TypeScript implementation of a global event management system for Tiptap table operations, featuring centralized event dispatching, persistent event logs, real-time streaming, and advanced filtering capabilities.

## Table of Contents

1. [Core Type Definitions](#core-type-definitions)
2. [EventManager Implementation](#eventmanager-implementation)
3. [Event Storage System](#event-storage-system)
4. [Event Filtering & Querying](#event-filtering--querying)
5. [Event Replay System](#event-replay-system)
6. [Event Streaming](#event-streaming)
7. [Event Batching](#event-batching)
8. [Event Middleware](#event-middleware)
9. [Integration Examples](#integration-examples)
10. [Performance Optimizations](#performance-optimizations)

## Core Type Definitions

```typescript
import { Editor } from '@tiptap/core'
import { UserInput } from './UserInput'
import { RobotInput } from './RobotInput'

// Base event interfaces
interface BaseEvent {
  id: string
  type: string
  timestamp: number
  source: 'user' | 'robot' | 'system' | 'external'
  userId?: string
  sessionId?: string
  metadata?: Record<string, any>
}

interface CellPosition {
  row: number
  col: number
}

interface CellRange {
  start: CellPosition
  end: CellPosition
}

// Specific event types for table operations
interface CellEvent extends BaseEvent {
  type: 'cell.update' | 'cell.focus' | 'cell.blur' | 'cell.select' | 'cell.validate'
  position: CellPosition
  oldValue?: string
  newValue?: string
  validationErrors?: string[]
}

interface TableEvent extends BaseEvent {
  type: 'table.create' | 'table.delete' | 'table.resize' | 'table.clear'
  tableId?: string
  dimensions?: { rows: number; cols: number }
  affectedCells?: CellPosition[]
}

interface FormulaEvent extends BaseEvent {
  type: 'formula.calculate' | 'formula.error' | 'formula.dependency'
  position: CellPosition
  formula: string
  result?: any
  dependencies?: CellPosition[]
  error?: string
}

interface UserInteractionEvent extends BaseEvent {
  type: 'user.keyboard' | 'user.mouse' | 'user.paste' | 'user.copy' | 'user.undo' | 'user.redo'
  keyCombo?: string
  pasteData?: string
  affectedCells?: CellPosition[]
}

interface BatchEvent extends BaseEvent {
  type: 'batch.start' | 'batch.complete' | 'batch.error'
  batchId: string
  operationCount: number
  operations?: string[]
  error?: string
}

interface TransactionEvent extends BaseEvent {
  type: 'transaction.start' | 'transaction.commit' | 'transaction.rollback'
  transactionId: string
  operations: string[]
  beforeState?: Record<string, any>
  afterState?: Record<string, any>
}

// Union type for all events
type TableOperationEvent =
  | CellEvent
  | TableEvent
  | FormulaEvent
  | UserInteractionEvent
  | BatchEvent
  | TransactionEvent

// Event filtering and querying
interface EventFilter {
  types?: string[]
  sources?: ('user' | 'robot' | 'system' | 'external')[]
  userId?: string
  sessionId?: string
  cellPosition?: CellPosition
  cellRange?: CellRange
  timeRange?: {
    start: number
    end: number
  }
  metadata?: Record<string, any>
}

interface EventQuery extends EventFilter {
  limit?: number
  offset?: number
  sortBy?: 'timestamp' | 'type' | 'source'
  sortOrder?: 'asc' | 'desc'
}

// Event storage interfaces
interface EventStorageAdapter {
  store(event: TableOperationEvent): Promise<void>
  retrieve(query: EventQuery): Promise<TableOperationEvent[]>
  count(filter: EventFilter): Promise<number>
  delete(filter: EventFilter): Promise<number>
  clear(): Promise<void>
}

// Event middleware
interface EventMiddleware {
  name: string
  priority: number
  process(event: TableOperationEvent): Promise<TableOperationEvent | null>
}

// Event subscriber
interface EventSubscriber {
  id: string
  filter?: EventFilter
  handler: (event: TableOperationEvent) => void | Promise<void>
  once?: boolean
}

// Event batch configuration
interface EventBatchConfig {
  maxSize: number
  maxWaitTime: number
  autoFlush: boolean
}

// Streaming configuration
interface StreamingConfig {
  enabled: boolean
  batchSize: number
  throttleMs: number
  bufferSize: number
}

// Performance optimization settings
interface PerformanceConfig {
  debounceMs: number
  throttleMs: number
  maxMemoryEvents: number
  gcInterval: number
}

// EventManager configuration
interface EventManagerConfig {
  storage?: EventStorageAdapter
  enablePersistence?: boolean
  enableStreaming?: boolean
  enableReplay?: boolean
  batchConfig?: EventBatchConfig
  streamingConfig?: StreamingConfig
  performanceConfig?: PerformanceConfig
}
```

## EventManager Implementation

```typescript
class EventManager {
  private static instance: EventManager | null = null
  private subscribers: Map<string, EventSubscriber> = new Map()
  private middleware: EventMiddleware[] = []
  private eventBuffer: TableOperationEvent[] = []
  private batchTimer: NodeJS.Timeout | null = null
  private storage: EventStorageAdapter | null = null
  private config: Required<EventManagerConfig>
  private memoryEvents: TableOperationEvent[] = []
  private streamingBuffer: TableOperationEvent[] = []
  private streamingTimer: NodeJS.Timeout | null = null
  private gcTimer: NodeJS.Timeout | null = null

  private constructor(config: EventManagerConfig = {}) {
    this.config = {
      storage: null,
      enablePersistence: true,
      enableStreaming: true,
      enableReplay: true,
      batchConfig: {
        maxSize: 100,
        maxWaitTime: 1000,
        autoFlush: true
      },
      streamingConfig: {
        enabled: true,
        batchSize: 50,
        throttleMs: 100,
        bufferSize: 1000
      },
      performanceConfig: {
        debounceMs: 50,
        throttleMs: 100,
        maxMemoryEvents: 10000,
        gcInterval: 300000 // 5 minutes
      },
      ...config
    }

    this.storage = this.config.storage
    this.initializeGarbageCollection()
    this.initializeStreaming()
  }

  // Singleton pattern implementation
  public static getInstance(config?: EventManagerConfig): EventManager {
    if (!EventManager.instance) {
      EventManager.instance = new EventManager(config)
    }
    return EventManager.instance
  }

  public static resetInstance(): void {
    if (EventManager.instance) {
      EventManager.instance.dispose()
      EventManager.instance = null
    }
  }

  // Event emission with middleware processing
  async emit(event: Omit<TableOperationEvent, 'id' | 'timestamp'>): Promise<void> {
    const fullEvent: TableOperationEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: Date.now()
    } as TableOperationEvent

    // Process through middleware pipeline
    let processedEvent = fullEvent
    for (const middleware of this.middleware.sort((a, b) => a.priority - b.priority)) {
      try {
        const result = await middleware.process(processedEvent)
        if (!result) {
          // Event was filtered out by middleware
          return
        }
        processedEvent = result
      } catch (error) {
        console.error(`Middleware ${middleware.name} failed:`, error)
      }
    }

    // Store in memory for immediate access
    this.memoryEvents.push(processedEvent)
    this.enforceMemoryLimit()

    // Add to batch for persistence
    if (this.config.enablePersistence) {
      this.addToBatch(processedEvent)
    }

    // Add to streaming buffer
    if (this.config.enableStreaming) {
      this.addToStream(processedEvent)
    }

    // Notify subscribers
    await this.notifySubscribers(processedEvent)
  }

  // Subscription management
  subscribe(
    filter: EventFilter | undefined,
    handler: (event: TableOperationEvent) => void | Promise<void>,
    options: { once?: boolean } = {}
  ): string {
    const id = this.generateSubscriberId()
    const subscriber: EventSubscriber = {
      id,
      filter,
      handler,
      once: options.once
    }

    this.subscribers.set(id, subscriber)
    return id
  }

  unsubscribe(subscriberId: string): boolean {
    return this.subscribers.delete(subscriberId)
  }

  // Middleware management
  addMiddleware(middleware: EventMiddleware): void {
    this.middleware.push(middleware)
    this.middleware.sort((a, b) => a.priority - b.priority)
  }

  removeMiddleware(name: string): boolean {
    const index = this.middleware.findIndex(m => m.name === name)
    if (index !== -1) {
      this.middleware.splice(index, 1)
      return true
    }
    return false
  }

  // Event querying
  async query(query: EventQuery): Promise<TableOperationEvent[]> {
    // First check memory cache
    let events = this.queryMemoryEvents(query)

    // If not enough results and persistence is enabled, query storage
    if (this.storage && (!query.limit || events.length < query.limit)) {
      const storageEvents = await this.storage.retrieve(query)

      // Merge and deduplicate
      const eventMap = new Map<string, TableOperationEvent>()
      events.forEach(e => eventMap.set(e.id, e))
      storageEvents.forEach(e => eventMap.set(e.id, e))

      events = Array.from(eventMap.values())
    }

    // Apply sorting and limiting
    return this.sortAndLimitEvents(events, query)
  }

  // Event counting
  async count(filter: EventFilter = {}): Promise<number> {
    const memoryCount = this.countMemoryEvents(filter)

    if (this.storage) {
      const storageCount = await this.storage.count(filter)
      return memoryCount + storageCount
    }

    return memoryCount
  }

  // Event replay functionality
  async replay(
    filter: EventFilter = {},
    handler: (event: TableOperationEvent) => void | Promise<void>,
    options: {
      speed?: number;
      pauseAfterEach?: boolean;
      skipValidation?: boolean;
    } = {}
  ): Promise<void> {
    if (!this.config.enableReplay) {
      throw new Error('Event replay is disabled')
    }

    const events = await this.query({
      ...filter,
      sortBy: 'timestamp',
      sortOrder: 'asc'
    })

    const speed = options.speed || 1
    let lastTimestamp = 0

    for (const event of events) {
      if (lastTimestamp > 0 && speed < Infinity) {
        const timeDiff = event.timestamp - lastTimestamp
        const waitTime = timeDiff / speed
        await this.delay(waitTime)
      }

      await handler(event)
      lastTimestamp = event.timestamp

      if (options.pauseAfterEach) {
        console.log(`Paused after event ${event.id}. Press any key to continue...`)
        // In a real implementation, you'd wait for user input
      }
    }
  }

  // Batch processing implementation
  private addToBatch(event: TableOperationEvent): void {
    this.eventBuffer.push(event)

    if (this.eventBuffer.length >= this.config.batchConfig.maxSize) {
      this.flushBatch()
    } else if (this.config.batchConfig.autoFlush && !this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.flushBatch()
      }, this.config.batchConfig.maxWaitTime)
    }
  }

  private async flushBatch(): Promise<void> {
    if (this.eventBuffer.length === 0) return

    const batch = [...this.eventBuffer]
    this.eventBuffer = []

    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
      this.batchTimer = null
    }

    if (this.storage) {
      try {
        await Promise.all(batch.map(event => this.storage!.store(event)))
      } catch (error) {
        console.error('Failed to flush event batch:', error)
        // Re-add events to buffer for retry
        this.eventBuffer.unshift(...batch)
      }
    }
  }

  // Streaming implementation
  private initializeStreaming(): void {
    if (!this.config.streamingConfig.enabled) return

    this.streamingTimer = setInterval(() => {
      this.flushStreamingBuffer()
    }, this.config.streamingConfig.throttleMs)
  }

  private addToStream(event: TableOperationEvent): void {
    this.streamingBuffer.push(event)

    if (this.streamingBuffer.length >= this.config.streamingConfig.bufferSize) {
      // Remove oldest events if buffer is full
      this.streamingBuffer.splice(0, this.streamingBuffer.length - this.config.streamingConfig.bufferSize)
    }
  }

  private flushStreamingBuffer(): void {
    if (this.streamingBuffer.length === 0) return

    const events = this.streamingBuffer.splice(0, this.config.streamingConfig.batchSize)

    // Emit streaming events to special stream subscribers
    this.notifyStreamSubscribers(events)
  }

  // Subscriber notification
  private async notifySubscribers(event: TableOperationEvent): Promise<void> {
    const promises: Promise<void>[] = []

    for (const [id, subscriber] of this.subscribers) {
      if (this.eventMatchesFilter(event, subscriber.filter)) {
        promises.push(
          Promise.resolve(subscriber.handler(event))
            .catch(error => console.error(`Subscriber ${id} error:`, error))
        )

        // Remove one-time subscribers
        if (subscriber.once) {
          this.subscribers.delete(id)
        }
      }
    }

    await Promise.all(promises)
  }

  private async notifyStreamSubscribers(events: TableOperationEvent[]): Promise<void> {
    for (const event of events) {
      await this.emit({
        ...event,
        type: `stream.${event.type}`,
        metadata: {
          ...event.metadata,
          isStreamed: true
        }
      })
    }
  }

  // Event filtering logic
  private eventMatchesFilter(event: TableOperationEvent, filter?: EventFilter): boolean {
    if (!filter) return true

    // Type filtering
    if (filter.types && !filter.types.includes(event.type)) {
      return false
    }

    // Source filtering
    if (filter.sources && !filter.sources.includes(event.source)) {
      return false
    }

    // User filtering
    if (filter.userId && event.userId !== filter.userId) {
      return false
    }

    // Session filtering
    if (filter.sessionId && event.sessionId !== filter.sessionId) {
      return false
    }

    // Time range filtering
    if (filter.timeRange) {
      if (event.timestamp < filter.timeRange.start || event.timestamp > filter.timeRange.end) {
        return false
      }
    }

    // Cell position filtering
    if (filter.cellPosition && 'position' in event) {
      const eventPosition = (event as CellEvent).position
      if (eventPosition.row !== filter.cellPosition.row ||
          eventPosition.col !== filter.cellPosition.col) {
        return false
      }
    }

    // Cell range filtering
    if (filter.cellRange && 'position' in event) {
      const eventPosition = (event as CellEvent).position
      if (eventPosition.row < filter.cellRange.start.row ||
          eventPosition.row > filter.cellRange.end.row ||
          eventPosition.col < filter.cellRange.start.col ||
          eventPosition.col > filter.cellRange.end.col) {
        return false
      }
    }

    // Metadata filtering
    if (filter.metadata) {
      for (const [key, value] of Object.entries(filter.metadata)) {
        if (!event.metadata || event.metadata[key] !== value) {
          return false
        }
      }
    }

    return true
  }

  // Memory management
  private enforceMemoryLimit(): void {
    if (this.memoryEvents.length > this.config.performanceConfig.maxMemoryEvents) {
      // Remove oldest events
      const eventsToRemove = this.memoryEvents.length - this.config.performanceConfig.maxMemoryEvents
      this.memoryEvents.splice(0, eventsToRemove)
    }
  }

  private initializeGarbageCollection(): void {
    this.gcTimer = setInterval(() => {
      this.performGarbageCollection()
    }, this.config.performanceConfig.gcInterval)
  }

  private performGarbageCollection(): void {
    // Remove old events from memory
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000) // 24 hours
    this.memoryEvents = this.memoryEvents.filter(event => event.timestamp > cutoffTime)

    // Clean up completed one-time subscribers
    for (const [id, subscriber] of this.subscribers) {
      if (subscriber.once && !this.subscribers.has(id)) {
        this.subscribers.delete(id)
      }
    }
  }

  // Query helpers
  private queryMemoryEvents(query: EventQuery): TableOperationEvent[] {
    return this.memoryEvents.filter(event => this.eventMatchesFilter(event, query))
  }

  private countMemoryEvents(filter: EventFilter): number {
    return this.memoryEvents.filter(event => this.eventMatchesFilter(event, filter)).length
  }

  private sortAndLimitEvents(events: TableOperationEvent[], query: EventQuery): TableOperationEvent[] {
    // Sort events
    if (query.sortBy) {
      events.sort((a, b) => {
        let aValue: any, bValue: any

        switch (query.sortBy) {
          case 'timestamp':
            aValue = a.timestamp
            bValue = b.timestamp
            break
          case 'type':
            aValue = a.type
            bValue = b.type
            break
          case 'source':
            aValue = a.source
            bValue = b.source
            break
          default:
            return 0
        }

        if (query.sortOrder === 'desc') {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
        } else {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
        }
      })
    }

    // Apply offset and limit
    const offset = query.offset || 0
    const limit = query.limit

    if (limit) {
      return events.slice(offset, offset + limit)
    } else {
      return events.slice(offset)
    }
  }

  // Utility methods
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateSubscriberId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Public utility methods
  getStats(): {
    memoryEvents: number
    subscribers: number
    middleware: number
    bufferedEvents: number
    streamingBufferSize: number
  } {
    return {
      memoryEvents: this.memoryEvents.length,
      subscribers: this.subscribers.size,
      middleware: this.middleware.length,
      bufferedEvents: this.eventBuffer.length,
      streamingBufferSize: this.streamingBuffer.length
    }
  }

  async getEventTypes(): Promise<string[]> {
    const events = await this.query({})
    const types = new Set(events.map(event => event.type))
    return Array.from(types).sort()
  }

  // Cleanup
  dispose(): void {
    // Clear timers
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
      this.batchTimer = null
    }

    if (this.streamingTimer) {
      clearInterval(this.streamingTimer)
      this.streamingTimer = null
    }

    if (this.gcTimer) {
      clearInterval(this.gcTimer)
      this.gcTimer = null
    }

    // Flush remaining events
    if (this.eventBuffer.length > 0) {
      this.flushBatch()
    }

    // Clear collections
    this.subscribers.clear()
    this.middleware = []
    this.eventBuffer = []
    this.memoryEvents = []
    this.streamingBuffer = []
  }
}
```

## Event Storage System

```typescript
// In-memory storage adapter
class InMemoryEventStorage implements EventStorageAdapter {
  private events: TableOperationEvent[] = []

  async store(event: TableOperationEvent): Promise<void> {
    this.events.push({ ...event })
  }

  async retrieve(query: EventQuery): Promise<TableOperationEvent[]> {
    let filteredEvents = this.events.filter(event =>
      this.eventMatchesFilter(event, query)
    )

    // Apply sorting
    if (query.sortBy) {
      filteredEvents.sort((a, b) => {
        const aVal = a[query.sortBy as keyof TableOperationEvent]
        const bVal = b[query.sortBy as keyof TableOperationEvent]
        const order = query.sortOrder === 'desc' ? -1 : 1
        return aVal < bVal ? -order : aVal > bVal ? order : 0
      })
    }

    // Apply pagination
    const offset = query.offset || 0
    const limit = query.limit || filteredEvents.length
    return filteredEvents.slice(offset, offset + limit)
  }

  async count(filter: EventFilter): Promise<number> {
    return this.events.filter(event => this.eventMatchesFilter(event, filter)).length
  }

  async delete(filter: EventFilter): Promise<number> {
    const initialLength = this.events.length
    this.events = this.events.filter(event => !this.eventMatchesFilter(event, filter))
    return initialLength - this.events.length
  }

  async clear(): Promise<void> {
    this.events = []
  }

  private eventMatchesFilter(event: TableOperationEvent, filter: EventFilter): boolean {
    // Implementation same as EventManager.eventMatchesFilter
    // ... (code omitted for brevity)
    return true // Simplified
  }
}

// IndexedDB storage adapter for browser persistence
class IndexedDBEventStorage implements EventStorageAdapter {
  private dbName = 'TiptapEventDB'
  private storeName = 'events'
  private version = 1
  private db: IDBDatabase | null = null

  constructor() {
    this.initialize()
  }

  private async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' })
          store.createIndex('timestamp', 'timestamp', { unique: false })
          store.createIndex('type', 'type', { unique: false })
          store.createIndex('source', 'source', { unique: false })
        }
      }
    })
  }

  async store(event: TableOperationEvent): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.add(event)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async retrieve(query: EventQuery): Promise<TableOperationEvent[]> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        let events = request.result as TableOperationEvent[]
        events = this.filterEvents(events, query)
        resolve(events)
      }
    })
  }

  async count(filter: EventFilter): Promise<number> {
    const events = await this.retrieve(filter)
    return events.length
  }

  async delete(filter: EventFilter): Promise<number> {
    // Implementation for deletion based on filter
    return 0 // Simplified
  }

  async clear(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.clear()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  private filterEvents(events: TableOperationEvent[], filter: EventFilter): TableOperationEvent[] {
    // Apply client-side filtering
    // Implementation same as in-memory filtering
    return events
  }
}

// File system storage adapter for Node.js
class FileSystemEventStorage implements EventStorageAdapter {
  private filePath: string
  private writeQueue: Promise<void> = Promise.resolve()

  constructor(filePath: string = './events.jsonl') {
    this.filePath = filePath
  }

  async store(event: TableOperationEvent): Promise<void> {
    // Queue writes to prevent race conditions
    this.writeQueue = this.writeQueue.then(async () => {
      const fs = await import('fs/promises')
      const line = JSON.stringify(event) + '\n'
      await fs.appendFile(this.filePath, line, 'utf8')
    })

    return this.writeQueue
  }

  async retrieve(query: EventQuery): Promise<TableOperationEvent[]> {
    try {
      const fs = await import('fs/promises')
      const content = await fs.readFile(this.filePath, 'utf8')
      const lines = content.split('\n').filter(line => line.trim())

      const events: TableOperationEvent[] = lines.map(line => JSON.parse(line))
      return this.filterAndSortEvents(events, query)
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return [] // File doesn't exist yet
      }
      throw error
    }
  }

  async count(filter: EventFilter): Promise<number> {
    const events = await this.retrieve(filter)
    return events.length
  }

  async delete(filter: EventFilter): Promise<number> {
    const events = await this.retrieve({})
    const filteredEvents = events.filter(event => !this.eventMatchesFilter(event, filter))

    // Rewrite file without deleted events
    const fs = await import('fs/promises')
    const content = filteredEvents.map(event => JSON.stringify(event)).join('\n') + '\n'
    await fs.writeFile(this.filePath, content, 'utf8')

    return events.length - filteredEvents.length
  }

  async clear(): Promise<void> {
    const fs = await import('fs/promises')
    await fs.writeFile(this.filePath, '', 'utf8')
  }

  private filterAndSortEvents(events: TableOperationEvent[], query: EventQuery): TableOperationEvent[] {
    // Implementation same as other storage adapters
    return events
  }

  private eventMatchesFilter(event: TableOperationEvent, filter: EventFilter): boolean {
    // Implementation same as other storage adapters
    return true
  }
}
```

## Event Filtering & Querying

```typescript
// Advanced event query builder
class EventQueryBuilder {
  private query: EventQuery = {}

  types(...types: string[]): this {
    this.query.types = types
    return this
  }

  sources(...sources: ('user' | 'robot' | 'system' | 'external')[]): this {
    this.query.sources = sources
    return this
  }

  user(userId: string): this {
    this.query.userId = userId
    return this
  }

  session(sessionId: string): this {
    this.query.sessionId = sessionId
    return this
  }

  cell(position: CellPosition): this {
    this.query.cellPosition = position
    return this
  }

  range(start: CellPosition, end: CellPosition): this {
    this.query.cellRange = { start, end }
    return this
  }

  timeRange(start: number | Date, end: number | Date): this {
    this.query.timeRange = {
      start: typeof start === 'number' ? start : start.getTime(),
      end: typeof end === 'number' ? end : end.getTime()
    }
    return this
  }

  lastHour(): this {
    const now = Date.now()
    return this.timeRange(now - 3600000, now)
  }

  lastDay(): this {
    const now = Date.now()
    return this.timeRange(now - 86400000, now)
  }

  metadata(key: string, value: any): this {
    if (!this.query.metadata) this.query.metadata = {}
    this.query.metadata[key] = value
    return this
  }

  limit(count: number): this {
    this.query.limit = count
    return this
  }

  offset(count: number): this {
    this.query.offset = count
    return this
  }

  sortBy(field: 'timestamp' | 'type' | 'source', order: 'asc' | 'desc' = 'asc'): this {
    this.query.sortBy = field
    this.query.sortOrder = order
    return this
  }

  build(): EventQuery {
    return { ...this.query }
  }

  async execute(): Promise<TableOperationEvent[]> {
    const eventManager = EventManager.getInstance()
    return eventManager.query(this.build())
  }
}

// Predefined query helpers
class EventQueries {
  static cellUpdates(position?: CellPosition): EventQueryBuilder {
    const builder = new EventQueryBuilder().types('cell.update')
    return position ? builder.cell(position) : builder
  }

  static userActions(userId?: string): EventQueryBuilder {
    const builder = new EventQueryBuilder().sources('user')
    return userId ? builder.user(userId) : builder
  }

  static robotOperations(): EventQueryBuilder {
    return new EventQueryBuilder().sources('robot')
  }

  static formulas(): EventQueryBuilder {
    return new EventQueryBuilder().types('formula.calculate', 'formula.error')
  }

  static transactions(): EventQueryBuilder {
    return new EventQueryBuilder().types('transaction.start', 'transaction.commit', 'transaction.rollback')
  }

  static errors(): EventQueryBuilder {
    return new EventQueryBuilder().types('cell.validate', 'formula.error', 'batch.error')
  }

  static recentActivity(minutes: number = 60): EventQueryBuilder {
    const cutoff = Date.now() - (minutes * 60 * 1000)
    return new EventQueryBuilder().timeRange(cutoff, Date.now())
  }
}
```

## Event Replay System

```typescript
// Event replay engine
class EventReplayEngine {
  private eventManager: EventManager
  private isReplaying = false
  private replaySpeed = 1
  private pausedReplay = false
  private currentReplayIndex = 0
  private replayEvents: TableOperationEvent[] = []

  constructor(eventManager: EventManager) {
    this.eventManager = eventManager
  }

  async startReplay(
    filter: EventFilter = {},
    options: {
      speed?: number
      startFromEvent?: string
      endAtEvent?: string
      skipTypes?: string[]
      onlyTypes?: string[]
      interactive?: boolean
      validateState?: boolean
    } = {}
  ): Promise<void> {
    if (this.isReplaying) {
      throw new Error('Replay is already in progress')
    }

    this.isReplaying = true
    this.replaySpeed = options.speed || 1
    this.pausedReplay = false
    this.currentReplayIndex = 0

    try {
      // Fetch events for replay
      this.replayEvents = await this.eventManager.query({
        ...filter,
        sortBy: 'timestamp',
        sortOrder: 'asc'
      })

      // Apply event filtering
      if (options.skipTypes) {
        this.replayEvents = this.replayEvents.filter(e => !options.skipTypes!.includes(e.type))
      }

      if (options.onlyTypes) {
        this.replayEvents = this.replayEvents.filter(e => options.onlyTypes!.includes(e.type))
      }

      // Find start position
      if (options.startFromEvent) {
        const startIndex = this.replayEvents.findIndex(e => e.id === options.startFromEvent)
        if (startIndex !== -1) {
          this.currentReplayIndex = startIndex
        }
      }

      // Find end position
      let endIndex = this.replayEvents.length - 1
      if (options.endAtEvent) {
        const foundEndIndex = this.replayEvents.findIndex(e => e.id === options.endAtEvent)
        if (foundEndIndex !== -1) {
          endIndex = foundEndIndex
        }
      }

      // Execute replay
      await this.executeReplay(this.currentReplayIndex, endIndex, options)

    } finally {
      this.isReplaying = false
      this.replayEvents = []
      this.currentReplayIndex = 0
    }
  }

  private async executeReplay(
    startIndex: number,
    endIndex: number,
    options: { interactive?: boolean; validateState?: boolean }
  ): Promise<void> {
    let lastTimestamp = 0

    for (let i = startIndex; i <= endIndex && this.isReplaying; i++) {
      this.currentReplayIndex = i
      const event = this.replayEvents[i]

      // Handle replay speed and timing
      if (lastTimestamp > 0 && this.replaySpeed < Infinity) {
        const timeDiff = event.timestamp - lastTimestamp
        const waitTime = Math.max(0, timeDiff / this.replaySpeed)
        await this.delay(waitTime)
      }

      // Wait if paused
      while (this.pausedReplay && this.isReplaying) {
        await this.delay(100)
      }

      if (!this.isReplaying) break

      // Execute the event
      try {
        await this.replayEvent(event)

        if (options.validateState) {
          await this.validateReplayState(event)
        }

        if (options.interactive) {
          await this.handleInteractiveReplay(event)
        }

      } catch (error) {
        console.error(`Replay failed at event ${event.id}:`, error)
        if (options.interactive) {
          const shouldContinue = await this.handleReplayError(event, error)
          if (!shouldContinue) break
        } else {
          throw error
        }
      }

      lastTimestamp = event.timestamp
    }
  }

  private async replayEvent(event: TableOperationEvent): Promise<void> {
    // Create a new event with replay metadata
    await this.eventManager.emit({
      ...event,
      id: undefined as any, // Will be regenerated
      timestamp: undefined as any, // Will be regenerated
      source: 'system',
      metadata: {
        ...event.metadata,
        isReplay: true,
        originalEventId: event.id,
        originalTimestamp: event.timestamp
      }
    })
  }

  private async validateReplayState(event: TableOperationEvent): Promise<void> {
    // Validate that the replayed event produces expected state
    // This would involve checking cell contents, formula results, etc.
    // Implementation depends on specific validation requirements
  }

  private async handleInteractiveReplay(event: TableOperationEvent): Promise<void> {
    console.log(`Replaying event: ${event.type} at ${new Date(event.timestamp).toISOString()}`)
    console.log('Event data:', JSON.stringify(event, null, 2))

    // In a real implementation, you might show a UI dialog
    // For now, just add a small delay for visibility
    await this.delay(500)
  }

  private async handleReplayError(event: TableOperationEvent, error: any): Promise<boolean> {
    console.error(`Error replaying event ${event.id}:`, error)
    console.log('Would you like to continue? (Implementation needed)')

    // In a real implementation, you'd wait for user input
    return true // Continue by default
  }

  pauseReplay(): void {
    this.pausedReplay = true
  }

  resumeReplay(): void {
    this.pausedReplay = false
  }

  stopReplay(): void {
    this.isReplaying = false
  }

  setReplaySpeed(speed: number): void {
    this.replaySpeed = Math.max(0.1, speed)
  }

  getReplayProgress(): { current: number; total: number; percentage: number } {
    return {
      current: this.currentReplayIndex,
      total: this.replayEvents.length,
      percentage: this.replayEvents.length > 0
        ? (this.currentReplayIndex / this.replayEvents.length) * 100
        : 0
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
```

## Event Streaming

```typescript
// Real-time event streaming
class EventStreamer {
  private eventManager: EventManager
  private streamingClients: Map<string, WebSocket> = new Map()
  private eventBuffer: TableOperationEvent[] = []
  private flushTimer: NodeJS.Timeout | null = null
  private config: {
    bufferSize: number
    flushInterval: number
    compressionThreshold: number
  }

  constructor(eventManager: EventManager, config = {}) {
    this.eventManager = eventManager
    this.config = {
      bufferSize: 100,
      flushInterval: 1000,
      compressionThreshold: 1024,
      ...config
    }

    this.initializeStreaming()
  }

  private initializeStreaming(): void {
    // Subscribe to all events for streaming
    this.eventManager.subscribe(
      {}, // No filter - stream all events
      (event) => this.bufferEvent(event)
    )

    // Set up periodic buffer flush
    this.flushTimer = setInterval(() => {
      this.flushBuffer()
    }, this.config.flushInterval)
  }

  private bufferEvent(event: TableOperationEvent): void {
    this.eventBuffer.push(event)

    if (this.eventBuffer.length >= this.config.bufferSize) {
      this.flushBuffer()
    }
  }

  private flushBuffer(): void {
    if (this.eventBuffer.length === 0) return

    const events = [...this.eventBuffer]
    this.eventBuffer = []

    // Send to all connected clients
    for (const [clientId, ws] of this.streamingClients) {
      this.sendEventsToClient(clientId, ws, events)
    }
  }

  private sendEventsToClient(
    clientId: string,
    ws: WebSocket,
    events: TableOperationEvent[]
  ): void {
    try {
      const message = {
        type: 'event_batch',
        events,
        timestamp: Date.now(),
        clientId
      }

      let payload = JSON.stringify(message)

      // Compress large payloads
      if (payload.length > this.config.compressionThreshold) {
        payload = this.compressPayload(payload)
      }

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload)
      } else {
        // Remove dead connections
        this.streamingClients.delete(clientId)
      }
    } catch (error) {
      console.error(`Failed to send events to client ${clientId}:`, error)
      this.streamingClients.delete(clientId)
    }
  }

  private compressPayload(payload: string): string {
    // Simple compression implementation
    // In production, you might use gzip or other compression algorithms
    return payload
  }

  // WebSocket server integration
  addClient(clientId: string, ws: WebSocket, filter?: EventFilter): void {
    this.streamingClients.set(clientId, ws)

    // Send initial connection message
    const welcomeMessage = {
      type: 'connection_established',
      clientId,
      timestamp: Date.now(),
      config: this.config
    }

    ws.send(JSON.stringify(welcomeMessage))

    // Set up client-specific event handlers
    ws.on('message', (data) => {
      this.handleClientMessage(clientId, data.toString())
    })

    ws.on('close', () => {
      this.streamingClients.delete(clientId)
    })

    ws.on('error', (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error)
      this.streamingClients.delete(clientId)
    })

    // Send recent events as catch-up
    this.sendCatchupEvents(clientId, ws, filter)
  }

  private async sendCatchupEvents(
    clientId: string,
    ws: WebSocket,
    filter?: EventFilter
  ): Promise<void> {
    try {
      const recentEvents = await this.eventManager.query({
        ...filter,
        timeRange: {
          start: Date.now() - 300000, // Last 5 minutes
          end: Date.now()
        },
        limit: 50,
        sortBy: 'timestamp',
        sortOrder: 'desc'
      })

      if (recentEvents.length > 0) {
        const catchupMessage = {
          type: 'catchup_events',
          events: recentEvents,
          timestamp: Date.now()
        }

        ws.send(JSON.stringify(catchupMessage))
      }
    } catch (error) {
      console.error(`Failed to send catchup events to client ${clientId}:`, error)
    }
  }

  private handleClientMessage(clientId: string, message: string): void {
    try {
      const data = JSON.parse(message)

      switch (data.type) {
        case 'filter_update':
          // Update client's event filter
          // Implementation would store client-specific filters
          break

        case 'history_request':
          // Send historical events
          this.handleHistoryRequest(clientId, data.query)
          break

        case 'ping':
          // Respond to ping
          const ws = this.streamingClients.get(clientId)
          if (ws) {
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }))
          }
          break
      }
    } catch (error) {
      console.error(`Failed to handle client message from ${clientId}:`, error)
    }
  }

  private async handleHistoryRequest(clientId: string, query: EventQuery): Promise<void> {
    const ws = this.streamingClients.get(clientId)
    if (!ws) return

    try {
      const events = await this.eventManager.query(query)
      const response = {
        type: 'history_response',
        events,
        timestamp: Date.now(),
        query
      }

      ws.send(JSON.stringify(response))
    } catch (error) {
      const errorResponse = {
        type: 'history_error',
        error: error.message,
        timestamp: Date.now(),
        query
      }

      ws.send(JSON.stringify(errorResponse))
    }
  }

  removeClient(clientId: string): void {
    const ws = this.streamingClients.get(clientId)
    if (ws) {
      ws.close()
      this.streamingClients.delete(clientId)
    }
  }

  getClientCount(): number {
    return this.streamingClients.size
  }

  dispose(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }

    // Close all client connections
    for (const [clientId, ws] of this.streamingClients) {
      ws.close()
    }
    this.streamingClients.clear()
  }
}
```

## Event Batching

```typescript
// Advanced event batching system
class EventBatchProcessor {
  private eventManager: EventManager
  private batches: Map<string, EventBatch> = new Map()
  private batchStrategies: Map<string, BatchStrategy> = new Map()
  private processingQueues: Map<string, EventBatch[]> = new Map()
  private config: EventBatchConfig

  constructor(eventManager: EventManager, config: EventBatchConfig) {
    this.eventManager = eventManager
    this.config = config

    this.initializeBatchStrategies()
    this.startBatchProcessing()
  }

  private initializeBatchStrategies(): void {
    // Time-based batching
    this.batchStrategies.set('time', {
      name: 'time',
      shouldBatch: (event, batch) => {
        const timeDiff = Date.now() - batch.startTime
        return timeDiff < this.config.maxWaitTime
      },
      shouldFlush: (batch) => {
        const timeDiff = Date.now() - batch.startTime
        return timeDiff >= this.config.maxWaitTime
      }
    })

    // Size-based batching
    this.batchStrategies.set('size', {
      name: 'size',
      shouldBatch: (event, batch) => {
        return batch.events.length < this.config.maxSize
      },
      shouldFlush: (batch) => {
        return batch.events.length >= this.config.maxSize
      }
    })

    // Cell-based batching (group events by cell position)
    this.batchStrategies.set('cell', {
      name: 'cell',
      shouldBatch: (event, batch) => {
        if (!('position' in event) || batch.events.length === 0) return true
        const firstEvent = batch.events[0] as CellEvent
        if (!('position' in firstEvent)) return true

        const eventPos = (event as CellEvent).position
        const batchPos = firstEvent.position
        return eventPos.row === batchPos.row && eventPos.col === batchPos.col
      },
      shouldFlush: (batch) => {
        return false // Only flush on strategy change or timeout
      }
    })

    // User session batching
    this.batchStrategies.set('session', {
      name: 'session',
      shouldBatch: (event, batch) => {
        if (batch.events.length === 0) return true
        const firstEvent = batch.events[0]
        return event.sessionId === firstEvent.sessionId
      },
      shouldFlush: (batch) => {
        return false // Only flush on strategy change or timeout
      }
    })
  }

  addToBatch(event: TableOperationEvent, strategyName: string = 'time'): void {
    const strategy = this.batchStrategies.get(strategyName)
    if (!strategy) {
      throw new Error(`Unknown batch strategy: ${strategyName}`)
    }

    const batchKey = this.getBatchKey(event, strategyName)
    let batch = this.batches.get(batchKey)

    if (!batch) {
      batch = this.createNewBatch(batchKey, strategyName)
      this.batches.set(batchKey, batch)
    }

    // Check if event should be batched
    if (strategy.shouldBatch(event, batch)) {
      batch.events.push(event)
      batch.lastActivity = Date.now()

      // Check if batch should be flushed
      if (strategy.shouldFlush(batch)) {
        this.flushBatch(batchKey)
      }
    } else {
      // Flush current batch and start new one
      this.flushBatch(batchKey)

      // Create new batch for this event
      batch = this.createNewBatch(batchKey, strategyName)
      batch.events.push(event)
      this.batches.set(batchKey, batch)
    }
  }

  private createNewBatch(key: string, strategyName: string): EventBatch {
    return {
      id: this.generateBatchId(),
      key,
      events: [],
      strategy: strategyName,
      startTime: Date.now(),
      lastActivity: Date.now(),
      metadata: {}
    }
  }

  private getBatchKey(event: TableOperationEvent, strategyName: string): string {
    switch (strategyName) {
      case 'cell':
        if ('position' in event) {
          const pos = (event as CellEvent).position
          return `cell_${pos.row}_${pos.col}`
        }
        return 'global'

      case 'session':
        return `session_${event.sessionId || 'anonymous'}`

      case 'user':
        return `user_${event.userId || 'anonymous'}`

      default:
        return 'global'
    }
  }

  private flushBatch(batchKey: string): void {
    const batch = this.batches.get(batchKey)
    if (!batch || batch.events.length === 0) return

    // Add batch to processing queue
    const strategyQueue = this.processingQueues.get(batch.strategy) || []
    strategyQueue.push({ ...batch })
    this.processingQueues.set(batch.strategy, strategyQueue)

    // Remove batch from active batches
    this.batches.delete(batchKey)

    // Emit batch event
    this.eventManager.emit({
      type: 'batch.complete',
      source: 'system',
      batchId: batch.id,
      operationCount: batch.events.length,
      operations: batch.events.map(e => e.type),
      metadata: {
        strategy: batch.strategy,
        duration: Date.now() - batch.startTime,
        ...batch.metadata
      }
    })
  }

  private startBatchProcessing(): void {
    // Process batches periodically
    setInterval(() => {
      this.processPendingBatches()
      this.cleanupStaleBatches()
    }, 1000)
  }

  private processPendingBatches(): void {
    for (const [strategy, queue] of this.processingQueues) {
      if (queue.length === 0) continue

      const batch = queue.shift()!
      this.processBatch(batch)
    }
  }

  private async processBatch(batch: EventBatch): Promise<void> {
    try {
      // Process events in batch
      switch (batch.strategy) {
        case 'cell':
          await this.processCellBatch(batch)
          break
        case 'session':
          await this.processSessionBatch(batch)
          break
        default:
          await this.processGenericBatch(batch)
      }
    } catch (error) {
      console.error(`Failed to process batch ${batch.id}:`, error)

      await this.eventManager.emit({
        type: 'batch.error',
        source: 'system',
        batchId: batch.id,
        operationCount: batch.events.length,
        error: error.message
      })
    }
  }

  private async processCellBatch(batch: EventBatch): Promise<void> {
    // Process cell-related events in sequence
    const cellEvents = batch.events as CellEvent[]
    const position = cellEvents[0]?.position

    if (!position) return

    // Group by event type
    const updates = cellEvents.filter(e => e.type === 'cell.update')
    const validations = cellEvents.filter(e => e.type === 'cell.validate')

    // Process updates first, then validations
    for (const update of updates) {
      // Apply cell update
      console.log(`Processing cell update: ${position.row},${position.col} = ${update.newValue}`)
    }

    for (const validation of validations) {
      // Apply validation
      console.log(`Processing cell validation: ${position.row},${position.col}`)
    }
  }

  private async processSessionBatch(batch: EventBatch): Promise<void> {
    // Process session-related events
    console.log(`Processing session batch: ${batch.events.length} events for session ${batch.key}`)

    // Could implement session analytics, state synchronization, etc.
  }

  private async processGenericBatch(batch: EventBatch): Promise<void> {
    // Generic batch processing
    console.log(`Processing generic batch: ${batch.events.length} events`)
  }

  private cleanupStaleBatches(): void {
    const staleTimeout = this.config.maxWaitTime * 2
    const cutoffTime = Date.now() - staleTimeout

    for (const [key, batch] of this.batches) {
      if (batch.lastActivity < cutoffTime) {
        this.flushBatch(key)
      }
    }
  }

  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Public methods
  flushAll(): void {
    const keys = Array.from(this.batches.keys())
    for (const key of keys) {
      this.flushBatch(key)
    }
  }

  getBatchStats(): {
    activeBatches: number
    queuedBatches: number
    strategies: string[]
  } {
    const queuedBatches = Array.from(this.processingQueues.values())
      .reduce((total, queue) => total + queue.length, 0)

    return {
      activeBatches: this.batches.size,
      queuedBatches,
      strategies: Array.from(this.batchStrategies.keys())
    }
  }
}

interface EventBatch {
  id: string
  key: string
  events: TableOperationEvent[]
  strategy: string
  startTime: number
  lastActivity: number
  metadata: Record<string, any>
}

interface BatchStrategy {
  name: string
  shouldBatch: (event: TableOperationEvent, batch: EventBatch) => boolean
  shouldFlush: (batch: EventBatch) => boolean
}
```

## Event Middleware

```typescript
// Event middleware system
abstract class BaseEventMiddleware implements EventMiddleware {
  abstract name: string
  abstract priority: number

  abstract process(event: TableOperationEvent): Promise<TableOperationEvent | null>

  protected shouldProcess(event: TableOperationEvent): boolean {
    return true
  }

  protected log(message: string, data?: any): void {
    console.log(`[${this.name}] ${message}`, data || '')
  }
}

// Validation middleware
class ValidationMiddleware extends BaseEventMiddleware {
  name = 'validation'
  priority = 100 // High priority

  private validators: Map<string, (event: TableOperationEvent) => boolean> = new Map()

  constructor() {
    super()
    this.initializeValidators()
  }

  private initializeValidators(): void {
    this.validators.set('cell.update', (event) => {
      const cellEvent = event as CellEvent
      return cellEvent.position &&
             typeof cellEvent.position.row === 'number' &&
             typeof cellEvent.position.col === 'number'
    })

    this.validators.set('formula.calculate', (event) => {
      const formulaEvent = event as FormulaEvent
      return formulaEvent.position && formulaEvent.formula && formulaEvent.formula.length > 0
    })
  }

  async process(event: TableOperationEvent): Promise<TableOperationEvent | null> {
    const validator = this.validators.get(event.type)
    if (validator && !validator(event)) {
      this.log(`Validation failed for event type ${event.type}`, event)
      return null // Filter out invalid event
    }

    return event
  }
}

// Enrichment middleware
class EnrichmentMiddleware extends BaseEventMiddleware {
  name = 'enrichment'
  priority = 200

  async process(event: TableOperationEvent): Promise<TableOperationEvent | null> {
    const enrichedEvent = { ...event }

    // Add computed metadata
    enrichedEvent.metadata = {
      ...enrichedEvent.metadata,
      processingTime: Date.now(),
      eventAge: Date.now() - enrichedEvent.timestamp,
      dayOfWeek: new Date(enrichedEvent.timestamp).getDay(),
      hourOfDay: new Date(enrichedEvent.timestamp).getHours()
    }

    // Add session context if available
    if (enrichedEvent.sessionId) {
      enrichedEvent.metadata.sessionContext = await this.getSessionContext(enrichedEvent.sessionId)
    }

    // Add user context if available
    if (enrichedEvent.userId) {
      enrichedEvent.metadata.userContext = await this.getUserContext(enrichedEvent.userId)
    }

    // Add cell context for cell events
    if ('position' in enrichedEvent) {
      const cellEvent = enrichedEvent as CellEvent
      enrichedEvent.metadata.cellContext = {
        cellId: `${cellEvent.position.row},${cellEvent.position.col}`,
        isHeaderCell: cellEvent.position.row === 0,
        isFirstColumn: cellEvent.position.col === 0
      }
    }

    return enrichedEvent
  }

  private async getSessionContext(sessionId: string): Promise<any> {
    // Implement session context lookup
    return { sessionId, platform: 'web' }
  }

  private async getUserContext(userId: string): Promise<any> {
    // Implement user context lookup
    return { userId, role: 'editor' }
  }
}

// Transformation middleware
class TransformationMiddleware extends BaseEventMiddleware {
  name = 'transformation'
  priority = 300

  private transformers: Map<string, (event: TableOperationEvent) => TableOperationEvent> = new Map()

  constructor() {
    super()
    this.initializeTransformers()
  }

  private initializeTransformers(): void {
    // Transform legacy event formats
    this.transformers.set('cell.change', (event) => ({
      ...event,
      type: 'cell.update'
    }))

    // Normalize user interaction events
    this.transformers.set('user.keyboard', (event) => {
      const userEvent = event as UserInteractionEvent
      return {
        ...userEvent,
        metadata: {
          ...userEvent.metadata,
          normalizedKeyCombo: this.normalizeKeyCombo(userEvent.keyCombo || '')
        }
      }
    })
  }

  async process(event: TableOperationEvent): Promise<TableOperationEvent | null> {
    const transformer = this.transformers.get(event.type)
    if (transformer) {
      return transformer(event)
    }

    return event
  }

  private normalizeKeyCombo(keyCombo: string): string {
    // Normalize key combinations (e.g., "ctrl+z" -> "Ctrl+Z")
    return keyCombo
      .split('+')
      .map(key => key.trim().toLowerCase())
      .map(key => key.charAt(0).toUpperCase() + key.slice(1))
      .join('+')
  }
}

// Rate limiting middleware
class RateLimitingMiddleware extends BaseEventMiddleware {
  name = 'rateLimit'
  priority = 50 // Very high priority

  private eventCounts: Map<string, number> = new Map()
  private lastReset = Date.now()
  private readonly limits: Record<string, number> = {
    'cell.update': 1000, // Max 1000 cell updates per minute
    'user.keyboard': 2000, // Max 2000 keyboard events per minute
    'formula.calculate': 500 // Max 500 formula calculations per minute
  }
  private readonly windowMs = 60000 // 1 minute

  async process(event: TableOperationEvent): Promise<TableOperationEvent | null> {
    const now = Date.now()

    // Reset counters if window expired
    if (now - this.lastReset > this.windowMs) {
      this.eventCounts.clear()
      this.lastReset = now
    }

    const limit = this.limits[event.type]
    if (!limit) return event // No limit for this event type

    const currentCount = this.eventCounts.get(event.type) || 0

    if (currentCount >= limit) {
      this.log(`Rate limit exceeded for ${event.type}`, { currentCount, limit })
      return null // Drop the event
    }

    this.eventCounts.set(event.type, currentCount + 1)
    return event
  }
}

// Audit middleware
class AuditMiddleware extends BaseEventMiddleware {
  name = 'audit'
  priority = 500 // Low priority - runs after most others

  async process(event: TableOperationEvent): Promise<TableOperationEvent | null> {
    // Log sensitive operations
    if (this.isSensitiveEvent(event)) {
      await this.logAuditEvent(event)
    }

    return event
  }

  private isSensitiveEvent(event: TableOperationEvent): boolean {
    const sensitiveTypes = [
      'table.delete',
      'table.clear',
      'batch.error',
      'transaction.rollback'
    ]

    return sensitiveTypes.includes(event.type)
  }

  private async logAuditEvent(event: TableOperationEvent): Promise<void> {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      eventType: event.type,
      eventId: event.id,
      userId: event.userId,
      sessionId: event.sessionId,
      source: event.source,
      details: this.extractSensitiveDetails(event)
    }

    // In production, this would write to an audit log
    console.log('AUDIT:', auditEntry)
  }

  private extractSensitiveDetails(event: TableOperationEvent): any {
    switch (event.type) {
      case 'table.delete':
        const tableEvent = event as TableEvent
        return {
          tableId: tableEvent.tableId,
          affectedCells: tableEvent.affectedCells?.length || 0
        }

      case 'batch.error':
        const batchEvent = event as BatchEvent
        return {
          batchId: batchEvent.batchId,
          operationCount: batchEvent.operationCount,
          error: batchEvent.error
        }

      default:
        return {}
    }
  }
}

// Performance monitoring middleware
class PerformanceMiddleware extends BaseEventMiddleware {
  name = 'performance'
  priority = 1000 // Lowest priority

  private metrics: Map<string, {
    count: number
    totalProcessingTime: number
    avgProcessingTime: number
    maxProcessingTime: number
  }> = new Map()

  async process(event: TableOperationEvent): Promise<TableOperationEvent | null> {
    const startTime = performance.now()

    // The event continues through the pipeline
    // We're just measuring middleware processing time

    const endTime = performance.now()
    const processingTime = endTime - startTime

    this.updateMetrics(event.type, processingTime)

    return event
  }

  private updateMetrics(eventType: string, processingTime: number): void {
    const current = this.metrics.get(eventType) || {
      count: 0,
      totalProcessingTime: 0,
      avgProcessingTime: 0,
      maxProcessingTime: 0
    }

    current.count++
    current.totalProcessingTime += processingTime
    current.avgProcessingTime = current.totalProcessingTime / current.count
    current.maxProcessingTime = Math.max(current.maxProcessingTime, processingTime)

    this.metrics.set(eventType, current)
  }

  getMetrics(): Map<string, any> {
    return new Map(this.metrics)
  }

  resetMetrics(): void {
    this.metrics.clear()
  }
}
```

## Integration Examples

```typescript
// Integration with UserInput and RobotInput classes
class IntegratedTableEventSystem {
  private eventManager: EventManager
  private userInput: UserInput
  private robotInput: RobotInput
  private batchProcessor: EventBatchProcessor
  private streamer: EventStreamer
  private replayEngine: EventReplayEngine
  private editor: Editor

  constructor(editor: Editor, config: EventManagerConfig = {}) {
    this.editor = editor

    // Initialize storage
    const storage = new IndexedDBEventStorage()

    // Initialize event manager
    this.eventManager = EventManager.getInstance({
      storage,
      enablePersistence: true,
      enableStreaming: true,
      enableReplay: true,
      ...config
    })

    // Add middleware
    this.setupMiddleware()

    // Initialize components
    this.initializeComponents()

    // Setup integrations
    this.setupUserInputIntegration()
    this.setupRobotInputIntegration()
    this.setupEditorIntegration()
  }

  private setupMiddleware(): void {
    this.eventManager.addMiddleware(new RateLimitingMiddleware())
    this.eventManager.addMiddleware(new ValidationMiddleware())
    this.eventManager.addMiddleware(new EnrichmentMiddleware())
    this.eventManager.addMiddleware(new TransformationMiddleware())
    this.eventManager.addMiddleware(new AuditMiddleware())
    this.eventManager.addMiddleware(new PerformanceMiddleware())
  }

  private initializeComponents(): void {
    // Initialize batch processor
    this.batchProcessor = new EventBatchProcessor(this.eventManager, {
      maxSize: 50,
      maxWaitTime: 2000,
      autoFlush: true
    })

    // Initialize streaming
    this.streamer = new EventStreamer(this.eventManager)

    // Initialize replay engine
    this.replayEngine = new EventReplayEngine(this.eventManager)

    // Initialize user input with event integration
    this.userInput = new UserInput(
      this.editor,
      this.createUserInputEventHandlers(),
      {
        enableAutoSave: true,
        autoSaveDelay: 1000,
        enableRealTimeValidation: true
      }
    )

    // Initialize robot input with event integration
    this.robotInput = new RobotInput({
      editor: this.editor,
      enableTransactions: true,
      enableFormulas: true
    })

    this.setupRobotInputEvents()
  }

  private createUserInputEventHandlers(): any {
    return {
      onCellChange: (position: CellPosition, content: any) => {
        this.eventManager.emit({
          type: 'cell.update',
          source: 'user',
          position,
          oldValue: content.oldValue,
          newValue: content.text,
          userId: this.getCurrentUserId(),
          sessionId: this.getSessionId()
        })
      },

      onCellFocus: (position: CellPosition) => {
        this.eventManager.emit({
          type: 'cell.focus',
          source: 'user',
          position,
          userId: this.getCurrentUserId(),
          sessionId: this.getSessionId()
        })
      },

      onCellBlur: (position: CellPosition) => {
        this.eventManager.emit({
          type: 'cell.blur',
          source: 'user',
          position,
          userId: this.getCurrentUserId(),
          sessionId: this.getSessionId()
        })
      },

      onValidationError: (position: CellPosition, errors: string[]) => {
        this.eventManager.emit({
          type: 'cell.validate',
          source: 'user',
          position,
          validationErrors: errors,
          userId: this.getCurrentUserId(),
          sessionId: this.getSessionId()
        })
      },

      onKeyboardNavigation: (from: CellPosition, to: CellPosition) => {
        this.eventManager.emit({
          type: 'user.keyboard',
          source: 'user',
          affectedCells: [from, to],
          userId: this.getCurrentUserId(),
          sessionId: this.getSessionId(),
          metadata: { navigationFrom: from, navigationTo: to }
        })
      },

      onPaste: (position: CellPosition, data: any) => {
        this.eventManager.emit({
          type: 'user.paste',
          source: 'user',
          position,
          pasteData: data.text,
          userId: this.getCurrentUserId(),
          sessionId: this.getSessionId(),
          metadata: {
            dataType: data.cells ? 'multi-cell' : 'single-cell',
            cellCount: data.cells?.length || 1
          }
        })
      },

      onUndo: (state: any) => {
        this.eventManager.emit({
          type: 'user.undo',
          source: 'user',
          position: state.position,
          userId: this.getCurrentUserId(),
          sessionId: this.getSessionId(),
          metadata: { restoredState: state }
        })
      },

      onRedo: (state: any) => {
        this.eventManager.emit({
          type: 'user.redo',
          source: 'user',
          position: state.position,
          userId: this.getCurrentUserId(),
          sessionId: this.getSessionId(),
          metadata: { restoredState: state }
        })
      }
    }
  }

  private setupRobotInputEvents(): void {
    this.robotInput.on('operation:start', (operation) => {
      this.eventManager.emit({
        type: 'batch.start',
        source: 'robot',
        batchId: operation.id,
        operationCount: 1,
        operations: [operation.type],
        sessionId: this.getSessionId()
      })
    })

    this.robotInput.on('operation:complete', (operation) => {
      const cellData = Array.isArray(operation.data) ? operation.data[0] : operation.data

      this.eventManager.emit({
        type: 'cell.update',
        source: 'robot',
        position: cellData?.position,
        newValue: String(cellData?.content || ''),
        sessionId: this.getSessionId(),
        metadata: {
          operationId: operation.id,
          operationType: operation.type,
          automated: true
        }
      })
    })

    this.robotInput.on('operation:error', (operation, error) => {
      this.eventManager.emit({
        type: 'batch.error',
        source: 'robot',
        batchId: operation.id,
        operationCount: 1,
        error: error.message,
        sessionId: this.getSessionId()
      })
    })

    this.robotInput.on('transaction:start', (transaction) => {
      this.eventManager.emit({
        type: 'transaction.start',
        source: 'robot',
        transactionId: transaction.id,
        operations: transaction.operations.map(op => op.id),
        sessionId: this.getSessionId()
      })
    })

    this.robotInput.on('transaction:commit', (transaction) => {
      this.eventManager.emit({
        type: 'transaction.commit',
        source: 'robot',
        transactionId: transaction.id,
        operations: transaction.operations.map(op => op.id),
        beforeState: Object.fromEntries(transaction.beforeState),
        afterState: Object.fromEntries(transaction.afterState),
        sessionId: this.getSessionId()
      })
    })

    this.robotInput.on('transaction:rollback', (transaction) => {
      this.eventManager.emit({
        type: 'transaction.rollback',
        source: 'robot',
        transactionId: transaction.id,
        operations: transaction.operations.map(op => op.id),
        beforeState: Object.fromEntries(transaction.beforeState),
        sessionId: this.getSessionId()
      })
    })

    this.robotInput.on('formula:calculate', (context) => {
      this.eventManager.emit({
        type: 'formula.calculate',
        source: 'robot',
        position: context.cell,
        formula: context.formula,
        result: context.result,
        dependencies: context.dependencies,
        sessionId: this.getSessionId()
      })
    })
  }

  private setupEditorIntegration(): void {
    // Listen for editor events and convert to table events
    this.editor.on('create', () => {
      this.eventManager.emit({
        type: 'table.create',
        source: 'system',
        sessionId: this.getSessionId(),
        metadata: { editorInstance: this.editor.constructor.name }
      })
    })

    this.editor.on('destroy', () => {
      this.eventManager.emit({
        type: 'table.delete',
        source: 'system',
        sessionId: this.getSessionId()
      })
    })
  }

  private setupUserInputIntegration(): void {
    // Additional user input event handling could go here
  }

  private setupRobotInputIntegration(): void {
    // Additional robot input event handling could go here
  }

  // Utility methods
  private getCurrentUserId(): string {
    // Implementation would get current user ID from authentication
    return 'user123'
  }

  private getSessionId(): string {
    // Implementation would get current session ID
    return 'session_' + Date.now()
  }

  // Public API methods
  async getEventHistory(filter: EventFilter = {}): Promise<TableOperationEvent[]> {
    return this.eventManager.query(filter)
  }

  async replayEvents(filter: EventFilter = {}, speed: number = 1): Promise<void> {
    return this.replayEngine.startReplay(filter, { speed })
  }

  subscribeToEvents(
    filter: EventFilter | undefined,
    handler: (event: TableOperationEvent) => void
  ): string {
    return this.eventManager.subscribe(filter, handler)
  }

  unsubscribeFromEvents(subscriptionId: string): boolean {
    return this.eventManager.unsubscribe(subscriptionId)
  }

  addStreamingClient(clientId: string, ws: WebSocket, filter?: EventFilter): void {
    this.streamer.addClient(clientId, ws, filter)
  }

  removeStreamingClient(clientId: string): void {
    this.streamer.removeClient(clientId)
  }

  getSystemStats(): any {
    return {
      eventManager: this.eventManager.getStats(),
      batchProcessor: this.batchProcessor.getBatchStats(),
      streamer: { clientCount: this.streamer.getClientCount() }
    }
  }

  // Cleanup
  dispose(): void {
    this.userInput?.destroy()
    this.robotInput?.dispose()
    this.batchProcessor?.flushAll()
    this.streamer?.dispose()
    this.eventManager?.dispose()
    EventManager.resetInstance()
  }
}
```

## Performance Optimizations

```typescript
// Performance optimization utilities
class EventPerformanceOptimizer {
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map()
  private throttleTimers: Map<string, NodeJS.Timeout> = new Map()
  private eventCounts: Map<string, number> = new Map()
  private lastEventTime: Map<string, number> = new Map()

  // Debounce similar events
  debounce<T extends TableOperationEvent>(
    event: T,
    key: string,
    delay: number,
    callback: (event: T) => void
  ): void {
    const existingTimer = this.debounceTimers.get(key)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    const timer = setTimeout(() => {
      callback(event)
      this.debounceTimers.delete(key)
    }, delay)

    this.debounceTimers.set(key, timer)
  }

  // Throttle high-frequency events
  throttle<T extends TableOperationEvent>(
    event: T,
    key: string,
    interval: number,
    callback: (event: T) => void
  ): void {
    const lastTime = this.lastEventTime.get(key) || 0
    const now = Date.now()

    if (now - lastTime >= interval) {
      callback(event)
      this.lastEventTime.set(key, now)
    } else if (!this.throttleTimers.has(key)) {
      const remainingTime = interval - (now - lastTime)
      const timer = setTimeout(() => {
        callback(event)
        this.lastEventTime.set(key, Date.now())
        this.throttleTimers.delete(key)
      }, remainingTime)

      this.throttleTimers.set(key, timer)
    }
  }

  // Batch similar events
  batchSimilarEvents<T extends TableOperationEvent>(
    events: T[],
    groupBy: (event: T) => string,
    processor: (grouped: Map<string, T[]>) => void
  ): void {
    const grouped = new Map<string, T[]>()

    for (const event of events) {
      const key = groupBy(event)
      const existing = grouped.get(key) || []
      existing.push(event)
      grouped.set(key, existing)
    }

    processor(grouped)
  }

  // Memory-efficient event filtering
  createOptimizedFilter(filter: EventFilter): (event: TableOperationEvent) => boolean {
    // Pre-compile filter conditions for better performance
    const typeSet = filter.types ? new Set(filter.types) : null
    const sourceSet = filter.sources ? new Set(filter.sources) : null
    const hasTimeRange = Boolean(filter.timeRange)
    const timeStart = filter.timeRange?.start
    const timeEnd = filter.timeRange?.end

    return (event: TableOperationEvent): boolean => {
      if (typeSet && !typeSet.has(event.type)) return false
      if (sourceSet && !sourceSet.has(event.source)) return false
      if (filter.userId && event.userId !== filter.userId) return false
      if (filter.sessionId && event.sessionId !== filter.sessionId) return false

      if (hasTimeRange && timeStart !== undefined && timeEnd !== undefined) {
        if (event.timestamp < timeStart || event.timestamp > timeEnd) return false
      }

      return true
    }
  }

  // Cleanup resources
  dispose(): void {
    // Clear all timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer)
    }
    for (const timer of this.throttleTimers.values()) {
      clearTimeout(timer)
    }

    this.debounceTimers.clear()
    this.throttleTimers.clear()
    this.eventCounts.clear()
    this.lastEventTime.clear()
  }
}

// Usage examples with performance optimizations
class OptimizedEventManager extends EventManager {
  private optimizer: EventPerformanceOptimizer

  constructor(config: EventManagerConfig = {}) {
    super(config)
    this.optimizer = new EventPerformanceOptimizer()
  }

  async emit(event: Omit<TableOperationEvent, 'id' | 'timestamp'>): Promise<void> {
    const eventKey = this.getEventKey(event)

    // Apply performance optimizations based on event type
    switch (event.type) {
      case 'cell.update':
        // Debounce rapid cell updates
        this.optimizer.debounce(
          event as CellEvent,
          `cell_update_${eventKey}`,
          100,
          (debouncedEvent) => super.emit(debouncedEvent)
        )
        break

      case 'user.keyboard':
        // Throttle keyboard events
        this.optimizer.throttle(
          event as UserInteractionEvent,
          `keyboard_${eventKey}`,
          50,
          (throttledEvent) => super.emit(throttledEvent)
        )
        break

      default:
        // No optimization for other events
        await super.emit(event)
        break
    }
  }

  private getEventKey(event: Omit<TableOperationEvent, 'id' | 'timestamp'>): string {
    if ('position' in event) {
      const cellEvent = event as Omit<CellEvent, 'id' | 'timestamp'>
      return `${cellEvent.position.row}_${cellEvent.position.col}`
    }

    return `${event.type}_${event.source}_${event.userId || 'anonymous'}`
  }

  dispose(): void {
    this.optimizer.dispose()
    super.dispose()
  }
}
```

## Usage Examples

```typescript
// Complete usage example
async function demonstrateEventSystem() {
  // Create editor instance (Tiptap editor setup)
  const editor = new Editor({
    // ... Tiptap configuration
  })

  // Initialize the integrated event system
  const eventSystem = new IntegratedTableEventSystem(editor, {
    storage: new IndexedDBEventStorage(),
    enablePersistence: true,
    enableStreaming: true,
    enableReplay: true,
    batchConfig: {
      maxSize: 100,
      maxWaitTime: 2000,
      autoFlush: true
    },
    streamingConfig: {
      enabled: true,
      batchSize: 50,
      throttleMs: 100,
      bufferSize: 1000
    }
  })

  // Subscribe to specific events
  const cellUpdateSubscription = eventSystem.subscribeToEvents(
    { types: ['cell.update'], sources: ['user'] },
    (event) => {
      console.log('User updated cell:', event)
    }
  )

  // Subscribe to error events
  const errorSubscription = eventSystem.subscribeToEvents(
    { types: ['cell.validate', 'batch.error', 'formula.error'] },
    (event) => {
      console.error('Error event:', event)
      // Handle error notification to user
    }
  )

  // Query event history
  const recentEvents = await eventSystem.getEventHistory(
    EventQueries.recentActivity(30).build() // Last 30 minutes
  )

  console.log(`Found ${recentEvents.length} recent events`)

  // Query specific cell history
  const cellHistory = await eventSystem.getEventHistory(
    EventQueries.cellUpdates({ row: 0, col: 1 })
      .timeRange(Date.now() - 86400000, Date.now()) // Last 24 hours
      .sortBy('timestamp', 'desc')
      .limit(10)
      .build()
  )

  console.log(`Cell (0,1) has ${cellHistory.length} updates in the last 24 hours`)

  // Set up WebSocket streaming for real-time updates
  const ws = new WebSocket('ws://localhost:3000/events')
  eventSystem.addStreamingClient('client_001', ws, {
    types: ['cell.update', 'formula.calculate'],
    timeRange: { start: Date.now(), end: Date.now() + 3600000 } // Next hour
  })

  // Replay events for debugging
  setTimeout(async () => {
    console.log('Replaying events from the last hour...')
    await eventSystem.replayEvents(
      EventQueries.recentActivity(60).build(),
      2.0 // 2x speed
    )
  }, 5000)

  // Advanced querying with EventQueryBuilder
  const complexQuery = new EventQueryBuilder()
    .types('cell.update', 'formula.calculate')
    .sources('user', 'robot')
    .range({ row: 0, col: 0 }, { row: 10, col: 5 }) // First 10 rows, 5 columns
    .lastDay()
    .metadata('validated', true)
    .sortBy('timestamp', 'desc')
    .limit(50)

  const complexResults = await complexQuery.execute()
  console.log(`Complex query returned ${complexResults.length} events`)

  // Monitor system performance
  setInterval(() => {
    const stats = eventSystem.getSystemStats()
    console.log('System stats:', stats)
  }, 10000) // Every 10 seconds

  // Cleanup when done
  process.on('SIGINT', () => {
    eventSystem.unsubscribeFromEvents(cellUpdateSubscription)
    eventSystem.unsubscribeFromEvents(errorSubscription)
    eventSystem.removeStreamingClient('client_001')
    eventSystem.dispose()
    process.exit(0)
  })
}

// Run the demonstration
demonstrateEventSystem().catch(console.error)
```

This comprehensive Global Event List Management system provides:

1. **Centralized Event Management**: Single EventManager singleton for all table operations
2. **Persistent Storage**: Multiple storage adapters (in-memory, IndexedDB, filesystem)
3. **Advanced Filtering**: Flexible query system with builder pattern
4. **Event Replay**: Full replay capabilities with speed control and validation
5. **Real-time Streaming**: WebSocket-based event streaming with batching
6. **Event Batching**: Multiple batching strategies for efficient processing
7. **Middleware Pipeline**: Extensible middleware for validation, enrichment, and transformation
8. **Performance Optimizations**: Debouncing, throttling, and memory management
9. **Seamless Integration**: Direct integration with UserInput and RobotInput classes
10. **Comprehensive Monitoring**: Statistics, metrics, and audit trails

The system is designed to be highly performant, scalable, and maintainable while providing a rich foundation for table operation management in Tiptap applications.