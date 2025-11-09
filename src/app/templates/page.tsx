'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, ArrowRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

export default function TemplatesPage() {
  const router = useRouter();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // My Templates pagination state
  const [myTemplates, setMyTemplates] = useState<any[]>([]);
  const [myCursor, setMyCursor] = useState<string | undefined>();
  const [myHasMore, setMyHasMore] = useState(true);

  // Public Templates pagination state
  const [publicTemplatesList, setPublicTemplatesList] = useState<any[]>([]);
  const [publicCursor, setPublicCursor] = useState<string | undefined>();
  const [publicHasMore, setPublicHasMore] = useState(true);

  // Queries with pagination
  const { data: myTemplatesData, isLoading, isFetching: myFetching, refetch } = api.template.list.useQuery(
    { limit: 36, cursor: myCursor },
    { enabled: myHasMore, keepPreviousData: true }
  );

  const { data: publicTemplatesData, isFetching: publicFetching } = api.template.listPublic.useQuery(
    { limit: 36, cursor: publicCursor },
    { enabled: publicHasMore, keepPreviousData: true }
  );

  // Update my templates list
  useEffect(() => {
    if (myTemplatesData) {
      setMyTemplates(prev => myCursor ? [...prev, ...myTemplatesData.items] : myTemplatesData.items);
      setMyHasMore(!!myTemplatesData.nextCursor);
    }
  }, [myTemplatesData, myCursor]);

  // Update public templates list
  useEffect(() => {
    if (publicTemplatesData) {
      setPublicTemplatesList(prev => publicCursor ? [...prev, ...publicTemplatesData.items] : publicTemplatesData.items);
      setPublicHasMore(!!publicTemplatesData.nextCursor);
    }
  }, [publicTemplatesData, publicCursor]);

  // IntersectionObserver refs
  const myObserverTarget = useRef<HTMLDivElement>(null);
  const publicObserverTarget = useRef<HTMLDivElement>(null);

  // Load more handlers
  const loadMoreMy = useCallback(() => {
    if (!myFetching && myHasMore && myTemplatesData?.nextCursor) {
      setMyCursor(myTemplatesData.nextCursor);
    }
  }, [myFetching, myHasMore, myTemplatesData?.nextCursor]);

  const loadMorePublic = useCallback(() => {
    if (!publicFetching && publicHasMore && publicTemplatesData?.nextCursor) {
      setPublicCursor(publicTemplatesData.nextCursor);
    }
  }, [publicFetching, publicHasMore, publicTemplatesData?.nextCursor]);

  // Set up IntersectionObserver for my templates
  useEffect(() => {
    if (!myObserverTarget.current || !myHasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !myFetching) {
          loadMoreMy();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(myObserverTarget.current);
    return () => observer.disconnect();
  }, [myHasMore, myFetching, loadMoreMy]);

  // Set up IntersectionObserver for public templates
  useEffect(() => {
    if (!publicObserverTarget.current || !publicHasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !publicFetching) {
          loadMorePublic();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(publicObserverTarget.current);
    return () => observer.disconnect();
  }, [publicHasMore, publicFetching, loadMorePublic]);

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
    <TooltipProvider>
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
          ) : myTemplates && myTemplates.length > 0 ? (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myTemplates.map((template) => (
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
                      onClick={() => handleUseTemplate(template.id, template.name)}
                      className="flex-1"
                    >
                      Create <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Loading indicator for infinite scroll */}
            {myHasMore && (
              <div ref={myObserverTarget} className="col-span-full py-8 text-center">
                {myFetching ? (
                  <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <p className="text-muted-foreground text-sm">Scroll for more...</p>
                )}
              </div>
            )}
            </>
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
        {publicTemplatesList && publicTemplatesList.length > 0 && (
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Public Templates
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {publicTemplatesList.map((template) => (
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
                      <p className="text-sm text-gray-600 mb-4 line-clamp-6">
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
                      className="flex-1"
                    >
                      Clone to My Templates <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Loading indicator for infinite scroll */}
            {publicHasMore && (
              <div ref={publicObserverTarget} className="col-span-full py-8 text-center">
                {publicFetching ? (
                  <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <p className="text-muted-foreground text-sm">Scroll for more...</p>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
    </TooltipProvider>
  );
}
