'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableCell } from '@tiptap/extension-table-cell'
import { api } from "@/trpc/react"
import { useCallback, useRef } from 'react'

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

export function TiptapTable() {
  const updateCell = api.cell.updateCell.useMutation({
    onError: (error) => {
      console.error('Failed to update cell:', error.message);
      if (error.data?.code === 'UNAUTHORIZED') {
        console.error('User not authenticated - please refresh the page');
      }
    }
  })
  const { data: events, refetch, error: eventsError } = api.cell.getEvents.useQuery(undefined, {
    refetchInterval: 2000, // Poll every 2 seconds
    retry: (failureCount, error) => {
      // Don't retry if unauthorized
      if (error.data?.code === 'UNAUTHORIZED') return false;
      return failureCount < 3;
    },
    refetchOnWindowFocus: false,
  })

  // Debounce mechanism - only fire events after user stops typing
  const debounceRefs = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const lastContentRef = useRef<Map<string, string>>(new Map())

  const debouncedCellUpdate = useCallback((content: string, rowIndex: number, colIndex: number) => {
    const cellKey = `${rowIndex}-${colIndex}`

    // Clear existing timeout for this specific cell
    const existingTimeout = debounceRefs.current.get(cellKey)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // Set new timeout for this specific cell
    const timeout = setTimeout(() => {
      const lastContent = lastContentRef.current.get(cellKey)

      // Only create event if content has actually changed
      console.log(`Checking cell update at (${rowIndex}, ${colIndex}): "${content}", last: "${lastContent}"`)
      if (content && content !== lastContent && content !== 'Cell 1' && content !== 'Cell 2') {
        console.log(`Creating debounced cell update at (${rowIndex}, ${colIndex}): "${content}"`)
        lastContentRef.current.set(cellKey, content)
        updateCell.mutate({
          rowIndex,
          colIndex,
          content,
        })
      } else {
        console.log(`Skipping cell update - filtered out`)
      }

      // Clean up the timeout reference
      debounceRefs.current.delete(cellKey)
    }, 1000) // Wait 1 second after user stops typing

    debounceRefs.current.set(cellKey, timeout)
  }, [updateCell])

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
      const rows = doc.querySelectorAll('tr')

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

  const triggerProcessing = async () => {
    await fetch('/api/process-events', { method: 'POST' })
    // Refetch events to see results
    void refetch()
  }

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
        <EditorContent editor={editor} />
        <style jsx global>{`
          .ProseMirror table {
            border-collapse: collapse;
            table-layout: fixed;
            width: 100%;
            margin: 0;
            overflow: hidden;
          }

          .ProseMirror td,
          .ProseMirror th {
            min-width: 1em;
            border: 1px solid #d1d5db;
            padding: 8px 12px;
            vertical-align: top;
            box-sizing: border-box;
            position: relative;
            min-height: 40px;
          }

          .ProseMirror td:first-child,
          .ProseMirror th:first-child {
            border-left: 1px solid #d1d5db;
          }

          .ProseMirror td:last-child,
          .ProseMirror th:last-child {
            border-right: 1px solid #d1d5db;
          }

          .ProseMirror tr:first-child td,
          .ProseMirror tr:first-child th {
            border-top: 1px solid #d1d5db;
          }

          .ProseMirror tr:last-child td,
          .ProseMirror tr:last-child th {
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