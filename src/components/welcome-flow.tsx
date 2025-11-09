'use client'

import { useState } from "react";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { WebsetsTable } from "@/components/websets-table";
import { Loader2, Pencil, Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

export function WelcomeFlow() {
  const router = useRouter();
  const [creatingTemplateId, setCreatingTemplateId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: templatesData, isLoading: templatesLoading, refetch: refetchTemplates } = api.template.list.useQuery();
  const { data: sheets, isLoading: sheetsLoading } = api.sheet.list.useQuery();

  // Extract templates from paginated response
  const templates = templatesData?.items ?? [];

  const createSheet = api.sheet.create.useMutation({
    onError: (error) => {
      console.error('Failed to create sheet:', error);
      alert('Failed to create sheet. Please try again.');
      setCreatingTemplateId(null);
    },
  });

  const deleteSheet = api.sheet.delete.useMutation({
    onSuccess: () => {
      // Invalidate and refetch sheets
      void api.useUtils().sheet.list.invalidate();
    },
    onError: (error) => {
      console.error('Failed to delete sheet:', error);
      alert('Failed to delete sheet. Please try again.');
    },
  });

  const deleteTemplate = api.template.delete.useMutation({
    onSuccess: () => {
      setDeleteConfirm(null);
      refetchTemplates();
    },
    onError: (error) => {
      alert(`Failed to delete template: ${error.message}`);
    },
  });

  const handleTemplateUse = async (templateId: string) => {
    setCreatingTemplateId(templateId);

    try {
      const template = templates?.find(t => t.id === templateId);
      const sheetName = template
        ? `${template.name} - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
        : 'Untitled Sheet';

      console.log('[WelcomeFlow] Creating sheet from template:', templateId);
      const newSheet = await createSheet.mutateAsync({
        name: sheetName,
        templateId,
      });

      if (newSheet) {
        console.log('[WelcomeFlow] Created sheet with ID:', newSheet.id);
        console.log('[WelcomeFlow] Navigating to:', `/sheets/${newSheet.id}`);

        // Store in sessionStorage so SheetManager knows this is a newly created sheet
        sessionStorage.setItem('justCreatedSheet', newSheet.id);
        router.push(`/sheets/${newSheet.id}`);
      }
    } catch (error) {
      console.error('Error in handleTemplateUse:', error);
      setCreatingTemplateId(null);
    }
  };

  const handleSheetDelete = (sheetId: string) => {
    deleteSheet.mutate({ sheetId });
  };

  const handleSheetNavigate = (sheetId: string) => {
    router.push(`/sheets/${sheetId}`);
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
    <TooltipProvider>
    <div className="container mx-auto px-4 py-8 space-y-8 max-w-7xl">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">
          Dashboard
        </h1>
        <p className="text-muted-foreground">
          Create websets from templates and manage your research
        </p>
      </div>

      {/* Template Gallery Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-foreground">
            Template Gallery
          </h2>
        </div>

        {templatesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
                    {/* Delete button in top right corner */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => handleDelete(template.id)}
                          variant="ghost"
                          size="icon-sm"
                          className={deleteConfirm === template.id ? 'text-destructive font-bold' : 'text-destructive hover:text-destructive'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {deleteConfirm === template.id ? 'Click again to confirm' : 'Delete template'}
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {template.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-6">
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
                <div className="border-t border-gray-200 bg-gray-50 px-6 py-3 flex items-center gap-3">
                  <Button
                    onClick={() => router.push(`/templates/${template.id}/edit`)}
                    variant="ghost"
                    size="sm"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Customize
                  </Button>
                  <Button
                    onClick={() => handleTemplateUse(template.id)}
                    className="flex-1"
                  >
                    Create <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border rounded-lg bg-muted/50">
            <p className="text-muted-foreground">
              No templates yet. Create your first template to get started!
            </p>
          </div>
        )}

        {creatingTemplateId && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-card p-6 rounded-lg shadow-lg flex items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-foreground">Creating webset...</p>
            </div>
          </div>
        )}
      </div>

      {/* Websets Table Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-foreground">
            Your Websets
          </h2>
        </div>

        <WebsetsTable
          sheets={sheets ?? []}
          onDelete={handleSheetDelete}
          onNavigate={handleSheetNavigate}
          isLoading={sheetsLoading}
        />
      </div>
    </div>
    </TooltipProvider>
  );
}
