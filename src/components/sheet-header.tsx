'use client'

import { useState, useCallback } from "react";
import { SheetSelector } from "@/components/sheet-selector";
import { ApiSnippetsDialog } from "@/components/api-snippets-dialog";
import { CountdownTimer } from "@/components/countdown-timer";
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
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { Edit2, Check, X, Trash2 } from "lucide-react";

interface SheetHeaderProps {
  sheetId: string;
  appUrl: string;
  currentSheet?: { id: string; name: string };
  pendingUpdates: number;
  treatRobotsAsHumans: boolean;
  onToggleRobotMode: () => void;
  onUpdateTick: () => void;
  onSelectSheet: (sheetId: string) => void;
}

export function SheetHeader({
  sheetId,
  appUrl,
  currentSheet,
  pendingUpdates,
  treatRobotsAsHumans,
  onToggleRobotMode,
  onUpdateTick,
  onSelectSheet,
}: SheetHeaderProps) {
  const router = useRouter();

  // Title editing state
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingName, setEditingName] = useState("");

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

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

  // Delete handler
  const handleDeleteSheet = useCallback(() => {
    if (confirmText === currentSheet?.name) {
      deleteMutation.mutate({ sheetId });
    }
  }, [confirmText, currentSheet?.name, sheetId, deleteMutation]);

  return (
    <>
      <div className="fixed top-0 left-[var(--sidebar-width)] right-[var(--agent-panel-width)] bg-white border-b border-gray-300 shadow-md z-50">
        <div className="px-8 py-4 space-y-3">
          {/* Title Row */}
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

          {/* Controls Row */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <SheetSelector
                selectedSheetId={sheetId}
                onSelectSheet={onSelectSheet}
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
              onTick={onUpdateTick}
              label="Next update"
              treatRobotsAsHumans={treatRobotsAsHumans}
              onToggleRobotMode={onToggleRobotMode}
            />
          </div>
        </div>
      </div>

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
    </>
  );
}
