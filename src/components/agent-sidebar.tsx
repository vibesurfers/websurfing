"use client";

import { useState, useEffect } from "react";
import { Sparkles, X, ChevronRight, Settings } from "lucide-react";
import { AgentChat } from "./agent-chat";
import { EditableColumnConfig } from "./editable-column-config";

interface AgentSidebarProps {
  sheetId: string;
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
}

/**
 * Agent Sidebar Component
 *
 * Right sidebar panel for chatting with the Mastra spreadsheet agent.
 * Features:
 * - Slide-out from right
 * - Resizable width
 * - Collapsible sections (Chat, Column Config)
 * - Keyboard shortcut support (Cmd/Ctrl + K)
 */
export function AgentSidebar({ sheetId, isOpen: controlledIsOpen, onToggle }: AgentSidebarProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "config">("chat");

  // Support both controlled and uncontrolled state
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = (open: boolean) => {
    if (onToggle) {
      onToggle(open);
    } else {
      setInternalIsOpen(open);
    }
  };

  // Keyboard shortcut: Cmd/Ctrl + K to toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
      // Esc to close
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, setIsOpen]);

  return (
    <>
      {/* Toggle Button (when closed) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed right-4 bottom-4 p-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-110 z-50"
          title="Open AI Assistant (Cmd/Ctrl + K)"
        >
          <Sparkles className="w-6 h-6" />
        </button>
      )}

      {/* Sidebar Panel */}
      <div
        className={`fixed top-0 right-0 h-full bg-white border-l border-gray-200 shadow-2xl z-40 transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ width: "480px" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">AI Assistant</h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
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
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Operator Settings
              </h3>
              <p className="text-xs text-gray-600 mb-4">
                Customize how AI processes each column
              </p>
              <EditableColumnConfig sheetId={sheetId} />
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Press <kbd className="px-1 py-0.5 bg-gray-200 rounded">Cmd/Ctrl + K</kbd> to toggle
          </p>
        </div>
      </div>

      {/* Backdrop overlay (when open on mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-20 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
