"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { api } from "@/trpc/react";
import { PreviewCard } from "./preview-card";
import { useQueryClient } from "@tanstack/react-query";

interface AgentChatProps {
  sheetId: string;
}

interface Message {
  role: "user" | "agent" | "system";
  content: string;
  timestamp: Date;
  preview?: {
    type: string;
    data: any;
  };
}

/**
 * Agent Chat Interface
 *
 * Chat UI for interacting with the Mastra spreadsheet agent.
 * Features:
 * - Message history with auto-scroll
 * - Typing indicator
 * - Preview cards for bulk operations
 * - Markdown support
 * - Error handling
 */
export function AgentChat({ sheetId }: AgentChatProps) {
  const queryClient = useQueryClient();

  // Load conversation history from localStorage
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`agent-chat-${sheetId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Convert timestamp strings back to Date objects
          return parsed.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
        } catch (e) {
          console.error("Failed to parse saved messages:", e);
        }
      }
    }
    // Default welcome message
    return [
      {
        role: "agent",
        content: "Hey! I'm your spreadsheet assistant. I can help you:\n\n🔍 Search for data (e.g., 'find top 20 pizzas in SF')\n➕ Add rows in bulk\n📊 Manage columns\n🗺️ Find places using Google Maps\n🗑️ Remove empty rows\n\nWhat would you like to do?",
        timestamp: new Date(),
      },
    ];
  });

  const [input, setInput] = useState("");
  const [threadId, setThreadId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`agent-thread-${sheetId}`);
    }
    return null;
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Persist conversation to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0) {
      localStorage.setItem(`agent-chat-${sheetId}`, JSON.stringify(messages));
    }
  }, [messages, sheetId]);

  // Persist thread ID
  useEffect(() => {
    if (typeof window !== 'undefined' && threadId) {
      localStorage.setItem(`agent-thread-${sheetId}`, threadId);
    }
  }, [threadId, sheetId]);

  // tRPC mutation for sending messages
  const chatMutation = api.agent.sendMessage.useMutation({
    onSuccess: (data) => {
      // Add agent response to messages
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          content: data.response,
          timestamp: new Date(),
        },
      ]);

      // Save thread ID
      if (data.threadId && !threadId) {
        setThreadId(data.threadId);
      }

      // Invalidate cell queries to refresh the UI
      // This ensures deleted/added rows show immediately
      void queryClient.invalidateQueries({
        queryKey: [["cell", "getCells"], { input: { sheetId }, type: "query" }],
      });
    },
    onError: (error) => {
      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          content: `Error: ${error.message}`,
          timestamp: new Date(),
        },
      ]);
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatMutation.isPending]);

  const handleSend = async () => {
    if (!input.trim() || chatMutation.isPending) return;

    const userMessage = input.trim();
    setInput("");

    // Add user message to chat
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: userMessage,
        timestamp: new Date(),
      },
    ]);

    // Send to agent
    await chatMutation.mutateAsync({
      message: userMessage,
      sheetId,
      threadId: threadId || undefined,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, idx) => (
          <div
            key={idx}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-4 py-2 ${
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : message.role === "agent"
                    ? "bg-gray-100 text-gray-900"
                    : "bg-yellow-50 text-yellow-900 border border-yellow-200"
              }`}
            >
              {/* Role indicator */}
              <p className="text-xs font-semibold mb-1 opacity-70">
                {message.role === "user" ? "You" : message.role === "agent" ? "Agent" : "System"}
              </p>

              {/* Content */}
              <div className="text-sm whitespace-pre-wrap">{message.content}</div>

              {/* Preview card if present */}
              {message.preview && (
                <div className="mt-2">
                  <PreviewCard preview={message.preview} sheetId={sheetId} />
                </div>
              )}

              {/* Timestamp */}
              <p className="text-xs mt-1 opacity-50">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {chatMutation.isPending && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex items-center gap-2 text-gray-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Agent is thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything... (e.g., 'find top 20 pizzas in SF')"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            rows={2}
            disabled={chatMutation.isPending}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || chatMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors self-end"
            title="Send message (Enter)"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Enter</kbd> to send, <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Shift+Enter</kbd> for new line
        </p>
      </div>

      {/* Quick Actions */}
      <div className="border-t border-gray-200 p-3 bg-gray-50">
        <p className="text-xs font-semibold text-gray-600 mb-2">Quick Actions:</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setInput("find top 20 pizzas in SF")}
            className="text-xs px-3 py-1 bg-white border border-gray-300 rounded-full hover:bg-gray-100 transition-colors"
          >
            🍕 Find pizzas
          </button>
          <button
            onClick={() => setInput("search for hackerspaces near Palo Alto")}
            className="text-xs px-3 py-1 bg-white border border-gray-300 rounded-full hover:bg-gray-100 transition-colors"
          >
            🔧 Find hackerspaces
          </button>
          <button
            onClick={() => setInput("add a Phone Number column")}
            className="text-xs px-3 py-1 bg-white border border-gray-300 rounded-full hover:bg-gray-100 transition-colors"
          >
            ➕ Add column
          </button>
          <button
            onClick={() => setInput("read the current sheet")}
            className="text-xs px-3 py-1 bg-white border border-gray-300 rounded-full hover:bg-gray-100 transition-colors"
          >
            📖 Read sheet
          </button>
          <button
            onClick={() => setInput("remove rows with empty first column")}
            className="text-xs px-3 py-1 bg-white border border-gray-300 rounded-full hover:bg-gray-100 transition-colors"
          >
            🗑️ Clean empty
          </button>
        </div>
      </div>
    </div>
  );
}
