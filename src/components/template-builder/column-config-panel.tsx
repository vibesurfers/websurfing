'use client';

import { useState, useEffect } from "react";

export interface ColumnConfig {
  id: string;
  title: string;
  position: number;
  operatorType: 'google_search' | 'url_context' | 'structured_output' | 'function_calling';
  prompt: string;
  dataType: 'text' | 'url' | 'email' | 'number' | 'json';
  dependencies: number[];
  isRequired: boolean;
  operatorConfig?: Record<string, any>;
}

interface ColumnConfigPanelProps {
  column: ColumnConfig;
  allColumns: ColumnConfig[];
  onChange: (column: ColumnConfig) => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

const OPERATOR_OPTIONS = [
  {
    value: 'google_search',
    label: 'Google Search',
    description: 'Search the web and return URLs and snippets',
    icon: '🔍',
  },
  {
    value: 'url_context',
    label: 'URL Content',
    description: 'Fetch and extract content from URLs',
    icon: '🌐',
  },
  {
    value: 'structured_output',
    label: 'Structured Data',
    description: 'Extract and format data into JSON',
    icon: '📊',
  },
  {
    value: 'function_calling',
    label: 'Function Calling',
    description: 'Call custom functions (advanced)',
    icon: '⚙️',
  },
] as const;

const DATA_TYPE_OPTIONS = [
  { value: 'text', label: 'Text', icon: '📝' },
  { value: 'url', label: 'URL', icon: '🔗' },
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'number', label: 'Number', icon: '🔢' },
  { value: 'json', label: 'JSON', icon: '{ }' },
] as const;

export function ColumnConfigPanel({
  column,
  allColumns,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}: ColumnConfigPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Columns to the left that this column can depend on
  const availableDependencies = allColumns.filter(
    (col) => col.position < column.position
  );

  const selectedOperator = OPERATOR_OPTIONS.find(
    (op) => op.value === column.operatorType
  );

  return (
    <div className="border border-gray-200 rounded-lg bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-t-lg">
        <div className="flex items-center space-x-3 flex-1">
          <div className="flex flex-col space-y-1">
            <button
              onClick={onMoveUp}
              disabled={!onMoveUp}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ▲
            </button>
            <button
              onClick={onMoveDown}
              disabled={!onMoveDown}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ▼
            </button>
          </div>

          <div className="flex items-center space-x-2 flex-1">
            <span className="text-sm font-medium text-gray-500">
              #{column.position + 1}
            </span>
            <input
              type="text"
              value={column.title}
              onChange={(e) => onChange({ ...column, title: e.target.value })}
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Column Title"
            />
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-gray-600"
          >
            {isExpanded ? '−' : '+'}
          </button>
        </div>

        <button
          onClick={onDelete}
          className="ml-4 text-red-500 hover:text-red-700 font-medium text-sm"
        >
          Delete
        </button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Operator Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Operator Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {OPERATOR_OPTIONS.map((op) => (
                <button
                  key={op.value}
                  onClick={() =>
                    onChange({ ...column, operatorType: op.value })
                  }
                  className={`p-3 border-2 rounded-lg text-left transition-all ${
                    column.operatorType === op.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">{op.icon}</span>
                    <div>
                      <div className="font-medium text-sm">{op.label}</div>
                      <div className="text-xs text-gray-500">
                        {op.description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI Prompt
              <span className="text-gray-400 font-normal ml-2">
                (How should the AI fill this column?)
              </span>
            </label>
            <textarea
              value={column.prompt}
              onChange={(e) => onChange({ ...column, prompt: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              placeholder={`e.g., "Search for the company website based on the company name" or "Extract contact email addresses from the webpage"`}
            />
          </div>

          {/* Data Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expected Data Type
            </label>
            <div className="flex space-x-2">
              {DATA_TYPE_OPTIONS.map((type) => (
                <button
                  key={type.value}
                  onClick={() => onChange({ ...column, dataType: type.value })}
                  className={`px-3 py-2 border-2 rounded-lg text-sm font-medium transition-all ${
                    column.dataType === type.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-1">{type.icon}</span>
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dependencies */}
          {availableDependencies.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dependencies
                <span className="text-gray-400 font-normal ml-2">
                  (Which columns does this column use?)
                </span>
              </label>
              <div className="space-y-2">
                {availableDependencies.map((dep) => (
                  <label
                    key={dep.id}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={column.dependencies.includes(dep.position)}
                      onChange={(e) => {
                        const newDeps = e.target.checked
                          ? [...column.dependencies, dep.position]
                          : column.dependencies.filter(
                              (d) => d !== dep.position
                            );
                        onChange({ ...column, dependencies: newDeps });
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      #{dep.position + 1} {dep.title}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Required Toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={column.isRequired}
                onChange={(e) =>
                  onChange({ ...column, isRequired: e.target.checked })
                }
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Required field
              </span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
