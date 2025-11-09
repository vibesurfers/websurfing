"use client";

import { useState } from "react";
import { Save, Edit2, X, Check } from "lucide-react";
import { api } from "@/trpc/react";

interface EditableColumnConfigProps {
  sheetId: string;
}

/**
 * Editable Column Config Panel
 *
 * Allows users to customize AI operator behavior for each column:
 * - Operator type (google_search, url_context, structured_output, function_calling)
 * - Custom prompts (instructions for the AI)
 * - Operator-specific config (advanced JSON)
 */
export function EditableColumnConfig({ sheetId }: EditableColumnConfigProps) {
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    operatorType: string;
    prompt: string;
  }>({ operatorType: '', prompt: '' });

  const utils = api.useUtils();
  const { data: columns, isLoading } = api.columnConfig.getColumnConfig.useQuery({ sheetId });

  const updateConfig = api.columnConfig.updateColumnConfig.useMutation({
    onSuccess: () => {
      setEditingColumnId(null);
      void utils.columnConfig.getColumnConfig.invalidate({ sheetId });
      void utils.sheet.getColumns.invalidate({ sheetId });
    },
    onError: (error) => {
      alert(`Failed to update: ${error.message}`);
    },
  });

  const startEdit = (columnId: string, operatorType?: string | null, prompt?: string | null) => {
    setEditingColumnId(columnId);
    setEditForm({
      operatorType: operatorType || 'structured_output',
      prompt: prompt || '',
    });
  };

  const saveEdit = (columnId: string) => {
    updateConfig.mutate({
      sheetId,
      columnId,
      operatorType: editForm.operatorType || null,
      prompt: editForm.prompt.trim() || null,
    });
  };

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
        <p className="text-sm">No columns configured</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {columns.map((col, idx) => {
        const isEditing = editingColumnId === col.id;

        return (
          <div
            key={col.id}
            className={`p-3 border rounded-lg transition-all ${
              isEditing
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            {/* Column Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                    {idx}
                  </span>
                  <span className="font-medium text-gray-900 text-sm">
                    {col.title || `Column ${idx}`}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({col.dataType})
                  </span>
                </div>
              </div>

              {!isEditing && (
                <button
                  onClick={() => startEdit(col.id, col.operatorType, col.prompt)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="Edit column config"
                >
                  <Edit2 className="w-3.5 h-3.5 text-gray-600" />
                </button>
              )}
            </div>

            {/* View Mode */}
            {!isEditing && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">Operator:</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    col.operatorType
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {col.operatorType || 'auto-detect'}
                  </span>
                </div>

                {col.prompt && (
                  <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                    <span className="font-medium">Prompt:</span> {col.prompt}
                  </div>
                )}

                {!col.operatorType && !col.prompt && (
                  <p className="text-xs text-gray-400 italic">
                    Using auto-detection
                  </p>
                )}
              </div>
            )}

            {/* Edit Mode */}
            {isEditing && (
              <div className="space-y-3">
                {/* Operator Type Selector */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Operator Type
                  </label>
                  <select
                    value={editForm.operatorType}
                    onChange={(e) => setEditForm({ ...editForm, operatorType: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Auto-detect</option>
                    <option value="google_search">Google Search</option>
                    <option value="url_context">URL Context</option>
                    <option value="structured_output">Structured Output</option>
                    <option value="function_calling">Function Calling</option>
                  </select>
                </div>

                {/* Custom Prompt */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Custom Prompt (optional)
                  </label>
                  <textarea
                    value={editForm.prompt}
                    onChange={(e) => setEditForm({ ...editForm, prompt: e.target.value })}
                    placeholder="e.g., Extract only the phone number in format (555) 123-4567"
                    className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => saveEdit(col.id)}
                    disabled={updateConfig.isPending}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
                  >
                    <Check className="w-3 h-3" />
                    Save
                  </button>
                  <button
                    onClick={() => setEditingColumnId(null)}
                    className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Help Text */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800 font-medium mb-1">
          💡 Operator Types:
        </p>
        <ul className="text-xs text-blue-700 space-y-0.5">
          <li>• <strong>Google Search</strong>: Web search with grounding</li>
          <li>• <strong>URL Context</strong>: Extract content from URLs</li>
          <li>• <strong>Structured Output</strong>: Extract specific data</li>
          <li>• <strong>Auto-detect</strong>: AI chooses based on content</li>
        </ul>
      </div>

      <div className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
        <p className="text-xs text-purple-800">
          ✨ <strong>Tip:</strong> Ask the agent to modify settings!
          <br />
          <span className="text-purple-700">e.g., "make the Rating column extract only star ratings"</span>
        </p>
      </div>
    </div>
  );
}
