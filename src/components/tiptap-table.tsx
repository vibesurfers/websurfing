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

function generateInitialContent(columnCount: number): string {
  const rows = Array.from({ length: 8 }, () => {
    const cells = Array.from({ length: columnCount }, () => '<td></td>').join('');
    return `<tr>${cells}</tr>`;
  }).join('\n      ');

  return `<table><tbody>${rows}</tbody></table>`;
}

interface TiptapTableProps {
  treatRobotsAsHumans: boolean
  sheetId: string
}

export function TiptapTable({ treatRobotsAsHumans, sheetId }: TiptapTableProps) {
  const { lastUpdate } = useSheetUpdates()
  const isApplyingRobotUpdates = useRef(false)
  const [columnCount, setColumnCount] = useState(2)
  const [columnTitles, setColumnTitles] = useState<string[]>([])
  const [processingRows, setProcessingRows] = useState<Set<number>>(new Set())
  const [confirmationPending, setConfirmationPending] = useState<{
    rowIndex: number;
    colIndex: number;
    content: string;
    affectedCells: number[];
  } | null>(null)
  const [isAddingColumn, setIsAddingColumn] = useState(false)
  const [newColumnTitle, setNewColumnTitle] = useState('')
  const columnInputRef = useRef<HTMLInputElement>(null)

  const utils = api.useUtils()

  const updateCell = api.cell.updateCell.useMutation({
    onSuccess: (_data, variables) => {
      void utils.cell.getEvents.invalidate({ sheetId });
      // Mark this row as processing
      setProcessingRows(prev => new Set(prev).add(variables.rowIndex));
    },
    onError: (error) => {
      console.error('Failed to update cell:', error.message);
      if (error.data?.code === 'UNAUTHORIZED') {
        console.error('User not authenticated - please refresh the page');
      }
    }
  })

  const updateCellWithoutEvent = api.cell.updateCellWithoutEvent.useMutation({
    onSuccess: () => {
      void utils.cell.getCells.invalidate({ sheetId });
    },
    onError: (error) => {
      console.error('Failed to update cell without event:', error.message);
      if (error.data?.code === 'UNAUTHORIZED') {
        console.error('User not authenticated - please refresh the page');
      }
    }
  })

  const clearCell = api.cell.clearCell.useMutation({
    onSuccess: () => {
      void utils.cell.getEvents.invalidate({ sheetId });
    },
    onError: (error) => {
      console.error('Failed to clear cell:', error.message);
      if (error.data?.code === 'UNAUTHORIZED') {
        console.error('User not authenticated - please refresh the page');
      }
    }
  })

  const clearCellsToRight = api.cell.clearCellsToRight.useMutation({
    onSuccess: () => {
      void utils.cell.getCells.invalidate({ sheetId });
    },
    onError: (error) => {
      console.error('Failed to clear cells to the right:', error.message);
      if (error.data?.code === 'UNAUTHORIZED') {
        console.error('User not authenticated - please refresh the page');
      }
    }
  })

  // Fetch cells from the database
  const { data: cells, refetch: refetchCells } = api.cell.getCells.useQuery(
    { sheetId },
    {
      refetchInterval: 2000,
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

  const { data: processingStatus } = api.cell.getProcessingStatus.useQuery(
    { sheetId },
    {
      refetchInterval: 2000,
      retry: (failureCount, error) => {
        if (error.data?.code === 'UNAUTHORIZED') return false;
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
    }
  )

  const addColumn = api.sheet.addColumn.useMutation({
    onSuccess: () => {
      void utils.sheet.getColumns.invalidate({ sheetId });
      setIsAddingColumn(false);
      setNewColumnTitle('');
    },
  })

  useEffect(() => {
    if (events) {
      console.log(`[TiptapTable] Received ${events.length} events for sheetId: ${sheetId}`)
    }
  }, [events, sheetId])

  useEffect(() => {
    if (columns && columns.length > 0) {
      const titles = columns.map(col => col.title)
      setColumnTitles(titles)
      const newCount = titles.length
      console.log('[TiptapTable] Setting column count to:', newCount, 'columns:', titles)

      // Update column count and reinitialize editor if needed
      if (newCount !== columnCount) {
        setColumnCount(newCount)
      }
    }
  }, [columns, columnCount])

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
      if (content !== lastContent) {

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
          // Check if this row has existing data in other columns
          const rowCells = cells?.filter(c => c.rowIndex === rowIndex) || [];
          const hasExistingData = rowCells.some(c =>
            c.colIndex !== colIndex && c.content && c.content.trim()
          );

          if (hasExistingData && !isRobotUpdate) {
            // Determine which cells will be affected (all cells to the right)
            const affectedCells = Array.from(
              { length: columnCount - colIndex - 1 },
              (_, i) => colIndex + i + 1
            ).filter(idx => rowCells.some(c => c.colIndex === idx && c.content?.trim()));

            if (affectedCells.length > 0) {
              // Show confirmation dialog
              console.log(`Row ${rowIndex} has existing data, showing confirmation`);
              setConfirmationPending({
                rowIndex,
                colIndex,
                content,
                affectedCells,
              });
              return;
            }
          }

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
  }, [updateCell, clearCell, treatRobotsAsHumans, sheetId, cells, columnCount])

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
    content: generateInitialContent(columnCount),
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

    console.log('[TiptapTable] Adjusting table columns. Current rows:', allRows.length, 'Target columnCount:', columnCount)

    let hasChanges = false
    allRows.forEach((row, idx) => {
      const currentCols = row.children.length
      console.log(`[TiptapTable] Row ${idx} has ${currentCols} columns, needs ${columnCount}`)

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
      console.log('[TiptapTable] Updating editor with new column structure')
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

    // Reset editor to initial empty state with correct column count
    editor.commands.setContent(generateInitialContent(columnCount))

    // Clear tracking refs
    lastContentRef.current.clear()
    debounceRefs.current.forEach(timeout => clearTimeout(timeout))
    debounceRefs.current.clear()

    // Invalidate and refetch queries for new sheet
    void utils.cell.getCells.invalidate({ sheetId })
    void utils.cell.getEvents.invalidate({ sheetId })
    void refetchCells()
    void refetch()
  }, [sheetId, editor, utils, refetchCells, refetch, columnCount])

  useEffect(() => {
    if (isAddingColumn && columnInputRef.current) {
      columnInputRef.current.focus();
    }
  }, [isAddingColumn])

  const handleAddColumn = () => {
    setIsAddingColumn(true);

    // Immediately add a temporary column to the editor to maintain alignment
    if (editor) {
      const html = editor.getHTML();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const table = doc.querySelector('table');
      if (table) {
        const tbody = table.querySelector('tbody') || table;
        const rows = tbody.querySelectorAll('tr');

        // Add a cell to each row
        rows.forEach(row => {
          const newCell = doc.createElement('td');
          row.appendChild(newCell);
        });

        isApplyingRobotUpdates.current = true;
        const newHtml = table.outerHTML;
        editor.commands.setContent(newHtml);
        isApplyingRobotUpdates.current = false;

        // Update column count to reflect the new column
        setColumnCount(prev => {
          const newCount = prev + 1;
          console.log('[TiptapTable] Column count increased to:', newCount);
          return newCount;
        });
      }
    }
  }

  const handleColumnTitleSubmit = () => {
    if (!newColumnTitle.trim()) {
      // User cancelled - remove the temporary column we added
      handleCancelAddColumn();
      return;
    }

    const nextPosition = columns?.length ?? (columnCount - 1); // -1 because we already added the column
    addColumn.mutate({
      sheetId,
      title: newColumnTitle.trim(),
      position: nextPosition,
      dataType: 'text',
    });
  }

  const handleCancelAddColumn = () => {
    // Remove the temporary column from the editor
    if (editor) {
      const html = editor.getHTML();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const table = doc.querySelector('table');
      if (table) {
        const tbody = table.querySelector('tbody') || table;
        const rows = tbody.querySelectorAll('tr');

        // Remove the last cell from each row
        rows.forEach(row => {
          if (row.lastChild) {
            row.removeChild(row.lastChild);
          }
        });

        isApplyingRobotUpdates.current = true;
        const newHtml = table.outerHTML;
        editor.commands.setContent(newHtml);
        isApplyingRobotUpdates.current = false;

        // Update column count to reflect the removed column
        setColumnCount(prev => prev - 1);
      }
    }

    setIsAddingColumn(false);
    setNewColumnTitle('');
  }

  const handleAddRow = () => {
    if (!editor) return;

    const html = editor.getHTML();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const table = doc.querySelector('table');
    if (!table) return;

    const tbody = table.querySelector('tbody') || table;
    const newRow = doc.createElement('tr');
    for (let i = 0; i < columnCount; i++) {
      const newCell = doc.createElement('td');
      newRow.appendChild(newCell);
    }
    tbody.appendChild(newRow);

    isApplyingRobotUpdates.current = true;
    editor.commands.setContent(`<div class="tableWrapper">${table.outerHTML}</div>`);
    isApplyingRobotUpdates.current = false;
  }

  // Apply cell updates to the editor when cells change
  useEffect(() => {
    console.log('[TiptapTable] Cell update effect triggered. Editor:', !!editor, 'Cells:', cells?.length || 0);
    if (!editor || !cells || cells.length === 0) return

    // Don't update if editor is focused (user is actively typing)
    if (editor.isFocused) {
      console.log('[TiptapTable] Editor is focused, skipping cell update to prevent interruption');
      return
    }

    console.log('[TiptapTable] Applying', cells.length, 'cells to editor');
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
    let updatedCount = 0;
    cells.forEach(cell => {
      const row = tbody.children[cell.rowIndex] as HTMLTableRowElement
      if (row && row.children[cell.colIndex]) {
        const td = row.children[cell.colIndex] as HTMLTableCellElement
        const currentContent = td.textContent?.trim() || ''
        const dbContent = (cell.content || '').trim()

        // Only update if content from database is different from what's currently shown
        if (dbContent !== currentContent) {
          console.log(`[TiptapTable] Cell (${cell.rowIndex},${cell.colIndex}) needs update: "${currentContent}" -> "${dbContent.slice(0, 50)}..."`);

          td.textContent = dbContent
          hasChanges = true
          updatedCount++

          // Update lastContentRef so we don't re-trigger events
          const cellKey = `${cell.rowIndex}-${cell.colIndex}`
          lastContentRef.current.set(cellKey, dbContent)
        }
      }
    })

    console.log(`[TiptapTable] Updated ${updatedCount} cells out of ${cells.length} total`)

    // Check which rows are complete (all columns filled)
    const rowCompletionMap = new Map<number, boolean>();
    cells.forEach(cell => {
      if (!rowCompletionMap.has(cell.rowIndex)) {
        rowCompletionMap.set(cell.rowIndex, true);
      }
    });

    // Check if all columns are filled for each row
    rowCompletionMap.forEach((_complete, rowIndex) => {
      const rowCells = cells.filter(c => c.rowIndex === rowIndex);
      const allFilled = rowCells.length === columnCount && rowCells.every(c => c.content && c.content.trim());
      rowCompletionMap.set(rowIndex, allFilled);
    });

    // Remove completed rows from processing set
    setProcessingRows(prev => {
      const newSet = new Set(prev);
      rowCompletionMap.forEach((isComplete, rowIndex) => {
        if (isComplete) {
          newSet.delete(rowIndex);
        }
      });
      return newSet;
    });

    // Apply changes back to editor if any cells were updated
    if (hasChanges) {
      console.log('[TiptapTable] Updating editor with new cell content');
      const tableWrapper = doc.createElement('div');
      tableWrapper.className = 'tableWrapper';
      tableWrapper.appendChild(table);

      editor.commands.setContent(`<div class="tableWrapper">${table.outerHTML}</div>`)
    } else {
      console.log('[TiptapTable] No changes detected, skipping editor update');
    }

    // Done applying robot updates
    isApplyingRobotUpdates.current = false
  }, [cells, editor, columnCount])

  // Apply processing state to rows
  useEffect(() => {
    if (!editor) return;

    const editorElement = editor.view.dom;
    const tbody = editorElement.querySelector('tbody');
    if (!tbody) return;

    const rows = tbody.querySelectorAll('tr');
    rows.forEach((row, index) => {
      if (processingRows.has(index)) {
        row.classList.add('processing-row');
      } else {
        row.classList.remove('processing-row');
      }
    });
  }, [editor, processingRows]);

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
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin-loader {
          to { transform: rotate(360deg); }
        }

        .processing-row {
          opacity: 0.6;
          position: relative;
          background-color: #f9fafb !important;
        }

        .processing-row td {
          position: relative;
          background-color: #f9fafb !important;
        }

        .processing-row td::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(249, 250, 251, 0.8);
          z-index: 5;
        }

        .processing-row td::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 20px;
          height: 20px;
          margin: -10px 0 0 -10px;
          border: 3px solid #e5e7eb;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin-loader 0.8s linear infinite;
          z-index: 10;
        }
      `}} />
      <div className="relative group">
        {/* Add column button - full height */}
        <div
          className="absolute right-0 top-0 bottom-0 w-16 bg-white border border-gray-300 hover:bg-blue-50 transition-colors cursor-pointer flex items-center justify-center z-20"
          style={{ borderLeft: 'none' }}
          onClick={handleAddColumn}
        >
          <span className="text-gray-400 hover:text-blue-500 text-lg">+</span>
        </div>

        <table style={{ width: 'calc(100% - 60px)', borderCollapse: 'collapse', tableLayout: 'fixed', position: 'relative' }}>
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
                      boxSizing: 'border-box',
                      width: `calc(100% / ${columnTitles.length})`
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
                      boxSizing: 'border-box',
                      width: `calc(100% / ${columnCount})`
                    }}
                  >
                    {i + 1}
                  </th>
                ))
              )}
              {isAddingColumn && (
                <th
                  className="bg-yellow-100 border border-yellow-300 text-center font-semibold text-xs"
                  style={{
                    padding: '8px 12px',
                    minWidth: '1em',
                    boxSizing: 'border-box'
                  }}
                >
                  <input
                    ref={columnInputRef}
                    type="text"
                    value={newColumnTitle}
                    onChange={(e) => setNewColumnTitle(e.target.value)}
                    onBlur={handleColumnTitleSubmit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleColumnTitleSubmit();
                      if (e.key === 'Escape') {
                        handleCancelAddColumn();
                      }
                    }}
                    placeholder="Column title..."
                    className="w-full bg-transparent border-none outline-none text-center text-xs"
                  />
                </th>
              )}
            </tr>
          </thead>
        </table>
        <div style={{ position: 'relative' }}>
          <EditorContent editor={editor} />
        </div>
        <div
          onClick={handleAddRow}
          className="w-full h-10 bg-white border border-gray-300 hover:bg-blue-50 transition-colors cursor-pointer flex items-center justify-center"
          style={{ borderTop: 'none' }}
        >
          <span className="text-gray-400 hover:text-blue-500 text-lg">+</span>
        </div>
        <style key={`table-styles-${columnCount}`} dangerouslySetInnerHTML={{ __html: `
          .ProseMirror table {
            border-collapse: collapse;
            table-layout: fixed;
            width: calc(100% - 60px);
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
            height: 40px;
            max-height: 40px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            width: calc(100% / ${columnCount});
          }

          .ProseMirror tr:hover td {
            height: auto;
            max-height: none;
            overflow: visible;
            white-space: normal;
            z-index: 10;
            background-color: #f9fafb;
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
        `}} />
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

      {/* Confirmation Modal */}
      {confirmationPending && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md shadow-xl">
            <h3 className="text-lg font-semibold mb-3">Re-process Row?</h3>
            <p className="text-gray-700 mb-4">
              This row already has data in {confirmationPending.affectedCells.length} column(s) to the right.
              Do you want to clear and re-process those cells?
            </p>
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm text-yellow-800">
                <strong>Affected columns:</strong> {confirmationPending.affectedCells.map(idx => columnTitles[idx] || `Column ${idx + 1}`).join(', ')}
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={async () => {
                  const { rowIndex, colIndex, content } = confirmationPending;
                  setConfirmationPending(null);
                  const cellKey = `${rowIndex}-${colIndex}`;
                  lastContentRef.current.set(cellKey, content);

                  // Clear all cells to the right
                  await clearCellsToRight.mutateAsync({
                    sheetId,
                    rowIndex,
                    startColIndex: colIndex,
                  });

                  // Now update the edited cell and trigger processing
                  updateCell.mutate({
                    sheetId,
                    rowIndex,
                    colIndex,
                    content,
                  });
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Yes, Re-process
              </button>
              <button
                onClick={() => {
                  const { rowIndex, colIndex, content } = confirmationPending;
                  setConfirmationPending(null);
                  const cellKey = `${rowIndex}-${colIndex}`;
                  lastContentRef.current.set(cellKey, content);
                  console.log(`User declined re-processing, updating cell without event`);
                  updateCellWithoutEvent.mutate({
                    sheetId,
                    rowIndex,
                    colIndex,
                    content,
                  });
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                No, Just Update This Cell
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}