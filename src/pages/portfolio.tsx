// /src/pages/portfolio.tsx

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useUser } from "@supabase/auth-helpers-react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

interface Gameplan {
  id: string;
  topic: string;
  skill: string;
  created_at: string;
}

export default function PortfolioPage() {
  const user = useUser();
  const router = useRouter();

  const [gameplans, setGameplans] = useState<Gameplan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Redirect if not signed in, otherwise fetch gameplans
  useEffect(() => {
    if (user === undefined) return;

    if (user === null) {
      router.replace("/signin");
      return;
    }

    const fetchGameplans = async () => {
      const { data, error } = await supabase
        .from<Gameplan>("gameplans")
        .select("id, topic, skill, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading portfolio:", error.message);
        setErrorMsg("Failed to load your gameplans.");
      } else {
        setGameplans(data || []);
      }
      setLoading(false);
    };

    fetchGameplans();
  }, [user, router]);

  if (!user || loading) {
    return null; // or spinner if you prefer
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-semibold mb-4">Your Portfolio</h1>

        {errorMsg && (
          <div className="mb-4 px-4 py-2 bg-red-100 text-red-700 rounded">
            {errorMsg}
          </div>
        )}

        {gameplans.length === 0 ? (
          <p className="text-gray-600">
            You have no saved gameplans yet. Start one by chatting in{" "}
            <Link href="/chat">
              <a className="text-indigo-600 hover:underline">AI Coaching Chat</a>
            </Link>
            .
          </p>
        ) : (
          <ul className="space-y-4">
            {gameplans.map((gp) => (
              <li
                key={gp.id}
                className="border border-gray-200 rounded p-4 hover:shadow transition"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-medium">
                      {gp.topic} – {gp.skill}
                    </h2>
                    <p className="text-sm text-gray-500">
                      Created on{" "}
                      {new Date(gp.created_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <Link href={`/portfolio/${gp.id}`}>
                    <a className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition">
                      View
                    </a>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
