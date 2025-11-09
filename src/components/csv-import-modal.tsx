'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { api } from '@/trpc/react';
import { useRouter } from 'next/navigation';

interface ParsedData {
  headers: string[];
  rows: string[][];
  fileName: string;
}

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CsvImportModal({ isOpen, onClose }: CsvImportModalProps) {
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const createSheetMutation = api.sheet.createFromCsv.useMutation({
    onSuccess: (sheet) => {
      setIsCreating(false);
      onClose();
      // Navigate to the sheet with a prompt to create a template
      router.push(`/sheets/${sheet.id}?createTemplate=true`);
    },
    onError: (error) => {
      setIsCreating(false);
      setError(`Failed to create sheet: ${error.message}`);
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    setIsUploading(true);
    setError(null);

    Papa.parse(file, {
      complete: (results) => {
        setIsUploading(false);

        if (results.errors.length > 0) {
          setError(`CSV parsing error: ${results.errors[0]?.message}`);
          return;
        }

        const data = results.data as string[][];
        if (data.length === 0) {
          setError('CSV file appears to be empty');
          return;
        }

        const headers = data[0]?.filter(h => h.trim()) || [];
        const rows = data.slice(1).filter(row => row.some(cell => cell.trim()));

        if (headers.length === 0) {
          setError('No valid headers found in CSV');
          return;
        }

        if (rows.length === 0) {
          setError('No data rows found in CSV');
          return;
        }

        setParsedData({
          headers,
          rows: rows.slice(0, 100), // Limit to first 100 rows for preview
          fileName: file.name
        });
      },
      header: false,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      transform: (value) => value.trim()
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    maxFiles: 1
  });

  const handleImport = () => {
    if (!parsedData) return;

    setIsCreating(true);
    setError(null);

    createSheetMutation.mutate({
      name: parsedData.fileName.replace('.csv', ''),
      headers: parsedData.headers,
      rows: parsedData.rows
    });
  };

  const handleClose = () => {
    setParsedData(null);
    setError(null);
    setIsUploading(false);
    setIsCreating(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Import CSV File</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {!parsedData ? (
            <div>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input {...getInputProps()} />
                <div className="space-y-4">
                  <div className="text-6xl">📊</div>
                  <div>
                    <p className="text-lg font-medium text-gray-900">
                      {isDragActive ? 'Drop your CSV file here' : 'Upload a CSV file'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Drag and drop or click to browse
                    </p>
                  </div>
                </div>
              </div>

              {isUploading && (
                <div className="mt-4 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-sm text-gray-600">Parsing CSV...</span>
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Preview: {parsedData.fileName}</h3>
                <p className="text-sm text-gray-600">
                  {parsedData.headers.length} columns, {parsedData.rows.length} rows (showing first 100)
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      {parsedData.headers.map((header, index) => (
                        <th key={index} className="px-3 py-2 text-left font-medium text-gray-900 border-r border-gray-300 last:border-r-0">
                          {header || `Column ${index + 1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.rows.slice(0, 10).map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-t border-gray-200">
                        {parsedData.headers.map((_, colIndex) => (
                          <td key={colIndex} className="px-3 py-2 border-r border-gray-200 last:border-r-0">
                            <div className="max-w-32 truncate">
                              {row[colIndex] || ''}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                    {parsedData.rows.length > 10 && (
                      <tr>
                        <td colSpan={parsedData.headers.length} className="px-3 py-2 text-center text-gray-500 italic">
                          ... and {parsedData.rows.length - 10} more rows
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setParsedData(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Upload Different File
                </button>

                <div className="flex space-x-3">
                  <button
                    onClick={handleClose}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={isCreating}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
                  >
                    {isCreating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating Sheet...
                      </>
                    ) : (
                      'Import & Create Sheet'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}