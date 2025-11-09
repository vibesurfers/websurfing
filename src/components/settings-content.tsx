"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Copy, Eye, EyeOff, RefreshCw, Key, Check, AlertTriangle } from "lucide-react";

export function SettingsContent() {
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);

  // Query API key
  const { data: apiKeyData, isLoading, refetch } = api.apiKey.get.useQuery();

  // Mutations
  const generateMutation = api.apiKey.generate.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const regenerateMutation = api.apiKey.regenerate.useMutation({
    onSuccess: () => {
      refetch();
      setRegenerateDialogOpen(false);
    },
  });

  const handleCopy = async () => {
    if (apiKeyData?.apiKey) {
      await navigator.clipboard.writeText(apiKeyData.apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGenerate = () => {
    generateMutation.mutate();
  };

  const handleRegenerate = () => {
    regenerateMutation.mutate();
  };

  const displayKey = showKey ? apiKeyData?.apiKey : apiKeyData?.maskedKey;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your API access and account settings
        </p>
      </div>

      <Separator />

      {/* API Access Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            <CardTitle>API Access</CardTitle>
          </div>
          <CardDescription>
            Use your API key to integrate VibeSurfers with your applications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : !apiKeyData?.hasKey ? (
            // No API key yet
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm text-muted-foreground">
                  You don't have an API key yet. Generate one to start using the API.
                </p>
              </div>
              <Button
                onClick={handleGenerate}
                disabled={generateMutation.isPending}
                className="w-full sm:w-auto"
              >
                {generateMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Key className="h-4 w-4 mr-2" />
                    Generate API Key
                  </>
                )}
              </Button>
            </div>
          ) : (
            // Has API key
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Your API Key</label>
                <div className="flex gap-2">
                  <Input
                    value={displayKey || ''}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowKey(!showKey)}
                    title={showKey ? 'Hide key' : 'Show key'}
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                    title="Copy to clipboard"
                  >
                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                {apiKeyData.createdAt && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Created: {new Date(apiKeyData.createdAt).toLocaleDateString()}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={() => setRegenerateDialogOpen(true)}
                  disabled={regenerateMutation.isPending}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate Key
                </Button>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-900 dark:text-amber-100">
                    <p className="font-medium mb-1">Keep your API key secure</p>
                    <p className="text-amber-700 dark:text-amber-300">
                      Anyone with your API key can access your sheets. Never share it publicly or commit it to version control.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* API Documentation */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">API Documentation</h3>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-sm mb-2">Authentication</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Include your API key in the Authorization header:
                </p>
                <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
                  Authorization: Bearer YOUR_API_KEY
                </pre>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-2">Available Endpoints</h4>
                <div className="space-y-3 text-sm">
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="font-mono text-xs mb-1">
                      <span className="text-green-600 dark:text-green-400 font-bold">GET</span>{' '}
                      /api/v1/sheets
                    </p>
                    <p className="text-muted-foreground">List all your sheets</p>
                  </div>

                  <div className="bg-muted p-3 rounded-lg">
                    <p className="font-mono text-xs mb-1">
                      <span className="text-blue-600 dark:text-blue-400 font-bold">POST</span>{' '}
                      /api/v1/sheets/&#123;sheetId&#125;/rows
                    </p>
                    <p className="text-muted-foreground mb-2">Add rows to a sheet</p>
                    <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
{`{
  "rows": [
    ["value1", "value2", "value3"],
    ["value1", "value2"]
  ]
}`}
                    </pre>
                  </div>

                  <div className="bg-muted p-3 rounded-lg">
                    <p className="font-mono text-xs mb-1">
                      <span className="text-green-600 dark:text-green-400 font-bold">GET</span>{' '}
                      /api/v1/sheets/&#123;sheetId&#125;/data?format=csv
                    </p>
                    <p className="text-muted-foreground">Export sheet data (json or csv)</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-2">Example Request</h4>
                <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
{`curl -X GET https://your-domain.com/api/v1/sheets \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
                </pre>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Regenerate Confirmation Dialog */}
      <Dialog open={regenerateDialogOpen} onOpenChange={setRegenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate API Key?</DialogTitle>
            <DialogDescription>
              This will invalidate your current API key. Any applications using the old key will stop working immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <p className="text-sm text-destructive font-medium">
              This action cannot be undone. Make sure to update all applications using your API key.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRegenerateDialogOpen(false)}
              disabled={regenerateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRegenerate}
              disabled={regenerateMutation.isPending}
            >
              {regenerateMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Regenerating...
                </>
              ) : (
                'Regenerate Key'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
