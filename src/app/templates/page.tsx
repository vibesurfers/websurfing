'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";

export default function TemplatesPage() {
  const router = useRouter();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: templates, isLoading, refetch } = api.template.list.useQuery();
  const { data: publicTemplates } = api.template.listPublic.useQuery();

  const deleteTemplate = api.template.delete.useMutation({
    onSuccess: () => {
      setDeleteConfirm(null);
      refetch();
    },
    onError: (error) => {
      alert(`Failed to delete template: ${error.message}`);
    },
  });

  const cloneTemplate = api.template.clone.useMutation({
    onSuccess: (cloned) => {
      refetch();
      router.push(`/templates/${cloned.id}/edit`);
    },
    onError: (error) => {
      alert(`Failed to clone template: ${error.message}`);
    },
  });

  const createSheet = api.sheet.create.useMutation({
    onSuccess: (sheet) => {
      if (!sheet) {
        alert('Failed to create sheet: No sheet returned');
        return;
      }
      router.push(`/sheets/${sheet.id}`);
    },
    onError: (error) => {
      alert(`Failed to create sheet: ${error.message}`);
    },
  });

  const handleUseTemplate = (templateId: string, templateName: string) => {
    createSheet.mutate({
      name: `${templateName} - ${new Date().toLocaleDateString()}`,
      templateId,
    });
  };

  const handleDelete = (id: string) => {
    if (deleteConfirm === id) {
      deleteTemplate.mutate({ id });
    } else {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Templates</h1>
          <p className="text-muted-foreground mt-1">
            Manage your workflow templates
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={() => router.push('/templates/new')}
            variant="default"
          >
            + Create Template
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-8">
        {/* My Templates */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            My Templates
          </h2>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-500 mt-4">Loading templates...</p>
            </div>
          ) : templates && templates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Template Card Header */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <span className="text-4xl">{template.icon || '📋'}</span>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {template.name}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {template.columns?.length || 0} columns
                          </p>
                        </div>
                      </div>
                      {template.isAutonomous && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                          Auto
                        </span>
                      )}
                    </div>

                    {template.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {template.description}
                      </p>
                    )}

                    {/* Column Pills */}
                    {template.columns && template.columns.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {template.columns.slice(0, 4).map((col) => (
                          <span
                            key={col.id}
                            className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                          >
                            {col.title}
                          </span>
                        ))}
                        {template.columns.length > 4 && (
                          <span className="text-xs text-gray-400 px-2 py-1">
                            +{template.columns.length - 4} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="border-t border-gray-200 bg-gray-50 px-6 py-3 flex items-center justify-between">
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => router.push(`/templates/${template.id}/edit`)}
                        variant="ghost"
                        size="sm"
                      >
                        Edit
                      </Button>
                      <span className="text-gray-300">•</span>
                      <Button
                        onClick={() => handleDelete(template.id)}
                        variant="ghost"
                        size="sm"
                        className={deleteConfirm === template.id ? 'text-destructive font-bold' : 'text-destructive'}
                      >
                        {deleteConfirm === template.id ? 'Confirm?' : 'Delete'}
                      </Button>
                    </div>
                    <Button
                      onClick={() => handleUseTemplate(template.id, template.name)}
                      size="sm"
                    >
                      Use →
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <p className="text-gray-500 mb-4">No templates yet</p>
              <Button
                onClick={() => router.push('/templates/new')}
              >
                Create Your First Template
              </Button>
            </div>
          )}
        </section>

        {/* Public Templates Marketplace */}
        {publicTemplates && publicTemplates.length > 0 && (
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Public Templates
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {publicTemplates.map((template) => (
                <div
                  key={template.id}
                  className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <span className="text-4xl">{template.icon || '📋'}</span>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {template.name}
                          </h3>
                          <p className="text-xs text-gray-500">
                            by {template.user?.name || 'Unknown'}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        Public
                      </span>
                    </div>

                    {template.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {template.description}
                      </p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center space-x-4 text-xs text-gray-500 mb-4">
                      <span>{template.columns?.length || 0} columns</span>
                      <span>•</span>
                      <span>{template.usageCount || 0} uses</span>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 bg-gray-50 px-6 py-3 flex justify-end">
                    <Button
                      onClick={() => cloneTemplate.mutate({ id: template.id })}
                      size="sm"
                    >
                      Clone to My Templates
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
