"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Upload } from "lucide-react";
import { api } from "@/trpc/react";
import { PreviewCard } from "./preview-card";
import { useQueryClient } from "@tanstack/react-query";
import Papa from "papaparse";

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

  // Get sheet information to customize onboarding
  const { data: sheetInfo } = api.sheet.getById.useQuery({ id: sheetId }, {
    enabled: !!sheetId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Generate template-specific welcome message
  const getWelcomeMessage = (templateType?: string | null): string => {
    switch (templateType) {
      case 'scientific':
        return `Hey! I'm your research assistant! 🔬 I specialize in academic research and PDF analysis. I can help you:

📚 **Find Research Papers**
- Search for highly-cited papers on any topic
- Find open access PDFs from arXiv, PubMed, Google Scholar

📄 **Analyze PDFs**
- Extract abstracts, methodologies, and key findings
- Analyze figures and extract insights
- Build citation networks

🔍 **Research Tasks**
- Compare methodologies across papers
- Find related work and build literature reviews
- Track citation relationships

Try asking: "find papers on transformer architectures" or "analyze this PDF: [URL]"

What research would you like to explore?`;

      case 'marketing':
        return `Hey! I'm your business intelligence assistant! 📊 I can help you research companies and markets:

🏢 **Company Research**
- Find business information and contact details
- Research competitors and market players
- Extract team sizes and company details

🌐 **Web Analysis**
- Analyze company websites
- Find contact information and social media
- Research market opportunities

📈 **Data Enrichment**
- Add missing business information
- Verify company details
- Build prospect lists

Try asking: "find SaaS companies in San Francisco" or "research competitors of Slack"

What business research would you like to do?`;

      case 'lucky':
        return `Hey! I'm your autonomous discovery agent! 🎲 I love exploring topics and finding unexpected connections:

🎯 **Autonomous Exploration**
- Give me any topic and I'll find related discoveries
- I'll keep exploring and expanding based on what I find
- Perfect for brainstorming and research inspiration

🔍 **Smart Discovery**
- I find patterns and connections you might miss
- I explore tangential topics and interesting rabbit holes
- I build knowledge maps automatically

✨ **Surprise Factor**
- Never know what interesting things I'll discover
- Great for creative research and inspiration
- I follow curiosity wherever it leads

Try asking: "explore quantum computing" or "discover connections between music and mathematics"

What should we explore together?`;

      default:
        return `Hey! I'm your spreadsheet assistant. I can help you:

🔍 Search for data (e.g., 'find top 20 pizzas in SF')
➕ Add rows in bulk
📊 Manage columns
🗺️ Find places using Google Maps
🗑️ Remove empty rows
📁 Import and analyze CSV files

What would you like to do?`;
    }
  };

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
    // Will be updated when sheet info loads
    return [];
  });

  // Update welcome message when sheet info loads
  useEffect(() => {
    if (sheetInfo && messages.length === 0) {
      setMessages([
        {
          role: "agent",
          content: getWelcomeMessage(sheetInfo.templateType),
          timestamp: new Date(),
        },
      ]);
    }
  }, [sheetInfo, messages.length]);

  const [input, setInput] = useState("");
  const [threadId, setThreadId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`agent-thread-${sheetId}`);
    }
    return null;
  });
  const [isUploadingCSV, setIsUploadingCSV] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // tRPC mutation for CSV upload
  const uploadCSVMutation = api.agent.uploadCSV.useMutation({
    onSuccess: (data) => {
      // Add agent's CSV analysis response
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          content: data.response,
          timestamp: new Date(),
        },
      ]);

      if (data.threadId && !threadId) {
        setThreadId(data.threadId);
      }

      setIsUploadingCSV(false);

      // Invalidate queries
      void queryClient.invalidateQueries({
        queryKey: [["cell", "getCells"], { input: { sheetId }, type: "query" }],
      });
    },
    onError: (error) => {
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          content: `CSV Upload Error: ${error.message}`,
          timestamp: new Date(),
        },
      ]);
      setIsUploadingCSV(false);
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatMutation.isPending, isUploadingCSV]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      alert('Please upload a CSV file');
      return;
    }

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      alert('File too large. Maximum size is 50MB');
      return;
    }

    setIsUploadingCSV(true);

    // Add user message about upload
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: `Uploading CSV: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
        timestamp: new Date(),
      },
    ]);

    // Parse CSV client-side
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        console.log('[CSV Upload] Parsed:', results.data.length, 'rows');

        // Upload to agent
        await uploadCSVMutation.mutateAsync({
          sheetId,
          csvData: {
            filename: file.name,
            headers: results.meta.fields || [],
            rows: results.data as Record<string, string>[],
          },
          threadId: threadId || undefined,
        });

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      },
      error: (error) => {
        setMessages((prev) => [
          ...prev,
          {
            role: "system",
            content: `CSV parsing failed: ${error.message}`,
            timestamp: new Date(),
          },
        ]);
        setIsUploadingCSV(false);
      },
    });
  };

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
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* CSV Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingCSV || chatMutation.isPending}
            className="text-xs px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 rounded-full hover:from-green-600 hover:to-emerald-600 transition-all disabled:from-gray-300 disabled:to-gray-300 font-medium"
          >
            {isUploadingCSV ? (
              <>
                <Loader2 className="inline w-3 h-3 mr-1 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="inline w-3 h-3 mr-1" />
                📁 Upload CSV
              </>
            )}
          </button>

          {/* Template-specific quick actions */}
          {sheetInfo?.templateType === 'scientific' ? (
            // Scientific Research Quick Actions
            <>
              <button
                onClick={() => setInput("find papers on machine learning")}
                className="text-xs px-3 py-1 bg-white border border-gray-300 rounded-full hover:bg-gray-100 transition-colors"
              >
                📚 Find papers
              </button>
              <button
                onClick={() => setInput("find recent transformer architecture papers")}
                className="text-xs px-3 py-1 bg-white border border-gray-300 rounded-full hover:bg-gray-100 transition-colors"
              >
                🤖 AI papers
              </button>
              <button
                onClick={() => setInput("analyze PDFs in the current sheet")}
                className="text-xs px-3 py-1 bg-white border border-gray-300 rounded-full hover:bg-gray-100 transition-colors"
              >
                📄 Analyze PDFs
              </button>
              <button
                onClick={() => setInput("find open access papers on quantum computing")}
                className="text-xs px-3 py-1 bg-white border border-gray-300 rounded-full hover:bg-gray-100 transition-colors"
              >
                ⚛️ Quantum papers
              </button>
              <button
                onClick={() => setInput("build citation network from current papers")}
                className="text-xs px-3 py-1 bg-white border border-gray-300 rounded-full hover:bg-gray-100 transition-colors"
              >
                🔗 Citations
              </button>
            </>
          ) : sheetInfo?.templateType === 'marketing' ? (
            // Marketing Analysis Quick Actions
            <>
              <button
                onClick={() => setInput("find SaaS companies in San Francisco")}
                className="text-xs px-3 py-1 bg-white border border-gray-300 rounded-full hover:bg-gray-100 transition-colors"
              >
                🏢 Find companies
              </button>
              <button
                onClick={() => setInput("research competitors of Slack")}
                className="text-xs px-3 py-1 bg-white border border-gray-300 rounded-full hover:bg-gray-100 transition-colors"
              >
                📊 Competitors
              </button>
              <button
                onClick={() => setInput("enrich business data with contact info")}
                className="text-xs px-3 py-1 bg-white border border-gray-300 rounded-full hover:bg-gray-100 transition-colors"
              >
                📞 Contact data
              </button>
              <button
                onClick={() => setInput("find Y Combinator startups 2024")}
                className="text-xs px-3 py-1 bg-white border border-gray-300 rounded-full hover:bg-gray-100 transition-colors"
              >
                🚀 YC startups
              </button>
            </>
          ) : sheetInfo?.templateType === 'lucky' ? (
            // I'm Feeling Lucky Quick Actions
            <>
              <button
                onClick={() => setInput("explore quantum computing")}
                className="text-xs px-3 py-1 bg-white border border-gray-300 rounded-full hover:bg-gray-100 transition-colors"
              >
                🎲 Explore quantum
              </button>
              <button
                onClick={() => setInput("discover connections between music and mathematics")}
                className="text-xs px-3 py-1 bg-white border border-gray-300 rounded-full hover:bg-gray-100 transition-colors"
              >
                🎵 Music + Math
              </button>
              <button
                onClick={() => setInput("find unexpected uses of blockchain")}
                className="text-xs px-3 py-1 bg-white border border-gray-300 rounded-full hover:bg-gray-100 transition-colors"
              >
                ⛓️ Blockchain ideas
              </button>
              <button
                onClick={() => setInput("explore biomimicry in technology")}
                className="text-xs px-3 py-1 bg-white border border-gray-300 rounded-full hover:bg-gray-100 transition-colors"
              >
                🦋 Biomimicry
              </button>
            </>
          ) : (
            // Default Quick Actions
            <>
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
            </>
          )}

          {/* Universal actions */}
          <button
            onClick={() => setInput("remove rows with empty first column")}
            className="text-xs px-3 py-1 bg-white border border-gray-300 rounded-full hover:bg-gray-100 transition-colors"
          >
            🗑️ Clean empty rows
          </button>
          <button
            onClick={() => setInput("clean up all empty and null values")}
            className="text-xs px-3 py-1 bg-white border border-red-300 rounded-full hover:bg-red-50 transition-colors text-red-700"
          >
            🧹 Deep clean
          </button>
        </div>
      </div>
    </div>
  );
}
