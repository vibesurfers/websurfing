"use client";

import { useState } from "react";
import { api } from "@/trpc/react";

/**
 * Spreadsheet Agent Test Page
 * Comprehensive testing interface for all agent tools
 */
export default function AgentTestPage() {
  const [message, setMessage] = useState("");
  const [sheetId, setSheetId] = useState("47063561-2103-4db9-9e4e-f09967f38826"); // Default test sheet
  const [threadId, setThreadId] = useState<string | null>(null);

  // Agent chat
  const chatMutation = api.spreadsheetAgentTest.chat.useMutation();

  // Tool tests
  const [testSheetId, setTestSheetId] = useState("47063561-2103-4db9-9e4e-f09967f38826");
  const sheetReaderQuery = api.spreadsheetAgentTest.testSheetReader.useQuery(
    { sheetId: testSheetId },
    { enabled: false }
  );

  const [mapsQuery, setMapsQuery] = useState({ placeType: "pizza restaurant", location: "San Francisco" });
  const mapsTest = api.spreadsheetAgentTest.testGoogleMaps.useQuery(
    { ...mapsQuery, maxResults: 5 },
    { enabled: false }
  );

  const [searchQuery, setSearchQuery] = useState("best hackerspaces in Palo Alto");
  const searchTest = api.spreadsheetAgentTest.testGoogleSearch.useQuery(
    { query: searchQuery, maxResults: 5 },
    { enabled: false }
  );

  const previewTest = api.spreadsheetAgentTest.testSheetWriterPreview.useQuery(
    { sheetId: testSheetId, sampleRows: 3 },
    { enabled: false }
  );

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    try {
      const result = await chatMutation.mutateAsync({
        message: message.trim(),
        sheetId: sheetId || undefined,
        threadId: threadId || undefined,
      });

      if (result.threadId && !threadId) {
        setThreadId(result.threadId);
      }

      setMessage("");
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">
        Spreadsheet Agent Test Suite 🏄‍♂️
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent Chat */}
        <div className="border border-gray-300 rounded-lg p-6 bg-white shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Agent Chat</h2>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sheet ID (optional)
            </label>
            <input
              type="text"
              value={sheetId}
              onChange={(e) => setSheetId(e.target.value)}
              placeholder="Leave empty for general chat"
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            />
          </div>

          {chatMutation.data && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <p className="font-semibold text-blue-900 mb-2">Agent:</p>
              <p className="text-gray-800 whitespace-pre-wrap">{chatMutation.data.response}</p>
            </div>
          )}

          {chatMutation.isError && (
            <div className="mb-4 p-4 bg-red-50 rounded-lg">
              <p className="font-semibold text-red-900 mb-2">Error:</p>
              <p className="text-red-700">{chatMutation.error.message}</p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Try: 'find top 5 pizzas in SF' or 'read the sheet'"
              className="w-full px-3 py-2 border border-gray-300 rounded resize-none"
              rows={3}
            />
            <button
              onClick={handleSendMessage}
              disabled={!message.trim() || chatMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
            >
              {chatMutation.isPending ? "Sending..." : "Send"}
            </button>
          </div>

          {threadId && (
            <p className="text-xs text-gray-500 mt-2">Thread: {threadId}</p>
          )}
        </div>

        {/* Tool Tests */}
        <div className="space-y-4">
          {/* Sheet Reader Test */}
          <div className="border border-gray-300 rounded-lg p-4 bg-white shadow-sm">
            <h3 className="font-semibold mb-2">Sheet Reader Tool</h3>
            <input
              type="text"
              value={testSheetId}
              onChange={(e) => setTestSheetId(e.target.value)}
              placeholder="Sheet ID"
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-2"
            />
            <button
              onClick={() => sheetReaderQuery.refetch()}
              disabled={sheetReaderQuery.isFetching}
              className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:bg-gray-300 w-full"
            >
              {sheetReaderQuery.isFetching ? "Reading..." : "Test Sheet Reader"}
            </button>
            {sheetReaderQuery.data && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                <p className="font-medium">Sheet: {sheetReaderQuery.data.sheet?.name}</p>
                <p>Columns: {sheetReaderQuery.data.columnCount}</p>
                <p>Rows: {sheetReaderQuery.data.rowCount}</p>
                {sheetReaderQuery.data.error && (
                  <p className="text-red-600">{sheetReaderQuery.data.error}</p>
                )}
              </div>
            )}
          </div>

          {/* Google Maps Test */}
          <div className="border border-gray-300 rounded-lg p-4 bg-white shadow-sm">
            <h3 className="font-semibold mb-2">Google Maps Tool</h3>
            <input
              type="text"
              value={mapsQuery.placeType}
              onChange={(e) => setMapsQuery({ ...mapsQuery, placeType: e.target.value })}
              placeholder="Place type"
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-2"
            />
            <input
              type="text"
              value={mapsQuery.location}
              onChange={(e) => setMapsQuery({ ...mapsQuery, location: e.target.value })}
              placeholder="Location"
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-2"
            />
            <button
              onClick={() => mapsTest.refetch()}
              disabled={mapsTest.isFetching}
              className="px-4 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:bg-gray-300 w-full"
            >
              {mapsTest.isFetching ? "Searching..." : "Test Google Maps"}
            </button>
            {mapsTest.data && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                <p className="font-medium">Found: {mapsTest.data.resultCount} places</p>
                {mapsTest.data.places.slice(0, 3).map((place, i) => (
                  <p key={i} className="truncate">{i + 1}. {place.name}</p>
                ))}
                {mapsTest.data.error && (
                  <p className="text-red-600">{mapsTest.data.error}</p>
                )}
              </div>
            )}
          </div>

          {/* Google Search Test */}
          <div className="border border-gray-300 rounded-lg p-4 bg-white shadow-sm">
            <h3 className="font-semibold mb-2">Google Search Tool</h3>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search query"
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-2"
            />
            <button
              onClick={() => searchTest.refetch()}
              disabled={searchTest.isFetching}
              className="px-4 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 disabled:bg-gray-300 w-full"
            >
              {searchTest.isFetching ? "Searching..." : "Test Google Search"}
            </button>
            {searchTest.data && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                <p className="font-medium">Found: {searchTest.data.resultCount} results</p>
                {searchTest.data.results.slice(0, 3).map((result, i) => (
                  <p key={i} className="truncate">{i + 1}. {result.title}</p>
                ))}
                {searchTest.data.error && (
                  <p className="text-red-600">{searchTest.data.error}</p>
                )}
              </div>
            )}
          </div>

          {/* Sheet Writer Preview Test */}
          <div className="border border-gray-300 rounded-lg p-4 bg-white shadow-sm">
            <h3 className="font-semibold mb-2">Sheet Writer (Preview)</h3>
            <button
              onClick={() => previewTest.refetch()}
              disabled={previewTest.isFetching}
              className="px-4 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 disabled:bg-gray-300 w-full"
            >
              {previewTest.isFetching ? "Previewing..." : "Test Sheet Writer Preview"}
            </button>
            {previewTest.data && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                <p className="font-medium">Mode: {previewTest.data.mode}</p>
                <p>Sample rows: {previewTest.data.sample?.length || 0}</p>
                {previewTest.data.message && (
                  <p className="text-green-600">{previewTest.data.message}</p>
                )}
                {previewTest.data.error && (
                  <p className="text-red-600">{previewTest.data.error}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Test Queries */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <p className="font-semibold mb-2">Try These Queries:</p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <button
            onClick={() => setMessage("find top 5 pizzas in SF")}
            className="text-left px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-100"
          >
            "find top 5 pizzas in SF"
          </button>
          <button
            onClick={() => setMessage("search for hackerspaces near Palo Alto")}
            className="text-left px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-100"
          >
            "search for hackerspaces near Palo Alto"
          </button>
          <button
            onClick={() => setMessage("read the current sheet")}
            className="text-left px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-100"
          >
            "read the current sheet"
          </button>
          <button
            onClick={() => setMessage("find bike rentals west of Palo Alto")}
            className="text-left px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-100"
          >
            "find bike rentals west of Palo Alto"
          </button>
        </div>
      </div>
    </div>
  );
}
