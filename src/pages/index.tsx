// /src/pages/index.tsx

import { useEffect } from "react";
import { useRouter } from "next/router";
import { useUser } from "@supabase/auth-helpers-react";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const user = useUser();
  const router = useRouter();

  useEffect(() => {
    // Wait until we know the auth state
    if (user === undefined) return;

    if (user === null) {
      // Not signed in → send to sign-in page
      router.replace("/signin");
    } else {
      // Signed in → check if profile exists
      const checkProfile = async () => {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error checking profile:", error);
          // In case of an unexpected error, you might still redirect to profile form,
          // or show an error UI. Here, we send to /profile so user can (re)create it.
          router.replace("/profile");
          return;
        }

        if (!profile) {
          // No profile row found → send to profile form
          router.replace("/profile");
        } else {
          // Profile exists → send to chat flow
          router.replace("/chat");
        }
      };

      checkProfile();
    }
  }, [user, router]);

  // While redirecting, render nothing (or a spinner if you prefer)
  return null;
}
