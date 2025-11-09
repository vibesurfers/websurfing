"use client";

import { Settings2, ChevronRight } from "lucide-react";
import { api } from "@/trpc/react";

interface AgentColumnConfigProps {
  sheetId: string;
}

/**
 * Agent Column Config Panel
 *
 * Displays current column configuration in the agent sidebar.
 * Shows:
 * - Column titles and positions
 * - Data types
 * - Operator types (if configured)
 * - Click to ask agent to modify
 */
export function AgentColumnConfig({ sheetId }: AgentColumnConfigProps) {
  const { data: columns, isLoading } = api.sheet.getColumns.useQuery({ sheetId });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!columns || columns.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Settings2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No columns configured</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {columns.map((col, idx) => (
        <div
          key={col.id}
          className="p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                  {idx}
                </span>
                <span className="font-medium text-gray-900 text-sm">
                  {col.title || `Column ${idx}`}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-600">
                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                  {col.dataType || 'text'}
                </span>

                {col.operatorType && (
                  <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded">
                    {col.operatorType}
                  </span>
                )}
              </div>
            </div>

            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      ))}

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          💡 Ask the agent to add, remove, or reorder columns!
        </p>
      </div>
    </div>
  );
}
