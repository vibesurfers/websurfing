'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ColumnConfigPanel,
  type ColumnConfig,
} from "@/components/template-builder/column-config-panel";
import { api } from "@/trpc/react";

export default function EditTemplatePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const templateId = params.id;

  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateIcon, setTemplateIcon] = useState('📋');
  const [isAutonomous, setIsAutonomous] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [columns, setColumns] = useState<ColumnConfig[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const { data: template, isLoading } = api.template.getById.useQuery({ id: templateId });

  const updateTemplate = api.template.update.useMutation({
    onSuccess: () => {
      setIsSaving(false);
      alert('Template updated successfully!');
      router.push('/templates');
    },
    onError: (error) => {
      setIsSaving(false);
      alert(`Failed to update template: ${error.message}`);
    },
  });

  // Load template data when it arrives
  useEffect(() => {
    if (template) {
      setTemplateName(template.name);
      setTemplateDescription(template.description || '');
      setTemplateIcon(template.icon || '📋');
      setIsAutonomous(template.isAutonomous || false);
      setSystemPrompt(template.systemPrompt || '');

      const loadedColumns: ColumnConfig[] = (template.columns || []).map((col) => ({
        id: col.id,
        title: col.title,
        position: col.position,
        operatorType: col.operatorType as 'google_search' | 'url_context' | 'structured_output' | 'function_calling',
        prompt: col.prompt || '',
        dataType: col.dataType as 'text' | 'url' | 'email' | 'number' | 'json',
        dependencies: (col.dependencies as number[]) || [],
        isRequired: col.isRequired || false,
        operatorConfig: (col.operatorConfig as Record<string, any>) || undefined,
      }));

      setColumns(loadedColumns);
    }
  }, [template]);

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

    updateTemplate.mutate({
      id: templateId,
      name: templateName,
      description: templateDescription,
      icon: templateIcon,
      isPublic: false,
      isAutonomous,
      systemPrompt: systemPrompt || undefined,
      config: {},
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 mt-4">Loading template...</p>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Template not found</p>
          <button
            onClick={() => router.push('/templates')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Templates
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Edit Template
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Modify your workflow configuration
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="space-y-6">
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
                  <p className="text-sm">Add columns to define your workflow</p>
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
                      index > 0 ? () => handleMoveColumn(index, 'up') : undefined
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

          {/* Save Button */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => router.push('/templates')}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
