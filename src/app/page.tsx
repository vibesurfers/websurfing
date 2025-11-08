import { TiptapTable } from "@/components/tiptap-table";
import { HydrateClient } from "@/trpc/server";

export default function Home() {
  return (
    <HydrateClient>
      <main className="container mx-auto p-8 min-h-screen bg-white">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">
          Event Queue Test - Tiptap Table
        </h1>
        <TiptapTable />
      </main>
    </HydrateClient>
  );
}
