import { HydrateClient } from "@/trpc/server";
import { auth, signOut } from "@/server/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { SettingsContent } from "@/components/settings-content";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
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
        <SettingsContent />
      </AppLayout>
    </HydrateClient>
  );
}
