'use client'

import { TiptapTable } from "@/components/tiptap-table";
import { CountdownTimer } from "@/components/countdown-timer";
import { SheetSelector } from "@/components/sheet-selector";
import { AgentSidebar } from "@/components/agent-sidebar";
import { ApiSnippetsDialog } from "@/components/api-snippets-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState, useCallback, createContext, useContext, useEffect } from "react";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { Edit2, Check, X, Trash2 } from "lucide-react";

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
  const [agentSidebarOpen, setAgentSidebarOpen] = useState(() => {
    // Load from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('agentSidebarOpen');
      return saved === 'true';
    }
    return false;
  });

  // Title editing state
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingName, setEditingName] = useState("");

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  // Persist sidebar state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('agentSidebarOpen', String(agentSidebarOpen));
    }
  }, [agentSidebarOpen]);

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

  // Mutations
  const utils = api.useUtils();

  const renameMutation = api.sheet.rename.useMutation({
    onSuccess: () => {
      setEditingTitle(false);
      void utils.sheet.list.invalidate();
    },
    onError: (error) => {
      alert(`Failed to rename: ${error.message}`);
    },
  });

  const deleteMutation = api.sheet.delete.useMutation({
    onSuccess: () => {
      router.push('/welcome');
    },
    onError: (error) => {
      alert(`Failed to delete: ${error.message}`);
    },
  });

  // Title editing handlers
  const startEditTitle = useCallback(() => {
    if (currentSheet?.name) {
      setEditingTitle(true);
      setEditingName(currentSheet.name);
    }
  }, [currentSheet?.name]);

  const saveTitle = useCallback(() => {
    if (editingName.trim() && currentSheet?.name !== editingName.trim()) {
      renameMutation.mutate({
        sheetId,
        name: editingName.trim(),
      });
    } else {
      setEditingTitle(false);
    }
  }, [editingName, currentSheet?.name, sheetId, renameMutation]);

  const cancelEdit = useCallback(() => {
    setEditingTitle(false);
    setEditingName("");
  }, []);

  // Delete handlers
  const handleDeleteSheet = useCallback(() => {
    if (confirmText === currentSheet?.name) {
      deleteMutation.mutate({ sheetId });
    }
  }, [confirmText, currentSheet?.name, sheetId, deleteMutation]);

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
          <div className="flex items-center gap-3">
            {editingTitle ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="text-3xl font-bold h-12 px-3"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveTitle();
                    if (e.key === 'Escape') cancelEdit();
                  }}
                />
                <Button size="icon-sm" variant="ghost" onClick={saveTitle} disabled={renameMutation.isPending}>
                  <Check className="w-5 h-5 text-green-600" />
                </Button>
                <Button size="icon-sm" variant="ghost" onClick={cancelEdit} disabled={renameMutation.isPending}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3 group">
                <h1 className="text-3xl font-bold text-gray-900">
                  {currentSheet?.name || 'Loading...'}
                </h1>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={startEditTitle}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Edit2 className="w-5 h-5" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => {
                    setDeleteDialogOpen(true);
                    setConfirmText("");
                  }}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <SheetSelector
                selectedSheetId={sheetId}
                onSelectSheet={handleSelectSheet}
              />
              <ApiSnippetsDialog
                sheetId={sheetId}
                sheetName={currentSheet?.name}
                appUrl={appUrl}
              />
              {pendingUpdates > 0 && (
                <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                  {pendingUpdates} updates applied
                </Badge>
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

          <TiptapTable treatRobotsAsHumans={treatRobotsAsHumans} sheetId={sheetId} />
        </div>
      </main>

      {/* Agent Sidebar */}
      <AgentSidebar
        sheetId={sheetId}
        isOpen={agentSidebarOpen}
        onToggle={setAgentSidebarOpen}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Sheet</DialogTitle>
            <DialogDescription>
              This will permanently delete "{currentSheet?.name}" and all its data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Type <strong className="font-semibold text-foreground">{currentSheet?.name}</strong> to confirm:
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type sheet name here"
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSheet}
              disabled={confirmText !== currentSheet?.name || deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Sheet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SheetUpdateContext.Provider>
  );
}
