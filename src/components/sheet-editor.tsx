'use client'

import { TiptapTable } from "@/components/tiptap-table";
import { CountdownTimer } from "@/components/countdown-timer";
import { AppHeader } from "@/components/app-header";
import { useState, useCallback, createContext, useContext, useEffect } from "react";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

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
}

export function SheetEditor({ sheetId }: SheetEditorProps) {
  const router = useRouter();
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [pendingUpdates, setPendingUpdates] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [treatRobotsAsHumans, setTreatRobotsAsHumans] = useState(true);
  const [refreshEventsCallback, setRefreshEventsCallback] = useState<(() => void) | null>(null);
  const [downloadCSVCallback, setDownloadCSVCallback] = useState<(() => void) | null>(null);

  const { data: sheets } = api.sheet.list.useQuery();

  const { error: authError, isLoading } = api.cell.getEvents.useQuery(
    { sheetId },
    {
      enabled: !!sheetId,
      refetchInterval: false,
      retry: false,
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
      <div className="min-h-screen bg-white">
        <AppHeader
          selectedSheetId={sheetId}
          onSelectSheet={handleSelectSheet}
          pendingUpdates={pendingUpdates}
          onRefreshEvents={refreshEventsCallback}
          onDownloadCSV={downloadCSVCallback}
        />

        <main className="w-full px-8 py-8">
          <div className="space-y-6">
            {lastUpdate && (
              <div className="text-sm text-gray-500">
                Last update: {lastUpdate.toLocaleTimeString()}
              </div>
            )}

            <TiptapTable
              treatRobotsAsHumans={treatRobotsAsHumans}
              sheetId={sheetId}
              onUpdateTick={handleUpdateTick}
              onToggleRobotMode={() => setTreatRobotsAsHumans(!treatRobotsAsHumans)}
              onRefreshEvents={setRefreshEventsCallback}
              onDownloadCSV={setDownloadCSVCallback}
            />
          </div>
        </main>
      </div>
    </SheetUpdateContext.Provider>
  );
}
