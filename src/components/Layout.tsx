// /src/components/Layout.tsx

import { ReactNode, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const user = useUser();
  const supabase = useSupabaseClient();
  const router = useRouter();

  // If auth state is still loading, do nothing
  useEffect(() => {
    if (user === undefined) return;
    if (user === null) {
      router.replace("/signin");
    }
  }, [user, router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/signin");
  };

  // While auth is loading or redirecting, don’t render layout
  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-text-secondary">
      {/* Top navigation bar */}
      <nav className="bg-primary text-white p-4 shadow-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link href="/">
            <a className="text-lg font-heading">Liferramp360</a>
          </Link>
          <div className="space-x-4">
            <Link href="/chat">
              <a
                className={`hover:underline ${
                  router.pathname === "/chat" ? "font-bold" : ""
                }`}
              >
                Chat
              </a>
            </Link>
            <Link href="/portfolio">
              <a
                className={`hover:underline ${
                  router.pathname.startsWith("/portfolio") ? "font-bold" : ""
                }`}
              >
                Portfolio
              </a>
            </Link>
            <Link href="/ingest">
              <a
                className={`hover:underline ${
                  router.pathname === "/ingest" ? "font-bold" : ""
                }`}
              >
                Ingest
              </a>
            </Link>
            <button
              onClick={handleSignOut}
              className="ml-4 bg-secondary hover:bg-secondary/90 px-3 py-1 rounded text-sm transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main content area */}
      <main className="flex-1 pt-6 px-4">
        {children}
      </main>

      {/* Optional footer */}
      <footer className="bg-surface text-text-secondary text-center py-4">
        <p className="text-sm">&copy; {new Date().getFullYear()} Liferramp360</p>
      </footer>
    </div>
  );
}
