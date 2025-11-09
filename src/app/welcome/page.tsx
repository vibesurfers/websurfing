import { HydrateClient } from "@/trpc/server";
import { auth } from "@/server/auth";
import { WelcomeFlow } from "@/components/welcome-flow";
import { MarketingHomepage } from "@/components/marketing-homepage";
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

  // Show marketing homepage for unauthenticated users
  if (!session?.user) {
    return <MarketingHomepage />;
  }

  // Show WelcomeFlow for authenticated users
  return (
    <HydrateClient>
      <WelcomeFlow />
    </HydrateClient>
  );
}
