'use client'

import { TiptapTable } from "@/components/tiptap-table";
import { AgentSidebar } from "@/components/agent-sidebar";
import { SheetControls } from "@/components/sheet-controls";
import { SheetHeader } from "@/components/sheet-header";
import { useState, useCallback, createContext, useContext, useEffect } from "react";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";

interface SheetUpdateContextType {
  lastUpdate: Date | null;
  pendingUpdates: number;
  selectedSheetId: string | null;
}

const SheetUpdateContext = createContext<SheetUpdateContextType | null>(null);

export function useSheetUpdates() {
  const context = useContext(SheetUpdateContext);
  if (!context) {
    throw new Error('useSheetUpdates must be used within SheetEditor');
  }
  return context;
}

interface SheetEditorProps {
  sheetId: string;
  appUrl: string;
}

export function SheetEditor({ sheetId, appUrl }: SheetEditorProps) {
  const router = useRouter();
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [pendingUpdates, setPendingUpdates] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [treatRobotsAsHumans, setTreatRobotsAsHumans] = useState(true);

  // Processing state for sticky panel
  const [isProcessingEvents, setIsProcessingEvents] = useState(false);

  const { data: sheets } = api.sheet.list.useQuery();

  // Get current sheet name for API snippets
  const currentSheet = sheets?.find(s => s.id === sheetId);

  const { error: authError, isLoading } = api.cell.getEvents.useQuery(
    { sheetId },
    {
      enabled: !!sheetId,
      refetchInterval: false,
      retry: false,
    }
  );

  // Query events for sticky panel (with auto-refresh)
  const { data: events, refetch: refetchEvents } = api.cell.getEvents.useQuery(
    { sheetId },
    {
      enabled: !!sheetId && isReady,
      refetchInterval: 2000, // Refresh every 2 seconds
    }
  );

  useEffect(() => {
    if (!isLoading) {
      if (!authError || authError.data?.code !== 'UNAUTHORIZED') {
        setIsReady(true);
      }
    }
  }, [isLoading, authError]);

  const handleSelectSheet = useCallback((newSheetId: string) => {
    router.push(`/sheets/${newSheetId}`);
  }, [router]);

  const utils = api.useUtils();

  // Sheet controls handlers
  const handleProcessEvents = useCallback(async () => {
    if (!sheetId) return;
    setIsProcessingEvents(true);
    try {
      await fetch(`/api/update-sheet?sheetId=${sheetId}`, { method: 'POST' });
      refetchEvents();
      void utils.cell.getCells.invalidate({ sheetId });
    } catch (error) {
      console.error('Error processing events:', error);
    } finally {
      setIsProcessingEvents(false);
    }
  }, [sheetId, refetchEvents, utils]);

  const handleRefreshEvents = useCallback(() => {
    refetchEvents();
  }, [refetchEvents]);

  const handleDownloadCSV = useCallback(async () => {
    if (!currentSheet?.name) return;

    try {
      // Fetch columns and cells
      const response = await fetch(`/api/v1/sheets/${sheetId}/data?format=csv`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('apiKey') || ''}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download CSV');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentSheet.name.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading CSV:', error);
      alert('Failed to download CSV. Please try again.');
    }
  }, [sheetId, currentSheet?.name]);

  const handleUpdateTick = useCallback(async () => {
    if (!sheetId) return;

    try {
      console.log('Triggering sheet update for sheet:', sheetId);
      const response = await fetch(`/api/update-sheet?sheetId=${sheetId}`, { method: 'POST' });
      const result = await response.json() as {
        success: boolean;
        totalApplied: number;
        appliedUpdates: Array<{
          id: string;
          rowIndex: number;
          colIndex: number;
          content: string;
          updateType: string;
        }>;
        error?: string;
      };

      if (result.success && result.totalApplied > 0) {
        console.log(`Applied ${result.totalApplied} sheet updates`);
        setLastUpdate(new Date());
        setPendingUpdates(result.totalApplied);

        setTimeout(() => setPendingUpdates(0), 3000);
      }
    } catch (error) {
      console.error('Error updating sheet:', error);
    }
  }, [sheetId]);

  if (!isReady && authError?.data?.code === 'UNAUTHORIZED') {
    return (
      <div className="container mx-auto p-8 min-h-screen bg-white">
        <div className="space-y-6">
          <h1 className="text-3xl font-bold text-gray-900">
            VibeSurfing - Web Search Spreadsheets
          </h1>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-yellow-800 font-semibold">Authentication Required</h3>
            <p className="text-yellow-600 mt-2">
              Please ensure you are signed in to access this sheet.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="container mx-auto p-8 min-h-screen bg-white">
        <div className="space-y-6">
          <h1 className="text-3xl font-bold text-gray-900">
            VibeSurfing - Web Search Spreadsheets
          </h1>
          <div className="flex items-center gap-2 text-gray-600">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            Loading...
          </div>
        </div>
      </div>
    );
  }

  return (
    <SheetUpdateContext.Provider value={{ lastUpdate, pendingUpdates, selectedSheetId: sheetId }}>
      <main className="container mx-auto min-h-screen bg-white">
        <SheetHeader
          sheetId={sheetId}
          appUrl={appUrl}
          currentSheet={currentSheet}
          pendingUpdates={pendingUpdates}
          treatRobotsAsHumans={treatRobotsAsHumans}
          onToggleRobotMode={() => setTreatRobotsAsHumans(!treatRobotsAsHumans)}
          onUpdateTick={handleUpdateTick}
          onSelectSheet={handleSelectSheet}
        />

        <div className="px-8 py-6 pt-40">
          <TiptapTable treatRobotsAsHumans={treatRobotsAsHumans} sheetId={sheetId} />
        </div>
      </main>

      {/* Agent Sidebar - Always Visible */}
      <AgentSidebar sheetId={sheetId} />

      {/* Sticky Bottom Control Panel */}
      <SheetControls
        events={events ?? []}
        onProcessEvents={handleProcessEvents}
        onRefreshEvents={handleRefreshEvents}
        onDownloadCSV={handleDownloadCSV}
        isProcessing={isProcessingEvents}
      />
    </SheetUpdateContext.Provider>
  );
}
