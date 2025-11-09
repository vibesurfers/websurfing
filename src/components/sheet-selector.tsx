'use client'

import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";

interface SheetSelectorProps {
  selectedSheetId: string | null;
  onSelectSheet: (sheetId: string) => void;
}

export function SheetSelector({ selectedSheetId, onSelectSheet }: SheetSelectorProps) {
  const router = useRouter();
  const { data: sheets } = api.sheet.list.useQuery();

  if (!sheets || sheets.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">No sheets found</span>
        <button
          onClick={() => router.push('/welcome')}
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
        value={selectedSheetId ?? ""}
        onChange={(e) => onSelectSheet(e.target.value)}
        className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {sheets.map((sheet) => (
          <option key={sheet.id} value={sheet.id}>
            {sheet.name}
          </option>
        ))}
      </select>

      <button
        onClick={() => router.push('/welcome')}
        className="text-sm text-blue-600 hover:text-blue-700"
      >
        + New
      </button>
    </div>
  );
}
