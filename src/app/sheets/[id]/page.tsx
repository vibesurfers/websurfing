import { HydrateClient } from "@/trpc/server";
import { auth, signIn } from "@/server/auth";
import { SheetEditor } from "@/components/sheet-editor";
import { AppHeader } from "@/components/app-header";
import { headers } from "next/headers";

interface SheetPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    createTemplate?: string;
  }>;
}

export default async function SheetPage({ params, searchParams }: SheetPageProps) {
  let session = await auth();
  const { id } = await params;
  const { createTemplate } = await searchParams;

  // Check for bypass userId in headers (for testing)
  if (process.env.NODE_ENV === 'development') {
    const headersList = await headers();
    const bypassUserId = headersList.get('x-bypass-user-id');
    if (bypassUserId) {
      // Create mock session for testing
      session = {
        user: {
          id: bypassUserId,
          name: 'Test User',
          email: 'test@example.com',
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
      console.log('Sheet page: Using bypass session for testing:', bypassUserId);
    }
  }

  if (!session?.user) {
    return (
      <>
        <AppHeader />
        <main className="container mx-auto p-8 min-h-screen bg-white">
        <div className="max-w-md mx-auto mt-8">
          <h1 className="text-3xl font-bold mb-6 text-gray-900 text-center">
            VibeSurfing - Web Search Spreadsheets
          </h1>
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              Sign in to continue
            </h2>
            <p className="text-gray-600 mb-6">
              You need to sign in to access this sheet.
            </p>
            <form
              action={async () => {
                "use server";
                await signIn("google");
              }}
            >
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Sign in with Google
              </button>
            </form>
          </div>
        </div>
      </main>
      </>
    );
  }

  return (
    <>
      <AppHeader />
      <HydrateClient>
        <SheetEditor sheetId={id} showTemplatePrompt={createTemplate === 'true'} />
      </HydrateClient>
    </>
  );
}
