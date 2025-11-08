# RobotInput Class for Tiptap Table Automation

A comprehensive TypeScript class for programmatic and automated input in Tiptap tables, supporting batch operations, async data handling, formula execution, and transaction rollback capabilities.

## Table of Contents

1. [Core Type Definitions](#core-type-definitions)
2. [RobotInput Class Implementation](#robotinput-class-implementation)
3. [Usage Examples](#usage-examples)
4. [Advanced Automation Scenarios](#advanced-automation-scenarios)

## Core Type Definitions

```typescript
import { Editor } from '@tiptap/core'

// Base interfaces for table operations
interface CellPosition {
  row: number
  col: number
}

interface CellRange {
  start: CellPosition
  end: CellPosition
}

interface CellData {
  position: CellPosition
  content: string | number | boolean
  metadata?: Record<string, any>
}

interface BatchOperation {
  id: string
  type: 'insert' | 'update' | 'delete' | 'formula'
  data: CellData | CellData[]
  timestamp: number
}

interface TransactionState {
  id: string
  operations: BatchOperation[]
  beforeState: Map<string, any>
  afterState: Map<string, any>
  status: 'pending' | 'committed' | 'rolled_back'
}

interface FormulaContext {
  cell: CellPosition
  range?: CellRange
  dependencies: CellPosition[]
  formula: string
  result?: any
}

interface DataPipelineStep {
  name: string
  transform: (data: any) => Promise<any> | any
  validation?: (data: any) => boolean
  onError?: (error: Error, data: any) => any
}

interface RobotInputConfig {
  editor: Editor
  batchSize?: number
  timeout?: number
  enableTransactions?: boolean
  enableFormulas?: boolean
  retryAttempts?: number
}

// Event system for monitoring operations
interface RobotInputEvents {
  'operation:start': (operation: BatchOperation) => void
  'operation:complete': (operation: BatchOperation) => void
  'operation:error': (operation: BatchOperation, error: Error) => void
  'transaction:start': (transaction: TransactionState) => void
  'transaction:commit': (transaction: TransactionState) => void
  'transaction:rollback': (transaction: TransactionState) => void
  'pipeline:step': (step: DataPipelineStep, data: any) => void
  'pipeline:complete': (result: any) => void
  'formula:calculate': (context: FormulaContext) => void
}
```

## RobotInput Class Implementation

```typescript
class RobotInput {
  private editor: Editor
  private config: Required<RobotInputConfig>
  private eventListeners: Map<keyof RobotInputEvents, Set<Function>>
  private activeTransactions: Map<string, TransactionState>
  private operationQueue: BatchOperation[]
  private isProcessing: boolean
  private formulaEngine: Map<string, Function>

  constructor(config: RobotInputConfig) {
    this.editor = config.editor
    this.config = {
      batchSize: 100,
      timeout: 5000,
      enableTransactions: true,
      enableFormulas: true,
      retryAttempts: 3,
      ...config
    }

    this.eventListeners = new Map()
    this.activeTransactions = new Map()
    this.operationQueue = []
    this.isProcessing = false
    this.formulaEngine = new Map()

    this.initializeFormulaEngine()
  }

  // Event System
  on<T extends keyof RobotInputEvents>(
    event: T,
    listener: RobotInputEvents[T]
  ): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event)!.add(listener)
  }

  off<T extends keyof RobotInputEvents>(
    event: T,
    listener: RobotInputEvents[T]
  ): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.delete(listener)
    }
  }

  private emit<T extends keyof RobotInputEvents>(
    event: T,
    ...args: Parameters<RobotInputEvents[T]>
  ): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          (listener as any)(...args)
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error)
        }
      })
    }
  }

  // Core Cell Operations
  async setCellContent(
    position: CellPosition,
    content: string | number | boolean,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    const operation: BatchOperation = {
      id: this.generateOperationId(),
      type: 'update',
      data: { position, content, metadata },
      timestamp: Date.now()
    }

    return this.executeOperation(operation)
  }

  async setCellsContent(data: CellData[]): Promise<boolean> {
    const operation: BatchOperation = {
      id: this.generateOperationId(),
      type: 'update',
      data,
      timestamp: Date.now()
    }

    return this.executeBatchOperation(operation)
  }

  async getCellContent(position: CellPosition): Promise<string | null> {
    try {
      const { state } = this.editor
      const table = this.findTableNode(state)
      if (!table) return null

      const cell = this.getCellAtPosition(table, position)
      return cell ? cell.textContent : null
    } catch (error) {
      console.error('Error getting cell content:', error)
      return null
    }
  }

  async getCellsInRange(range: CellRange): Promise<CellData[]> {
    const cells: CellData[] = []

    for (let row = range.start.row; row <= range.end.row; row++) {
      for (let col = range.start.col; col <= range.end.col; col++) {
        const position = { row, col }
        const content = await this.getCellContent(position)
        if (content !== null) {
          cells.push({ position, content })
        }
      }
    }

    return cells
  }

  // Batch Operations
  async executeBatch(operations: BatchOperation[]): Promise<boolean> {
    if (this.isProcessing) {
      throw new Error('Another batch operation is already in progress')
    }

    this.isProcessing = true

    try {
      const chunks = this.chunkOperations(operations, this.config.batchSize)

      for (const chunk of chunks) {
        await this.processBatchChunk(chunk)

        // Small delay between chunks to prevent UI blocking
        await this.delay(10)
      }

      return true
    } catch (error) {
      console.error('Batch execution failed:', error)
      return false
    } finally {
      this.isProcessing = false
    }
  }

  private async processBatchChunk(operations: BatchOperation[]): Promise<void> {
    const promises = operations.map(op => this.executeOperation(op))
    await Promise.all(promises)
  }

  private chunkOperations(
    operations: BatchOperation[],
    size: number
  ): BatchOperation[][] {
    const chunks: BatchOperation[][] = []
    for (let i = 0; i < operations.length; i += size) {
      chunks.push(operations.slice(i, i + size))
    }
    return chunks
  }

  // Transaction Support
  async startTransaction(): Promise<string> {
    if (!this.config.enableTransactions) {
      throw new Error('Transactions are not enabled')
    }

    const transactionId = this.generateTransactionId()
    const transaction: TransactionState = {
      id: transactionId,
      operations: [],
      beforeState: new Map(),
      afterState: new Map(),
      status: 'pending'
    }

    this.activeTransactions.set(transactionId, transaction)
    this.emit('transaction:start', transaction)

    return transactionId
  }

  async commitTransaction(transactionId: string): Promise<boolean> {
    const transaction = this.activeTransactions.get(transactionId)
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`)
    }

    try {
      // Execute all operations in the transaction
      for (const operation of transaction.operations) {
        await this.executeOperation(operation)
      }

      transaction.status = 'committed'
      this.emit('transaction:commit', transaction)
      this.activeTransactions.delete(transactionId)

      return true
    } catch (error) {
      console.error('Transaction commit failed:', error)
      await this.rollbackTransaction(transactionId)
      return false
    }
  }

  async rollbackTransaction(transactionId: string): Promise<boolean> {
    const transaction = this.activeTransactions.get(transactionId)
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`)
    }

    try {
      // Restore previous state
      for (const [key, value] of transaction.beforeState) {
        const position = this.parsePositionKey(key)
        await this.setCellContent(position, value)
      }

      transaction.status = 'rolled_back'
      this.emit('transaction:rollback', transaction)
      this.activeTransactions.delete(transactionId)

      return true
    } catch (error) {
      console.error('Transaction rollback failed:', error)
      return false
    }
  }

  // Formula Engine
  private initializeFormulaEngine(): void {
    // Basic arithmetic formulas
    this.formulaEngine.set('SUM', (range: CellRange) => {
      return this.calculateSum(range)
    })

    this.formulaEngine.set('AVERAGE', (range: CellRange) => {
      return this.calculateAverage(range)
    })

    this.formulaEngine.set('COUNT', (range: CellRange) => {
      return this.calculateCount(range)
    })

    this.formulaEngine.set('MAX', (range: CellRange) => {
      return this.calculateMax(range)
    })

    this.formulaEngine.set('MIN', (range: CellRange) => {
      return this.calculateMin(range)
    })
  }

  async executeFormula(
    formula: string,
    targetCell: CellPosition,
    context?: any
  ): Promise<any> {
    if (!this.config.enableFormulas) {
      throw new Error('Formula execution is not enabled')
    }

    try {
      const { functionName, args } = this.parseFormula(formula)
      const formulaFunction = this.formulaEngine.get(functionName)

      if (!formulaFunction) {
        throw new Error(`Unknown formula function: ${functionName}`)
      }

      const formulaContext: FormulaContext = {
        cell: targetCell,
        dependencies: this.extractDependencies(formula),
        formula,
        ...context
      }

      this.emit('formula:calculate', formulaContext)

      const result = await formulaFunction(...args)
      await this.setCellContent(targetCell, result)

      return result
    } catch (error) {
      console.error('Formula execution failed:', error)
      throw error
    }
  }

  registerFormula(name: string, fn: Function): void {
    this.formulaEngine.set(name.toUpperCase(), fn)
  }

  // Data Pipeline Support
  async executeDataPipeline(
    data: any,
    steps: DataPipelineStep[],
    targetRange?: CellRange
  ): Promise<any> {
    let currentData = data

    for (const step of steps) {
      try {
        this.emit('pipeline:step', step, currentData)

        // Validate input if validation function provided
        if (step.validation && !step.validation(currentData)) {
          throw new Error(`Validation failed for step: ${step.name}`)
        }

        // Execute transformation
        currentData = await step.transform(currentData)

      } catch (error) {
        if (step.onError) {
          currentData = step.onError(error, currentData)
        } else {
          throw new Error(`Pipeline step '${step.name}' failed: ${error.message}`)
        }
      }
    }

    // If target range specified, populate cells with result
    if (targetRange && Array.isArray(currentData)) {
      await this.populateRange(targetRange, currentData)
    }

    this.emit('pipeline:complete', currentData)
    return currentData
  }

  // Async Data Fetching
  async fetchAndPopulate(
    url: string,
    targetRange: CellRange,
    transformer?: (data: any) => CellData[]
  ): Promise<boolean> {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.config.timeout)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      const cellData = transformer ? transformer(data) : this.defaultDataTransformer(data)

      return await this.populateRange(targetRange, cellData)
    } catch (error) {
      console.error('Fetch and populate failed:', error)
      return false
    }
  }

  async populateFromAPI(
    apiConfig: {
      url: string
      method?: 'GET' | 'POST'
      headers?: Record<string, string>
      body?: any
    },
    targetRange: CellRange,
    transformer?: (data: any) => CellData[]
  ): Promise<boolean> {
    try {
      const { url, method = 'GET', headers = {}, body } = apiConfig

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(this.config.timeout)
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const data = await response.json()
      const cellData = transformer ? transformer(data) : this.defaultDataTransformer(data)

      return await this.populateRange(targetRange, cellData)
    } catch (error) {
      console.error('API population failed:', error)
      return false
    }
  }

  // Utility Methods
  private async populateRange(
    range: CellRange,
    data: CellData[] | any[][]
  ): Promise<boolean> {
    try {
      if (Array.isArray(data) && Array.isArray(data[0])) {
        // 2D array format
        const operations: BatchOperation[] = []

        for (let rowOffset = 0; rowOffset < data.length; rowOffset++) {
          const row = data[rowOffset]
          for (let colOffset = 0; colOffset < row.length; colOffset++) {
            const position = {
              row: range.start.row + rowOffset,
              col: range.start.col + colOffset
            }

            if (position.row <= range.end.row && position.col <= range.end.col) {
              operations.push({
                id: this.generateOperationId(),
                type: 'update',
                data: { position, content: row[colOffset] },
                timestamp: Date.now()
              })
            }
          }
        }

        return await this.executeBatch(operations)
      } else {
        // CellData array format
        const cellData = data as CellData[]
        return await this.setCellsContent(cellData)
      }
    } catch (error) {
      console.error('Range population failed:', error)
      return false
    }
  }

  private defaultDataTransformer(data: any): CellData[] {
    if (Array.isArray(data)) {
      return data.map((item, index) => ({
        position: { row: index, col: 0 },
        content: typeof item === 'object' ? JSON.stringify(item) : String(item)
      }))
    } else if (typeof data === 'object') {
      return Object.entries(data).map(([key, value], index) => ({
        position: { row: index, col: 0 },
        content: `${key}: ${value}`
      }))
    }

    return [{
      position: { row: 0, col: 0 },
      content: String(data)
    }]
  }

  private async executeOperation(operation: BatchOperation): Promise<boolean> {
    this.emit('operation:start', operation)

    try {
      const cellData = Array.isArray(operation.data)
        ? operation.data[0]
        : operation.data

      if (!cellData) return false

      // Store before state for transactions
      const beforeContent = await this.getCellContent(cellData.position)

      // Execute the operation
      await this.performCellUpdate(cellData)

      // Store after state for transactions
      const activeTransaction = Array.from(this.activeTransactions.values())
        .find(t => t.status === 'pending')

      if (activeTransaction) {
        const posKey = this.formatPositionKey(cellData.position)
        activeTransaction.beforeState.set(posKey, beforeContent)
        activeTransaction.afterState.set(posKey, cellData.content)
        activeTransaction.operations.push(operation)
      }

      this.emit('operation:complete', operation)
      return true
    } catch (error) {
      this.emit('operation:error', operation, error as Error)
      return false
    }
  }

  private async performCellUpdate(cellData: CellData): Promise<void> {
    const { state, view } = this.editor
    const table = this.findTableNode(state)

    if (!table) {
      throw new Error('No table found in editor')
    }

    const cellPos = this.getCellPosition(table, cellData.position)
    if (cellPos === null) {
      throw new Error(`Cell at position ${cellData.position.row},${cellData.position.col} not found`)
    }

    // Create transaction to update cell content
    const tr = state.tr
    tr.replaceWith(
      cellPos,
      cellPos + 1,
      state.schema.text(String(cellData.content))
    )

    view.dispatch(tr)
  }

  // Formula calculation methods
  private async calculateSum(range: CellRange): Promise<number> {
    const cells = await this.getCellsInRange(range)
    return cells.reduce((sum, cell) => {
      const num = Number(cell.content)
      return isNaN(num) ? sum : sum + num
    }, 0)
  }

  private async calculateAverage(range: CellRange): Promise<number> {
    const sum = await this.calculateSum(range)
    const cells = await this.getCellsInRange(range)
    const numericCells = cells.filter(cell => !isNaN(Number(cell.content)))
    return numericCells.length > 0 ? sum / numericCells.length : 0
  }

  private async calculateCount(range: CellRange): Promise<number> {
    const cells = await this.getCellsInRange(range)
    return cells.filter(cell => cell.content !== '').length
  }

  private async calculateMax(range: CellRange): Promise<number> {
    const cells = await this.getCellsInRange(range)
    const numbers = cells
      .map(cell => Number(cell.content))
      .filter(num => !isNaN(num))
    return numbers.length > 0 ? Math.max(...numbers) : 0
  }

  private async calculateMin(range: CellRange): Promise<number> {
    const cells = await this.getCellsInRange(range)
    const numbers = cells
      .map(cell => Number(cell.content))
      .filter(num => !isNaN(num))
    return numbers.length > 0 ? Math.min(...numbers) : 0
  }

  // Helper methods
  private findTableNode(state: any): any {
    // Implementation depends on Tiptap table structure
    // This is a simplified version
    let tableNode = null
    state.doc.descendants((node: any) => {
      if (node.type.name === 'table') {
        tableNode = node
        return false
      }
    })
    return tableNode
  }

  private getCellAtPosition(table: any, position: CellPosition): any {
    // Implementation depends on Tiptap table structure
    // This would navigate to the specific cell
    return null
  }

  private getCellPosition(table: any, position: CellPosition): number | null {
    // Implementation depends on Tiptap table structure
    // This would return the absolute position in the document
    return null
  }

  private parseFormula(formula: string): { functionName: string; args: any[] } {
    const match = formula.match(/^([A-Z]+)\((.+)\)$/)
    if (!match) {
      throw new Error('Invalid formula format')
    }

    const functionName = match[1]
    const argsString = match[2]

    // Simple parsing - could be enhanced for complex arguments
    const args = argsString.split(',').map(arg => arg.trim())

    return { functionName, args }
  }

  private extractDependencies(formula: string): CellPosition[] {
    // Extract cell references from formula
    const cellRefs = formula.match(/[A-Z]+\d+/g) || []
    return cellRefs.map(ref => this.parseCellReference(ref))
  }

  private parseCellReference(ref: string): CellPosition {
    const match = ref.match(/([A-Z]+)(\d+)/)
    if (!match) throw new Error(`Invalid cell reference: ${ref}`)

    const col = match[1].charCodeAt(0) - 65 // A=0, B=1, etc.
    const row = parseInt(match[2]) - 1 // 1-based to 0-based

    return { row, col }
  }

  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateTransactionId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private formatPositionKey(position: CellPosition): string {
    return `${position.row},${position.col}`
  }

  private parsePositionKey(key: string): CellPosition {
    const [row, col] = key.split(',').map(Number)
    return { row, col }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Cleanup
  dispose(): void {
    this.eventListeners.clear()
    this.activeTransactions.clear()
    this.operationQueue = []
    this.formulaEngine.clear()
  }
}

export { RobotInput, type RobotInputConfig, type CellPosition, type CellRange, type CellData }
```

## Usage Examples

### Basic Cell Operations

```typescript
import { RobotInput } from './RobotInput'

// Initialize with Tiptap editor
const robot = new RobotInput({
  editor: tiptapEditor,
  batchSize: 50,
  enableTransactions: true,
  enableFormulas: true
})

// Set single cell
await robot.setCellContent(
  { row: 0, col: 0 },
  'Hello World',
  { source: 'automated', timestamp: Date.now() }
)

// Set multiple cells
await robot.setCellsContent([
  { position: { row: 0, col: 0 }, content: 'Name' },
  { position: { row: 0, col: 1 }, content: 'Age' },
  { position: { row: 0, col: 2 }, content: 'City' },
  { position: { row: 1, col: 0 }, content: 'John' },
  { position: { row: 1, col: 1 }, content: 30 },
  { position: { row: 1, col: 2 }, content: 'New York' }
])

// Get cell content
const content = await robot.getCellContent({ row: 1, col: 0 })
console.log('Cell content:', content)
```

### Batch Operations

```typescript
// Create batch operations
const operations = [
  {
    id: 'batch_1',
    type: 'update' as const,
    data: { position: { row: 0, col: 0 }, content: 'Product' },
    timestamp: Date.now()
  },
  {
    id: 'batch_2',
    type: 'update' as const,
    data: { position: { row: 0, col: 1 }, content: 'Price' },
    timestamp: Date.now()
  },
  {
    id: 'batch_3',
    type: 'update' as const,
    data: { position: { row: 0, col: 2 }, content: 'Stock' },
    timestamp: Date.now()
  }
]

// Execute batch
const success = await robot.executeBatch(operations)
if (success) {
  console.log('Batch operations completed successfully')
}
```

### Transaction Support

```typescript
// Start a transaction
const txId = await robot.startTransaction()

try {
  // Perform multiple operations
  await robot.setCellContent({ row: 0, col: 0 }, 'Test 1')
  await robot.setCellContent({ row: 0, col: 1 }, 'Test 2')
  await robot.setCellContent({ row: 0, col: 2 }, 'Test 3')

  // Commit the transaction
  await robot.commitTransaction(txId)
  console.log('Transaction committed successfully')
} catch (error) {
  // Rollback on error
  await robot.rollbackTransaction(txId)
  console.error('Transaction rolled back due to error:', error)
}
```

### Formula Execution

```typescript
// Execute built-in formulas
await robot.executeFormula(
  'SUM(A1:A10)',
  { row: 11, col: 0 }
)

await robot.executeFormula(
  'AVERAGE(B1:B10)',
  { row: 11, col: 1 }
)

// Register custom formula
robot.registerFormula('CUSTOM_CONCAT', (range) => {
  return robot.getCellsInRange(range).then(cells =>
    cells.map(cell => cell.content).join(', ')
  )
})

// Use custom formula
await robot.executeFormula(
  'CUSTOM_CONCAT(A1:A5)',
  { row: 6, col: 0 }
)
```

### Data Pipeline Processing

```typescript
// Define data transformation pipeline
const pipeline = [
  {
    name: 'validation',
    transform: (data) => {
      if (!Array.isArray(data)) {
        throw new Error('Data must be an array')
      }
      return data
    },
    validation: (data) => Array.isArray(data)
  },
  {
    name: 'normalization',
    transform: (data) => {
      return data.map(item => ({
        name: String(item.name || '').trim(),
        age: parseInt(item.age) || 0,
        email: String(item.email || '').toLowerCase()
      }))
    }
  },
  {
    name: 'formatting',
    transform: (data) => {
      return data.map(item => [
        item.name,
        item.age,
        item.email
      ])
    }
  }
]

// Execute pipeline with target range
const rawData = [
  { name: ' John Doe ', age: '30', email: 'JOHN@EMAIL.COM' },
  { name: 'Jane Smith', age: '25', email: 'jane@email.com' }
]

await robot.executeDataPipeline(
  rawData,
  pipeline,
  { start: { row: 1, col: 0 }, end: { row: 10, col: 2 } }
)
```

### Async Data Fetching

```typescript
// Fetch from REST API
await robot.fetchAndPopulate(
  'https://api.example.com/users',
  { start: { row: 1, col: 0 }, end: { row: 100, col: 5 } },
  (data) => {
    // Transform API response to cell data
    return data.users.map((user, index) => [
      { position: { row: index + 1, col: 0 }, content: user.name },
      { position: { row: index + 1, col: 1 }, content: user.email },
      { position: { row: index + 1, col: 2 }, content: user.department },
      { position: { row: index + 1, col: 3 }, content: user.salary },
      { position: { row: index + 1, col: 4 }, content: user.startDate }
    ]).flat()
  }
)

// Advanced API configuration
await robot.populateFromAPI(
  {
    url: 'https://api.example.com/reports',
    method: 'POST',
    headers: {
      'Authorization': 'Bearer token',
      'X-Custom-Header': 'value'
    },
    body: {
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      format: 'summary'
    }
  },
  { start: { row: 0, col: 0 }, end: { row: 50, col: 10 } },
  (response) => {
    // Custom data transformation
    return response.report.map((row, rowIndex) =>
      row.columns.map((cell, colIndex) => ({
        position: { row: rowIndex, col: colIndex },
        content: cell.value,
        metadata: {
          type: cell.type,
          formatted: cell.formatted
        }
      }))
    ).flat()
  }
)
```

## Advanced Automation Scenarios

### Event-Driven Automation

```typescript
// Monitor operations
robot.on('operation:complete', (operation) => {
  console.log(`Operation ${operation.id} completed:`, operation.type)

  // Trigger dependent operations
  if (operation.type === 'update') {
    // Recalculate formulas that depend on updated cells
    updateDependentFormulas(operation.data)
  }
})

robot.on('transaction:commit', (transaction) => {
  console.log(`Transaction ${transaction.id} committed with ${transaction.operations.length} operations`)

  // Log audit trail
  auditLogger.log({
    type: 'transaction_commit',
    transactionId: transaction.id,
    operationCount: transaction.operations.length,
    timestamp: Date.now()
  })
})

robot.on('pipeline:step', (step, data) => {
  console.log(`Pipeline step '${step.name}' processing ${Array.isArray(data) ? data.length : 1} items`)
})
```

### Complex Data Import Automation

```typescript
async function automateDataImport() {
  const robot = new RobotInput({
    editor: tiptapEditor,
    batchSize: 100,
    enableTransactions: true,
    timeout: 10000
  })

  // Start transaction for rollback capability
  const txId = await robot.startTransaction()

  try {
    // Step 1: Clear existing data
    const clearRange = { start: { row: 0, col: 0 }, end: { row: 1000, col: 20 } }
    const clearCells = await robot.getCellsInRange(clearRange)
    const clearOperations = clearCells.map(cell => ({
      id: `clear_${cell.position.row}_${cell.position.col}`,
      type: 'update' as const,
      data: { ...cell, content: '' },
      timestamp: Date.now()
    }))
    await robot.executeBatch(clearOperations)

    // Step 2: Fetch and process data from multiple sources
    const [usersData, salesData, inventoryData] = await Promise.all([
      fetch('https://api.example.com/users').then(r => r.json()),
      fetch('https://api.example.com/sales').then(r => r.json()),
      fetch('https://api.example.com/inventory').then(r => r.json())
    ])

    // Step 3: Process users data
    await robot.executeDataPipeline(
      usersData,
      [
        {
          name: 'user_validation',
          transform: (data) => data.filter(user => user.active),
          validation: (data) => Array.isArray(data)
        },
        {
          name: 'user_formatting',
          transform: (data) => data.map((user, index) => ([
            { position: { row: index + 1, col: 0 }, content: user.id },
            { position: { row: index + 1, col: 1 }, content: user.name },
            { position: { row: index + 1, col: 2 }, content: user.email },
            { position: { row: index + 1, col: 3 }, content: user.department }
          ])).flat()
        }
      ],
      { start: { row: 1, col: 0 }, end: { row: 1000, col: 3 } }
    )

    // Step 4: Process sales data with formulas
    const salesStartRow = usersData.length + 3
    await robot.populateRange(
      { start: { row: salesStartRow, col: 0 }, end: { row: salesStartRow + salesData.length, col: 4 } },
      salesData.map((sale, index) => [
        sale.id,
        sale.product,
        sale.quantity,
        sale.price,
        '' // Will be calculated by formula
      ])
    )

    // Add total calculation formulas
    for (let i = 0; i < salesData.length; i++) {
      await robot.executeFormula(
        `=C${salesStartRow + i + 1}*D${salesStartRow + i + 1}`, // quantity * price
        { row: salesStartRow + i, col: 4 }
      )
    }

    // Step 5: Add summary formulas
    const summaryRow = salesStartRow + salesData.length + 2
    await robot.setCellContent({ row: summaryRow, col: 3 }, 'Total Sales:')
    await robot.executeFormula(
      `SUM(E${salesStartRow + 1}:E${salesStartRow + salesData.length})`,
      { row: summaryRow, col: 4 }
    )

    // Commit transaction
    await robot.commitTransaction(txId)
    console.log('Data import automation completed successfully')

  } catch (error) {
    // Rollback on any error
    await robot.rollbackTransaction(txId)
    console.error('Data import failed, rolled back:', error)
    throw error
  }
}
```

### Real-time Data Synchronization

```typescript
async function setupRealTimeSync() {
  const robot = new RobotInput({
    editor: tiptapEditor,
    batchSize: 50,
    enableTransactions: false // Real-time updates don't need transactions
  })

  // WebSocket connection for real-time data
  const ws = new WebSocket('wss://api.example.com/realtime')

  ws.onmessage = async (event) => {
    const update = JSON.parse(event.data)

    switch (update.type) {
      case 'cell_update':
        await robot.setCellContent(
          update.position,
          update.value,
          { source: 'realtime', timestamp: Date.now() }
        )
        break

      case 'range_update':
        const operations = update.changes.map(change => ({
          id: `rt_${Date.now()}_${Math.random()}`,
          type: 'update' as const,
          data: {
            position: change.position,
            content: change.value,
            metadata: { source: 'realtime' }
          },
          timestamp: Date.now()
        }))
        await robot.executeBatch(operations)
        break

      case 'formula_recalc':
        for (const formula of update.formulas) {
          await robot.executeFormula(
            formula.expression,
            formula.targetCell
          )
        }
        break
    }
  }

  // Periodic data refresh
  setInterval(async () => {
    try {
      const freshData = await fetch('https://api.example.com/dashboard-data')
        .then(r => r.json())

      // Update specific ranges with fresh data
      await robot.populateFromAPI(
        { url: 'https://api.example.com/metrics' },
        { start: { row: 0, col: 10 }, end: { row: 5, col: 15 } },
        (data) => data.metrics.map((metric, index) => ({
          position: { row: index, col: 10 },
          content: metric.value,
          metadata: {
            label: metric.name,
            lastUpdated: Date.now()
          }
        }))
      )
    } catch (error) {
      console.error('Periodic refresh failed:', error)
    }
  }, 30000) // Every 30 seconds
}
```

This comprehensive RobotInput class provides a robust foundation for automating Tiptap table operations with support for batch processing, transactions, formulas, data pipelines, and async operations. The implementation can be extended further based on specific use cases and requirements.