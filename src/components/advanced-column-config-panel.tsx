"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Trash2, MoveUp, MoveDown, Check, X } from "lucide-react";
import { api } from "@/trpc/react";

interface ColumnConfigData {
  id: string;
  title: string;
  position: number;
  dataType: string | null;
  operatorType: string | null;
  operatorConfig: any;
  prompt: string | null;
  dependencies: number[] | null;
  isRequired: boolean | null;
  defaultValue: string | null;
}

interface AdvancedColumnConfigPanelProps {
  sheetId: string;
}

/**
 * Advanced Column Config Panel
 *
 * Full-featured column editor matching the template builder UI
 * Allows editing all column properties: operator, prompt, dependencies, data type, etc.
 */
export function AdvancedColumnConfigPanel({ sheetId }: AdvancedColumnConfigPanelProps) {
  const [expandedColumns, setExpandedColumns] = useState<Set<string>>(new Set());
  const [editingColumn, setEditingColumn] = useState<string | null>(null);

  const utils = api.useUtils();
  const { data: columns, isLoading } = api.columnConfig.getColumnConfig.useQuery({ sheetId });

  const updateConfig = api.columnConfig.updateColumnConfig.useMutation({
    onSuccess: () => {
      setEditingColumn(null);
      void utils.columnConfig.getColumnConfig.invalidate({ sheetId });
      void utils.sheet.getColumns.invalidate({ sheetId });
    },
  });

  const toggleExpand = (columnId: string) => {
    const newSet = new Set(expandedColumns);
    if (newSet.has(columnId)) {
      newSet.delete(columnId);
    } else {
      newSet.add(columnId);
    }
    setExpandedColumns(newSet);
  };

  const handleUpdate = (columnId: string, updates: Partial<ColumnConfigData>) => {
    updateConfig.mutate({
      sheetId,
      columnId,
      ...updates,
    });
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" /></div>;
  }

  if (!columns || columns.length === 0) {
    return <div className="text-center py-8 text-gray-500 text-sm">No columns configured</div>;
  }

  return (
    <div className="space-y-3">
      {columns.map((col, idx) => {
        const isExpanded = expandedColumns.has(col.id);
        const isEditing = editingColumn === col.id;

        return (
          <div
            key={col.id}
            className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden"
          >
            {/* Column Header */}
            <div className="bg-gray-50 px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-xs font-mono text-gray-500 bg-white px-2 py-0.5 rounded border">
                  #{idx + 1}
                </span>
                <span className="font-medium text-sm text-gray-900">
                  {col.title}
                </span>
                {col.isRequired && (
                  <span className="text-xs text-red-600 font-medium">*</span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleExpand(col.id)}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  title={isExpanded ? "Collapse" : "Expand"}
                >
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-600" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="p-4 space-y-4">
                {/* Operator Type - Visual Cards */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    Operator Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'google_search', icon: '🔍', label: 'Google Search', desc: 'Search the web' },
                      { value: 'url_context', icon: '🌐', label: 'URL Content', desc: 'Extract from URLs' },
                      { value: 'structured_output', icon: '📊', label: 'Structured Data', desc: 'Extract specific data' },
                      { value: '', icon: '🤖', label: 'Auto-detect', desc: 'AI chooses' },
                    ].map((op) => (
                      <button
                        key={op.value}
                        onClick={() => handleUpdate(col.id, { operatorType: op.value || null })}
                        className={`p-2 border-2 rounded-lg text-left transition-all ${
                          (col.operatorType || '') === op.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-lg mb-0.5">{op.icon}</div>
                        <div className="text-xs font-medium text-gray-900">{op.label}</div>
                        <div className="text-xs text-gray-500">{op.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* AI Prompt */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    AI Prompt
                  </label>
                  <textarea
                    value={col.prompt || ''}
                    onChange={(e) => handleUpdate(col.id, { prompt: e.target.value })}
                    placeholder="e.g., 'Search for the company website based on the company name'"
                    className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>

                {/* Data Type - Pill Buttons */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    Data Type
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'text', icon: '📝', label: 'Text' },
                      { value: 'url', icon: '🔗', label: 'URL' },
                      { value: 'email', icon: '📧', label: 'Email' },
                      { value: 'number', icon: '🔢', label: 'Number' },
                      { value: 'json', icon: '{ }', label: 'JSON' },
                    ].map((dt) => (
                      <button
                        key={dt.value}
                        onClick={() => handleUpdate(col.id, { dataType: dt.value })}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          col.dataType === dt.value
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <span className="mr-1">{dt.icon}</span>
                        {dt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dependencies */}
                {idx > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">
                      Dependencies (requires these columns first)
                    </label>
                    <div className="space-y-1.5 bg-gray-50 rounded p-2">
                      {columns.slice(0, idx).map((prevCol) => {
                        const deps = (col.dependencies || []) as number[];
                        const isChecked = deps.includes(prevCol.position);

                        return (
                          <label key={prevCol.id} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const newDeps = e.target.checked
                                  ? [...deps, prevCol.position]
                                  : deps.filter(d => d !== prevCol.position);
                                handleUpdate(col.id, { dependencies: newDeps });
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-xs text-gray-700">
                              #{prevCol.position + 1} {prevCol.title}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Required Toggle */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={col.isRequired || false}
                    onChange={(e) => handleUpdate(col.id, { isRequired: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label className="text-xs font-medium text-gray-700">
                    Required field
                  </label>
                </div>

                {/* Default Value */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Default Value (optional)
                  </label>
                  <input
                    type="text"
                    value={col.defaultValue || ''}
                    onChange={(e) => handleUpdate(col.id, { defaultValue: e.target.value })}
                    placeholder="e.g., N/A"
                    className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Help */}
      <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-900 font-medium mb-1">
          ✨ Pro Tips:
        </p>
        <ul className="text-xs text-blue-800 space-y-0.5">
          <li>• Click operator cards to change AI behavior</li>
          <li>• Set dependencies to process columns in order</li>
          <li>• Use custom prompts for precise data extraction</li>
          <li>• Ask the agent: "make Rating extract only numbers"</li>
        </ul>
      </div>
    </div>
  );
}
