"use client";

import { useState } from "react";
import { CheckCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react";

interface PreviewCardProps {
  preview: {
    type: string;
    data: any;
  };
  sheetId: string;
  onConfirm?: (previewId: string) => void;
  onCancel?: (previewId: string) => void;
}

/**
 * Preview Card Component
 *
 * Displays a preview of bulk operations before execution.
 * Types:
 * - Bulk Row Creation
 * - Add Column
 * - CSV Import
 *
 * Shows:
 * - Summary (row count, column names)
 * - Sample data
 * - Confirm/Cancel buttons
 */
export function PreviewCard({ preview, sheetId, onConfirm, onCancel }: PreviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { type, data } = preview;

  // Render different preview types
  const renderPreview = () => {
    switch (type) {
      case "bulk_rows":
        return (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="font-semibold text-gray-900">Bulk Row Creation</h4>
                <p className="text-sm text-gray-600">
                  {data.rowCount} rows • {data.columns?.length || 0} columns
                </p>
              </div>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Sample rows */}
            {data.sample && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-gray-600 mb-1">
                  Sample (first 3 rows):
                </p>
                <div className="bg-white rounded border border-gray-200 p-2 text-xs font-mono">
                  {data.sample.slice(0, 3).map((row: any, idx: number) => (
                    <div key={idx} className="mb-1">
                      <span className="text-gray-500">{idx + 1}.</span>{" "}
                      {Object.values(row.cells || row).join(" • ")}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Full data (when expanded) */}
            {isExpanded && data.rows && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-gray-600 mb-1">
                  All {data.rows.length} rows:
                </p>
                <div className="bg-white rounded border border-gray-200 p-2 text-xs font-mono max-h-60 overflow-y-auto">
                  {data.rows.map((row: any, idx: number) => (
                    <div key={idx} className="mb-1">
                      <span className="text-gray-500">{idx + 1}.</span>{" "}
                      {Object.values(row.cells || row).join(" • ")}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case "add_column":
        return (
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Add Column</h4>
            <div className="bg-white rounded border border-gray-200 p-3 text-sm">
              <p>
                <span className="font-medium">Title:</span> {data.title}
              </p>
              <p>
                <span className="font-medium">Position:</span> {data.position}
              </p>
              <p>
                <span className="font-medium">Type:</span> {data.dataType}
              </p>
            </div>
          </div>
        );

      case "csv_import":
        return (
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">CSV Import</h4>
            <div className="bg-white rounded border border-gray-200 p-3 text-sm">
              <p>
                <span className="font-medium">Rows:</span> {data.rowCount}
              </p>
              <p>
                <span className="font-medium">Columns:</span>{" "}
                {data.columns?.join(", ")}
              </p>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-sm text-gray-600">
            Preview type: {type}
          </div>
        );
    }
  };

  return (
    <div className="border-2 border-blue-300 rounded-lg p-3 bg-blue-50">
      {renderPreview()}

      {/* Action buttons */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => onConfirm?.(data.previewId)}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm font-medium"
        >
          <CheckCircle className="w-4 h-4" />
          Confirm
        </button>
        <button
          onClick={() => onCancel?.(data.previewId)}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-sm font-medium"
        >
          <XCircle className="w-4 h-4" />
          Cancel
        </button>
      </div>

      <p className="text-xs text-gray-600 mt-2 text-center">
        Review the changes and click Confirm to proceed
      </p>
    </div>
  );
}
