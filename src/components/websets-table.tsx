"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MoreVertical, Trash2, ExternalLink, Sparkles, Edit2, Check, X } from "lucide-react";
import { format } from "date-fns";
import { api } from "@/trpc/react";

interface Sheet {
  id: string;
  name: string;
  templateType: string | null;
  isAutonomous: boolean | null;
  createdAt: Date | null;
}

interface WebsetsTableProps {
  sheets: Sheet[];
  onDelete: (sheetId: string) => void;
  onNavigate: (sheetId: string) => void;
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

export function WebsetsTable({
  sheets,
  onDelete,
  onNavigate,
  isLoading = false,
  hasMore = false,
  onLoadMore,
}: WebsetsTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sheetToDelete, setSheetToDelete] = useState<string | null>(null);
  const [editingSheetId, setEditingSheetId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const observerTarget = useRef<HTMLTableRowElement>(null);

  // Rename mutation
  const utils = api.useUtils();
  const renameMutation = api.sheet.rename.useMutation({
    onSuccess: () => {
      setEditingSheetId(null);
      void utils.sheet.list.invalidate();
    },
    onError: (error) => {
      alert(`Failed to rename: ${error.message}`);
    },
  });

  // Infinite scroll observer
  useEffect(() => {
    if (!observerTarget.current || !hasMore || !onLoadMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isLoading) {
          onLoadMore();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(observerTarget.current);

    return () => observer.disconnect();
  }, [hasMore, isLoading, onLoadMore]);

  const handleDeleteClick = useCallback((sheetId: string) => {
    setSheetToDelete(sheetId);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (sheetToDelete) {
      onDelete(sheetToDelete);
      setDeleteDialogOpen(false);
      setSheetToDelete(null);
    }
  }, [sheetToDelete, onDelete]);

  const startEdit = useCallback((sheetId: string, currentName: string) => {
    setEditingSheetId(sheetId);
    setEditingName(currentName);
  }, []);

  const saveEdit = useCallback(() => {
    if (editingSheetId && editingName.trim()) {
      renameMutation.mutate({
        sheetId: editingSheetId,
        name: editingName.trim(),
      });
    }
  }, [editingSheetId, editingName, renameMutation]);

  const cancelEdit = useCallback(() => {
    setEditingSheetId(null);
    setEditingName("");
  }, []);

  const getTemplateLabel = (templateType: string | null) => {
    if (!templateType) return "Custom";

    const labels: Record<string, string> = {
      lucky: "I'm Feeling Lucky",
      marketing: "Marketing Analysis",
      scientific: "Scientific Research",
    };

    return labels[templateType] || templateType;
  };

  if (sheets.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground text-sm">
          No websets yet. Create one from a template to get started!
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Name</TableHead>
              <TableHead className="w-[25%]">Template</TableHead>
              <TableHead className="w-[25%]">Created</TableHead>
              <TableHead className="w-[10%] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sheets.map((sheet, index) => (
              <TableRow
                key={sheet.id}
                ref={index === sheets.length - 1 ? observerTarget : null}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onNavigate(sheet.id)}
              >
                <TableCell className="font-medium" onClick={(e) => e.stopPropagation()}>
                  {editingSheetId === sheet.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="h-8"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit();
                          if (e.key === 'Escape') cancelEdit();
                        }}
                      />
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={saveEdit}
                        disabled={renameMutation.isPending}
                      >
                        <Check className="w-4 h-4 text-green-600" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={cancelEdit}
                        disabled={renameMutation.isPending}
                      >
                        <X className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group">
                      <span>{sheet.name}</span>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => startEdit(sheet.id, sheet.name)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      {sheet.isAutonomous && (
                        <Badge variant="secondary" className="text-xs">
                          <Sparkles className="w-3 h-3 mr-1" />
                          Auto
                        </Badge>
                      )}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {getTemplateLabel(sheet.templateType)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {sheet.createdAt ? format(new Date(sheet.createdAt), "MMM d, yyyy") : "N/A"}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate(sheet.id);
                        }}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(sheet.id);
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}

            {isLoading && (
              <>
                {[...Array(3)].map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    <TableCell>
                      <Skeleton className="h-4 w-[200px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-[120px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-[100px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-8 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))}
              </>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Webset</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this webset? This action cannot be undone
              and will delete all associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
