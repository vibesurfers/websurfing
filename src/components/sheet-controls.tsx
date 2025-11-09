'use client'

import { Button } from '@/components/ui/button'
import { EventsPanel } from './events-panel'
import { Download, RefreshCw, Play } from 'lucide-react'

interface Event {
  id: string
  eventType: string
  status: string
  payload: unknown
  createdAt?: Date | null
}

interface SheetControlsProps {
  events: Event[]
  onProcessEvents: () => void
  onRefreshEvents: () => void
  onDownloadCSV: () => void
  isProcessing?: boolean
}

export function SheetControls({
  events,
  onProcessEvents,
  onRefreshEvents,
  onDownloadCSV,
  isProcessing = false
}: SheetControlsProps) {
  return (
    <div className="fixed bottom-0 left-[var(--sidebar-width)] right-0 bg-white border-t border-gray-300 shadow-lg z-40">
      <div className="px-4 py-3 space-y-3">
        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={onProcessEvents}
            variant="default"
            size="sm"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Process Events
              </>
            )}
          </Button>
          <Button
            onClick={onRefreshEvents}
            variant="secondary"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Events
          </Button>
          <Button
            onClick={onDownloadCSV}
            variant="outline"
            size="sm"
            className="bg-green-50 hover:bg-green-100 border-green-300 text-green-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Download CSV
          </Button>
        </div>

        {/* Collapsible Events Panel */}
        <EventsPanel events={events} />
      </div>
    </div>
  )
}
