'use client'

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SheetEditor } from "@/components/sheet-editor";
import { AppLayout } from "@/components/layout/app-layout";

interface SheetPageWrapperProps {
  sheetId: string;
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  onSignOut: () => void;
}

export function SheetPageWrapper({ sheetId, user, onSignOut }: SheetPageWrapperProps) {
  const router = useRouter();
  const [pendingUpdates, setPendingUpdates] = useState(0);
  const [refreshEventsCallback, setRefreshEventsCallback] = useState<(() => void) | null>(null);
  const [downloadCSVCallback, setDownloadCSVCallback] = useState<(() => void) | null>(null);

  const handleSelectSheet = useCallback((newSheetId: string) => {
    router.push(`/sheets/${newSheetId}`);
  }, [router]);

  // Create a modified SheetEditor component that can expose its callbacks
  const SheetEditorWithCallbacks = () => {
    return (
      <SheetEditor
        sheetId={sheetId}
        onPendingUpdatesChange={setPendingUpdates}
        onRefreshEventsCallback={setRefreshEventsCallback}
        onDownloadCSVCallback={setDownloadCSVCallback}
      />
    );
  };

  return (
    <AppLayout
      user={user}
      onSignOut={onSignOut}
      selectedSheetId={sheetId}
      onSelectSheet={handleSelectSheet}
      pendingUpdates={pendingUpdates}
      refreshEventsCallback={refreshEventsCallback}
      downloadCSVCallback={downloadCSVCallback}
    >
      <SheetEditorWithCallbacks />
    </AppLayout>
  );
}