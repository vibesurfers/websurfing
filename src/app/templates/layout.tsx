import { auth, signOut } from "@/server/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { redirect } from "next/navigation";

export default async function TemplatesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/welcome");
  }

  return (
    <AppLayout
      user={session.user}
      onSignOut={async () => {
        "use server";
        await signOut();
      }}
    >
      {children}
    </AppLayout>
  );
}
