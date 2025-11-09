'use client'

import { useState } from "react";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { COLUMN_TEMPLATES, type TemplateType, getDefaultSheetName } from "@/server/templates/column-templates";

export function WelcomeFlow() {
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const { data: sheets } = api.sheet.list.useQuery();
  const createSheet = api.sheet.create.useMutation({
    onError: (error) => {
      console.error('Failed to create sheet:', error);
      alert('Failed to create sheet. Please try again.');
      setIsCreating(false);
    },
  });

  const handleTemplateSelect = async (templateType: TemplateType) => {
    setIsCreating(true);
    setSelectedTemplate(templateType);

    try {
      const sheetName = getDefaultSheetName(templateType);
      console.log('[WelcomeFlow] Creating sheet with template:', templateType);
      const newSheet = await createSheet.mutateAsync({
        name: sheetName,
        templateType,
      });

      if (newSheet) {
        console.log('[WelcomeFlow] Created sheet with ID:', newSheet.id);
        console.log('[WelcomeFlow] Navigating to:', `/sheets/${newSheet.id}`);

        router.push(`/sheets/${newSheet.id}`);
      }
    } catch (error) {
      console.error('Error in handleTemplateSelect:', error);
      setIsCreating(false);
    }
  };

  const handleSelectExistingSheet = (sheetId: string) => {
    router.push(`/sheets/${sheetId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-100 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-xl p-8 space-y-8">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <Image
              src="/logo.png"
              alt="VibeSurfing - Vibe the Web"
              width={300}
              height={300}
              priority
              className="rounded-lg"
            />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent mb-3">
              Vibe the Web
            </h1>
            <p className="text-lg text-gray-700 mb-2">
              Ride the waves of information with websets
            </p>
            <p className="text-gray-600">
              AI-powered spreadsheets that surf the internet for you
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="border-2 border-cyan-200 rounded-xl p-6 hover:border-cyan-400 transition-colors bg-gradient-to-br from-white to-cyan-50/30">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              🏄 Catch a Wave - Start a New Webset
            </h2>
            <p className="text-gray-600 mb-6">
              Pick your vibe and let AI surf the web for you
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.values(COLUMN_TEMPLATES).map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template.id)}
                  disabled={isCreating}
                  className="group relative bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="text-5xl mb-3">{template.icon}</div>
                  <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-600">
                    {template.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {template.description}
                  </p>

                  {template.isAutonomous && (
                    <div className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                      <span>⚠️</span>
                      <span>Autonomous mode</span>
                    </div>
                  )}

                  {isCreating && selectedTemplate === template.id && (
                    <div className="absolute inset-0 bg-white/80 rounded-lg flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-4 text-sm text-gray-500">
              <strong>Column Preview:</strong>
              {selectedTemplate && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {COLUMN_TEMPLATES[selectedTemplate].columns.map((col, idx) => (
                    <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                      {col.title}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="border-2 border-blue-200 rounded-xl p-6 hover:border-blue-400 transition-colors bg-gradient-to-br from-white to-blue-50/30">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              🌊 Your Websets
            </h2>
            <p className="text-gray-600 mb-4">
              Jump back into your saved websets and keep vibing
            </p>

            {sheets && sheets.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {sheets.map((sheet) => (
                  <button
                    key={sheet.id}
                    onClick={() => handleSelectExistingSheet(sheet.id)}
                    className="w-full text-left bg-gray-50 hover:bg-green-50 border border-gray-200 hover:border-green-500 rounded-lg p-4 transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900 group-hover:text-green-700">
                          {sheet.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {sheet.templateType && (
                            <span className="inline-flex items-center gap-1">
                              <span>{COLUMN_TEMPLATES[sheet.templateType as TemplateType]?.icon}</span>
                              <span>{COLUMN_TEMPLATES[sheet.templateType as TemplateType]?.name}</span>
                            </span>
                          )}
                          {!sheet.templateType && <span>Custom Sheet</span>}
                        </p>
                      </div>
                      <div className="text-xs text-gray-400">
                        {sheet.createdAt ? new Date(sheet.createdAt).toLocaleDateString() : ''}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No websets yet. Catch your first wave above!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
