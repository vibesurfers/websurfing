"use client";

import { useState } from "react";
import { api } from "@/trpc/react";

/**
 * Simple test page for Mastra agent integration
 * Test the agent by sending messages and seeing responses
 */
export default function MastraTestPage() {
  const [message, setMessage] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);

  // tRPC mutations
  const pingQuery = api.mastraTest.ping.useQuery();
  const chatMutation = api.mastraTest.chat.useMutation();

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    try {
      const result = await chatMutation.mutateAsync({
        message: message.trim(),
        threadId: threadId || undefined,
      });

      // Save thread ID for conversation continuity
      if (result.threadId && !threadId) {
        setThreadId(result.threadId);
      }

      console.log("Agent response:", result.response);
      setMessage(""); // Clear input
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">
        Mastra Agent Test 🏄‍♂️
      </h1>

      {/* Health Check */}
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Health Check</h2>
        {pingQuery.isLoading && <p className="text-gray-600">Loading...</p>}
        {pingQuery.isError && (
          <p className="text-red-600">
            Error: {pingQuery.error.message}
          </p>
        )}
        {pingQuery.isSuccess && (
          <div className="text-green-600">
            <p>✓ {pingQuery.data.message}</p>
            <p className="text-xs text-gray-500">{pingQuery.data.timestamp}</p>
          </div>
        )}
      </div>

      {/* Chat Interface */}
      <div className="border border-gray-300 rounded-lg p-6 bg-white shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Chat with Test Agent</h2>

        {threadId && (
          <p className="text-xs text-gray-500 mb-4">
            Thread ID: {threadId}
          </p>
        )}

        {/* Response Display */}
        {chatMutation.data && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <p className="font-semibold text-blue-900 mb-2">Agent:</p>
            <p className="text-gray-800">{chatMutation.data.response}</p>
          </div>
        )}

        {/* Error Display */}
        {chatMutation.isError && (
          <div className="mb-4 p-4 bg-red-50 rounded-lg">
            <p className="font-semibold text-red-900 mb-2">Error:</p>
            <p className="text-red-700">{chatMutation.error.message}</p>
          </div>
        )}

        {/* Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Say hello to the agent..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={chatMutation.isPending}
          />
          <button
            onClick={handleSendMessage}
            disabled={!message.trim() || chatMutation.isPending}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {chatMutation.isPending ? "Sending..." : "Send"}
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-700">
        <p className="font-semibold mb-2">Test Instructions:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Try: "Hello!"</li>
          <li>Try: "What can you help me with?"</li>
          <li>Try: "Tell me about spreadsheet operations"</li>
        </ul>
      </div>
    </div>
  );
}
