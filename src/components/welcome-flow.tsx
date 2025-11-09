'use client'

import { useState } from "react";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { TemplateGalleryCard } from "@/components/template-gallery-card";
import { WebsetsTable } from "@/components/websets-table";
import { Loader2 } from "lucide-react";

export function WelcomeFlow() {
  const router = useRouter();
  const [creatingTemplateId, setCreatingTemplateId] = useState<string | null>(null);

  const { data: templates, isLoading: templatesLoading } = api.template.list.useQuery();
  const { data: sheets, isLoading: sheetsLoading } = api.sheet.list.useQuery();

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

  return (
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <TemplateGalleryCard
                key={template.id}
                id={template.id}
                name={template.name}
                description={template.description ?? undefined}
                icon={template.icon ?? undefined}
                isAutonomous={template.isAutonomous ?? false}
                isPublic={template.isPublic ?? false}
                columns={template.columns.map(col => ({
                  title: col.title,
                  position: col.position,
                  dataType: col.dataType ?? 'text',
                }))}
                usageCount={template.usageCount ?? 0}
                onUse={handleTemplateUse}
              />
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
  );
}
