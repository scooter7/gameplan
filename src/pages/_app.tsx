// /src/pages/_app.tsx

import { useState } from "react";
import type { AppProps } from "next/app";
import {
  SessionContextProvider,
  Session,
} from "@supabase/auth-helpers-react";
import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";
import "../styles/globals.css";

type MyAppProps = AppProps<{
  initialSession: Session | null;
}>;

export default function MyApp({ Component, pageProps }: MyAppProps) {
  // Use the new “pages” helper instead of createBrowserSupabaseClient
  const [supabaseClient] = useState<SupabaseClient>(() =>
    createPagesBrowserClient()
  );

  return (
    <SessionContextProvider
      supabaseClient={supabaseClient}
      initialSession={pageProps.initialSession}
    >
      <Component {...pageProps} />
    </SessionContextProvider>
  );
}
