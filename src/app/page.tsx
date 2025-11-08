import { HydrateClient } from "@/trpc/server";
import { auth, signIn, signOut } from "@/server/auth";
import { SheetManager } from "@/components/sheet-manager";
import { headers } from "next/headers";

export default async function Home() {
  let session = await auth();

  // Check for bypass userId in headers (for testing)
  const headersList = await headers();
  const bypassUserId = headersList.get('x-bypass-user-id');

  if (bypassUserId && process.env.NODE_ENV === 'development') {
    // Create mock session for testing
    session = {
      user: {
        id: bypassUserId,
        name: 'Test User',
        email: 'test@example.com',
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
    };
    console.log('Page: Using bypass session for testing:', bypassUserId);
  }

  if (!session?.user) {
    return (
      <main className="container mx-auto p-8 min-h-screen bg-white">
        <div className="max-w-md mx-auto mt-8">
          <h1 className="text-3xl font-bold mb-6 text-gray-900 text-center">
            Event Queue Test - Tiptap Table
          </h1>
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              Sign in to continue
            </h2>
            <p className="text-gray-600 mb-6">
              You need to sign in to access the collaborative table and event queue.
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
    );
  }

  return (
    <HydrateClient>
      <main className="container mx-auto p-8 min-h-screen bg-white">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <span className="text-gray-600">
              Welcome, {session.user.name}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut();
              }}
            >
              <button
                type="submit"
                className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
        <SheetManager />
      </main>
    </HydrateClient>
  );
}
