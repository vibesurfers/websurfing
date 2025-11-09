"use client";

import { useState } from "react";
import { Sparkles, Settings } from "lucide-react";
import { AgentChat } from "./agent-chat";
import { AdvancedColumnConfigPanel } from "./advanced-column-config-panel";

interface AgentSidebarProps {
  sheetId: string;
}

/**
 * Agent Sidebar Component
 *
 * Right sidebar panel for chatting with the Mastra spreadsheet agent.
 * Always visible panel with Chat and Config tabs.
 */
export function AgentSidebar({ sheetId }: AgentSidebarProps) {
  const [activeTab, setActiveTab] = useState<"chat" | "config">("chat");

  return (
    <div
      className="fixed top-0 right-0 h-full bg-white border-l border-gray-200 shadow-2xl z-40"
      style={{ width: "var(--agent-panel-width)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">AI Assistant</h2>
        </div>
      </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "chat"
                ? "bg-white text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            💬 Chat
          </button>
          <button
            onClick={() => setActiveTab("config")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "config"
                ? "bg-white text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <Settings className="inline w-4 h-4 mr-1" />
            Config
          </button>
        </div>

        {/* Content */}
        <div className="h-[calc(100vh-140px)] overflow-hidden">
          {activeTab === "chat" && (
            <AgentChat sheetId={sheetId} />
          )}

          {activeTab === "config" && (
            <div className="p-4 h-full overflow-y-auto">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Column Configuration
              </h3>
              <p className="text-xs text-gray-600 mb-4">
                Customize AI operators, prompts, and dependencies
              </p>
              <AdvancedColumnConfigPanel sheetId={sheetId} />
            </div>
          )}
        </div>

      </div>
  );
}
