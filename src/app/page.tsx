import { TiptapTable } from "@/components/tiptap-table";
import { HydrateClient } from "@/trpc/server";
import { auth, signIn, signOut } from "@/server/auth";

export default async function Home() {
  const session = await auth();

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
          <h1 className="text-3xl font-bold text-gray-900">
            Event Queue Test - Tiptap Table
          </h1>
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
        <TiptapTable />
      </main>
    </HydrateClient>
  );
}
