# Tiptap Tables Documentation: Comprehensive Guide

## Overview

HTML tables are a common way to display data in web applications. Tiptap provides comprehensive table support through individual extensions or the convenient TableKit bundle. This guide covers everything you need to implement tables in your Tiptap editor.

## 1. How to Import Tiptap Table Dependencies

### Option 1: Using TableKit (Recommended)

TableKit is a bundled extension that includes all necessary table-related extensions:

```bash
npm install @tiptap/extension-table
```

```typescript
import { Editor } from '@tiptap/core'
import { TableKit } from '@tiptap/extension-table'

const editor = new Editor({
  extensions: [TableKit],
  content: '<p>Your content here</p>'
})
```

### Option 2: Individual Table Extensions

For more granular control, you can import individual table extensions:

```bash
npm install @tiptap/extension-table
```

```typescript
import { Editor } from '@tiptap/core'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'

const editor = new Editor({
  extensions: [
    Table,
    TableRow,
    TableHeader,
    TableCell,
  ],
})
```

## 2. How to Set Up Tables in the Editor

### Basic Setup with TableKit

```typescript
import { Editor } from '@tiptap/core'
import { TableKit } from '@tiptap/extension-table'

const editor = new Editor({
  element: document.querySelector('.editor'),
  extensions: [
    TableKit,
    // ... other extensions
  ],
  content: `
    <p>Welcome to the editor with table support!</p>
  `
})
```

### Advanced Setup with Configuration

```typescript
import { Editor } from '@tiptap/core'
import { TableKit } from '@tiptap/extension-table'

const editor = new Editor({
  element: document.querySelector('.editor'),
  extensions: [
    TableKit.configure({
      // Configure the Table extension
      table: {
        resizable: true,
        handleWidth: 5,
        cellMinWidth: 25,
        lastColumnResizable: true,
        allowTableNodeSelection: false,
        HTMLAttributes: {
          class: 'custom-table',
        },
      },
      // Configure TableCell
      tableCell: {
        HTMLAttributes: {
          class: 'custom-cell',
        },
      },
      // Configure TableHeader
      tableHeader: {
        HTMLAttributes: {
          class: 'custom-header',
        },
      },
      // Disable specific extensions if needed
      // tableRow: false,
    }),
  ],
})
```

### Individual Extension Setup

```typescript
import { Editor } from '@tiptap/core'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'

const editor = new Editor({
  extensions: [
    Table.configure({
      resizable: true,
      HTMLAttributes: {
        class: 'my-custom-table',
      },
    }),
    TableRow.configure({
      HTMLAttributes: {
        class: 'table-row',
      },
    }),
    TableHeader.configure({
      HTMLAttributes: {
        class: 'table-header',
      },
    }),
    TableCell.configure({
      HTMLAttributes: {
        class: 'table-cell',
      },
    }),
  ],
})
```

## 3. How to Generate Default Table Format

### Creating a Default Table

The default table is a 3x3 grid with a header row:

```typescript
// Insert a default table (3x3 with header)
editor.commands.insertTable()

// Or specify custom dimensions
editor.commands.insertTable({
  rows: 4,
  cols: 5,
  withHeaderRow: true
})

// Insert table without header row
editor.commands.insertTable({
  rows: 3,
  cols: 3,
  withHeaderRow: false
})
```

### Complete Table Creation Example

```typescript
import { Editor } from '@tiptap/core'
import { TableKit } from '@tiptap/extension-table'

// Create editor with table support
const editor = new Editor({
  element: document.querySelector('.editor'),
  extensions: [TableKit],
})

// Function to create a default table
function createDefaultTable() {
  editor.commands.insertTable({
    rows: 3,
    cols: 3,
    withHeaderRow: true
  })
}

// Function to create custom table
function createCustomTable(rows: number, cols: number, hasHeader: boolean = true) {
  editor.commands.insertTable({
    rows: rows,
    cols: cols,
    withHeaderRow: hasHeader
  })
}

// Usage examples
createDefaultTable() // 3x3 with header
createCustomTable(5, 4, false) // 5x4 without header
```

## 4. Table Configuration Options

### Complete Configuration Interface

```typescript
interface TableOptions {
  // HTML attributes for the table element
  HTMLAttributes: Record<string, any>

  // Enable table resizing
  resizable: boolean // default: false

  // Handle width for resizing
  handleWidth: number // default: 5

  // Minimum cell width
  cellMinWidth: number // default: 25

  // Allow resizing of last column
  lastColumnResizable: boolean // default: true

  // Allow table node selection
  allowTableNodeSelection: boolean // default: false

  // Render wrapper div around table
  renderWrapper: boolean // default: false
}
```

### Example with All Options

```typescript
const editor = new Editor({
  extensions: [
    TableKit.configure({
      table: {
        HTMLAttributes: {
          class: 'editor-table',
          'data-testid': 'table',
        },
        resizable: true,
        handleWidth: 8,
        cellMinWidth: 50,
        lastColumnResizable: true,
        allowTableNodeSelection: true,
        renderWrapper: true,
      },
    }),
  ],
})
```

## 5. Table Commands and API

### Row Operations

```typescript
// Add rows
editor.commands.addRowBefore()
editor.commands.addRowAfter()

// Delete current row
editor.commands.deleteRow()
```

### Column Operations

```typescript
// Add columns
editor.commands.addColumnBefore()
editor.commands.addColumnAfter()

// Delete current column
editor.commands.deleteColumn()
```

### Cell Operations

```typescript
// Merge cells
editor.commands.mergeCells()

// Split cell
editor.commands.splitCell()

// Set cell attributes
editor.commands.setCellAttribute('backgroundColor', '#f0f0f0')
editor.commands.setCellAttribute('customAttribute', 'value')

// Navigation
editor.commands.goToNextCell()
editor.commands.goToPreviousCell()
```

### Header Operations

```typescript
// Toggle headers
editor.commands.toggleHeaderRow()
editor.commands.toggleHeaderColumn()
editor.commands.toggleHeaderCell()
```

### Table Management

```typescript
// Delete entire table
editor.commands.deleteTable()
```

## 6. Styling and CSS

### Basic Table Styles

```css
/* Basic table styling */
.ProseMirror table {
  border-collapse: collapse;
  table-layout: fixed;
  width: 100%;
  margin: 0;
  overflow: hidden;
}

.ProseMirror table td,
.ProseMirror table th {
  min-width: 1em;
  border: 1px solid #ced4da;
  padding: 3px 5px;
  vertical-align: top;
  box-sizing: border-box;
  position: relative;
}

.ProseMirror table th {
  font-weight: bold;
  text-align: left;
  background-color: #f1f3f4;
}

/* Selected cells */
.ProseMirror .selectedCell:after {
  z-index: 2;
  position: absolute;
  content: "";
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(200, 200, 255, 0.4);
  pointer-events: none;
}

/* Column resize handle */
.ProseMirror .column-resize-handle {
  position: absolute;
  right: -2px;
  top: 0;
  bottom: -2px;
  width: 4px;
  background-color: #adf;
  pointer-events: none;
}
```

### Custom Table Themes

```typescript
// Professional theme
const professionalTableConfig = {
  HTMLAttributes: {
    class: 'professional-table',
  },
}

// Minimal theme
const minimalTableConfig = {
  HTMLAttributes: {
    class: 'minimal-table',
  },
}

// Usage
const editor = new Editor({
  extensions: [
    TableKit.configure({
      table: professionalTableConfig,
      tableCell: {
        HTMLAttributes: {
          class: 'professional-cell',
        },
      },
    }),
  ],
})
```

```css
/* Professional theme */
.professional-table {
  border: 2px solid #333;
  border-radius: 8px;
  overflow: hidden;
}

.professional-table td,
.professional-table th {
  border: 1px solid #ddd;
  padding: 12px;
}

.professional-table th {
  background: linear-gradient(to bottom, #f7f7f7, #e7e7e7);
  font-weight: 600;
}

/* Minimal theme */
.minimal-table {
  border: none;
}

.minimal-table td,
.minimal-table th {
  border: none;
  border-bottom: 1px solid #eee;
  padding: 8px 12px;
}

.minimal-table th {
  background: none;
  font-weight: 500;
  border-bottom: 2px solid #333;
}
```

## 7. Complete Working Example

```typescript
import { Editor } from '@tiptap/core'
import { TableKit } from '@tiptap/extension-table'
import StarterKit from '@tiptap/starter-kit'

// Create the editor
const editor = new Editor({
  element: document.querySelector('.editor'),
  extensions: [
    StarterKit,
    TableKit.configure({
      table: {
        resizable: true,
        HTMLAttributes: {
          class: 'my-table',
        },
      },
    }),
  ],
  content: `
    <h2>Tables in Tiptap</h2>
    <p>This editor supports tables with the following features:</p>
    <ul>
      <li>Add and remove rows/columns</li>
      <li>Merge and split cells</li>
      <li>Toggle header rows/columns</li>
      <li>Resize columns</li>
    </ul>
  `,
})

// Utility functions for table operations
const tableUtils = {
  insertTable: (rows = 3, cols = 3, withHeader = true) => {
    editor.commands.insertTable({ rows, cols, withHeaderRow: withHeader })
  },

  addRow: (before = false) => {
    if (before) {
      editor.commands.addRowBefore()
    } else {
      editor.commands.addRowAfter()
    }
  },

  addColumn: (before = false) => {
    if (before) {
      editor.commands.addColumnBefore()
    } else {
      editor.commands.addColumnAfter()
    }
  },

  deleteRow: () => editor.commands.deleteRow(),
  deleteColumn: () => editor.commands.deleteColumn(),
  deleteTable: () => editor.commands.deleteTable(),

  mergeCells: () => editor.commands.mergeCells(),
  splitCell: () => editor.commands.splitCell(),

  toggleHeaderRow: () => editor.commands.toggleHeaderRow(),
  toggleHeaderColumn: () => editor.commands.toggleHeaderColumn(),
}

// Example usage
tableUtils.insertTable(4, 3, true) // Insert 4x3 table with header
```

## 8. Advanced Features

### Custom Cell Attributes

```typescript
// Set background color
editor.commands.setCellAttribute('style', 'background-color: #ffeb3b')

// Set custom data attributes
editor.commands.setCellAttribute('data-priority', 'high')

// Set CSS classes
editor.commands.setCellAttribute('class', 'highlighted-cell important')
```

### Table Event Handling

```typescript
editor.on('selectionUpdate', ({ editor }) => {
  const { selection } = editor.state
  // Check if cursor is in a table
  const inTable = selection.$anchor.parent.type.name === 'tableCell' ||
                  selection.$anchor.parent.type.name === 'tableHeader'

  if (inTable) {
    console.log('Cursor is in a table')
    // Enable table-specific UI
  }
})
```

This comprehensive guide covers all aspects of implementing tables in Tiptap, from basic setup to advanced customization. The examples provided are ready to use and can be adapted to your specific requirements.