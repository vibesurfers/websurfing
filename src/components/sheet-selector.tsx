'use client'

import { api } from "@/trpc/react";
import { useState } from "react";

interface SheetSelectorProps {
  selectedSheetId: string | null;
  onSelectSheet: (sheetId: string) => void;
}

export function SheetSelector({ selectedSheetId, onSelectSheet }: SheetSelectorProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newSheetName, setNewSheetName] = useState("");

  const { data: sheets, refetch } = api.sheet.list.useQuery();
  const createSheet = api.sheet.create.useMutation({
    onSuccess: (newSheet) => {
      void refetch();
      onSelectSheet(newSheet.id);
      setIsCreating(false);
      setNewSheetName("");
    },
  });

  const handleCreateSheet = () => {
    if (newSheetName.trim()) {
      createSheet.mutate({ name: newSheetName.trim() });
    }
  };

  if (!sheets || sheets.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">No sheets found</span>
        <button
          onClick={() => setIsCreating(true)}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          Create one
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">Sheet:</span>
      <select
        value={selectedSheetId || ""}
        onChange={(e) => onSelectSheet(e.target.value)}
        className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {sheets.map((sheet) => (
          <option key={sheet.id} value={sheet.id}>
            {sheet.name}
          </option>
        ))}
      </select>

      {isCreating ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newSheetName}
            onChange={(e) => setNewSheetName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateSheet();
              if (e.key === "Escape") {
                setIsCreating(false);
                setNewSheetName("");
              }
            }}
            placeholder="Sheet name"
            className="border border-gray-300 rounded px-2 py-1 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <button
            onClick={handleCreateSheet}
            disabled={!newSheetName.trim() || createSheet.isPending}
            className="text-sm bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {createSheet.isPending ? "..." : "Add"}
          </button>
          <button
            onClick={() => {
              setIsCreating(false);
              setNewSheetName("");
            }}
            className="text-sm text-gray-600 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsCreating(true)}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          + New
        </button>
      )}
    </div>
  );
}
