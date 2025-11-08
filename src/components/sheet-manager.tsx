'use client'

import { TiptapTable } from "@/components/tiptap-table";
import { CountdownTimer } from "@/components/countdown-timer";
import { useState, useCallback, createContext, useContext, useEffect } from "react";
import { api } from "@/trpc/react";

interface SheetUpdateContextType {
  triggerRefresh: () => void;
  lastUpdate: Date | null;
  pendingUpdates: number;
}

const SheetUpdateContext = createContext<SheetUpdateContextType | null>(null);

export function useSheetUpdates() {
  const context = useContext(SheetUpdateContext);
  if (!context) {
    throw new Error('useSheetUpdates must be used within SheetManager');
  }
  return context;
}

export function SheetManager() {
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendingUpdates, setPendingUpdates] = useState(0);
  const [isReady, setIsReady] = useState(false);

  // Test authentication by trying to fetch events once
  const { error: authError, isLoading } = api.cell.getEvents.useQuery(undefined, {
    refetchInterval: false,
    retry: false,
  });

  // Set ready state based on query result
  useEffect(() => {
    if (!isLoading) {
      if (!authError || authError.data?.code !== 'UNAUTHORIZED') {
        setIsReady(true);
      }
    }
  }, [isLoading, authError]);

  const triggerRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  const handleUpdateTick = useCallback(async () => {
    try {
      console.log('Triggering sheet update...');
      const response = await fetch('/api/update-sheet', { method: 'POST' });
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

        // Trigger table refresh
        triggerRefresh();

        // Clear the pending count after a delay
        setTimeout(() => setPendingUpdates(0), 3000);
      }
    } catch (error) {
      console.error('Error updating sheet:', error);
    }
  }, [triggerRefresh]);

  // Show loading state while checking authentication
  if (!isReady && authError?.data?.code === 'UNAUTHORIZED') {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Event Queue Test - Tiptap Table
        </h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-yellow-800 font-semibold">Authentication Required</h3>
          <p className="text-yellow-600 mt-2">
            Please ensure you are signed in to access the collaborative table.
          </p>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Event Queue Test - Tiptap Table
        </h1>
        <div className="flex items-center gap-2 text-gray-600">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <SheetUpdateContext.Provider value={{ triggerRefresh, lastUpdate, pendingUpdates }}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Event Queue Test - Tiptap Table
          </h1>
          <div className="flex items-center gap-4">
            {pendingUpdates > 0 && (
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1 rounded">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                {pendingUpdates} updates applied
              </div>
            )}
            <CountdownTimer
              intervalMs={5000}
              onTick={handleUpdateTick}
              label="Next update"
            />
          </div>
        </div>

        {lastUpdate && (
          <div className="text-sm text-gray-500">
            Last update: {lastUpdate.toLocaleTimeString()}
          </div>
        )}

        <TiptapTable key={refreshKey} />
      </div>
    </SheetUpdateContext.Provider>
  );
}