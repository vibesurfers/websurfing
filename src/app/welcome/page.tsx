import { HydrateClient } from "@/trpc/server";
import { auth, signIn } from "@/server/auth";
import { WelcomeFlow } from "@/components/welcome-flow";

export default async function WelcomePage() {
  const session = await auth();

  if (!session?.user) {
    return (
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
              You need to sign in to create and manage your search spreadsheets.
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
      <WelcomeFlow />
    </HydrateClient>
  );
}
