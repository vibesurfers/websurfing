'use client';

import { useState, useEffect, useRef } from "react";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { WebsetsTable } from "@/components/websets-table";

export function WebsetsContent() {
  const router = useRouter();
  const [allSheets, setAllSheets] = useState<any[]>([]);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Query all sheets
  const { data: sheets, isLoading } = api.sheet.list.useQuery();

  const deleteSheet = api.sheet.delete.useMutation({
    onSuccess: () => {
      // Invalidate and refetch
      void api.useUtils().sheet.list.invalidate();
    },
    onError: (error) => {
      console.error('Failed to delete sheet:', error);
      alert('Failed to delete sheet. Please try again.');
    },
  });

  // Update sheets list when data changes
  useEffect(() => {
    if (sheets) {
      setAllSheets(sheets);
    }
  }, [sheets]);

  const handleSheetDelete = (sheetId: string) => {
    deleteSheet.mutate({ sheetId });
  };

  const handleSheetNavigate = (sheetId: string) => {
    router.push(`/sheets/${sheetId}`);
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 max-w-7xl">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">All Websets</h1>
        <p className="text-muted-foreground">
          View and manage all your websets
        </p>
      </div>

      {/* Websets Table */}
      <WebsetsTable
        sheets={allSheets}
        onDelete={handleSheetDelete}
        onNavigate={handleSheetNavigate}
        isLoading={isLoading}
      />
    </div>
  );
}
