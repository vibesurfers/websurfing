import { useEffect, useState, useRef } from "react";

export interface SheetEvent {
  type: 'connected' | 'status_update' | 'cell_update' | 'error';
  timestamp: string;
  message?: string;
  data?: {
    pendingEvents?: Array<{
      id: string;
      eventType: string;
      status: string;
      retryCount: number | null;
      lastError: string | null;
      createdAt: Date | null;
    }>;
    recentUpdates?: Array<{
      id: string;
      rowIndex: number;
      colIndex: number;
      content: string | null;
      updateType: string;
      createdAt: Date | null;
      appliedAt: Date | null;
    }>;
    cellUpdate?: {
      rowIndex: number;
      colIndex: number;
      status: 'pending' | 'processing' | 'completed' | 'error';
      content?: string;
      progress?: number;
      message?: string;
    };
  };
}

export interface SheetStatus {
  connected: boolean;
  pendingEventsCount: number;
  processingCount: number;
  lastUpdate: Date | null;
  events: SheetEvent[];
}

/**
 * Hook to subscribe to real-time sheet updates via Server-Sent Events
 *
 * @param sheetId - The ID of the sheet to monitor
 * @param enabled - Whether to connect to the stream (default: true)
 * @returns Current status and event history
 *
 * @example
 * const { connected, pendingEventsCount, events } = useSheetEvents(sheetId);
 */
export function useSheetEvents(
  sheetId: string | null,
  enabled: boolean = true
): SheetStatus {
  const [status, setStatus] = useState<SheetStatus>({
    connected: false,
    pendingEventsCount: 0,
    processingCount: 0,
    lastUpdate: null,
    events: [],
  });

  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!sheetId || !enabled) {
      return;
    }

    // Create EventSource connection
    const eventSource = new EventSource(`/api/sheets/${sheetId}/events`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('[SSE] Connected to sheet events');
      setStatus((prev) => ({
        ...prev,
        connected: true,
      }));
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as SheetEvent;

        setStatus((prev) => {
          const newEvents = [...prev.events, data].slice(-50); // Keep last 50 events

          let pendingCount = prev.pendingEventsCount;
          let processingCount = prev.processingCount;

          // Update counts based on event type
          if (data.type === 'status_update' && data.data?.pendingEvents) {
            pendingCount = data.data.pendingEvents.filter(
              (e) => e.status === 'pending'
            ).length;
            processingCount = data.data.pendingEvents.filter(
              (e) => e.status === 'processing'
            ).length;
          }

          return {
            ...prev,
            pendingEventsCount: pendingCount,
            processingCount,
            lastUpdate: new Date(),
            events: newEvents,
          };
        });
      } catch (error) {
        console.error('[SSE] Error parsing event:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('[SSE] Connection error:', error);
      setStatus((prev) => ({
        ...prev,
        connected: false,
      }));

      // EventSource will automatically reconnect
    };

    // Cleanup
    return () => {
      console.log('[SSE] Disconnecting from sheet events');
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [sheetId, enabled]);

  return status;
}

/**
 * Get the latest status for a specific cell from the event stream
 */
export function useCellStatus(
  sheetId: string | null,
  rowIndex: number,
  colIndex: number
): {
  status: 'idle' | 'pending' | 'processing' | 'completed' | 'error';
  message?: string;
  progress?: number;
} {
  const { events } = useSheetEvents(sheetId);

  // Find the most recent event for this cell
  const cellEvents = events
    .filter(
      (e) =>
        e.type === 'cell_update' &&
        e.data?.cellUpdate?.rowIndex === rowIndex &&
        e.data?.cellUpdate?.colIndex === colIndex
    )
    .slice(-1);

  if (cellEvents.length === 0) {
    return { status: 'idle' };
  }

  const latestEvent = cellEvents[0]!;
  const cellUpdate = latestEvent.data?.cellUpdate;

  return {
    status: cellUpdate?.status || 'idle',
    message: cellUpdate?.message,
    progress: cellUpdate?.progress,
  };
}
