'use client'

import { TiptapTable } from "@/components/tiptap-table";
import { CountdownTimer } from "@/components/countdown-timer";
import { SheetSelector } from "@/components/sheet-selector";
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
  showTemplatePrompt?: boolean;
}

export function SheetEditor({ sheetId, showTemplatePrompt }: SheetEditorProps) {
  const router = useRouter();
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [pendingUpdates, setPendingUpdates] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [treatRobotsAsHumans, setTreatRobotsAsHumans] = useState(true);
  const [showTemplatePromptBanner, setShowTemplatePromptBanner] = useState(showTemplatePrompt);


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
      <main className="container mx-auto p-8 min-h-screen bg-white">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">
              VibeSurfing - Web Search Spreadsheets
            </h1>
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/welcome')}
                className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                All Sheets
              </button>
              <button
                onClick={() => signOut()}
                className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <SheetSelector
                selectedSheetId={sheetId}
                onSelectSheet={handleSelectSheet}
              />
              {pendingUpdates > 0 && (
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1 rounded">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  {pendingUpdates} updates applied
                </div>
              )}
            </div>
            <CountdownTimer
              intervalMs={5000}
              onTick={handleUpdateTick}
              label="Next update"
              treatRobotsAsHumans={treatRobotsAsHumans}
              onToggleRobotMode={() => setTreatRobotsAsHumans(!treatRobotsAsHumans)}
            />
          </div>

          {lastUpdate && (
            <div className="text-sm text-gray-500">
              Last update: {lastUpdate.toLocaleTimeString()}
            </div>
          )}

          {showTemplatePromptBanner && (
            <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-start space-x-4">
                  <div className="text-4xl">🚀</div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Great! Your CSV data is imported
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Now create an intelligent template to automatically enrich your data with AI-powered searches, web scraping, and data extraction.
                    </p>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => router.push('/templates/new')}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        ✨ Create Enrichment Template
                      </button>
                      <button
                        onClick={() => setShowTemplatePromptBanner(false)}
                        className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Later
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowTemplatePromptBanner(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          <TiptapTable treatRobotsAsHumans={treatRobotsAsHumans} sheetId={sheetId} />
        </div>
      </main>
    </SheetUpdateContext.Provider>
  );
}
