'use client';

import { useState } from "react";
import { api } from "@/trpc/react";
import type { TemplateConfig } from "@/server/ai/template-generator";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface TemplateChatProps {
  onTemplateGenerated?: (template: {
    id: string;
    config: TemplateConfig;
  }) => void;
  onOpenInBuilder?: (templateId: string) => void;
}

export function TemplateChat({ onTemplateGenerated, onOpenInBuilder }: TemplateChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'll help you create a custom template for your workflow. Describe what kind of data you want to extract and I'll set it up for you.\n\nFor example:\n- \"Find LinkedIn profiles for companies: start with company name, find website, then LinkedIn company page, then key people\"\n- \"Research articles: input topic, search for papers, get URLs, extract summaries and citations\"",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTemplate, setGeneratedTemplate] = useState<{
    id: string;
    config: TemplateConfig;
  } | null>(null);

  const generateTemplate = api.template.generateFromChat.useMutation({
    onSuccess: (data) => {
      setIsGenerating(false);
      if (!data.template) {
        console.error("No template returned from generation");
        return;
      }
      setGeneratedTemplate({
        id: data.template.id,
        config: data.config,
      });

      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Great! I've created a template called "${data.config.name}".\n\n${data.config.description}\n\nIt has ${data.config.columns.length} columns:\n${data.config.columns.map((col, i) => `${i + 1}. **${col.title}**: ${col.prompt || 'Extract data'} (using ${col.operatorType})`).join('\n')}\n\nYou can use it now or refine it in the visual builder.`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (onTemplateGenerated) {
        onTemplateGenerated({
          id: data.template.id,
          config: data.config,
        });
      }
    },
    onError: (error) => {
      setIsGenerating(false);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}. Please try again or describe your workflow differently.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    },
  });

  const refineTemplate = api.template.refineFromFeedback.useMutation({
    onSuccess: (data) => {
      setIsGenerating(false);
      if (!data.template) {
        console.error("No template returned from refinement");
        return;
      }
      setGeneratedTemplate({
        id: data.template.id,
        config: data.config,
      });

      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `I've updated the template!\n\nNow it has ${data.config.columns.length} columns:\n${data.config.columns.map((col, i) => `${i + 1}. **${col.title}**: ${col.prompt || 'Extract data'}`).join('\n')}`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    },
    onError: (error) => {
      setIsGenerating(false);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Sorry, I couldn't update the template: ${error.message}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    },
  });

  const handleSend = () => {
    if (!input.trim() || isGenerating) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsGenerating(true);

    if (generatedTemplate) {
      // Refine existing template
      refineTemplate.mutate({
        templateId: generatedTemplate.id,
        feedback: input,
      });
    } else {
      // Generate new template
      generateTemplate.mutate({
        description: input,
      });
    }

    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-900 shadow-sm border border-gray-200'
              }`}
            >
              <div className="whitespace-pre-wrap text-sm">
                {message.content.split('\n').map((line, i) => {
                  // Simple markdown bold parsing
                  const parts = line.split(/(\*\*.*?\*\*)/g);
                  return (
                    <div key={i}>
                      {parts.map((part, j) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                          return <strong key={j}>{part.slice(2, -2)}</strong>;
                        }
                        return <span key={j}>{part}</span>;
                      })}
                    </div>
                  );
                })}
              </div>
              <div
                className={`text-xs mt-1 ${
                  message.role === 'user' ? 'text-blue-200' : 'text-gray-400'
                }`}
              >
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {isGenerating && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-900 shadow-sm border border-gray-200 rounded-lg px-4 py-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Generated Template Preview */}
      {generatedTemplate && (
        <div className="border-t border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">{generatedTemplate.config.icon || '📋'}</span>
              <div>
                <h3 className="font-semibold text-gray-900">{generatedTemplate.config.name}</h3>
                <p className="text-xs text-gray-500">
                  {generatedTemplate.config.columns.length} columns
                  {generatedTemplate.config.isAutonomous && ' • Autonomous'}
                </p>
              </div>
            </div>
            <button
              onClick={() => onOpenInBuilder?.(generatedTemplate.id)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Open in Builder
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white p-4">
        <div className="flex space-x-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={
              generatedTemplate
                ? "Describe changes you'd like to make..."
                : "Describe the workflow you want to automate..."
            }
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
            disabled={isGenerating}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isGenerating}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {generatedTemplate ? 'Refine' : 'Generate'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
