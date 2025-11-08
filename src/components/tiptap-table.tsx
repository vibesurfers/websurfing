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
  const updateCell = api.cell.updateCell.useMutation()
  const { data: events, refetch } = api.cell.getEvents.useQuery(undefined, {
    refetchInterval: 2000, // Poll every 2 seconds
  })

  // Debounce mechanism - only fire events after user stops typing
  const debounceRef = useRef<NodeJS.Timeout>()
  const lastContentRef = useRef<string>('')

  const debouncedCellUpdate = useCallback((content: string, rowIndex: number, colIndex: number) => {
    // Clear existing timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    // Set new timeout
    debounceRef.current = setTimeout(() => {
      console.log(`Debounced cell update at (${rowIndex}, ${colIndex}): "${content}"`)
      updateCell.mutate({
        rowIndex,
        colIndex,
        content,
      })
    }, 1000) // Wait 1 second after user stops typing
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
      console.log('Table updated:', html)

      // Parse the HTML to find table cells with content
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')
      const rows = doc.querySelectorAll('tr')

      rows.forEach((row, rowIndex) => {
        const cells = row.querySelectorAll('td')
        cells.forEach((cell, colIndex) => {
          const content = cell.textContent?.trim() || ''

          // Only create events for cells that have non-empty content and aren't the default
          if (content && content !== 'Cell 1' && content !== 'Cell 2' && content !== '') {
            console.log(`Cell changed at (${rowIndex}, ${colIndex}): "${content}"`)

            // Use debounced update instead of direct mutation
            debouncedCellUpdate(content, rowIndex, colIndex)
          }
        })
      })
    },
  })

  const triggerProcessing = async () => {
    await fetch('/api/process-events', { method: 'POST' })
    // Refetch events to see results
    void refetch()
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
        {events?.slice(-5).map(event => (
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