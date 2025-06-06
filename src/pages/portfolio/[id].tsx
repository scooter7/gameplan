// /src/pages/portfolio/[id].tsx

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useUser } from "@supabase/auth-helpers-react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import FlashcardCard, { FlashcardParsed } from "@/components/FlashcardCard"; // Import the new component

interface Goal {
  id: string;
  description: string;
  status: string;
  start_date: string;
}

interface Flashcard {
  id: string;
  content: string;
}

interface GameplanDetail {
  topic: string;
  skill: string;
  created_at: string;
  goals: Goal[];
  flashcards: Flashcard[];
}

export default function GameplanDetailPage() {
  const user = useUser();
  const router = useRouter();
  const { id } = router.query; // this is the gameplan ID

  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [gameplan, setGameplan] = useState<GameplanDetail | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [flashcards, setFlashcards] = useState<FlashcardParsed[]>([]);
  const [updatingGoalId, setUpdatingGoalId] = useState<string | null>(null);
  const [markingCompleted, setMarkingCompleted] = useState<boolean>(false);
  const [flashcardsSubmitted, setFlashcardsSubmitted] = useState<boolean[]>([]);

  // Fetch gameplan and related goals/flashcards
  useEffect(() => {
    if (user === undefined) return; // auth loading
    if (user === null) {
      router.replace("/signin");
      return;
    }
    if (!id || typeof id !== "string") return;

    const fetchDetail = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("gameplans")
        .select(
          `
          topic,
          skill,
          created_at,
          goals (
            id,
            description,
            status,
            start_date
          ),
          flashcards (
            id,
            content
          )
        `
        )
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching gameplan detail:", error.message);
        setErrorMsg("Failed to load gameplan details.");
        setLoading(false);
        return;
      }
      if (!data) {
        setErrorMsg("Gameplan not found.");
        setLoading(false);
        return;
      }

      const detail = data as unknown as GameplanDetail;
      setGameplan({
        topic: detail.topic,
        skill: detail.skill,
        created_at: detail.created_at,
        goals: detail.goals || [],
        flashcards: detail.flashcards || [],
      });
      setGoals(detail.goals || []);

      // Parse each flashcard’s content into structured data
      const parsedFCs: FlashcardParsed[] = (detail.flashcards || []).map(
        (fc) => parseFlashcardContent(fc.content)
      );
      setFlashcards(parsedFCs);
      setFlashcardsSubmitted(Array(parsedFCs.length).fill(false)); // Initialize completion status
      setLoading(false);
    };

    fetchDetail();
  }, [user, id, router]);

  // Parse a flashcard’s content into video URL, description lines, and MCQs
  function parseFlashcardContent(content: string): FlashcardParsed {
    // Extract a YouTube URL if present
    const urlMatch = content.match(
      /https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/i
    );
    const videoUrl = urlMatch ? urlMatch[0] : null;

    // Remove the "Video: URL" line from raw content, then split into lines
    const lines = content
      .split("\n")
      .filter((line) => !line.startsWith("Video: "))
      .filter((line) => line.trim() !== "");

    // Find "Description:" line and separate it from questions
    let descriptionLines: string[] = [];
    let questionsSection: string[] = [];
    let isQuestions = false;
    for (const line of lines) {
      if (line.startsWith("Description:")) {
        descriptionLines.push(line.replace("Description:", "").trim());
      } else if (line.startsWith("Questions:")) {
        isQuestions = true;
      } else if (isQuestions) {
        questionsSection.push(line);
      }
    }

    // Parse questionsSection into question blocks
    const questions: {
      prompt: string;
      options: string[];
      correct: string;
    }[] = [];
    let currentQ: { prompt: string; options: string[]; correct: string } | null =
      null;

    for (const rawLine of questionsSection) {
      const line = rawLine.trim();
      if (/^\d+\.\s/.test(line)) {
        if (currentQ) questions.push(currentQ);
        currentQ = {
          prompt: line.replace(/^\d+\.\s*/, "").trim(),
          options: [],
          correct: "",
        };
      } else if (/^[a-d]\)/i.test(line)) {
        if (currentQ) {
          const opt = line.replace(/^[a-d]\)\s*/, "").trim();
          currentQ.options.push(opt);
        }
      } else if (/^Correct:/i.test(line)) {
        if (currentQ) {
          currentQ.correct = line.replace(/^Correct:\s*/, "").trim();
        }
      } else {
        if (currentQ && currentQ.options.length > 0) {
          const lastIdx = currentQ.options.length - 1;
          currentQ.options[lastIdx] += " " + line;
        } else if (currentQ) {
          currentQ.prompt += " " + line;
        }
      }
    }
    if (currentQ) questions.push(currentQ);

    return {
      videoUrl,
      descriptionLines,
      questions,
    };
  }

  // Update a single goal’s status
  const updateGoalStatus = async (goalId: string, newStatus: string) => {
    setUpdatingGoalId(goalId);
    const { error } = await supabase
      .from("goals")
      .update({ status: newStatus })
      .eq("id", goalId);

    if (error) {
      console.error("Error updating goal status:", error.message);
      setErrorMsg("Failed to update goal status.");
    } else {
      setGoals((prev) =>
        prev.map((g) => (g.id === goalId ? { ...g, status: newStatus } : g))
      );
    }
    setUpdatingGoalId(null);
  };

  // Mark all goals as completed and redirect to /chat
  const handleMarkCompleted = async () => {
    if (!gameplan) return;
    setMarkingCompleted(true);

    const updates = goals.map((g) =>
      supabase.from("goals").update({ status: "completed" }).eq("id", g.id)
    );
    const results = await Promise.all(updates);
    const anyError = results.find((r) => r.error);
    if (anyError?.error) {
      console.error("Error marking all goals complete:", anyError.error);
      setErrorMsg("Failed to mark all goals as completed.");
      setMarkingCompleted(false);
      return;
    }

    router.push("/chat?completed=true");
  };

  const handleFlashcardComplete = (index: number) => {
    setFlashcardsSubmitted((prev) => {
      const newState = [...prev];
      newState[index] = true;
      return newState;
    });
  };

  if (!user || loading) {
    return null; // or a spinner
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6">
        {errorMsg && (
          <div className="mb-4 px-4 py-2 bg-red-100 text-red-700 rounded">
            {errorMsg}
          </div>
        )}

        {gameplan ? (
          <>
            <h1 className="text-2xl font-semibold mb-2">
              {gameplan.topic} – {gameplan.skill}
            </h1>
            <p className="text-sm text-gray-500 mb-6">
              Created on{" "}
              {new Date(gameplan.created_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-medium mb-4">Your Goals</h2>
              <ul className="space-y-4">
                {goals.map((goal) => (
                  <li
                    key={goal.id}
                    className="border border-gray-200 rounded p-4 flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium">{goal.description}</p>
                      <p className="text-sm text-gray-500">
                        Start Date:{" "}
                        {new Date(goal.start_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <select
                        value={goal.status}
                        disabled={updatingGoalId === goal.id}
                        onChange={(e) =>
                          updateGoalStatus(goal.id, e.target.value)
                        }
                        className="border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="pending">Pending</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-medium mb-4">Your Flashcards</h2>
              <div>
                {flashcards.map((fc, idx) => (
                  <FlashcardCard
                    key={idx}
                    fc={fc}
                    index={idx}
                    onComplete={() => handleFlashcardComplete(idx)}
                  />
                ))}
              </div>
            </section>

            <div className="text-center">
              <button
                onClick={handleMarkCompleted}
                disabled={markingCompleted}
                className={`px-6 py-3 rounded-md text-white ${
                  markingCompleted
                    ? "bg-green-300 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700"
                } transition`}
              >
                {markingCompleted
                  ? "Marking Completed..."
                  : "I've Completed This Gameplan"}
              </button>
            </div>
          </>
        ) : (
          <p className="text-gray-600">Loading gameplan details...</p>
        )}

        <div className="mt-6">
          <Link href="/profile" legacyBehavior>
            <a className="text-indigo-600 hover:underline text-sm">
              &larr; Back to Profile
            </a>
          </Link>
        </div>
      </div>
    </div>
  );
}