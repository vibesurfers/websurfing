# Event Type Classes for Tiptap Table Operations

A comprehensive TypeScript event system for tracking and managing all table operations in Tiptap editors, with specialized event types for user interactions, programmatic operations, and cell updates.

## Table of Contents

1. [Core Event Architecture](#core-event-architecture)
2. [Base Event System](#base-event-system)
3. [UserInputEventType Implementation](#userinputeventtype-implementation)
4. [RobotInputEventType Implementation](#robotinputeventtype-implementation)
5. [CellUpdateEventType Implementation](#cellupdateeventtype-implementation)
6. [Event Factory Functions](#event-factory-functions)
7. [Event Filtering and Querying](#event-filtering-and-querying)
8. [Integration Examples](#integration-examples)
9. [Usage Examples](#usage-examples)

## Core Event Architecture

```typescript
// Base interfaces for all event types
interface EventMetadata {
  timestamp: number
  userId?: string
  sessionId: string
  editorId: string
  source: 'user' | 'robot' | 'system'
  version: string
}

interface CellPosition {
  row: number
  col: number
}

interface CellRange {
  start: CellPosition
  end: CellPosition
}

interface CellContent {
  text: string
  format?: 'plain' | 'number' | 'date' | 'currency' | 'percentage' | 'formula'
  metadata?: Record<string, any>
}

interface EventContext {
  tableId?: string
  documentId?: string
  collaborators?: string[]
  permissions?: string[]
  environment: 'development' | 'staging' | 'production'
}

// Event severity levels
type EventSeverity = 'debug' | 'info' | 'warn' | 'error' | 'critical'

// Event status for tracking lifecycle
type EventStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
```

## Base Event System

```typescript
import { Editor } from '@tiptap/core'

abstract class BaseEvent {
  public readonly id: string
  public readonly type: string
  public readonly metadata: EventMetadata
  public readonly context: EventContext
  public readonly severity: EventSeverity
  public status: EventStatus
  public readonly createdAt: Date
  public updatedAt: Date
  public error?: Error
  public tags: Set<string>
  private _serialized?: string

  constructor(
    type: string,
    metadata: Partial<EventMetadata> = {},
    context: Partial<EventContext> = {},
    severity: EventSeverity = 'info'
  ) {
    this.id = this.generateEventId()
    this.type = type
    this.severity = severity
    this.status = 'pending'
    this.createdAt = new Date()
    this.updatedAt = new Date()
    this.tags = new Set()

    this.metadata = {
      timestamp: Date.now(),
      sessionId: this.generateSessionId(),
      editorId: 'default',
      source: 'system',
      version: '1.0.0',
      ...metadata
    }

    this.context = {
      environment: 'development',
      ...context
    }
  }

  // Abstract methods that must be implemented by subclasses
  abstract getPayload(): any
  abstract validate(): boolean
  abstract getDescription(): string

  // Event lifecycle methods
  markAsProcessing(): this {
    this.status = 'processing'
    this.updatedAt = new Date()
    return this
  }

  markAsCompleted(): this {
    this.status = 'completed'
    this.updatedAt = new Date()
    return this
  }

  markAsFailed(error: Error): this {
    this.status = 'failed'
    this.error = error
    this.updatedAt = new Date()
    return this
  }

  markAsCancelled(): this {
    this.status = 'cancelled'
    this.updatedAt = new Date()
    return this
  }

  // Tag management
  addTag(tag: string): this {
    this.tags.add(tag)
    return this
  }

  removeTag(tag: string): this {
    this.tags.delete(tag)
    return this
  }

  hasTag(tag: string): boolean {
    return this.tags.has(tag)
  }

  // Serialization
  serialize(): string {
    if (!this._serialized || this.status !== 'completed') {
      this._serialized = JSON.stringify({
        id: this.id,
        type: this.type,
        metadata: this.metadata,
        context: this.context,
        severity: this.severity,
        status: this.status,
        createdAt: this.createdAt.toISOString(),
        updatedAt: this.updatedAt.toISOString(),
        error: this.error ? {
          name: this.error.name,
          message: this.error.message,
          stack: this.error.stack
        } : undefined,
        tags: Array.from(this.tags),
        payload: this.getPayload()
      }, null, 2)
    }
    return this._serialized
  }

  static deserialize<T extends BaseEvent>(
    serialized: string,
    eventClass: new (...args: any[]) => T
  ): T {
    const data = JSON.parse(serialized)
    const event = new eventClass()

    // Restore properties
    Object.assign(event, {
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      tags: new Set(data.tags),
      error: data.error ? Object.assign(new Error(data.error.message), data.error) : undefined
    })

    return event
  }

  // Utility methods
  getDuration(): number {
    return this.updatedAt.getTime() - this.createdAt.getTime()
  }

  isExpired(ttlMs: number = 86400000): boolean {
    return Date.now() - this.metadata.timestamp > ttlMs
  }

  clone(): this {
    const cloned = Object.create(Object.getPrototypeOf(this))
    return Object.assign(cloned, {
      ...this,
      id: this.generateEventId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'pending',
      error: undefined,
      tags: new Set(this.tags),
      _serialized: undefined
    })
  }

  // Helper methods
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }
}

export default BaseEvent
```

## UserInputEventType Implementation

```typescript
interface UserInputEventPayload {
  action: 'type' | 'click' | 'navigate' | 'paste' | 'cut' | 'copy' | 'delete' | 'select'
  target: CellPosition | CellRange
  inputData?: {
    text?: string
    html?: string
    keyCode?: number
    modifiers?: {
      ctrl: boolean
      alt: boolean
      shift: boolean
      meta: boolean
    }
  }
  beforeState?: CellContent
  afterState?: CellContent
  navigationDirection?: 'up' | 'down' | 'left' | 'right' | 'tab' | 'enter'
  selectionData?: {
    selectedText?: string
    selectionStart?: number
    selectionEnd?: number
  }
}

interface UserInputEventConfig {
  captureKeystrokes: boolean
  captureMouseEvents: boolean
  captureClipboardEvents: boolean
  debounceMs: number
  enableUndo: boolean
  trackSelection: boolean
}

class UserInputEventType extends BaseEvent {
  public readonly payload: UserInputEventPayload
  public readonly config: UserInputEventConfig
  public readonly originalEvent?: Event

  private validationRules: Map<string, (payload: UserInputEventPayload) => boolean>

  constructor(
    payload: UserInputEventPayload,
    originalEvent?: Event,
    metadata: Partial<EventMetadata> = {},
    context: Partial<EventContext> = {},
    config: Partial<UserInputEventConfig> = {}
  ) {
    super('user_input', { ...metadata, source: 'user' }, context)

    this.payload = payload
    this.originalEvent = originalEvent
    this.config = {
      captureKeystrokes: true,
      captureMouseEvents: true,
      captureClipboardEvents: true,
      debounceMs: 100,
      enableUndo: true,
      trackSelection: true,
      ...config
    }

    this.validationRules = new Map()
    this.initializeValidation()
    this.addEventTags()
  }

  getPayload(): UserInputEventPayload {
    return this.payload
  }

  validate(): boolean {
    // Basic payload validation
    if (!this.payload.action || !this.payload.target) {
      return false
    }

    // Position validation
    if ('row' in this.payload.target) {
      const pos = this.payload.target as CellPosition
      if (pos.row < 0 || pos.col < 0) return false
    } else {
      const range = this.payload.target as CellRange
      if (range.start.row < 0 || range.start.col < 0 ||
          range.end.row < range.start.row || range.end.col < range.start.col) {
        return false
      }
    }

    // Run custom validation rules
    for (const [ruleName, rule] of this.validationRules) {
      try {
        if (!rule(this.payload)) {
          console.warn(`UserInput validation failed for rule: ${ruleName}`)
          return false
        }
      } catch (error) {
        console.error(`UserInput validation error in rule ${ruleName}:`, error)
        return false
      }
    }

    return true
  }

  getDescription(): string {
    const target = 'row' in this.payload.target
      ? `cell(${this.payload.target.row},${this.payload.target.col})`
      : `range(${this.payload.target.start.row},${this.payload.target.start.col} to ${this.payload.target.end.row},${this.payload.target.end.col})`

    switch (this.payload.action) {
      case 'type':
        return `User typed "${this.payload.inputData?.text || ''}" in ${target}`
      case 'click':
        return `User clicked ${target}`
      case 'navigate':
        return `User navigated ${this.payload.navigationDirection} to ${target}`
      case 'paste':
        return `User pasted content into ${target}`
      case 'cut':
        return `User cut content from ${target}`
      case 'copy':
        return `User copied content from ${target}`
      case 'delete':
        return `User deleted content from ${target}`
      case 'select':
        return `User selected ${target}`
      default:
        return `User performed ${this.payload.action} on ${target}`
    }
  }

  // Specialized methods for user input events
  isKeyboardEvent(): boolean {
    return ['type', 'navigate', 'delete'].includes(this.payload.action)
  }

  isMouseEvent(): boolean {
    return ['click', 'select'].includes(this.payload.action)
  }

  isClipboardEvent(): boolean {
    return ['paste', 'cut', 'copy'].includes(this.payload.action)
  }

  hasModifiers(): boolean {
    return !!(this.payload.inputData?.modifiers && (
      this.payload.inputData.modifiers.ctrl ||
      this.payload.inputData.modifiers.alt ||
      this.payload.inputData.modifiers.shift ||
      this.payload.inputData.modifiers.meta
    ))
  }

  getInputText(): string {
    return this.payload.inputData?.text || ''
  }

  getTargetPosition(): CellPosition {
    if ('row' in this.payload.target) {
      return this.payload.target as CellPosition
    }
    return (this.payload.target as CellRange).start
  }

  getSelectedText(): string {
    return this.payload.selectionData?.selectedText || ''
  }

  // Add validation rule
  addValidationRule(name: string, rule: (payload: UserInputEventPayload) => boolean): void {
    this.validationRules.set(name, rule)
  }

  // Remove validation rule
  removeValidationRule(name: string): boolean {
    return this.validationRules.delete(name)
  }

  private initializeValidation(): void {
    // Text input validation
    this.addValidationRule('text_input', (payload) => {
      if (payload.action === 'type') {
        return payload.inputData?.text !== undefined
      }
      return true
    })

    // Navigation validation
    this.addValidationRule('navigation', (payload) => {
      if (payload.action === 'navigate') {
        return payload.navigationDirection !== undefined
      }
      return true
    })

    // Clipboard validation
    this.addValidationRule('clipboard', (payload) => {
      if (['paste', 'cut', 'copy'].includes(payload.action)) {
        return payload.inputData?.text !== undefined || payload.inputData?.html !== undefined
      }
      return true
    })
  }

  private addEventTags(): void {
    this.addTag('user-input')
    this.addTag(this.payload.action)

    if (this.isKeyboardEvent()) this.addTag('keyboard')
    if (this.isMouseEvent()) this.addTag('mouse')
    if (this.isClipboardEvent()) this.addTag('clipboard')
    if (this.hasModifiers()) this.addTag('modified')
  }
}

export { UserInputEventType, type UserInputEventPayload, type UserInputEventConfig }
```

## RobotInputEventType Implementation

```typescript
interface RobotInputEventPayload {
  operation: 'batch_update' | 'formula_execution' | 'api_import' | 'data_transformation' | 'auto_calculation' | 'scheduled_task'
  target: CellPosition | CellRange
  operationData: {
    batchSize?: number
    formulaExpression?: string
    apiEndpoint?: string
    transformationRules?: Array<{
      field: string
      transformation: string
      validation?: string
    }>
    calculationType?: 'sum' | 'average' | 'count' | 'max' | 'min' | 'custom'
    scheduleInfo?: {
      frequency: string
      nextRun: number
      timezone: string
    }
  }
  executionPlan?: {
    steps: Array<{
      name: string
      estimatedDuration: number
      dependencies: string[]
    }>
    totalEstimatedTime: number
    parallelizable: boolean
  }
  result?: {
    success: boolean
    affectedCells: number
    executionTime: number
    errors: string[]
    warnings: string[]
  }
}

interface RobotInputEventConfig {
  enableProfiling: boolean
  maxExecutionTime: number
  enableRetry: boolean
  maxRetries: number
  retryBackoffMs: number
  enableBatching: boolean
  batchSize: number
  enableLogging: boolean
  logLevel: 'debug' | 'info' | 'warn' | 'error'
}

class RobotInputEventType extends BaseEvent {
  public readonly payload: RobotInputEventPayload
  public readonly config: RobotInputEventConfig
  public readonly transactionId?: string

  private executionStartTime?: number
  private executionEndTime?: number
  private retryCount: number = 0
  private profiling: Map<string, number> = new Map()

  constructor(
    payload: RobotInputEventPayload,
    transactionId?: string,
    metadata: Partial<EventMetadata> = {},
    context: Partial<EventContext> = {},
    config: Partial<RobotInputEventConfig> = {}
  ) {
    super('robot_input', { ...metadata, source: 'robot' }, context)

    this.payload = payload
    this.transactionId = transactionId
    this.config = {
      enableProfiling: true,
      maxExecutionTime: 30000, // 30 seconds
      enableRetry: true,
      maxRetries: 3,
      retryBackoffMs: 1000,
      enableBatching: true,
      batchSize: 100,
      enableLogging: true,
      logLevel: 'info',
      ...config
    }

    this.addEventTags()
  }

  getPayload(): RobotInputEventPayload {
    return this.payload
  }

  validate(): boolean {
    // Basic payload validation
    if (!this.payload.operation || !this.payload.target) {
      return false
    }

    // Operation-specific validation
    switch (this.payload.operation) {
      case 'formula_execution':
        if (!this.payload.operationData.formulaExpression) {
          return false
        }
        break
      case 'api_import':
        if (!this.payload.operationData.apiEndpoint) {
          return false
        }
        try {
          new URL(this.payload.operationData.apiEndpoint)
        } catch {
          return false
        }
        break
      case 'batch_update':
        if (!this.payload.operationData.batchSize || this.payload.operationData.batchSize <= 0) {
          return false
        }
        break
    }

    return true
  }

  getDescription(): string {
    const target = 'row' in this.payload.target
      ? `cell(${this.payload.target.row},${this.payload.target.col})`
      : `range(${this.payload.target.start.row},${this.payload.target.start.col} to ${this.payload.target.end.row},${this.payload.target.end.col})`

    switch (this.payload.operation) {
      case 'batch_update':
        return `Robot executed batch update on ${target} (${this.payload.operationData.batchSize} cells)`
      case 'formula_execution':
        return `Robot executed formula "${this.payload.operationData.formulaExpression}" on ${target}`
      case 'api_import':
        return `Robot imported data from ${this.payload.operationData.apiEndpoint} to ${target}`
      case 'data_transformation':
        return `Robot transformed data in ${target} using ${this.payload.operationData.transformationRules?.length} rules`
      case 'auto_calculation':
        return `Robot performed ${this.payload.operationData.calculationType} calculation on ${target}`
      case 'scheduled_task':
        return `Robot executed scheduled task on ${target}`
      default:
        return `Robot performed ${this.payload.operation} on ${target}`
    }
  }

  // Execution lifecycle methods
  startExecution(): this {
    this.executionStartTime = Date.now()
    this.markAsProcessing()
    this.addTag('executing')

    if (this.config.enableProfiling) {
      this.profiling.set('start_time', this.executionStartTime)
    }

    return this
  }

  completeExecution(result: RobotInputEventPayload['result']): this {
    this.executionEndTime = Date.now()
    this.payload.result = result
    this.markAsCompleted()
    this.removeTag('executing')
    this.addTag('completed')

    if (this.config.enableProfiling) {
      this.profiling.set('end_time', this.executionEndTime)
      this.profiling.set('total_duration', this.getExecutionTime())
    }

    return this
  }

  failExecution(error: Error, partialResult?: Partial<RobotInputEventPayload['result']>): this {
    this.executionEndTime = Date.now()
    this.markAsFailed(error)
    this.removeTag('executing')
    this.addTag('failed')

    if (partialResult) {
      this.payload.result = {
        success: false,
        affectedCells: 0,
        executionTime: this.getExecutionTime(),
        errors: [error.message],
        warnings: [],
        ...partialResult
      }
    }

    return this
  }

  // Retry management
  canRetry(): boolean {
    return this.config.enableRetry &&
           this.retryCount < this.config.maxRetries &&
           this.status === 'failed'
  }

  incrementRetryCount(): number {
    this.retryCount++
    this.addTag(`retry-${this.retryCount}`)
    return this.retryCount
  }

  getRetryDelay(): number {
    return this.config.retryBackoffMs * Math.pow(2, this.retryCount - 1)
  }

  // Performance methods
  getExecutionTime(): number {
    if (!this.executionStartTime) return 0
    const endTime = this.executionEndTime || Date.now()
    return endTime - this.executionStartTime
  }

  isTimeout(): boolean {
    return this.getExecutionTime() > this.config.maxExecutionTime
  }

  addProfilingMark(name: string, value: number = Date.now()): void {
    if (this.config.enableProfiling) {
      this.profiling.set(name, value)
    }
  }

  getProfilingData(): Record<string, number> {
    return Object.fromEntries(this.profiling)
  }

  // Specialized robot operation methods
  isBatchOperation(): boolean {
    return this.payload.operation === 'batch_update'
  }

  isFormulaOperation(): boolean {
    return this.payload.operation === 'formula_execution'
  }

  isAPIOperation(): boolean {
    return this.payload.operation === 'api_import'
  }

  isScheduledOperation(): boolean {
    return this.payload.operation === 'scheduled_task'
  }

  getAffectedCellCount(): number {
    if ('row' in this.payload.target) {
      return 1
    } else {
      const range = this.payload.target as CellRange
      return (range.end.row - range.start.row + 1) * (range.end.col - range.start.col + 1)
    }
  }

  getEstimatedDuration(): number {
    return this.payload.executionPlan?.totalEstimatedTime || 0
  }

  private addEventTags(): void {
    this.addTag('robot-input')
    this.addTag(this.payload.operation)

    if (this.isBatchOperation()) this.addTag('batch')
    if (this.isFormulaOperation()) this.addTag('formula')
    if (this.isAPIOperation()) this.addTag('api')
    if (this.isScheduledOperation()) this.addTag('scheduled')
    if (this.transactionId) this.addTag(`transaction-${this.transactionId}`)
  }
}

export { RobotInputEventType, type RobotInputEventPayload, type RobotInputEventConfig }
```

## CellUpdateEventType Implementation

```typescript
interface CellUpdateEventPayload {
  updateType: 'content' | 'format' | 'metadata' | 'structure' | 'validation'
  position: CellPosition
  beforeState: {
    content?: CellContent
    format?: string
    metadata?: Record<string, any>
    structure?: {
      colspan?: number
      rowspan?: number
      cellType?: 'data' | 'header'
    }
  }
  afterState: {
    content?: CellContent
    format?: string
    metadata?: Record<string, any>
    structure?: {
      colspan?: number
      rowspan?: number
      cellType?: 'data' | 'header'
    }
  }
  changeReason: 'user_input' | 'robot_operation' | 'formula_calculation' | 'validation_correction' | 'data_import' | 'collaboration'
  validationResult?: {
    isValid: boolean
    errors: string[]
    warnings: string[]
    appliedCorrections: string[]
  }
  dependencies?: {
    affectedFormulas: CellPosition[]
    dependentCells: CellPosition[]
    triggeringEvents: string[]
  }
}

interface CellUpdateEventConfig {
  trackHistory: boolean
  maxHistoryEntries: number
  enableValidation: boolean
  enableDependencyTracking: boolean
  enableConflictDetection: boolean
  debounceMs: number
  enableRealTimeSync: boolean
}

class CellUpdateEventType extends BaseEvent {
  public readonly payload: CellUpdateEventPayload
  public readonly config: CellUpdateEventConfig
  public readonly parentEventId?: string
  public readonly conflictingEvents: Set<string> = new Set()

  private changeVector: number = 1
  private lockTimestamp?: number

  constructor(
    payload: CellUpdateEventPayload,
    parentEventId?: string,
    metadata: Partial<EventMetadata> = {},
    context: Partial<EventContext> = {},
    config: Partial<CellUpdateEventConfig> = {}
  ) {
    super('cell_update', metadata, context)

    this.payload = payload
    this.parentEventId = parentEventId
    this.config = {
      trackHistory: true,
      maxHistoryEntries: 50,
      enableValidation: true,
      enableDependencyTracking: true,
      enableConflictDetection: true,
      debounceMs: 50,
      enableRealTimeSync: false,
      ...config
    }

    this.addEventTags()
  }

  getPayload(): CellUpdateEventPayload {
    return this.payload
  }

  validate(): boolean {
    // Basic payload validation
    if (!this.payload.updateType || !this.payload.position) {
      return false
    }

    if (!this.payload.beforeState && !this.payload.afterState) {
      return false
    }

    // Position validation
    if (this.payload.position.row < 0 || this.payload.position.col < 0) {
      return false
    }

    // Update type validation
    const validUpdateTypes = ['content', 'format', 'metadata', 'structure', 'validation']
    if (!validUpdateTypes.includes(this.payload.updateType)) {
      return false
    }

    // Reason validation
    const validReasons = ['user_input', 'robot_operation', 'formula_calculation', 'validation_correction', 'data_import', 'collaboration']
    if (!validReasons.includes(this.payload.changeReason)) {
      return false
    }

    return true
  }

  getDescription(): string {
    const pos = `cell(${this.payload.position.row},${this.payload.position.col})`
    const reason = this.payload.changeReason.replace('_', ' ')

    switch (this.payload.updateType) {
      case 'content':
        const beforeText = this.payload.beforeState.content?.text || ''
        const afterText = this.payload.afterState.content?.text || ''
        return `Cell content updated in ${pos}: "${beforeText}" → "${afterText}" (${reason})`
      case 'format':
        const beforeFormat = this.payload.beforeState.format || 'plain'
        const afterFormat = this.payload.afterState.format || 'plain'
        return `Cell format updated in ${pos}: ${beforeFormat} → ${afterFormat} (${reason})`
      case 'metadata':
        return `Cell metadata updated in ${pos} (${reason})`
      case 'structure':
        return `Cell structure updated in ${pos} (${reason})`
      case 'validation':
        const valid = this.payload.validationResult?.isValid ? 'valid' : 'invalid'
        return `Cell validation updated in ${pos}: now ${valid} (${reason})`
      default:
        return `Cell updated in ${pos} (${reason})`
    }
  }

  // Specialized cell update methods
  isContentUpdate(): boolean {
    return this.payload.updateType === 'content'
  }

  isFormatUpdate(): boolean {
    return this.payload.updateType === 'format'
  }

  isStructureUpdate(): boolean {
    return this.payload.updateType === 'structure'
  }

  isValidationUpdate(): boolean {
    return this.payload.updateType === 'validation'
  }

  hasValidationErrors(): boolean {
    return !!(this.payload.validationResult?.errors?.length)
  }

  hasValidationWarnings(): boolean {
    return !!(this.payload.validationResult?.warnings?.length)
  }

  hasDependencies(): boolean {
    return !!(this.payload.dependencies && (
      this.payload.dependencies.affectedFormulas?.length ||
      this.payload.dependencies.dependentCells?.length
    ))
  }

  // Content comparison methods
  getContentChange(): { added: string, removed: string, modified: boolean } {
    const before = this.payload.beforeState.content?.text || ''
    const after = this.payload.afterState.content?.text || ''

    if (before === after) {
      return { added: '', removed: '', modified: false }
    }

    // Simple diff implementation
    const added = after.replace(before, '')
    const removed = before.replace(after, '')

    return { added, removed, modified: true }
  }

  getFormatChange(): { before: string, after: string, changed: boolean } {
    const before = this.payload.beforeState.format || 'plain'
    const after = this.payload.afterState.format || 'plain'

    return {
      before,
      after,
      changed: before !== after
    }
  }

  getMetadataChanges(): { added: string[], removed: string[], modified: string[] } {
    const before = this.payload.beforeState.metadata || {}
    const after = this.payload.afterState.metadata || {}

    const beforeKeys = new Set(Object.keys(before))
    const afterKeys = new Set(Object.keys(after))

    const added = Array.from(afterKeys).filter(key => !beforeKeys.has(key))
    const removed = Array.from(beforeKeys).filter(key => !afterKeys.has(key))
    const modified = Array.from(beforeKeys).filter(key =>
      afterKeys.has(key) && before[key] !== after[key]
    )

    return { added, removed, modified }
  }

  // Conflict detection
  detectConflict(otherEvent: CellUpdateEventType): boolean {
    if (!this.config.enableConflictDetection) {
      return false
    }

    // Same cell position
    if (this.payload.position.row === otherEvent.payload.position.row &&
        this.payload.position.col === otherEvent.payload.position.col) {

      // Different change vectors (concurrent updates)
      if (this.changeVector !== otherEvent.changeVector) {
        return true
      }

      // Updates within debounce window
      const timeDiff = Math.abs(this.metadata.timestamp - otherEvent.metadata.timestamp)
      if (timeDiff < this.config.debounceMs) {
        return true
      }
    }

    return false
  }

  addConflictingEvent(eventId: string): void {
    this.conflictingEvents.add(eventId)
    this.addTag('conflict')
  }

  removeConflictingEvent(eventId: string): boolean {
    const removed = this.conflictingEvents.delete(eventId)
    if (this.conflictingEvents.size === 0) {
      this.removeTag('conflict')
    }
    return removed
  }

  hasConflicts(): boolean {
    return this.conflictingEvents.size > 0
  }

  // Change vector management for operational transformation
  setChangeVector(vector: number): void {
    this.changeVector = vector
  }

  getChangeVector(): number {
    return this.changeVector
  }

  // Lock management for collaborative editing
  acquireLock(timeoutMs: number = 5000): boolean {
    if (this.lockTimestamp && Date.now() - this.lockTimestamp < timeoutMs) {
      return false // Already locked
    }

    this.lockTimestamp = Date.now()
    this.addTag('locked')
    return true
  }

  releaseLock(): void {
    this.lockTimestamp = undefined
    this.removeTag('locked')
  }

  isLocked(): boolean {
    return this.lockTimestamp !== undefined
  }

  // Dependency management
  addDependentCell(position: CellPosition): void {
    if (!this.payload.dependencies) {
      this.payload.dependencies = {
        affectedFormulas: [],
        dependentCells: [],
        triggeringEvents: []
      }
    }

    this.payload.dependencies.dependentCells.push(position)
    this.addTag('has-dependencies')
  }

  addAffectedFormula(position: CellPosition): void {
    if (!this.payload.dependencies) {
      this.payload.dependencies = {
        affectedFormulas: [],
        dependentCells: [],
        triggeringEvents: []
      }
    }

    this.payload.dependencies.affectedFormulas.push(position)
    this.addTag('affects-formulas')
  }

  addTriggeringEvent(eventId: string): void {
    if (!this.payload.dependencies) {
      this.payload.dependencies = {
        affectedFormulas: [],
        dependentCells: [],
        triggeringEvents: []
      }
    }

    this.payload.dependencies.triggeringEvents.push(eventId)
  }

  private addEventTags(): void {
    this.addTag('cell-update')
    this.addTag(this.payload.updateType)
    this.addTag(this.payload.changeReason)

    if (this.hasValidationErrors()) this.addTag('validation-error')
    if (this.hasValidationWarnings()) this.addTag('validation-warning')
    if (this.hasDependencies()) this.addTag('has-dependencies')
    if (this.parentEventId) this.addTag(`parent-${this.parentEventId}`)
  }
}

export { CellUpdateEventType, type CellUpdateEventPayload, type CellUpdateEventConfig }
```

## Event Factory Functions

```typescript
interface EventFactoryConfig {
  defaultUserId?: string
  defaultSessionId?: string
  defaultEditorId: string
  environment: 'development' | 'staging' | 'production'
  enableValidation: boolean
  enableLogging: boolean
}

class EventFactory {
  private config: EventFactoryConfig
  private eventCounter: number = 0

  constructor(config: EventFactoryConfig) {
    this.config = config
  }

  // UserInput event factory methods
  createUserTypeEvent(
    position: CellPosition,
    text: string,
    originalEvent?: KeyboardEvent,
    metadata?: Partial<EventMetadata>
  ): UserInputEventType {
    const payload: UserInputEventPayload = {
      action: 'type',
      target: position,
      inputData: {
        text,
        keyCode: originalEvent?.keyCode,
        modifiers: {
          ctrl: originalEvent?.ctrlKey || false,
          alt: originalEvent?.altKey || false,
          shift: originalEvent?.shiftKey || false,
          meta: originalEvent?.metaKey || false
        }
      }
    }

    return new UserInputEventType(payload, originalEvent, {
      userId: this.config.defaultUserId,
      sessionId: this.config.defaultSessionId,
      editorId: this.config.defaultEditorId,
      ...metadata
    })
  }

  createUserClickEvent(
    position: CellPosition,
    originalEvent?: MouseEvent,
    metadata?: Partial<EventMetadata>
  ): UserInputEventType {
    const payload: UserInputEventPayload = {
      action: 'click',
      target: position
    }

    return new UserInputEventType(payload, originalEvent, {
      userId: this.config.defaultUserId,
      sessionId: this.config.defaultSessionId,
      editorId: this.config.defaultEditorId,
      ...metadata
    })
  }

  createUserNavigationEvent(
    fromPosition: CellPosition,
    toPosition: CellPosition,
    direction: 'up' | 'down' | 'left' | 'right' | 'tab' | 'enter',
    originalEvent?: KeyboardEvent,
    metadata?: Partial<EventMetadata>
  ): UserInputEventType {
    const payload: UserInputEventPayload = {
      action: 'navigate',
      target: toPosition,
      navigationDirection: direction,
      beforeState: { text: '' }, // Would be populated with actual content
      afterState: { text: '' }
    }

    return new UserInputEventType(payload, originalEvent, {
      userId: this.config.defaultUserId,
      sessionId: this.config.defaultSessionId,
      editorId: this.config.defaultEditorId,
      ...metadata
    })
  }

  createUserPasteEvent(
    position: CellPosition,
    pastedData: { text?: string, html?: string },
    originalEvent?: ClipboardEvent,
    metadata?: Partial<EventMetadata>
  ): UserInputEventType {
    const payload: UserInputEventPayload = {
      action: 'paste',
      target: position,
      inputData: pastedData
    }

    return new UserInputEventType(payload, originalEvent, {
      userId: this.config.defaultUserId,
      sessionId: this.config.defaultSessionId,
      editorId: this.config.defaultEditorId,
      ...metadata
    })
  }

  // RobotInput event factory methods
  createBatchUpdateEvent(
    targetRange: CellRange,
    batchSize: number,
    transactionId?: string,
    metadata?: Partial<EventMetadata>
  ): RobotInputEventType {
    const payload: RobotInputEventPayload = {
      operation: 'batch_update',
      target: targetRange,
      operationData: { batchSize },
      executionPlan: {
        steps: [
          {
            name: 'validate_range',
            estimatedDuration: 100,
            dependencies: []
          },
          {
            name: 'execute_batch',
            estimatedDuration: batchSize * 10,
            dependencies: ['validate_range']
          }
        ],
        totalEstimatedTime: 100 + (batchSize * 10),
        parallelizable: true
      }
    }

    return new RobotInputEventType(payload, transactionId, {
      sessionId: this.config.defaultSessionId,
      editorId: this.config.defaultEditorId,
      ...metadata
    })
  }

  createFormulaExecutionEvent(
    targetPosition: CellPosition,
    formulaExpression: string,
    metadata?: Partial<EventMetadata>
  ): RobotInputEventType {
    const payload: RobotInputEventPayload = {
      operation: 'formula_execution',
      target: targetPosition,
      operationData: { formulaExpression },
      executionPlan: {
        steps: [
          {
            name: 'parse_formula',
            estimatedDuration: 50,
            dependencies: []
          },
          {
            name: 'resolve_dependencies',
            estimatedDuration: 200,
            dependencies: ['parse_formula']
          },
          {
            name: 'execute_calculation',
            estimatedDuration: 100,
            dependencies: ['resolve_dependencies']
          }
        ],
        totalEstimatedTime: 350,
        parallelizable: false
      }
    }

    return new RobotInputEventType(payload, undefined, {
      sessionId: this.config.defaultSessionId,
      editorId: this.config.defaultEditorId,
      ...metadata
    })
  }

  createAPIImportEvent(
    targetRange: CellRange,
    apiEndpoint: string,
    metadata?: Partial<EventMetadata>
  ): RobotInputEventType {
    const payload: RobotInputEventPayload = {
      operation: 'api_import',
      target: targetRange,
      operationData: { apiEndpoint },
      executionPlan: {
        steps: [
          {
            name: 'fetch_data',
            estimatedDuration: 2000,
            dependencies: []
          },
          {
            name: 'transform_data',
            estimatedDuration: 500,
            dependencies: ['fetch_data']
          },
          {
            name: 'populate_cells',
            estimatedDuration: 1000,
            dependencies: ['transform_data']
          }
        ],
        totalEstimatedTime: 3500,
        parallelizable: false
      }
    }

    return new RobotInputEventType(payload, undefined, {
      sessionId: this.config.defaultSessionId,
      editorId: this.config.defaultEditorId,
      ...metadata
    })
  }

  // CellUpdate event factory methods
  createContentUpdateEvent(
    position: CellPosition,
    beforeContent: CellContent,
    afterContent: CellContent,
    changeReason: CellUpdateEventPayload['changeReason'],
    parentEventId?: string,
    metadata?: Partial<EventMetadata>
  ): CellUpdateEventType {
    const payload: CellUpdateEventPayload = {
      updateType: 'content',
      position,
      beforeState: { content: beforeContent },
      afterState: { content: afterContent },
      changeReason
    }

    return new CellUpdateEventType(payload, parentEventId, {
      sessionId: this.config.defaultSessionId,
      editorId: this.config.defaultEditorId,
      ...metadata
    })
  }

  createFormatUpdateEvent(
    position: CellPosition,
    beforeFormat: string,
    afterFormat: string,
    changeReason: CellUpdateEventPayload['changeReason'],
    metadata?: Partial<EventMetadata>
  ): CellUpdateEventType {
    const payload: CellUpdateEventPayload = {
      updateType: 'format',
      position,
      beforeState: { format: beforeFormat },
      afterState: { format: afterFormat },
      changeReason
    }

    return new CellUpdateEventType(payload, undefined, {
      sessionId: this.config.defaultSessionId,
      editorId: this.config.defaultEditorId,
      ...metadata
    })
  }

  createValidationUpdateEvent(
    position: CellPosition,
    validationResult: CellUpdateEventPayload['validationResult'],
    changeReason: CellUpdateEventPayload['changeReason'],
    metadata?: Partial<EventMetadata>
  ): CellUpdateEventType {
    const payload: CellUpdateEventPayload = {
      updateType: 'validation',
      position,
      beforeState: {},
      afterState: {},
      changeReason,
      validationResult
    }

    return new CellUpdateEventType(payload, undefined, {
      sessionId: this.config.defaultSessionId,
      editorId: this.config.defaultEditorId,
      ...metadata
    })
  }

  // Utility methods
  createCompoundEvent(
    events: BaseEvent[],
    metadata?: Partial<EventMetadata>
  ): CompoundEvent {
    return new CompoundEvent(events, {
      sessionId: this.config.defaultSessionId,
      editorId: this.config.defaultEditorId,
      ...metadata
    })
  }

  getNextEventId(): string {
    return `evt_${Date.now()}_${(++this.eventCounter).toString().padStart(6, '0')}`
  }
}

// Compound event for grouping related events
class CompoundEvent extends BaseEvent {
  public readonly childEvents: BaseEvent[]

  constructor(
    childEvents: BaseEvent[],
    metadata: Partial<EventMetadata> = {},
    context: Partial<EventContext> = {}
  ) {
    super('compound', metadata, context)
    this.childEvents = childEvents
  }

  getPayload(): any {
    return {
      eventCount: this.childEvents.length,
      eventTypes: this.childEvents.map(e => e.type),
      childEvents: this.childEvents.map(e => e.serialize())
    }
  }

  validate(): boolean {
    return this.childEvents.length > 0 && this.childEvents.every(e => e.validate())
  }

  getDescription(): string {
    return `Compound event containing ${this.childEvents.length} child events`
  }
}

export { EventFactory, CompoundEvent, type EventFactoryConfig }
```

## Event Filtering and Querying

```typescript
interface EventQuery {
  types?: string[]
  sources?: ('user' | 'robot' | 'system')[]
  severities?: EventSeverity[]
  statuses?: EventStatus[]
  tags?: string[]
  timeRange?: {
    start: Date
    end: Date
  }
  userIds?: string[]
  sessionIds?: string[]
  positions?: CellPosition[]
  ranges?: CellRange[]
}

interface EventFilterConfig {
  maxResults?: number
  sortBy?: 'timestamp' | 'type' | 'severity' | 'status'
  sortOrder?: 'asc' | 'desc'
  includePayload?: boolean
  includeContext?: boolean
}

class EventFilter {
  private events: BaseEvent[] = []

  constructor(events: BaseEvent[] = []) {
    this.events = events
  }

  addEvent(event: BaseEvent): void {
    this.events.push(event)
  }

  addEvents(events: BaseEvent[]): void {
    this.events.push(...events)
  }

  query(
    query: EventQuery,
    config: EventFilterConfig = {}
  ): BaseEvent[] {
    let filtered = this.events

    // Filter by type
    if (query.types?.length) {
      filtered = filtered.filter(event => query.types!.includes(event.type))
    }

    // Filter by source
    if (query.sources?.length) {
      filtered = filtered.filter(event => query.sources!.includes(event.metadata.source))
    }

    // Filter by severity
    if (query.severities?.length) {
      filtered = filtered.filter(event => query.severities!.includes(event.severity))
    }

    // Filter by status
    if (query.statuses?.length) {
      filtered = filtered.filter(event => query.statuses!.includes(event.status))
    }

    // Filter by tags
    if (query.tags?.length) {
      filtered = filtered.filter(event =>
        query.tags!.some(tag => event.hasTag(tag))
      )
    }

    // Filter by time range
    if (query.timeRange) {
      filtered = filtered.filter(event => {
        const eventTime = event.createdAt.getTime()
        return eventTime >= query.timeRange!.start.getTime() &&
               eventTime <= query.timeRange!.end.getTime()
      })
    }

    // Filter by user IDs
    if (query.userIds?.length) {
      filtered = filtered.filter(event =>
        event.metadata.userId && query.userIds!.includes(event.metadata.userId)
      )
    }

    // Filter by session IDs
    if (query.sessionIds?.length) {
      filtered = filtered.filter(event =>
        query.sessionIds!.includes(event.metadata.sessionId)
      )
    }

    // Filter by positions (for events that have position data)
    if (query.positions?.length) {
      filtered = filtered.filter(event => {
        const payload = event.getPayload()
        if (payload.position) {
          return query.positions!.some(pos =>
            pos.row === payload.position.row && pos.col === payload.position.col
          )
        }
        if (payload.target && 'row' in payload.target) {
          return query.positions!.some(pos =>
            pos.row === payload.target.row && pos.col === payload.target.col
          )
        }
        return false
      })
    }

    // Filter by ranges (for events that affect ranges)
    if (query.ranges?.length) {
      filtered = filtered.filter(event => {
        const payload = event.getPayload()
        if (payload.target && 'start' in payload.target) {
          const eventRange = payload.target as CellRange
          return query.ranges!.some(queryRange =>
            this.rangesOverlap(eventRange, queryRange)
          )
        }
        return false
      })
    }

    // Sort results
    if (config.sortBy) {
      filtered.sort((a, b) => {
        let aVal: any, bVal: any

        switch (config.sortBy) {
          case 'timestamp':
            aVal = a.metadata.timestamp
            bVal = b.metadata.timestamp
            break
          case 'type':
            aVal = a.type
            bVal = b.type
            break
          case 'severity':
            const severityOrder = { debug: 0, info: 1, warn: 2, error: 3, critical: 4 }
            aVal = severityOrder[a.severity]
            bVal = severityOrder[b.severity]
            break
          case 'status':
            const statusOrder = { pending: 0, processing: 1, completed: 2, failed: 3, cancelled: 4 }
            aVal = statusOrder[a.status]
            bVal = statusOrder[b.status]
            break
          default:
            return 0
        }

        if (aVal < bVal) return config.sortOrder === 'desc' ? 1 : -1
        if (aVal > bVal) return config.sortOrder === 'desc' ? -1 : 1
        return 0
      })
    }

    // Limit results
    if (config.maxResults) {
      filtered = filtered.slice(0, config.maxResults)
    }

    return filtered
  }

  // Specialized query methods
  getUserEvents(userId: string, timeRange?: { start: Date, end: Date }): BaseEvent[] {
    return this.query({
      sources: ['user'],
      userIds: [userId],
      timeRange
    })
  }

  getRobotEvents(timeRange?: { start: Date, end: Date }): BaseEvent[] {
    return this.query({
      sources: ['robot'],
      timeRange
    })
  }

  getCellUpdateEvents(position: CellPosition): BaseEvent[] {
    return this.query({
      types: ['cell_update'],
      positions: [position]
    })
  }

  getErrorEvents(timeRange?: { start: Date, end: Date }): BaseEvent[] {
    return this.query({
      severities: ['error', 'critical'],
      timeRange
    }, { sortBy: 'timestamp', sortOrder: 'desc' })
  }

  getRecentEvents(minutes: number = 30): BaseEvent[] {
    const now = new Date()
    const start = new Date(now.getTime() - (minutes * 60 * 1000))

    return this.query({
      timeRange: { start, end: now }
    }, { sortBy: 'timestamp', sortOrder: 'desc' })
  }

  getEventsByTag(tag: string): BaseEvent[] {
    return this.query({ tags: [tag] })
  }

  getEventsInRange(range: CellRange): BaseEvent[] {
    return this.query({ ranges: [range] })
  }

  // Analytics methods
  getEventCounts(): Record<string, number> {
    const counts: Record<string, number> = {}

    this.events.forEach(event => {
      counts[event.type] = (counts[event.type] || 0) + 1
    })

    return counts
  }

  getEventCountsBySource(): Record<string, number> {
    const counts: Record<string, number> = {}

    this.events.forEach(event => {
      counts[event.metadata.source] = (counts[event.metadata.source] || 0) + 1
    })

    return counts
  }

  getAverageExecutionTime(eventType?: string): number {
    let targetEvents = this.events

    if (eventType) {
      targetEvents = this.events.filter(e => e.type === eventType)
    }

    if (targetEvents.length === 0) return 0

    const totalTime = targetEvents.reduce((sum, event) => sum + event.getDuration(), 0)
    return totalTime / targetEvents.length
  }

  getEventTrends(intervalMs: number = 300000): Array<{ timestamp: number, count: number }> {
    if (this.events.length === 0) return []

    const startTime = Math.min(...this.events.map(e => e.metadata.timestamp))
    const endTime = Math.max(...this.events.map(e => e.metadata.timestamp))
    const trends: Array<{ timestamp: number, count: number }> = []

    for (let time = startTime; time <= endTime; time += intervalMs) {
      const count = this.events.filter(event =>
        event.metadata.timestamp >= time &&
        event.metadata.timestamp < time + intervalMs
      ).length

      trends.push({ timestamp: time, count })
    }

    return trends
  }

  // Export methods
  exportToJSON(query?: EventQuery, config?: EventFilterConfig): string {
    const events = query ? this.query(query, config) : this.events
    return JSON.stringify(events.map(event => JSON.parse(event.serialize())), null, 2)
  }

  exportToCSV(query?: EventQuery, config?: EventFilterConfig): string {
    const events = query ? this.query(query, config) : this.events

    if (events.length === 0) return ''

    const headers = ['id', 'type', 'timestamp', 'source', 'severity', 'status', 'description']
    const rows = events.map(event => [
      event.id,
      event.type,
      event.metadata.timestamp,
      event.metadata.source,
      event.severity,
      event.status,
      event.getDescription().replace(/,/g, ';') // Escape commas
    ])

    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }

  // Utility methods
  private rangesOverlap(range1: CellRange, range2: CellRange): boolean {
    return !(
      range1.end.row < range2.start.row ||
      range1.start.row > range2.end.row ||
      range1.end.col < range2.start.col ||
      range1.start.col > range2.end.col
    )
  }

  clear(): void {
    this.events = []
  }

  size(): number {
    return this.events.length
  }
}

export { EventFilter, type EventQuery, type EventFilterConfig }
```

## Integration Examples

```typescript
// Integration with Tiptap editor
import { Editor } from '@tiptap/core'
import { UserInputEventType, RobotInputEventType, CellUpdateEventType } from './EventTypes'
import { EventFactory } from './EventFactory'
import { EventFilter } from './EventFilter'

class TiptapEventIntegration {
  private editor: Editor
  private eventFactory: EventFactory
  private eventFilter: EventFilter
  private eventHistory: BaseEvent[] = []

  constructor(editor: Editor) {
    this.editor = editor
    this.eventFactory = new EventFactory({
      defaultEditorId: 'tiptap-editor',
      environment: 'development',
      enableValidation: true,
      enableLogging: true
    })
    this.eventFilter = new EventFilter()

    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    // User input events
    this.editor.on('transaction', ({ transaction }) => {
      if (transaction.docChanged) {
        this.handleDocumentChange(transaction)
      }
    })

    this.editor.on('focus', () => {
      // Track focus events
      const event = this.eventFactory.createUserClickEvent(
        { row: 0, col: 0 }, // Would get actual position
        undefined,
        { userId: 'current-user' }
      )
      this.recordEvent(event)
    })

    this.editor.on('selectionUpdate', ({ transaction }) => {
      // Track selection changes
      this.handleSelectionUpdate(transaction)
    })
  }

  private handleDocumentChange(transaction: any): void {
    transaction.steps.forEach((step: any, index: number) => {
      if (step.jsonID === 'replace') {
        // Content replacement - likely a cell update
        const event = this.createCellUpdateFromTransaction(step, transaction)
        if (event) {
          this.recordEvent(event)
        }
      }
    })
  }

  private createCellUpdateFromTransaction(step: any, transaction: any): CellUpdateEventType | null {
    // Extract cell position and content from transaction step
    // This is a simplified implementation
    const position = this.extractCellPosition(step)
    if (!position) return null

    const beforeContent = this.extractBeforeContent(step)
    const afterContent = this.extractAfterContent(step)

    return this.eventFactory.createContentUpdateEvent(
      position,
      beforeContent,
      afterContent,
      'user_input',
      undefined,
      { userId: 'current-user' }
    )
  }

  private handleSelectionUpdate(transaction: any): void {
    // Create selection events for navigation tracking
    const position = this.getCurrentCellPosition()
    if (position) {
      const event = this.eventFactory.createUserClickEvent(
        position,
        undefined,
        { userId: 'current-user' }
      )
      this.recordEvent(event)
    }
  }

  // Public API methods
  recordEvent(event: BaseEvent): void {
    this.eventHistory.push(event)
    this.eventFilter.addEvent(event)

    // Emit event for external listeners
    this.editor.emit('eventRecorded', { event })
  }

  getUserActivity(userId: string, hours: number = 1): BaseEvent[] {
    const now = new Date()
    const start = new Date(now.getTime() - (hours * 60 * 60 * 1000))

    return this.eventFilter.getUserEvents(userId, { start, end: now })
  }

  getCellHistory(position: CellPosition): BaseEvent[] {
    return this.eventFilter.getCellUpdateEvents(position)
  }

  getRecentErrors(): BaseEvent[] {
    return this.eventFilter.getErrorEvents()
  }

  exportEventHistory(format: 'json' | 'csv' = 'json'): string {
    return format === 'json'
      ? this.eventFilter.exportToJSON()
      : this.eventFilter.exportToCSV()
  }

  // Helper methods (would be implemented based on actual Tiptap table structure)
  private extractCellPosition(step: any): CellPosition | null {
    // Implementation depends on Tiptap table structure
    return null
  }

  private extractBeforeContent(step: any): CellContent {
    // Implementation depends on Tiptap table structure
    return { text: '', format: 'plain' }
  }

  private extractAfterContent(step: any): CellContent {
    // Implementation depends on Tiptap table structure
    return { text: '', format: 'plain' }
  }

  private getCurrentCellPosition(): CellPosition | null {
    // Implementation depends on Tiptap table structure
    return null
  }
}

// Usage with existing UserInput and RobotInput classes
class EnhancedTableManager {
  private editor: Editor
  private userInput: any // UserInput from previous implementation
  private robotInput: any // RobotInput from previous implementation
  private eventIntegration: TiptapEventIntegration
  private eventFactory: EventFactory

  constructor(editor: Editor) {
    this.editor = editor
    this.eventIntegration = new TiptapEventIntegration(editor)
    this.eventFactory = new EventFactory({
      defaultEditorId: 'table-manager',
      environment: 'production',
      enableValidation: true,
      enableLogging: true
    })

    this.setupUserInput()
    this.setupRobotInput()
  }

  private setupUserInput(): void {
    this.userInput = new (require('./UserInput').default)(this.editor, {
      onCellChange: (position, content) => {
        const event = this.eventFactory.createContentUpdateEvent(
          position,
          { text: '', format: 'plain' }, // Previous content
          content,
          'user_input'
        )
        this.eventIntegration.recordEvent(event)
      },

      onKeyboardNavigation: (from, to) => {
        const event = this.eventFactory.createUserNavigationEvent(
          from,
          to,
          'tab' // Would determine actual direction
        )
        this.eventIntegration.recordEvent(event)
      },

      onPaste: (position, data) => {
        const event = this.eventFactory.createUserPasteEvent(
          position,
          { text: data.text, html: data.html }
        )
        this.eventIntegration.recordEvent(event)
      }
    })
  }

  private setupRobotInput(): void {
    this.robotInput = new (require('./RobotInput').RobotInput)({
      editor: this.editor,
      enableTransactions: true,
      enableFormulas: true
    })

    this.robotInput.on('operation:start', (operation) => {
      const event = this.createRobotEventFromOperation(operation)
      event.startExecution()
      this.eventIntegration.recordEvent(event)
    })

    this.robotInput.on('operation:complete', (operation) => {
      // Find and update the corresponding event
      const events = this.eventIntegration.eventFilter.query({
        tags: [`operation-${operation.id}`]
      })

      if (events.length > 0) {
        const event = events[0] as RobotInputEventType
        event.completeExecution({
          success: true,
          affectedCells: 1,
          executionTime: event.getExecutionTime(),
          errors: [],
          warnings: []
        })
      }
    })
  }

  private createRobotEventFromOperation(operation: any): RobotInputEventType {
    // Create appropriate robot event based on operation type
    switch (operation.type) {
      case 'update':
        return this.eventFactory.createBatchUpdateEvent(
          { start: { row: 0, col: 0 }, end: { row: 1, col: 1 } },
          1
        ).addTag(`operation-${operation.id}`)

      case 'formula':
        return this.eventFactory.createFormulaExecutionEvent(
          { row: 0, col: 0 },
          operation.data?.formula || 'SUM(A1:A10)'
        ).addTag(`operation-${operation.id}`)

      default:
        return this.eventFactory.createBatchUpdateEvent(
          { start: { row: 0, col: 0 }, end: { row: 1, col: 1 } },
          1
        ).addTag(`operation-${operation.id}`)
    }
  }

  // Public API
  getEventHistory(): BaseEvent[] {
    return this.eventIntegration.eventFilter.getRecentEvents()
  }

  getPerformanceMetrics(): any {
    const filter = this.eventIntegration.eventFilter

    return {
      totalEvents: filter.size(),
      eventCounts: filter.getEventCounts(),
      averageExecutionTime: filter.getAverageExecutionTime(),
      errorCount: filter.getErrorEvents().length,
      userActivity: filter.getUserEvents('current-user').length
    }
  }
}

export { TiptapEventIntegration, EnhancedTableManager }
```

## Usage Examples

```typescript
// Basic event creation and management
import { EventFactory, UserInputEventType, RobotInputEventType, CellUpdateEventType } from './EventTypes'

// Initialize event factory
const eventFactory = new EventFactory({
  defaultUserId: 'user123',
  defaultSessionId: 'session456',
  defaultEditorId: 'editor789',
  environment: 'production',
  enableValidation: true,
  enableLogging: true
})

// Create user input events
const typeEvent = eventFactory.createUserTypeEvent(
  { row: 1, col: 1 },
  'Hello World'
)

const clickEvent = eventFactory.createUserClickEvent(
  { row: 2, col: 3 }
)

const pasteEvent = eventFactory.createUserPasteEvent(
  { row: 0, col: 0 },
  { text: 'Pasted content', html: '<span>Pasted content</span>' }
)

// Create robot input events
const batchEvent = eventFactory.createBatchUpdateEvent(
  { start: { row: 0, col: 0 }, end: { row: 10, col: 5 } },
  50
)

const formulaEvent = eventFactory.createFormulaExecutionEvent(
  { row: 11, col: 0 },
  'SUM(A1:A10)'
)

const apiEvent = eventFactory.createAPIImportEvent(
  { start: { row: 0, col: 0 }, end: { row: 100, col: 10 } },
  'https://api.example.com/data'
)

// Create cell update events
const contentUpdate = eventFactory.createContentUpdateEvent(
  { row: 1, col: 1 },
  { text: 'Old value', format: 'plain' },
  { text: 'New value', format: 'plain' },
  'user_input'
)

const formatUpdate = eventFactory.createFormatUpdateEvent(
  { row: 2, col: 2 },
  'plain',
  'currency',
  'user_input'
)

// Event lifecycle management
console.log('Type event initial status:', typeEvent.status) // 'pending'

typeEvent.markAsProcessing()
console.log('Type event processing status:', typeEvent.status) // 'processing'

// Simulate completion
setTimeout(() => {
  typeEvent.markAsCompleted()
  console.log('Type event completed status:', typeEvent.status) // 'completed'
  console.log('Event duration:', typeEvent.getDuration(), 'ms')
}, 1000)

// Robot event execution tracking
batchEvent.startExecution()
console.log('Batch event executing:', batchEvent.status) // 'processing'

// Simulate batch operation
setTimeout(() => {
  batchEvent.completeExecution({
    success: true,
    affectedCells: 50,
    executionTime: batchEvent.getExecutionTime(),
    errors: [],
    warnings: []
  })
  console.log('Batch operation result:', batchEvent.payload.result)
}, 2000)

// Event filtering and querying
import { EventFilter } from './EventFilter'

const eventFilter = new EventFilter([
  typeEvent,
  clickEvent,
  pasteEvent,
  batchEvent,
  formulaEvent,
  contentUpdate,
  formatUpdate
])

// Query examples
const userEvents = eventFilter.query({
  sources: ['user'],
  types: ['user_input']
})

const recentEvents = eventFilter.getRecentEvents(60) // Last 60 minutes

const errorEvents = eventFilter.getErrorEvents()

const cellUpdates = eventFilter.getCellUpdateEvents({ row: 1, col: 1 })

console.log('User events:', userEvents.length)
console.log('Recent events:', recentEvents.length)
console.log('Cell update events for (1,1):', cellUpdates.length)

// Event analytics
const eventCounts = eventFilter.getEventCounts()
const sourceCounts = eventFilter.getEventCountsBySource()
const avgExecutionTime = eventFilter.getAverageExecutionTime('robot_input')

console.log('Event counts by type:', eventCounts)
console.log('Event counts by source:', sourceCounts)
console.log('Average robot execution time:', avgExecutionTime, 'ms')

// Export event data
const jsonExport = eventFilter.exportToJSON({
  timeRange: {
    start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
    end: new Date()
  }
})

const csvExport = eventFilter.exportToCSV({
  severities: ['error', 'critical']
})

console.log('JSON export length:', jsonExport.length)
console.log('CSV export preview:', csvExport.split('\n').slice(0, 3).join('\n'))

// Event serialization/deserialization
const serializedEvent = typeEvent.serialize()
console.log('Serialized event:', JSON.parse(serializedEvent).type)

// Advanced event management
const compoundEvent = eventFactory.createCompoundEvent([
  typeEvent,
  contentUpdate
])

compoundEvent.addTag('user-session')
compoundEvent.addTag('content-change')

console.log('Compound event description:', compoundEvent.getDescription())
console.log('Compound event tags:', Array.from(compoundEvent.tags))

// Validation examples
console.log('Type event valid:', typeEvent.validate())
console.log('Batch event valid:', batchEvent.validate())

// Event conflict detection (for collaborative editing)
const conflictEvent = eventFactory.createContentUpdateEvent(
  { row: 1, col: 1 }, // Same position as contentUpdate
  { text: 'Different old', format: 'plain' },
  { text: 'Different new', format: 'plain' },
  'collaboration'
)

if (contentUpdate.detectConflict(conflictEvent)) {
  console.log('Conflict detected between events')
  contentUpdate.addConflictingEvent(conflictEvent.id)
}

// Real-time event streaming simulation
function simulateRealTimeEvents() {
  const events = [
    () => eventFactory.createUserTypeEvent({ row: 0, col: 0 }, 'A'),
    () => eventFactory.createUserTypeEvent({ row: 0, col: 1 }, 'B'),
    () => eventFactory.createUserTypeEvent({ row: 0, col: 2 }, 'C'),
    () => eventFactory.createFormulaExecutionEvent({ row: 1, col: 0 }, 'SUM(A1:C1)')
  ]

  events.forEach((eventCreator, index) => {
    setTimeout(() => {
      const event = eventCreator()
      event.addTag('real-time')
      eventFilter.addEvent(event)

      console.log(`Real-time event ${index + 1}:`, event.getDescription())

      if (event instanceof RobotInputEventType) {
        event.startExecution()
        setTimeout(() => {
          event.completeExecution({
            success: true,
            affectedCells: 1,
            executionTime: event.getExecutionTime(),
            errors: [],
            warnings: []
          })
        }, 100)
      } else {
        event.markAsCompleted()
      }
    }, index * 500)
  })
}

// Run real-time simulation
simulateRealTimeEvents()

// Monitor event trends
setTimeout(() => {
  const trends = eventFilter.getEventTrends(1000) // 1-second intervals
  console.log('Event trends:', trends)
}, 3000)
```

This comprehensive Event Type system provides:

1. **Complete type safety** with full TypeScript interfaces
2. **Flexible event hierarchy** with specialized event types for different operations
3. **Rich metadata and context** tracking for audit trails and analytics
4. **Event lifecycle management** with status tracking and error handling
5. **Powerful filtering and querying** capabilities for event analysis
6. **Serialization/deserialization** support for persistence and transmission
7. **Conflict detection** for collaborative editing scenarios
8. **Performance monitoring** with execution time tracking and profiling
9. **Integration examples** showing how to connect with Tiptap and existing classes
10. **Comprehensive validation** with customizable validation rules

The system is designed to be highly extensible and can be easily integrated with existing Tiptap table implementations while providing robust event tracking and analytics capabilities.