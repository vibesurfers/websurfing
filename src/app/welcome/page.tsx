import { HydrateClient } from "@/trpc/server";
import { auth, signIn } from "@/server/auth";
import { WelcomeFlow } from "@/components/welcome-flow";
import Image from "next/image";
import { headers } from "next/headers";

export default async function WelcomePage() {
  let session = await auth();

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
      console.log('Welcome page: Using bypass session for testing:', bypassUserId);
    }
  }

  if (!session?.user) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-100 flex items-center justify-center p-8">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">
            <div className="flex justify-center">
              <Image
                src="/logo.png"
                alt="VibeSurfing - Vibe the Web"
                width={250}
                height={250}
                priority
                className="rounded-lg"
              />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent mb-2">
                Vibe the Web
              </h1>
              <p className="text-gray-600 mb-6">
                AI-powered websets that surf the internet for you
              </p>
            </div>
            <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-3 text-gray-800">
                Ready to catch some waves?
              </h2>
              <p className="text-gray-600 mb-6">
                Sign in to start vibing with websets
              </p>
              <form
                action={async () => {
                  "use server";
                  await signIn("google");
                }}
              >
                <button
                  type="submit"
                  className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-all shadow-lg hover:shadow-xl"
                >
                  Sign in with Google
                </button>
              </form>
            </div>
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
