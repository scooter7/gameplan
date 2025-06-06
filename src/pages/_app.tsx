// /src/pages/_app.tsx

import { useState } from "react";
import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";
import { SessionContextProvider } from "@supabase/auth-helpers-react";

// ────────────────────────────────────────────────────────────────────────────────
// 1) Import your globals.css _before_ anything else that relies on Tailwind or your
//    @font-face declarations. This file must contain the `@tailwind base;` /
//    `@tailwind components;` / `@tailwind utilities;` directives, plus all of your
//    custom CSS variables, .button, .card, .flashcard, and background classes.
// ────────────────────────────────────────────────────────────────────────────────
import "@/styles/globals.css";

import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  // ──────────────────────────────────────────────────────────────────────────────
  // 2) Initialize Supabase client for “Pages Router”
  //    (we switched to createPagesBrowserClient instead of the deprecated createBrowserSupabaseClient)
  // ──────────────────────────────────────────────────────────────────────────────
  const [supabaseClient] = useState(() => createPagesBrowserClient());

  return (
    // ────────────────────────────────────────────────────────────────────────────
    // 3) Wrap the entire app in the SessionContextProvider so any page/component
    //    can call useUser(), useSession(), etc.
    // ────────────────────────────────────────────────────────────────────────────
    <SessionContextProvider supabaseClient={supabaseClient}>
      <Component {...pageProps} />
    </SessionContextProvider>
  );
}
