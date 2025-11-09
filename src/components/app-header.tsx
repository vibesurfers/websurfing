import Image from "next/image";
import Link from "next/link";

export function AppHeader() {
  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center">
        <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
          <Image
            src="/vibesurfers-logo.svg"
            alt="VibeSurfing Logo"
            width={32}
            height={32}
            className="rounded"
          />
          <span className="text-xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
            VibeSurfing
          </span>
        </Link>
      </div>
    </header>
  );
}