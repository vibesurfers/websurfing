"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Code, Copy, Check } from "lucide-react";

interface ApiSnippetsDialogProps {
  sheetId: string;
  sheetName?: string;
  appUrl: string;
}

type Language = 'curl' | 'javascript' | 'python';

export function ApiSnippetsDialog({ sheetId, sheetName, appUrl }: ApiSnippetsDialogProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('curl');
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const apiUrl = appUrl;

  const snippets = {
    curl: {
      addRows: `# Add rows to ${sheetName || 'this sheet'}
curl -X POST \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"rows":[["value1","value2","value3"],["value1","value2"]]}' \\
  ${apiUrl}/api/v1/sheets/${sheetId}/rows`,

      exportJson: `# Export sheet data as JSON
curl -H "Authorization: Bearer YOUR_API_KEY" \\
  ${apiUrl}/api/v1/sheets/${sheetId}/data`,

      exportCsv: `# Export sheet data as CSV
curl -H "Authorization: Bearer YOUR_API_KEY" \\
  ${apiUrl}/api/v1/sheets/${sheetId}/data?format=csv \\
  > ${sheetName?.replace(/[^a-zA-Z0-9]/g, '_') || 'export'}.csv`,
    },
    javascript: {
      addRows: `// Add rows to ${sheetName || 'this sheet'}
const API_KEY = 'your_api_key_here';

const response = await fetch('${apiUrl}/api/v1/sheets/${sheetId}/rows', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${API_KEY}\`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    rows: [
      ["value1", "value2", "value3"],
      ["value1", "value2"]
    ]
  })
});

const result = await response.json();
console.log(result);`,

      exportJson: `// Export sheet data as JSON
const API_KEY = 'your_api_key_here';

const response = await fetch('${apiUrl}/api/v1/sheets/${sheetId}/data', {
  headers: {
    'Authorization': \`Bearer \${API_KEY}\`
  }
});

const data = await response.json();
console.log(data);`,

      exportCsv: `// Export sheet data as CSV
const API_KEY = 'your_api_key_here';

const response = await fetch('${apiUrl}/api/v1/sheets/${sheetId}/data?format=csv', {
  headers: {
    'Authorization': \`Bearer \${API_KEY}\`
  }
});

const csvData = await response.text();
console.log(csvData);`,
    },
    python: {
      addRows: `# Add rows to ${sheetName || 'this sheet'}
import requests

API_KEY = 'your_api_key_here'

response = requests.post(
    '${apiUrl}/api/v1/sheets/${sheetId}/rows',
    headers={'Authorization': f'Bearer {API_KEY}'},
    json={
        'rows': [
            ["value1", "value2", "value3"],
            ["value1", "value2"]
        ]
    }
)

print(response.json())`,

      exportJson: `# Export sheet data as JSON
import requests

API_KEY = 'your_api_key_here'

response = requests.get(
    '${apiUrl}/api/v1/sheets/${sheetId}/data',
    headers={'Authorization': f'Bearer {API_KEY}'}
)

data = response.json()
print(data)`,

      exportCsv: `# Export sheet data as CSV
import requests

API_KEY = 'your_api_key_here'

response = requests.get(
    '${apiUrl}/api/v1/sheets/${sheetId}/data?format=csv',
    headers={'Authorization': f'Bearer {API_KEY}'}
)

with open('${sheetName?.replace(/[^a-zA-Z0-9]/g, '_') || 'export'}.csv', 'w') as f:
    f.write(response.text)`,
    },
  };

  const handleCopy = async (snippet: string, snippetId: string) => {
    await navigator.clipboard.writeText(snippet);
    setCopiedSnippet(snippetId);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const SnippetCard = ({ title, snippet, snippetId }: { title: string; snippet: string; snippetId: string }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">{title}</h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleCopy(snippet, snippetId)}
        >
          {copiedSnippet === snippetId ? (
            <>
              <Check className="h-4 w-4 mr-1 text-green-600" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </>
          )}
        </Button>
      </div>
      <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto font-mono">
        {snippet}
      </pre>
    </div>
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Code className="h-4 w-4 mr-2" />
          API
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>API Integration</DialogTitle>
          <DialogDescription>
            Ready-to-use code snippets for {sheetName ? `"${sheetName}"` : 'this sheet'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Language Tabs */}
          <div className="flex gap-2 border-b">
            <button
              onClick={() => setSelectedLanguage('curl')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                selectedLanguage === 'curl'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              cURL
            </button>
            <button
              onClick={() => setSelectedLanguage('javascript')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                selectedLanguage === 'javascript'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              JavaScript
            </button>
            <button
              onClick={() => setSelectedLanguage('python')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                selectedLanguage === 'python'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Python
            </button>
          </div>

          {/* Snippets */}
          <div className="space-y-6">
            <SnippetCard
              title="Add Rows"
              snippet={snippets[selectedLanguage].addRows}
              snippetId={`${selectedLanguage}-add-rows`}
            />
            <SnippetCard
              title="Export as JSON"
              snippet={snippets[selectedLanguage].exportJson}
              snippetId={`${selectedLanguage}-export-json`}
            />
            <SnippetCard
              title="Export as CSV"
              snippet={snippets[selectedLanguage].exportCsv}
              snippetId={`${selectedLanguage}-export-csv`}
            />
          </div>

          {/* Note about API Key */}
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <p className="text-sm text-amber-900 dark:text-amber-100">
              <strong>Note:</strong> Replace <code className="bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded">YOUR_API_KEY</code> with your actual API key from{' '}
              <a href="/settings" className="underline hover:text-amber-700 dark:hover:text-amber-300">
                Settings
              </a>
              .
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
