import { HydrateClient } from "@/trpc/server";
import { auth, signOut } from "@/server/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { WebsetsContent } from "@/components/websets-content";
import { redirect } from "next/navigation";

export default async function WebsetsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/');
  }

  return (
    <HydrateClient>
      <AppLayout
        user={session.user}
        onSignOut={async () => {
          "use server";
          await signOut();
        }}
      >
        <WebsetsContent />
      </AppLayout>
    </HydrateClient>
  );
}
