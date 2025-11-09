'use client'

import { TiptapTable } from "@/components/tiptap-table";
import { CountdownTimer } from "@/components/countdown-timer";
import { SheetSelector } from "@/components/sheet-selector";
import { WelcomeFlow } from "@/components/welcome-flow";
import { useState, useCallback, createContext, useContext, useEffect } from "react";
import { api } from "@/trpc/react";
import { useRouter, useSearchParams } from "next/navigation";

interface SheetUpdateContextType {
  lastUpdate: Date | null;
  pendingUpdates: number;
  selectedSheetId: string | null;
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [pendingUpdates, setPendingUpdates] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [treatRobotsAsHumans, setTreatRobotsAsHumans] = useState(true);
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(searchParams.get('sheetId'));

  const { data: sheets } = api.sheet.list.useQuery();

  useEffect(() => {
    const sheetIdFromUrl = searchParams.get('sheetId');
    const justCreatedSheet = sessionStorage.getItem('justCreatedSheet');

    if (sheetIdFromUrl) {
      // Always accept the sheet ID from URL if it's a newly created sheet
      // or if it exists in our sheets list
      const isJustCreated = justCreatedSheet === sheetIdFromUrl;
      const existsInList = sheets?.some(s => s.id === sheetIdFromUrl);

      if (isJustCreated || existsInList) {
        if (selectedSheetId !== sheetIdFromUrl) {
          console.log('[SheetManager] Setting selectedSheetId from URL:', sheetIdFromUrl);
          setSelectedSheetId(sheetIdFromUrl);

          // Clear the flag if this is the sheet we just created
          if (isJustCreated) {
            sessionStorage.removeItem('justCreatedSheet');
          }
        }
      }
    } else if (sheets && sheets.length > 0 && !selectedSheetId && !justCreatedSheet) {
      const firstSheet = sheets[0]!.id;
      console.log('[SheetManager] Auto-selecting first sheet:', firstSheet);
      setSelectedSheetId(firstSheet);
      router.replace(`/?sheetId=${firstSheet}`);
    }
  }, [sheets, searchParams, selectedSheetId, router]);

  // Update URL when sheet selection changes
  const handleSelectSheet = useCallback((sheetId: string) => {
    setSelectedSheetId(sheetId);
    router.replace(`/?sheetId=${sheetId}`);
  }, [router]);

  // Test authentication by trying to fetch events once
  const { error: authError, isLoading } = api.cell.getEvents.useQuery(
    selectedSheetId ? { sheetId: selectedSheetId } : undefined,
    {
      enabled: !!selectedSheetId,
      refetchInterval: false,
      retry: false,
    }
  );

  // Set ready state based on query result
  useEffect(() => {
    if (!isLoading) {
      if (!authError || authError.data?.code !== 'UNAUTHORIZED') {
        setIsReady(true);
      }
    }
  }, [isLoading, authError]);

  const handleUpdateTick = useCallback(async () => {
    if (!selectedSheetId) return;

    try {
      console.log('Triggering sheet update for sheet:', selectedSheetId);
      const response = await fetch(`/api/update-sheet?sheetId=${selectedSheetId}`, { method: 'POST' });
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

        // Clear the pending count after a delay
        setTimeout(() => setPendingUpdates(0), 3000);
      }
    } catch (error) {
      console.error('Error updating sheet:', error);
    }
  }, [selectedSheetId]);

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

  if (!selectedSheetId) {
    return <WelcomeFlow />;
  }

  return (
    <SheetUpdateContext.Provider value={{ lastUpdate, pendingUpdates, selectedSheetId }}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Event Queue Test - Tiptap Table
          </h1>
          <div className="flex items-center gap-4">
            <SheetSelector
              selectedSheetId={selectedSheetId}
              onSelectSheet={handleSelectSheet}
            />
            {pendingUpdates > 0 && (
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1 rounded">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                {pendingUpdates} updates applied
              </div>
            )}
          </div>
        </div>

        {lastUpdate && (
          <div className="text-sm text-gray-500">
            Last update: {lastUpdate.toLocaleTimeString()}
          </div>
        )}

        {selectedSheetId && (
          <TiptapTable
            treatRobotsAsHumans={treatRobotsAsHumans}
            sheetId={selectedSheetId}
            onUpdateTick={handleUpdateTick}
            onToggleRobotMode={() => setTreatRobotsAsHumans(!treatRobotsAsHumans)}
          />
        )}
      </div>
    </SheetUpdateContext.Provider>
  );
}