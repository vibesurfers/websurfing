# Tiptap Table Extensions - Comprehensive Guide

## Overview

Tiptap's table functionality is built on top of ProseMirror's table module and provides a comprehensive set of extensions for creating and manipulating tables. The table system consists of four main extensions: Table, TableRow, TableCell, and TableHeader.

## Installation

```typescript
import { Editor } from '@tiptap/core'
import { TableKit } from '@tiptap/extension-table'

// Option 1: Install complete TableKit (recommended)
new Editor({
  extensions: [TableKit],
})

// Option 2: Install individual components
import { Table } from '@tiptap/extension-table/table'
import { TableRow } from '@tiptap/extension-table/row'
import { TableCell } from '@tiptap/extension-table/cell'
import { TableHeader } from '@tiptap/extension-table/header'

new Editor({
  extensions: [Table, TableRow, TableCell, TableHeader],
})
```

## 1. How to Identify/Read Content from a Table Cell

### Basic Cell Content Reading

```typescript
import { findParentNode } from '@tiptap/core'
import { Node } from '@tiptap/pm/model'

// Get current cell node
function getCurrentCell(editor: Editor): Node | null {
  const { selection } = editor.state
  const cell = findParentNode(node => node.type.name === 'tableCell')(selection)

  if (cell) {
    return cell.node
  }
  return null
}

// Read cell text content
function getCellTextContent(editor: Editor): string {
  const cell = getCurrentCell(editor)
  return cell ? cell.textContent : ''
}

// Read cell HTML content
function getCellHTMLContent(editor: Editor): string {
  const { selection } = editor.state
  const cell = findParentNode(node => node.type.name === 'tableCell')(selection)

  if (cell) {
    const fragment = cell.node.content
    return editor.schema.nodeFromJSON({
      type: 'doc',
      content: [{ type: 'paragraph', content: fragment.toJSON() }]
    }).toDOM().innerHTML
  }
  return ''
}
```

### Advanced Cell Identification with TableMap

```typescript
import { TableMap } from '@tiptap/prosemirror-tables'

// Get cell at specific row/column coordinates
function getCellAt(editor: Editor, row: number, col: number): { node: Node; pos: number } | null {
  const { doc } = editor.state
  const table = findParentNode(node => node.type.name === 'table')(editor.state.selection)

  if (!table) return null

  try {
    const map = TableMap.get(table.node)
    const cellPos = map.positionAt(row, col, table.node)
    const $cellPos = doc.resolve(table.pos + cellPos)
    const cellNode = $cellPos.nodeAfter

    if (cellNode && cellNode.type.name === 'tableCell') {
      return { node: cellNode, pos: table.pos + cellPos }
    }
  } catch (error) {
    console.warn('Invalid cell coordinates:', { row, col })
  }

  return null
}

// Get all cells in a table
function getAllCells(editor: Editor): Array<{ node: Node; pos: number; row: number; col: number }> {
  const { doc } = editor.state
  const table = findParentNode(node => node.type.name === 'table')(editor.state.selection)

  if (!table) return []

  const cells: Array<{ node: Node; pos: number; row: number; col: number }> = []
  const map = TableMap.get(table.node)

  for (let row = 0; row < map.height; row++) {
    for (let col = 0; col < map.width; col++) {
      const cellPos = map.positionAt(row, col, table.node)
      const $cellPos = doc.resolve(table.pos + cellPos)
      const cellNode = $cellPos.nodeAfter

      if (cellNode && cellNode.type.name === 'tableCell') {
        cells.push({ node: cellNode, pos: table.pos + cellPos, row, col })
      }
    }
  }

  return cells
}
```

### Cell Attribute Reading

```typescript
// Read cell attributes
function getCellAttributes(editor: Editor): Record<string, any> {
  const cell = getCurrentCell(editor)
  return cell ? cell.attrs : {}
}

// Get specific attribute
function getCellAttribute(editor: Editor, attributeName: string): any {
  const cell = getCurrentCell(editor)
  return cell ? cell.attrs[attributeName] : undefined
}
```

## 2. Default Hooks Available on Cell Change

Tiptap doesn't provide built-in cell change hooks, but you can implement them using transactions and plugins:

### Transaction-based Cell Change Detection

```typescript
import { Plugin, PluginKey } from '@tiptap/pm/state'

const cellChangePluginKey = new PluginKey('cellChangeDetection')

const CellChangePlugin = new Plugin({
  key: cellChangePluginKey,
  state: {
    init() {
      return { lastCellContent: new Map() }
    },
    apply(tr, value) {
      // Track cell content changes
      if (tr.docChanged) {
        const newCellContent = new Map()

        // Scan for table cells and track their content
        tr.doc.descendants((node, pos) => {
          if (node.type.name === 'tableCell') {
            const cellId = `${pos}-${node.textContent}`
            newCellContent.set(pos, node.textContent)

            // Check if content changed
            if (value.lastCellContent.has(pos) &&
                value.lastCellContent.get(pos) !== node.textContent) {
              // Cell content changed - trigger custom event
              console.log('Cell changed at position:', pos, 'New content:', node.textContent)
            }
          }
        })

        return { lastCellContent: newCellContent }
      }

      return value
    }
  }
})

// Add to editor
const editor = new Editor({
  extensions: [
    TableKit,
    // Add the plugin
    Extension.create({
      name: 'cellChangeDetection',
      addProseMirrorPlugins() {
        return [CellChangePlugin]
      }
    })
  ]
})
```

### Custom Cell Change Handler

```typescript
// Create a custom extension with cell change detection
const TableCellWithChangeDetection = TableCell.extend({
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('tableCellChangeHandler'),
        appendTransaction(transactions, oldState, newState) {
          const cellChanges: Array<{
            pos: number,
            oldContent: string,
            newContent: string,
            row: number,
            col: number
          }> = []

          // Compare old and new states to detect cell changes
          oldState.doc.descendants((oldNode, oldPos) => {
            if (oldNode.type.name === 'tableCell') {
              const newNode = newState.doc.nodeAt(oldPos)

              if (newNode && newNode.textContent !== oldNode.textContent) {
                // Find table position to calculate row/col
                const table = findParentNode(node => node.type.name === 'table')(
                  newState.doc.resolve(oldPos)
                )

                if (table) {
                  const map = TableMap.get(table.node)
                  const relativePos = oldPos - table.pos - 1
                  const cellRect = map.findCell(relativePos)

                  cellChanges.push({
                    pos: oldPos,
                    oldContent: oldNode.textContent,
                    newContent: newNode.textContent,
                    row: cellRect.top,
                    col: cellRect.left
                  })
                }
              }
            }
          })

          // Process cell changes
          if (cellChanges.length > 0) {
            this.onCellChange?.(cellChanges)
          }

          return null
        }
      })
    ]
  },

  addOptions() {
    return {
      onCellChange: null as ((changes: any[]) => void) | null
    }
  }
})
```

## 3. How to Set Cell Values Programmatically

### Basic Cell Content Setting

```typescript
// Set cell content using selection
function setCellContent(editor: Editor, content: string): boolean {
  const { selection } = editor.state
  const cell = findParentNode(node => node.type.name === 'tableCell')(selection)

  if (cell) {
    const cellStart = cell.pos + 1
    const cellEnd = cell.pos + cell.node.nodeSize - 1

    editor.chain()
      .setTextSelection({ from: cellStart, to: cellEnd })
      .insertContent(content)
      .run()

    return true
  }

  return false
}

// Set cell content at specific coordinates
function setCellContentAt(editor: Editor, row: number, col: number, content: string): boolean {
  const cellInfo = getCellAt(editor, row, col)

  if (cellInfo) {
    const cellStart = cellInfo.pos + 1
    const cellEnd = cellInfo.pos + cellInfo.node.nodeSize - 1

    editor.chain()
      .setTextSelection({ from: cellStart, to: cellEnd })
      .insertContent(content)
      .run()

    return true
  }

  return false
}

// Set structured content (with formatting)
function setCellStructuredContent(editor: Editor, content: any): boolean {
  const { selection } = editor.state
  const cell = findParentNode(node => node.type.name === 'tableCell')(selection)

  if (cell) {
    const cellStart = cell.pos + 1
    const cellEnd = cell.pos + cell.node.nodeSize - 1

    editor.chain()
      .setTextSelection({ from: cellStart, to: cellEnd })
      .setContent(content)
      .run()

    return true
  }

  return false
}
```

### Advanced Cell Manipulation Commands

```typescript
// Custom commands for cell manipulation
const CustomTableCommands = Extension.create({
  name: 'customTableCommands',

  addCommands() {
    return {
      setCellValue: (row: number, col: number, value: string) => ({ editor, commands }) => {
        return setCellContentAt(editor, row, col, value)
      },

      setCellHTML: (row: number, col: number, html: string) => ({ editor }) => {
        const cellInfo = getCellAt(editor, row, col)

        if (cellInfo) {
          const cellStart = cellInfo.pos + 1
          const cellEnd = cellInfo.pos + cellInfo.node.nodeSize - 1

          editor.chain()
            .setTextSelection({ from: cellStart, to: cellEnd })
            .insertContent(html)
            .run()

          return true
        }

        return false
      },

      clearCell: (row: number, col: number) => ({ editor }) => {
        return setCellContentAt(editor, row, col, '')
      },

      copyCellContent: (fromRow: number, fromCol: number, toRow: number, toCol: number) => ({ editor }) => {
        const sourceCell = getCellAt(editor, fromRow, fromCol)

        if (sourceCell) {
          const content = sourceCell.node.textContent
          return setCellContentAt(editor, toRow, toCol, content)
        }

        return false
      }
    }
  }
})
```

## 4. How to Implement checkCellIsEmpty() Function

### Basic Implementation

```typescript
// Simple text-based empty check
function checkCellIsEmpty(cellNode: Node): boolean {
  return !cellNode.textContent || cellNode.textContent.trim().length === 0
}

// Check current selected cell
function checkCurrentCellIsEmpty(editor: Editor): boolean {
  const cell = getCurrentCell(editor)
  return cell ? checkCellIsEmpty(cell) : true
}

// Check cell at specific coordinates
function checkCellIsEmptyAt(editor: Editor, row: number, col: number): boolean {
  const cellInfo = getCellAt(editor, row, col)
  return cellInfo ? checkCellIsEmpty(cellInfo.node) : true
}
```

### Advanced Implementation with Content Analysis

```typescript
// More sophisticated empty check considering formatting
function checkCellIsEmptyAdvanced(cellNode: Node): boolean {
  // Check if cell has no content
  if (cellNode.childCount === 0) {
    return true
  }

  // Check if cell only contains empty paragraphs
  let hasContent = false

  cellNode.descendants((node) => {
    if (node.type.name === 'text' && node.text && node.text.trim().length > 0) {
      hasContent = true
      return false // Stop iteration
    }

    // Check for non-text content like images, etc.
    if (node.type.name !== 'paragraph' && node.type.name !== 'text') {
      hasContent = true
      return false // Stop iteration
    }
  })

  return !hasContent
}

// Check if cell contains only whitespace or empty formatting
function isCellEffectivelyEmpty(cellNode: Node): boolean {
  // Get plain text content
  const textContent = cellNode.textContent

  // Check for empty text
  if (!textContent || textContent.trim().length === 0) {
    // Also check if there are any non-text nodes
    let hasNonTextContent = false

    cellNode.descendants((node) => {
      if (node.type.name !== 'paragraph' &&
          node.type.name !== 'text' &&
          node.type.name !== 'hardBreak') {
        hasNonTextContent = true
        return false
      }
    })

    return !hasNonTextContent
  }

  return false
}
```

### Utility Functions for Cell State

```typescript
// Comprehensive cell analysis
interface CellAnalysis {
  isEmpty: boolean
  textLength: number
  wordCount: number
  hasFormatting: boolean
  hasImages: boolean
  hasLinks: boolean
}

function analyzeCellContent(cellNode: Node): CellAnalysis {
  const textContent = cellNode.textContent
  const analysis: CellAnalysis = {
    isEmpty: !textContent || textContent.trim().length === 0,
    textLength: textContent.length,
    wordCount: textContent.trim().split(/\s+/).filter(word => word.length > 0).length,
    hasFormatting: false,
    hasImages: false,
    hasLinks: false
  }

  cellNode.descendants((node) => {
    if (node.type.name === 'image') {
      analysis.hasImages = true
    }

    if (node.type.name === 'link') {
      analysis.hasLinks = true
    }

    if (node.marks && node.marks.length > 0) {
      analysis.hasFormatting = true
    }
  })

  return analysis
}
```

## 5. All Table-Related Commands and Methods

### Built-in Table Commands

```typescript
// Table structure commands
editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: false })
editor.commands.deleteTable()

// Row operations
editor.commands.addRowBefore()
editor.commands.addRowAfter()
editor.commands.deleteRow()

// Column operations
editor.commands.addColumnBefore()
editor.commands.addColumnAfter()
editor.commands.deleteColumn()

// Cell operations
editor.commands.mergeCells()
editor.commands.splitCell()
editor.commands.setCellAttribute('backgroundColor', '#000')
editor.commands.toggleHeaderCell()
editor.commands.toggleHeaderColumn()
editor.commands.toggleHeaderRow()

// Navigation
editor.commands.goToNextCell()
editor.commands.goToPreviousCell()
```

### Advanced Table Manipulation

```typescript
// Custom table utility class
class TiptapTableUtils {
  constructor(private editor: Editor) {}

  // Get table dimensions
  getTableDimensions(): { rows: number; cols: number } | null {
    const table = findParentNode(node => node.type.name === 'table')(this.editor.state.selection)

    if (table) {
      const map = TableMap.get(table.node)
      return { rows: map.height, cols: map.width }
    }

    return null
  }

  // Get all table data as 2D array
  getTableData(): string[][] {
    const table = findParentNode(node => node.type.name === 'table')(this.editor.state.selection)

    if (!table) return []

    const map = TableMap.get(table.node)
    const data: string[][] = []

    for (let row = 0; row < map.height; row++) {
      data[row] = []
      for (let col = 0; col < map.width; col++) {
        const cellInfo = getCellAt(this.editor, row, col)
        data[row][col] = cellInfo ? cellInfo.node.textContent : ''
      }
    }

    return data
  }

  // Set entire table data
  setTableData(data: string[][]): boolean {
    const dimensions = this.getTableDimensions()

    if (!dimensions || data.length !== dimensions.rows) {
      return false
    }

    for (let row = 0; row < data.length; row++) {
      for (let col = 0; col < data[row].length; col++) {
        setCellContentAt(this.editor, row, col, data[row][col])
      }
    }

    return true
  }

  // Find cells matching criteria
  findCells(predicate: (content: string, row: number, col: number) => boolean): Array<{ row: number; col: number; content: string }> {
    const results: Array<{ row: number; col: number; content: string }> = []
    const dimensions = this.getTableDimensions()

    if (!dimensions) return results

    for (let row = 0; row < dimensions.rows; row++) {
      for (let col = 0; col < dimensions.cols; col++) {
        const cellInfo = getCellAt(this.editor, row, col)
        const content = cellInfo ? cellInfo.node.textContent : ''

        if (predicate(content, row, col)) {
          results.push({ row, col, content })
        }
      }
    }

    return results
  }

  // Get empty cells
  getEmptyCells(): Array<{ row: number; col: number }> {
    return this.findCells((content) => !content.trim()).map(({ row, col }) => ({ row, col }))
  }

  // Resize table
  resizeTable(newRows: number, newCols: number): boolean {
    const currentDimensions = this.getTableDimensions()

    if (!currentDimensions) return false

    // Add/remove rows
    const rowDiff = newRows - currentDimensions.rows
    if (rowDiff > 0) {
      for (let i = 0; i < rowDiff; i++) {
        this.editor.commands.addRowAfter()
      }
    } else if (rowDiff < 0) {
      for (let i = 0; i < Math.abs(rowDiff); i++) {
        this.editor.commands.deleteRow()
      }
    }

    // Add/remove columns
    const colDiff = newCols - currentDimensions.cols
    if (colDiff > 0) {
      for (let i = 0; i < colDiff; i++) {
        this.editor.commands.addColumnAfter()
      }
    } else if (colDiff < 0) {
      for (let i = 0; i < Math.abs(colDiff); i++) {
        this.editor.commands.deleteColumn()
      }
    }

    return true
  }
}

// Usage
const tableUtils = new TiptapTableUtils(editor)
const tableData = tableUtils.getTableData()
const emptyCells = tableUtils.getEmptyCells()
```

### Selection and Navigation Commands

```typescript
// Cell selection utilities
import { CellSelection } from '@tiptap/prosemirror-tables'

const TableSelectionCommands = Extension.create({
  name: 'tableSelectionCommands',

  addCommands() {
    return {
      selectCell: (row: number, col: number) => ({ state, dispatch }) => {
        const cellInfo = getCellAt(this.editor, row, col)

        if (cellInfo && dispatch) {
          const cellStart = cellInfo.pos + 1
          const selection = new CellSelection(state.doc.resolve(cellStart))
          dispatch(state.tr.setSelection(selection))
          return true
        }

        return false
      },

      selectRow: (row: number) => ({ state, dispatch }) => {
        const table = findParentNode(node => node.type.name === 'table')(state.selection)

        if (table && dispatch) {
          const map = TableMap.get(table.node)
          const firstCellPos = map.positionAt(row, 0, table.node)
          const $firstCell = state.doc.resolve(table.pos + firstCellPos)
          const rowSelection = CellSelection.rowSelection($firstCell)
          dispatch(state.tr.setSelection(rowSelection))
          return true
        }

        return false
      },

      selectColumn: (col: number) => ({ state, dispatch }) => {
        const table = findParentNode(node => node.type.name === 'table')(state.selection)

        if (table && dispatch) {
          const map = TableMap.get(table.node)
          const firstCellPos = map.positionAt(0, col, table.node)
          const $firstCell = state.doc.resolve(table.pos + firstCellPos)
          const colSelection = CellSelection.colSelection($firstCell)
          dispatch(state.tr.setSelection(colSelection))
          return true
        }

        return false
      }
    }
  }
})
```

## Configuration Options

### Table Extension Configuration

```typescript
const editor = new Editor({
  extensions: [
    Table.configure({
      HTMLAttributes: {
        class: 'my-custom-table',
      },
      resizable: true,
      handleWidth: 5,
      cellMinWidth: 25,
      lastColumnResizable: true,
      allowTableNodeSelection: true,
    }),
    TableRow.configure({
      HTMLAttributes: {
        class: 'my-table-row',
      },
    }),
    TableCell.configure({
      HTMLAttributes: {
        class: 'my-table-cell',
      },
    }),
    TableHeader.configure({
      HTMLAttributes: {
        class: 'my-table-header',
      },
    }),
  ],
})
```

This comprehensive guide covers all aspects of working with Tiptap table extensions, from basic cell operations to advanced table manipulation techniques. The examples are written in TypeScript and provide practical implementations for common table operations.