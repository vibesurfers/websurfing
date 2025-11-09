'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Event {
  id: string
  eventType: string
  status: string
  payload: unknown
  createdAt?: Date | null
}

interface EventsPanelProps {
  events: Event[]
}

export function EventsPanel({ events }: EventsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Calculate status counts
  const statusCounts = {
    pending: events.filter(e => e.status === 'pending').length,
    processing: events.filter(e => e.status === 'processing').length,
    completed: events.filter(e => e.status === 'completed').length,
    failed: events.filter(e => e.status === 'failed').length,
  }

  return (
    <div className="border border-gray-300 rounded-lg bg-gray-50 overflow-hidden">
      {/* Summary Header (Always Visible) */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-4 text-sm flex-wrap">
          <span className="font-semibold text-gray-900">
            Events: {events.length}
          </span>
          {statusCounts.pending > 0 && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
              Pending: {statusCounts.pending}
            </Badge>
          )}
          {statusCounts.processing > 0 && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
              Processing: {statusCounts.processing}
            </Badge>
          )}
          {statusCounts.completed > 0 && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
              Completed: {statusCounts.completed}
            </Badge>
          )}
          {statusCounts.failed > 0 && (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
              Failed: {statusCounts.failed}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {isExpanded ? 'Hide details' : 'Show details'}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-600" />
          )}
        </div>
      </button>

      {/* Expanded Events List */}
      {isExpanded && (
        <div className="border-t border-gray-300 p-4 max-h-64 overflow-y-auto bg-white">
          {events.length === 0 ? (
            <p className="text-gray-400 text-sm">No events yet</p>
          ) : (
            <div className="space-y-2">
              {events.slice().reverse().slice(0, 20).map(event => (
                <div key={event.id} className="bg-gray-50 p-3 rounded border border-gray-200">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-semibold text-gray-900">
                      {event.eventType}
                    </span>
                    <Badge
                      variant="outline"
                      className={
                        event.status === 'completed' ? 'bg-green-50 text-green-700 border-green-300' :
                        event.status === 'processing' ? 'bg-blue-50 text-blue-700 border-blue-300' :
                        event.status === 'failed' ? 'bg-red-50 text-red-700 border-red-300' :
                        'bg-yellow-50 text-yellow-700 border-yellow-300'
                      }
                    >
                      {event.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-600 font-mono truncate">
                    {JSON.stringify(event.payload)}
                  </div>
                  {event.createdAt && (
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(event.createdAt).toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
              {events.length > 20 && (
                <p className="text-xs text-center text-muted-foreground pt-2">
                  Showing 20 most recent events
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
