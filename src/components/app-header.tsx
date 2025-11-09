'use client'

import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, Plus, RefreshCw, Download } from "lucide-react";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface AppHeaderProps {
  selectedSheetId: string | null;
  onSelectSheet: (sheetId: string) => void;
  pendingUpdates?: number;
  onRefreshEvents?: () => void;
  onDownloadCSV?: () => void;
}

export function AppHeader({ selectedSheetId, onSelectSheet, pendingUpdates, onRefreshEvents, onDownloadCSV }: AppHeaderProps) {
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: sheets } = api.sheet.list.useQuery();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedSheet = sheets?.find(sheet => sheet.id === selectedSheetId);

  return (
    <header className="w-full bg-white border-b border-gray-200 shadow-sm">
      <div className="px-8 h-16 flex items-center justify-between">
        {/* Left side - Sheet selector */}
        <div className="flex items-center gap-4">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-3 px-4 py-2 h-12 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors min-w-[320px] justify-between"
            >
              <span className="text-sm font-medium text-gray-900 truncate">
                {selectedSheet ? selectedSheet.name : 'Select a sheet...'}
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${
                isDropdownOpen ? 'rotate-180' : ''
              }`} />
            </button>

            {/* Dropdown menu */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                {sheets && sheets.length > 0 ? (
                  sheets.map((sheet) => (
                    <button
                      key={sheet.id}
                      onClick={() => {
                        onSelectSheet(sheet.id);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                        selectedSheetId === sheet.id ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                      }`}
                    >
                      <div className="font-medium">{sheet.name}</div>
                      {sheet.description && (
                        <div className="text-xs text-gray-500 mt-1">{sheet.description}</div>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-gray-500">
                    No sheets found
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Pending updates indicator */}
          {pendingUpdates && pendingUpdates > 0 && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              {pendingUpdates} updates applied
            </div>
          )}
        </div>

        {/* Right side - Action buttons */}
        <div className="flex items-center gap-3">
          <Button
            onClick={onRefreshEvents || undefined}
            variant="secondary"
            className="flex items-center gap-2 h-10"
            disabled={!onRefreshEvents}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Events
          </Button>

          <Button
            onClick={onDownloadCSV || undefined}
            variant="outline"
            className="bg-green-50 hover:bg-green-100 border-green-300 text-green-700 h-10"
            disabled={!onDownloadCSV}
          >
            <Download className="h-4 w-4 mr-2" />
            Download CSV
          </Button>

          <button
            onClick={() => router.push('/welcome')}
            className="flex items-center gap-2 px-4 py-2 h-10 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Sheet
          </button>
        </div>
      </div>
    </header>
  );
}