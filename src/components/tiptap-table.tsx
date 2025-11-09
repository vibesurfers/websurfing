'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableCell } from '@tiptap/extension-table-cell'
import { api } from "@/trpc/react"
import { useCallback, useRef, useEffect, useState, useContext, createContext } from 'react'
import { Button } from "@/components/ui/button"
import { CountdownTimer } from "@/components/countdown-timer"
import { RefreshCw } from "lucide-react"

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
  // Start with just 1 empty row for better UX
  // User can add more rows by clicking the "+" button
  const cells = Array.from({ length: columnCount }, () => '<td></td>').join('');
  const row = `<tr>${cells}</tr>`;

  return `<table><tbody>${row}</tbody></table>`;
}

interface TiptapTableProps {
  treatRobotsAsHumans: boolean
  sheetId: string
  onUpdateTick: () => Promise<void>
  onToggleRobotMode: () => void
}

export function TiptapTable({ treatRobotsAsHumans, sheetId, onUpdateTick, onToggleRobotMode }: TiptapTableProps) {
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

  const deleteRow = api.cell.deleteRow.useMutation({
    onSuccess: () => {
      void utils.cell.getCells.invalidate({ sheetId });
    },
    onError: (error) => {
      console.error('Failed to delete row:', error.message);
      alert('Failed to delete row. Please try again.');
    }
  })

  const reprocessRow = api.cell.reprocessRow.useMutation({
    onSuccess: () => {
      void utils.cell.getEvents.invalidate({ sheetId });
      void utils.cell.getCells.invalidate({ sheetId });
    },
    onError: (error) => {
      console.error('Failed to reprocess row:', error.message);
      alert(error.message || 'Failed to reprocess row. Please try again.');
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
      editor.commands.setContent(`<div class="tableWrapper">${table.outerHTML}</div>`)
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

    // Use TipTap's native addColumnAfter command
    if (editor) {
      isApplyingRobotUpdates.current = true;
      editor.chain().focus().addColumnAfter().run();
      isApplyingRobotUpdates.current = false;

      // Update column count to reflect the new column
      setColumnCount(prev => {
        const newCount = prev + 1;
        console.log('[TiptapTable] Column count increased to:', newCount);
        return newCount;
      });
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
    // Use TipTap's native deleteColumn command to remove the temporary column
    if (editor) {
      isApplyingRobotUpdates.current = true;
      editor.chain().focus().deleteColumn().run();
      isApplyingRobotUpdates.current = false;

      // Update column count to reflect the removed column
      setColumnCount(prev => prev - 1);
    }

    setIsAddingColumn(false);
    setNewColumnTitle('');
  }

  const reprocessColumn = api.cell.reprocessColumn.useMutation({
    onSuccess: (data) => {
      console.log(`[TiptapTable] Reprocessing initiated: ${data.message}`);
      // Invalidate queries to refresh
      void utils.cell.getCells.invalidate({ sheetId });
      void utils.cell.getProcessingStatus.invalidate({ sheetId });
    },
    onError: (error) => {
      console.error('[TiptapTable] Reprocess failed:', error);
      alert(`Failed to reprocess column: ${error.message}`);
    },
  });

  const handleReprocessColumn = (colIndex: number) => {
    const columnName = columnTitles[colIndex] || `Column ${colIndex + 1}`;
    const confirmed = confirm(
      `Reprocess all rows for "${columnName}"?\n\nThis will clear existing data and re-run the AI operators for this column.`
    );

    if (confirmed) {
      reprocessColumn.mutate({ sheetId, colIndex });
    }
  }

  const handleAddRow = () => {
    if (!editor) return;

    // Use TipTap's native addRowAfter command
    isApplyingRobotUpdates.current = true;
    editor.chain().focus().addRowAfter().run();
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

    // Update cell contents from database AND add processing indicators
    let hasChanges = false
    let updatedCount = 0;
    cells.forEach(cell => {
      const row = tbody.children[cell.rowIndex] as HTMLTableRowElement
      if (row && row.children[cell.colIndex]) {
        const td = row.children[cell.colIndex] as HTMLTableCellElement
        const currentContent = td.textContent?.trim() || ''
        const dbContent = (cell.content || '').trim()

        // Check if this cell is currently processing
        const cellKey = `${cell.rowIndex}-${cell.colIndex}`;
        const cellStatus = processingStatus?.[cellKey];

        // Remove all status classes first
        td.classList.remove('cell-processing', 'cell-pending', 'cell-completed', 'cell-error');

        // Apply status class based on current state
        if (cellStatus?.status === 'processing') {
          td.classList.add('cell-processing');
          td.setAttribute('data-status-message', cellStatus.message || 'Processing...');
        } else if (cellStatus?.status === 'completed' && dbContent) {
          td.classList.add('cell-completed');
          // Remove completed class after 3 seconds
          setTimeout(() => td.classList.remove('cell-completed'), 3000);
        } else if (cellStatus?.status === 'error') {
          td.classList.add('cell-error');
          td.setAttribute('data-status-message', cellStatus.message || 'Error');
        } else if (cellStatus?.status === 'idle' && !dbContent) {
          // Idle with no content = pending
          td.classList.add('cell-pending');
        } else {
          // No special status
          td.removeAttribute('data-status-message');
        }

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
      <div className="relative group w-full" style={{ paddingRight: '80px' }}>
        {/* Column headers */}
        {columnTitles.length > 0 && (
          <div
            className="flex border-b border-gray-300 bg-blue-50 sticky top-0 z-10 w-full"
          >
            {columnTitles.map((title, i) => (
              <div
                key={i}
                className="bg-blue-100 border-r border-blue-300 text-center font-semibold text-xs text-blue-900 min-w-0"
                style={{
                  padding: '8px 4px',
                  width: `calc(100% / ${columnTitles.length})`,
                  boxSizing: 'border-box',
                }}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="flex-1 truncate">{title}</span>
                  {i > 0 && ( // Don't show reprocess for first column
                    <Button
                      onClick={() => handleReprocessColumn(i)}
                      size="sm"
                      variant="default"
                      className="h-5 px-1 text-xs"
                      title={`Reprocess all rows for "${title}"`}
                    >
                      ↻
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ position: 'relative' }}>
          <EditorContent editor={editor} />
          {/* Row action buttons - positioned absolutely */}
          <div className="row-actions-container">
            {/* Create buttons only for actual table rows */}
            {(() => {
              // Get the actual number of rows from the editor
              if (!editor) return [];

              const html = editor.getHTML();
              const parser = new DOMParser();
              const doc = parser.parseFromString(html, 'text/html');
              const tbody = doc.querySelector('tbody');
              const actualRows = tbody ? tbody.querySelectorAll('tr').length : 0;

              return Array.from({ length: actualRows }).map((_, rowIndex) => {
                // Check if this row has data
                const rowHasData = cells?.some(cell =>
                  cell.rowIndex === rowIndex && cell.content && cell.content.trim()
                ) || false;

              return (
                <div
                  key={rowIndex}
                  className="row-actions"
                  style={{
                    position: 'absolute',
                    right: '-80px',
                    top: `${rowIndex * 40}px`,
                    width: '60px',
                    height: '40px',
                    display: 'flex', // Always visible
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px',
                    backgroundColor: 'white',
                    zIndex: 1000,
                  }}
                  data-row-index={rowIndex}
                >
                  <button
                    onClick={() => {
                      const confirmText = rowHasData
                        ? `Are you sure you want to delete row ${rowIndex + 1}? This will permanently remove all data in this row.`
                        : `Delete empty row ${rowIndex + 1}?`;
                      if (confirm(confirmText)) {
                        deleteRow.mutate({ sheetId, rowIndex });
                      }
                    }}
                    className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors flex items-center justify-center"
                    title="Delete row"
                    style={{ fontSize: '12px', minWidth: '24px', height: '24px' }}
                  >
                    🗑️
                  </button>
                  <button
                    onClick={() => {
                      if (rowHasData) {
                        if (confirm(`Refresh and reprocess row ${rowIndex + 1}? This will clear the row and regenerate all data.`)) {
                          reprocessRow.mutate({ sheetId, rowIndex });
                        }
                      } else {
                        alert(`Row ${rowIndex + 1} is empty. Add some content first to refresh the row.`);
                      }
                    }}
                    className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors flex items-center justify-center"
                    title="Refresh / Reprocess row"
                    style={{ fontSize: '12px', minWidth: '24px', height: '24px' }}
                    disabled={!rowHasData}
                  >
                    <RefreshCw className="h-3 w-3" />
                  </button>
                </div>
              );
            });
            })()}
          </div>
        </div>
        <div
          onClick={handleAddRow}
          className="w-full h-12 bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 border-2 border-dashed border-blue-300 hover:border-blue-400 transition-all cursor-pointer flex items-center justify-center gap-2 rounded-lg mt-2"
        >
          <span className="text-blue-600 text-2xl font-bold">+</span>
          <span className="text-blue-700 font-medium text-sm">Add Row</span>
        </div>
        <style key={`table-styles-${columnCount}`} dangerouslySetInnerHTML={{ __html: `
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

          /* Row actions are always visible */

          .row-actions {
            z-index: 1000;
          }

          /* Table scroll without button interference */
          .ProseMirror {
            position: relative;
            overflow-x: auto;
          }

          .row-actions-container {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
          }

          .row-actions {
            pointer-events: auto;
          }

          .ProseMirror td:last-child {
            border-right: 1px solid #d1d5db;
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
        <Button
          onClick={() => refetch()}
          variant="secondary"
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Events
        </Button>
        <Button
          onClick={downloadCSV}
          variant="outline"
          className="bg-green-50 hover:bg-green-100 border-green-300 text-green-700"
        >
          Download as CSV
        </Button>
      </div>

      {/* Debug: Show events */}
      <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold">Events ({events?.length ?? 0}):</h3>
          <CountdownTimer
            intervalMs={5000}
            onTick={onUpdateTick}
            label="Next update"
            treatRobotsAsHumans={treatRobotsAsHumans}
            onToggleRobotMode={onToggleRobotMode}
          />
        </div>
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