// /src/pages/portfolio/[id].tsx

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useUser } from "@supabase/auth-helpers-react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

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

type FlashcardParsed = {
  videoUrl: string | null;
  descriptionLines: string[];
  questions: {
    prompt: string;
    options: string[];
    correct: string;
  }[];
};

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
        .select(`
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
        `)
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
        // New question, e.g. "1. Why is ...?"
        if (currentQ) questions.push(currentQ);
        currentQ = { prompt: line.replace(/^\d+\.\s*/, "").trim(), options: [], correct: "" };
      } else if (/^[a-d]\)/i.test(line)) {
        // Option line, e.g. "a) It saves time."
        if (currentQ) {
          const opt = line.replace(/^[a-d]\)\s*/, "").trim();
          currentQ.options.push(opt);
        }
      } else if (/^Correct:/i.test(line)) {
        // Correct answer, e.g. "Correct: b"
        if (currentQ) {
          currentQ.correct = line.replace(/^Correct:\s*/, "").trim();
        }
      } else {
        // if any continuation lines, append them to last option or question prompt
        if (currentQ && currentQ.options.length > 0) {
          // append to last option
          const lastIdx = currentQ.options.length - 1;
          currentQ.options[lastIdx] += " " + line;
        } else if (currentQ) {
          // append to question prompt
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

    // Redirect to chat with a query param for a congratulatory message
    router.push("/chat?completed=true");
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

            {/* Goals Section */}
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

            {/* Flashcards Section */}
            <section className="mb-8">
              <h2 className="text-xl font-medium mb-4">Your Flashcards</h2>
              <div className="space-y-8">
                {flashcards.map((fc, idx) => (
                  <FlashcardCard key={idx} fc={fc} />
                ))}
              </div>
            </section>

            {/* “I’ve completed this gameplan” Button */}
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
          <Link href="/portfolio">
            <a className="text-indigo-600 hover:underline text-sm">
              &larr; Back to Portfolio
            </a>
          </Link>
        </div>
      </div>
    </div>
  );
}

// Component to render a single flashcard with flip animation and MCQ form
function FlashcardCard({ fc }: { fc: FlashcardParsed }) {
  const [answers, setAnswers] = useState<Map<number, string>>(new Map());
  const [showResults, setShowResults] = useState<boolean>(false);

  // Handle choosing an option for question i
  const handleOptionChange = (qIdx: number, option: string) => {
    setAnswers((prev) => new Map(prev.set(qIdx, option)));
  };

  // Check if all questions have an answer selected
  const allAnswered = fc.questions.every((_, idx) => answers.has(idx));

  // Compute results when user submits
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [incorrectIndices, setIncorrectIndices] = useState<number[]>([]);

  const handleSubmitAnswers = (e: React.FormEvent) => {
    e.preventDefault();
    let correct = 0;
    const incorrect: number[] = [];
    fc.questions.forEach((q, idx) => {
      const userChoice = answers.get(idx);
      if (userChoice === q.correct) {
        correct++;
      } else {
        incorrect.push(idx);
      }
    });
    setCorrectCount(correct);
    setIncorrectIndices(incorrect);
    setShowResults(true);
  };

  return (
    <div
      className={`relative w-full bg-white border border-gray-200 rounded-lg shadow-sm transition-transform transform ${
        showResults ? "rotate-y-180" : ""
      }`}
      style={{
        perspective: "1000px",
      }}
    >
      {/* Front Side */}
      <div
        className={`absolute w-full h-full backface-hidden ${
          showResults ? "hidden" : "block"
        }`}
      >
        {fc.videoUrl && (
          <div className="aspect-w-16 aspect-h-9 mb-4">
            <iframe
              src={fc.videoUrl.replace("watch?v=", "embed/")}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full rounded"
              title="YouTube Video"
            />
          </div>
        )}

        {/* Description */}
        <div className="mb-4">
          {fc.descriptionLines.map((line, idx) => (
            <p key={idx} className="text-gray-800 whitespace-pre-wrap">
              {line}
            </p>
          ))}
        </div>

        {/* MCQ Form */}
        <form onSubmit={handleSubmitAnswers}>
          {fc.questions.map((q, idx) => (
            <div key={idx} className="mb-4">
              <p className="font-medium mb-2">{q.prompt}</p>
              <div className="space-y-1">
                {q.options.map((opt, optIdx) => {
                  // Map option text to letter a/b/c/d for value
                  const letter = String.fromCharCode(97 + optIdx); // 'a', 'b', 'c', ...
                  return (
                    <label key={optIdx} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name={`q-${idx}`}
                        value={letter}
                        checked={answers.get(idx) === letter}
                        onChange={() => handleOptionChange(idx, letter)}
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                        disabled={showResults}
                      />
                      <span className="text-gray-700">{opt}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          <button
            type="submit"
            disabled={!allAnswered || showResults}
            className={`w-full py-2 rounded-md text-white ${
              !allAnswered || showResults
                ? "bg-indigo-300 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700"
            } transition`}
          >
            Submit Answers
          </button>
        </form>
      </div>

      {/* Back Side (Results) */}
      <div
        className={`absolute w-full h-full rotate-y-180 backface-hidden ${
          showResults ? "block" : "hidden"
        }`}
        style={{
          transformStyle: "preserve-3d",
        }}
      >
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-2">Results</h3>
          <p className="mb-4">
            You answered {correctCount} out of {fc.questions.length} correctly.
          </p>
          {fc.questions.map((q, idx) => {
            const userChoice = answers.get(idx);
            const isCorrect = userChoice === q.correct;
            return (
              <div key={idx} className="mb-3">
                <p className="font-medium">
                  {idx + 1}. {q.prompt}
                </p>
                {q.options.map((opt, optIdx) => {
                  const letter = String.fromCharCode(97 + optIdx);
                  // Highlight correct answer in green; the user's wrong choice in red
                  let textClass = "text-gray-800";
                  if (letter === q.correct) textClass = "text-green-600";
                  else if (letter === userChoice && !isCorrect)
                    textClass = "text-red-600";

                  return (
                    <p key={optIdx} className={`ml-4 ${textClass}`}>
                      {letter}) {opt}
                    </p>
                  );
                })}
                <p className="italic text-sm mt-1">
                  Your answer: {userChoice?.toUpperCase() || "–"} | Correct:{" "}
                  {q.correct.toUpperCase()}
                </p>
              </div>
            );
          })}
          <button
            onClick={() => setShowResults(false)}
            className="mt-4 w-full py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
          >
            Review Again
          </button>
        </div>
      </div>

      <style jsx>{`
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
        .backface-hidden {
          backface-visibility: hidden;
          transform-style: preserve-3d;
        }
      `}</style>
    </div>
  );
}
