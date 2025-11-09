'use client';

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { TemplateChat } from "@/components/chat-builder/template-chat";
import {
  ColumnConfigPanel,
  type ColumnConfig,
} from "@/components/template-builder/column-config-panel";
import { api } from "@/trpc/react";
import type { TemplateConfig } from "@/server/ai/template-generator";
import { AppHeader } from "@/components/app-header";

type BuilderMode = 'chat' | 'visual' | 'hybrid';

export default function NewTemplatePage() {
  const router = useRouter();
  const [mode, setMode] = useState<BuilderMode>('hybrid');
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateIcon, setTemplateIcon] = useState('📋');
  const [isAutonomous, setIsAutonomous] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [columns, setColumns] = useState<ColumnConfig[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);

  const createTemplate = api.template.create.useMutation({
    onSuccess: (data) => {
      setIsSaving(false);
      setTemplateId(data.id);

      if (isCreatingSheet) {
        // If we're in "use template" flow, create sheet immediately
        setIsCreatingSheet(false);
        createSheet.mutate({
          name: `${templateName} - Sheet`,
          templateId: data.id,
        });
      } else {
        // Normal save flow
        router.push(`/templates/${data.id}`);
      }
    },
    onError: (error) => {
      setIsSaving(false);
      setIsCreatingSheet(false);
      alert(`Failed to save template: ${error.message}`);
    },
  });

  const createSheet = api.sheet.create.useMutation({
    onSuccess: (data) => {
      router.push(`/sheets/${data.id}`);
    },
    onError: (error) => {
      alert(`Failed to create sheet: ${error.message}`);
    },
  });

  const updateTemplate = api.template.update.useMutation({
    onSuccess: () => {
      setIsSaving(false);
      alert('Template updated successfully!');
    },
    onError: (error) => {
      setIsSaving(false);
      alert(`Failed to update template: ${error.message}`);
    },
  });

  const handleTemplateGenerated = (template: {
    id: string;
    config: TemplateConfig;
  }) => {
    setTemplateId(template.id);
    setTemplateName(template.config.name);
    setTemplateDescription(template.config.description || '');
    setTemplateIcon(template.config.icon || '📋');
    setIsAutonomous(template.config.isAutonomous);
    setSystemPrompt(template.config.systemPrompt || '');

    // Convert to ColumnConfig format
    const newColumns: ColumnConfig[] = template.config.columns.map((col) => ({
      id: `col-${col.position}`,
      title: col.title,
      position: col.position,
      operatorType: col.operatorType,
      prompt: col.prompt || '',
      dataType: col.dataType,
      dependencies: col.dependencies || [],
      isRequired: col.isRequired,
      operatorConfig: col.operatorConfig,
    }));

    setColumns(newColumns);
    setMode('visual');
  };

  const handleOpenInBuilder = (id: string) => {
    router.push(`/templates/${id}/edit`);
  };

  const handleAddColumn = () => {
    const newColumn: ColumnConfig = {
      id: `col-${Date.now()}`,
      title: `Column ${columns.length + 1}`,
      position: columns.length,
      operatorType: 'google_search',
      prompt: '',
      dataType: 'text',
      dependencies: [],
      isRequired: false,
    };

    setColumns([...columns, newColumn]);
  };

  const handleUpdateColumn = (index: number, updated: ColumnConfig) => {
    const newColumns = [...columns];
    newColumns[index] = updated;
    setColumns(newColumns);
  };

  const handleDeleteColumn = (index: number) => {
    const newColumns = columns.filter((_, i) => i !== index);
    // Update positions
    newColumns.forEach((col, i) => {
      col.position = i;
    });
    setColumns(newColumns);
  };

  const handleMoveColumn = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === columns.length - 1)
    ) {
      return;
    }

    const newColumns = [...columns];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    [newColumns[index], newColumns[targetIndex]] = [
      newColumns[targetIndex]!,
      newColumns[index]!,
    ];

    // Update positions
    newColumns.forEach((col, i) => {
      col.position = i;
    });

    setColumns(newColumns);
  };

  const handleSave = () => {
    if (!templateName.trim()) {
      alert('Please enter a template name');
      return;
    }

    if (columns.length === 0) {
      alert('Please add at least one column');
      return;
    }

    setIsSaving(true);

    const templateData = {
      name: templateName,
      description: templateDescription,
      icon: templateIcon,
      isPublic: false,
      isAutonomous,
      systemPrompt: systemPrompt || undefined,
      config: {},
      columns: columns.map((col) => ({
        title: col.title,
        position: col.position,
        operatorType: col.operatorType,
        operatorConfig: col.operatorConfig,
        prompt: col.prompt,
        dataType: col.dataType,
        dependencies: col.dependencies,
        validationRules: {},
        isRequired: col.isRequired,
        defaultValue: undefined,
      })),
    };

    if (templateId) {
      updateTemplate.mutate({
        id: templateId,
        ...templateData,
      });
    } else {
      createTemplate.mutate(templateData);
    }
  };

  const handleUseTemplate = () => {
    if (!templateId && columns.length > 0) {
      // First save the template, then create sheet
      setIsCreatingSheet(true);
      setIsSaving(true);

      const templateData = {
        name: templateName,
        description: templateDescription,
        icon: templateIcon,
        isPublic: false,
        isAutonomous,
        systemPrompt: systemPrompt || undefined,
        config: {},
        columns: columns.map((col) => ({
          title: col.title,
          position: col.position,
          operatorType: col.operatorType,
          operatorConfig: col.operatorConfig,
          prompt: col.prompt,
          dataType: col.dataType,
          dependencies: col.dependencies,
          validationRules: {},
          isRequired: col.isRequired,
          defaultValue: undefined,
        })),
      };

      createTemplate.mutate(templateData);
    } else if (templateId) {
      // Template already exists, create sheet with it
      createSheet.mutate({
        name: `${templateName} - Sheet`,
        templateId,
      });
    }
  };

  return (
    <React.Fragment>
      <AppHeader />
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Create New Template
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Design a reusable workflow for data extraction
                </p>
              </div>

            {/* Mode Selector */}
            <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setMode('chat')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  mode === 'chat'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                💬 Chat
              </button>
              <button
                onClick={() => setMode('hybrid')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  mode === 'hybrid'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🔀 Hybrid
              </button>
              <button
                onClick={() => setMode('visual')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  mode === 'visual'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🎨 Visual
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Chat Panel (Left side in hybrid mode) */}
          {(mode === 'chat' || mode === 'hybrid') && (
            <div
              className={`${
                mode === 'hybrid' ? 'col-span-5' : 'col-span-12'
              } bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden`}
              style={{ height: '80vh' }}
            >
              <TemplateChat
                onTemplateGenerated={handleTemplateGenerated}
                onOpenInBuilder={handleOpenInBuilder}
              />
            </div>
          )}

          {/* Visual Builder (Right side in hybrid mode) */}
          {(mode === 'visual' || mode === 'hybrid') && (
            <div
              className={`${
                mode === 'hybrid' ? 'col-span-7' : 'col-span-12'
              } space-y-6`}
            >
              {/* Template Metadata */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Template Details
                </h2>

                <div className="space-y-4">
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Icon
                      </label>
                      <input
                        type="text"
                        value={templateIcon}
                        onChange={(e) => setTemplateIcon(e.target.value)}
                        className="w-full px-3 py-2 text-center text-2xl border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="📋"
                      />
                    </div>

                    <div className="col-span-10">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Template Name
                      </label>
                      <input
                        type="text"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., LinkedIn Lead Finder"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={templateDescription}
                      onChange={(e) => setTemplateDescription(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows={2}
                      placeholder="Describe what this template does..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      System Prompt (Optional)
                    </label>
                    <textarea
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows={2}
                      placeholder="Overall instructions for the AI..."
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="autonomous"
                      checked={isAutonomous}
                      onChange={(e) => setIsAutonomous(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label
                      htmlFor="autonomous"
                      className="text-sm font-medium text-gray-700"
                    >
                      Autonomous Mode
                      <span className="text-gray-500 font-normal ml-2">
                        (Automatically fill all columns)
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Columns */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Columns ({columns.length})
                  </h2>
                  <button
                    onClick={handleAddColumn}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    + Add Column
                  </button>
                </div>

                <div className="space-y-4">
                  {columns.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <p className="text-lg mb-2">No columns yet</p>
                      <p className="text-sm">
                        Use the chat to generate columns or add them manually
                      </p>
                    </div>
                  ) : (
                    columns.map((col, index) => (
                      <ColumnConfigPanel
                        key={col.id}
                        column={col}
                        allColumns={columns}
                        onChange={(updated) => handleUpdateColumn(index, updated)}
                        onDelete={() => handleDeleteColumn(index)}
                        onMoveUp={
                          index > 0
                            ? () => handleMoveColumn(index, 'up')
                            : undefined
                        }
                        onMoveDown={
                          index < columns.length - 1
                            ? () => handleMoveColumn(index, 'down')
                            : undefined
                        }
                      />
                    ))
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {columns.length > 0 && (
                <div className="flex justify-between items-center">
                  <button
                    onClick={() => router.push('/templates')}
                    className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                  >
                    ALL TEMPLATES
                  </button>

                  <div className="flex space-x-3">
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      {isSaving && !isCreatingSheet ? 'Saving...' : templateId ? 'Update Template' : 'Save Template'}
                    </button>
                    <button
                      onClick={handleUseTemplate}
                      disabled={isSaving || !templateName.trim()}
                      className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      {isCreatingSheet ? 'Creating Sheet...' : 'USE TEMPLATE'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      </div>
    </React.Fragment>
  );
}
