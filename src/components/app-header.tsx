'use client';

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { CsvImportModal } from "./csv-import-modal";

export function AppHeader() {
  const [showCsvImport, setShowCsvImport] = useState(false);

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <Image
              src="/vibesurfers-logo.svg"
              alt="VibeSurfing Logo"
              width={32}
              height={32}
              className="rounded"
            />
            <span className="text-xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
              VibeSurfing
            </span>
          </Link>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowCsvImport(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              <span>📊</span>
              <span>Import CSV</span>
            </button>
            <Link
              href="/templates/new"
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <span>✨</span>
              <span>New Template</span>
            </Link>
          </div>
        </div>
      </header>

      <CsvImportModal
        isOpen={showCsvImport}
        onClose={() => setShowCsvImport(false)}
      />
    </>
  );
}