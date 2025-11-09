'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableCell } from '@tiptap/extension-table-cell'
import { api } from "@/trpc/react"
import { useCallback, useRef, useEffect, useState, useContext, createContext } from 'react'

interface SheetUpdateContextType {
  lastUpdate: Date | null;
  pendingUpdates: number;
  selectedSheetId: string | null;
}

const SheetUpdateContext = createContext<SheetUpdateContextType | null>(null);

function useSheetUpdates() {
  const context = useContext(SheetUpdateContext);
  if (!context) {
    return { lastUpdate: null, pendingUpdates: 0, selectedSheetId: null };
  }
  return context;
}

const initialContent = `
  <table>
    <tbody>
      <tr><td>Cell 1</td><td>Cell 2</td></tr>
      <tr><td></td><td></td></tr>
      <tr><td></td><td></td></tr>
      <tr><td></td><td></td></tr>
      <tr><td></td><td></td></tr>
      <tr><td></td><td></td></tr>
      <tr><td></td><td></td></tr>
      <tr><td></td><td></td></tr>
    </tbody>
  </table>
`

interface TiptapTableProps {
  treatRobotsAsHumans: boolean
  sheetId: string
}

export function TiptapTable({ treatRobotsAsHumans, sheetId }: TiptapTableProps) {
  const { lastUpdate } = useSheetUpdates()
  const isApplyingRobotUpdates = useRef(false)
  const [columnCount, setColumnCount] = useState(2)
  const [columnTitles, setColumnTitles] = useState<string[]>([])

  const utils = api.useUtils()

  const updateCell = api.cell.updateCell.useMutation({
    onError: (error) => {
      console.error('Failed to update cell:', error.message);
      if (error.data?.code === 'UNAUTHORIZED') {
        console.error('User not authenticated - please refresh the page');
      }
    }
  })

  const clearCell = api.cell.clearCell.useMutation({
    onError: (error) => {
      console.error('Failed to clear cell:', error.message);
      if (error.data?.code === 'UNAUTHORIZED') {
        console.error('User not authenticated - please refresh the page');
      }
    }
  })

  // Fetch cells from the database
  const { data: cells, refetch: refetchCells } = api.cell.getCells.useQuery(
    { sheetId },
    {
      refetchInterval: false,
      retry: (failureCount, error) => {
        if (error.data?.code === 'UNAUTHORIZED') return false;
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
    }
  )

  const { data: events, refetch, error: eventsError } = api.cell.getEvents.useQuery(
    { sheetId },
    {
      refetchInterval: false,
      retry: (failureCount, error) => {
        if (error.data?.code === 'UNAUTHORIZED') return false;
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
    }
  )

  const { data: columns } = api.sheet.getColumns.useQuery(
    { sheetId },
    {
      refetchInterval: false,
      retry: (failureCount, error) => {
        if (error.data?.code === 'UNAUTHORIZED') return false;
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
    }
  )

  useEffect(() => {
    if (events) {
      console.log(`[TiptapTable] Received ${events.length} events for sheetId: ${sheetId}`)
    }
  }, [events, sheetId])

  useEffect(() => {
    if (columns && columns.length > 0) {
      const titles = columns.map(col => col.title)
      setColumnTitles(titles)
      setColumnCount(titles.length)
    }
  }, [columns])

  // Debounce mechanism - only fire events after user stops typing
  const debounceRefs = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const lastContentRef = useRef<Map<string, string>>(new Map())

  const debouncedCellUpdate = useCallback((content: string, rowIndex: number, colIndex: number) => {
    const cellKey = `${rowIndex}-${colIndex}`

    // Capture whether this is a robot update at the time of the call
    const isRobotUpdate = isApplyingRobotUpdates.current

    // Clear existing timeout for this specific cell
    const existingTimeout = debounceRefs.current.get(cellKey)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // If this is a robot update and we're not treating robots as humans, skip creating event
    // But still update the content tracking so we know what's in the cell
    if (isRobotUpdate && !treatRobotsAsHumans) {
      console.log(`Skipping robot update event for (${rowIndex}, ${colIndex}) - treatRobotsAsHumans is false`)
      lastContentRef.current.set(cellKey, content)
      return
    }

    // Set new timeout for this specific cell
    const timeout = setTimeout(() => {
      const lastContent = lastContentRef.current.get(cellKey)

      // Check if content actually changed
      if (content !== lastContent && content !== 'Cell 1' && content !== 'Cell 2') {

        // If content is empty, user deleted the cell content
        if (!content || content === '') {
          console.log(`User deleted content at (${rowIndex}, ${colIndex})`)
          lastContentRef.current.set(cellKey, '')

          // Clear the cell and any pending events for it
          clearCell.mutate({
            sheetId,
            rowIndex,
            colIndex,
          })
        } else {
          // Normal update with content
          const updateSource = isRobotUpdate ? 'robot' : 'user'
          console.log(`Creating ${updateSource} cell update event at (${rowIndex}, ${colIndex}): "${content}"`)
          lastContentRef.current.set(cellKey, content)
          updateCell.mutate({
            sheetId,
            rowIndex,
            colIndex,
            content,
          })
        }
      } else {
        console.log(`Skipping cell update - no change or filtered`)
      }

      // Clean up the timeout reference
      debounceRefs.current.delete(cellKey)
    }, 1000) // Wait 1 second after user stops typing

    debounceRefs.current.set(cellKey, timeout)
  }, [updateCell, clearCell, treatRobotsAsHumans, sheetId])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: initialContent,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      // Parse table and extract actual cell contents
      const html = editor.getHTML()

      // Parse the HTML to find table cells with content
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')
      const tbody = doc.querySelector('tbody')
      if (!tbody) return

      const rows = tbody.querySelectorAll('tr')

      // Update column count based on first row (only if no columns from DB)
      if (rows[0] && columnTitles.length === 0) {
        const cellCount = rows[0].querySelectorAll('td').length
        setColumnCount(cellCount)
      }

      rows.forEach((row, rowIndex) => {
        const cells = row.querySelectorAll('td')
        cells.forEach((cell, colIndex) => {
          const content = cell.textContent?.trim() || ''
          // Use debounced update for all content changes
          debouncedCellUpdate(content, rowIndex, colIndex)
        })
      })
    },
  })

  // Refresh events and cells when sheet updates happen
  useEffect(() => {
    if (lastUpdate) {
      void refetch()
      void refetchCells()
    }
  }, [lastUpdate, refetch, refetchCells])

  // Ensure table has correct column count whenever columnCount changes
  useEffect(() => {
    if (!editor) return

    const html = editor.getHTML()
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const table = doc.querySelector('table')
    if (!table) return

    const tbody = table.querySelector('tbody') || table
    const allRows = tbody.querySelectorAll('tr')

    let hasChanges = false
    allRows.forEach(row => {
      // Add columns if needed
      while (row.children.length < columnCount) {
        const newCell = doc.createElement('td')
        row.appendChild(newCell)
        hasChanges = true
      }
      // Remove extra columns if any
      while (row.children.length > columnCount) {
        row.removeChild(row.lastChild!)
        hasChanges = true
      }
    })

    if (hasChanges) {
      isApplyingRobotUpdates.current = true
      const newHtml = table.outerHTML
      editor.commands.setContent(newHtml)
      isApplyingRobotUpdates.current = false
    }
  }, [columnCount, editor])

  // Clear editor and refetch when sheet changes
  useEffect(() => {
    if (!editor) return

    console.log(`[TiptapTable] Sheet changed to: ${sheetId}, clearing editor and refetching data`)

    // Reset editor to initial empty state
    editor.commands.setContent(initialContent)

    // Clear tracking refs
    lastContentRef.current.clear()
    debounceRefs.current.forEach(timeout => clearTimeout(timeout))
    debounceRefs.current.clear()

    // Invalidate and refetch queries for new sheet
    void utils.cell.getCells.invalidate({ sheetId })
    void utils.cell.getEvents.invalidate({ sheetId })
    void refetchCells()
    void refetch()
  }, [sheetId, editor, utils, refetchCells, refetch])

  // Apply cell updates to the editor when cells change
  useEffect(() => {
    if (!editor || !cells || cells.length === 0) return

    // Mark that we're applying robot updates
    isApplyingRobotUpdates.current = true

    // Parse current HTML and update only the cells that have new data from DB
    const html = editor.getHTML()
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const table = doc.querySelector('table')
    if (!table) {
      isApplyingRobotUpdates.current = false
      return
    }

    // Find max dimensions needed
    let maxRow = 0
    let maxCol = 0
    cells.forEach(cell => {
      maxRow = Math.max(maxRow, cell.rowIndex)
      maxCol = Math.max(maxCol, cell.colIndex)
    })

    const tbody = table.querySelector('tbody') || table
    const rows = tbody.querySelectorAll('tr')

    // Add rows if needed
    while (tbody.children.length <= maxRow) {
      const newRow = doc.createElement('tr')
      // Add cells to match the required column count
      for (let i = 0; i < columnCount; i++) {
        const newCell = doc.createElement('td')
        newRow.appendChild(newCell)
      }
      tbody.appendChild(newRow)
    }

    // Ensure all rows have exactly columnCount cells
    const allRows = tbody.querySelectorAll('tr')
    allRows.forEach(row => {
      // Add columns if needed
      while (row.children.length < columnCount) {
        const newCell = doc.createElement('td')
        row.appendChild(newCell)
      }
      // Remove extra columns if any
      while (row.children.length > columnCount) {
        row.removeChild(row.lastChild!)
      }
    })

    // Update cell contents from database
    let hasChanges = false
    cells.forEach(cell => {
      const row = tbody.children[cell.rowIndex] as HTMLTableRowElement
      if (row && row.children[cell.colIndex]) {
        const td = row.children[cell.colIndex] as HTMLTableCellElement
        const currentContent = td.textContent?.trim() || ''

        // Only update if this cell has new content from the database
        // and it's different from what's currently shown
        if (cell.content && cell.content !== currentContent) {
          // Check if this is a recently user-edited cell (within last 3 seconds)
          const cellKey = `${cell.rowIndex}-${cell.colIndex}`
          const lastEdit = lastContentRef.current.get(cellKey)

          // Skip if user just edited this cell
          if (lastEdit === cell.content || lastEdit === currentContent) {
            return
          }

          td.textContent = cell.content
          hasChanges = true
        }
      }
    })

    // Apply changes back to editor if any cells were updated
    if (hasChanges) {
      const newHtml = table.outerHTML
      editor.commands.setContent(newHtml)
    }

    // Done applying robot updates
    isApplyingRobotUpdates.current = false
  }, [cells, editor])

  const triggerProcessing = async () => {
    await fetch('/api/update-sheet', { method: 'POST' })
    // Refetch events and cells to see results
    void refetch()
    void refetchCells()
  }

  const downloadCSV = useCallback(() => {
    const csvRows: string[] = []

    // Add header row
    if (columnTitles.length > 0) {
      const headerRow = columnTitles.map(title => `"${title.replace(/"/g, '""')}"`).join(',')
      csvRows.push(headerRow)
    } else {
      const headerRow = Array.from({ length: columnCount }, (_, i) => `"Column ${i + 1}"`).join(',')
      csvRows.push(headerRow)
    }

    // Parse table and extract cell data
    if (editor) {
      const html = editor.getHTML()
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')
      const tbody = doc.querySelector('tbody')

      if (tbody) {
        const rows = tbody.querySelectorAll('tr')
        rows.forEach((row) => {
          const cells = row.querySelectorAll('td')
          const rowData = Array.from(cells).map(cell => {
            const content = cell.textContent?.trim() || ''
            return `"${content.replace(/"/g, '""')}"`
          })
          csvRows.push(rowData.join(','))
        })
      }
    }

    // Create CSV blob and download
    const csvContent = csvRows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', `sheet-${sheetId}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [editor, columnTitles, columnCount, sheetId])

  // Show error state if there's an auth issue
  if (eventsError?.data?.code === 'UNAUTHORIZED') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-semibold">Authentication Required</h3>
        <p className="text-red-600 mt-2">
          Please refresh the page to sign in and access the table.
        </p>
      </div>
    );
  }

  if (!editor) return null

  return (
    <div className="space-y-4">
      <div className="border rounded p-4">
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              {columnTitles.length > 0 ? (
                columnTitles.map((title, i) => (
                  <th
                    key={i}
                    className="bg-blue-100 border border-blue-300 text-center font-semibold text-xs text-blue-900"
                    style={{
                      padding: '8px 12px',
                      minWidth: '1em',
                      boxSizing: 'border-box'
                    }}
                  >
                    {title}
                  </th>
                ))
              ) : (
                Array.from({ length: columnCount }, (_, i) => (
                  <th
                    key={i}
                    className="bg-gray-100 border border-gray-300 text-center font-semibold text-xs text-gray-700"
                    style={{
                      padding: '4px 12px',
                      minWidth: '1em',
                      boxSizing: 'border-box'
                    }}
                  >
                    {i + 1}
                  </th>
                ))
              )}
            </tr>
          </thead>
        </table>
        <EditorContent editor={editor} />
        <style jsx global>{`
          .ProseMirror table {
            border-collapse: collapse;
            table-layout: fixed;
            width: 100%;
            margin: 0;
            overflow: hidden;
            margin-top: -1px;
          }

          .ProseMirror td {
            min-width: 1em;
            border: 1px solid #d1d5db;
            padding: 8px 12px;
            vertical-align: top;
            box-sizing: border-box;
            position: relative;
            min-height: 40px;
          }

          .ProseMirror td:first-child {
            border-left: 1px solid #d1d5db;
          }

          .ProseMirror td:last-child {
            border-right: 1px solid #d1d5db;
          }

          .ProseMirror tr:first-child td {
            border-top: 1px solid #d1d5db;
          }

          .ProseMirror tr:last-child td {
            border-bottom: 1px solid #d1d5db;
          }

          .ProseMirror .selectedCell:after {
            z-index: 2;
            position: absolute;
            content: "";
            left: 0; right: 0; top: 0; bottom: 0;
            background: rgba(200, 200, 255, 0.4);
            pointer-events: none;
          }

          .ProseMirror .column-resize-handle {
            position: absolute;
            right: -2px;
            top: 0;
            bottom: -2px;
            width: 4px;
            background-color: #adf;
            pointer-events: none;
          }

          .ProseMirror {
            outline: none;
          }
        `}</style>
      </div>

      <div className="flex gap-2">
        <button
          onClick={triggerProcessing}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Process Events
        </button>
        <button
          onClick={() => refetch()}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Refresh Events
        </button>
        <button
          onClick={downloadCSV}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          Download as CSV
        </button>
      </div>

      {/* Debug: Show events */}
      <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded">
        <h3 className="font-semibold mb-2">Events ({events?.length ?? 0}):</h3>
        {events?.length === 0 && (
          <p className="text-gray-400">No events yet</p>
        )}
        {events?.slice().reverse().slice(0, 5).map(event => (
          <div key={event.id} className="bg-white p-2 rounded mb-2 border">
            <div className="font-mono text-xs">
              <strong>{event.eventType}</strong> - {event.status}
            </div>
            <div className="text-xs text-gray-500">
              {JSON.stringify(event.payload)}
            </div>
            <div className="text-xs text-gray-400">
              {event.createdAt?.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}