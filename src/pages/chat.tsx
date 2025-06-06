// /src/pages/chat.tsx

import { useState, useEffect, useCallback, FormEvent } from "react";
import { useRouter } from "next/router";
import { useUser } from "@supabase/auth-helpers-react";
import { supabase } from "@/lib/supabaseClient";

// -----------------------------------------------------------------------------
// 1) Types & Data Structures
// -----------------------------------------------------------------------------

interface MCQ {
  prompt: string;
  options: string[];
  correct: string; // "a", "b", "c", or "d"
}

interface FlashcardParsed {
  videoUrl: string | null;
  descriptionLines: string[];
  questions: MCQ[];
}

interface FrontendGoal {
  id: string;
  description: string;
  status: "not-started" | "in-progress" | "completed";
}

type TextMessage = {
  sender: "user" | "bot";
  type: "text";
  text: string;
};

type FlashcardMessage = {
  sender: "bot";
  type: "flashcards";
  flashcards: FlashcardParsed[];
};

type Message = TextMessage | FlashcardMessage;

const skillAreaMap: Record<string, string[]> = {
  Leadership: [
    "Transformational Leadership",
    "Authenticity",
    "Emotional Intelligence",
    "DEI",
    "Problem Solving",
    "Next Level Leadership",
  ],
  Resilience: [
    "Growth Mindset",
    "Time Management",
    "Impostor Syndrome",
    "Goal Setting",
    "Time Blocking",
    "Learning Agility",
  ],
  Collaboration: [
    "Active Listening",
    "Messaging",
    "Empathy & Understanding",
    "Building Trust",
    "Team Dynamics",
    "Conflict Resolution",
  ],
  Communication: [
    "Storytelling & Messaging",
    "Presentation Skills",
    "Negotiation",
    "Social Media",
    "Personal Branding",
    "Mastering Feedback",
  ],
  "Personal Well Being": [
    "Physical Health",
    "Mental Health",
    "Emotional Health",
    "Financial Health",
    "Work/Life Balance",
    "Stress Management",
  ],
  "Critical Thinking": [
    "Data-driven Decision Making",
    "Ethics",
    "Visioning",
    "Planning & Strategy",
    "Strategy & Planning",
  ],
  "Career Development": [
    "Personal Branding",
    "Resume Building",
    "Career Transitioning",
    "Interview Skills",
    "Presentation Skills",
  ],
  "Global Fluency": [
    "World Views",
    "Global Communication Skills",
    "Understanding Global Markets & Trends",
    "Cultural Awareness & Sensitivity",
    "Intercultural Competency",
    "Adaptability & Agility",
  ],
  Creativity: [
    "Innovation & Experimentation",
    "Empowerment & Autonomy",
    "Cross-Disciplinary Collaboration",
  ],
  Technology: [
    "Data-driven Decision Making",
    "Cyber Security & Risk Management",
    "Innovation & Change Management",
    "AI",
    "Vision & Strategy Alignment",
    "Ethics & Sustainability",
  ],
};

// -----------------------------------------------------------------------------
// 2) ChatPage Component
// -----------------------------------------------------------------------------

export default function ChatPage() {
  const user = useUser();
  const router = useRouter();

  const [profileLoading, setProfileLoading] = useState<boolean>(true);
  const [name, setName] = useState<string>("");

  // Show all main topic categories on load:
  const [availableTopics] = useState<string[]>(Object.keys(skillAreaMap));

  // Stages: loading → selectTopic → selectSkill → confirmGameplan → chat
  const [stage, setStage] = useState<
    "loading" | "selectTopic" | "selectSkill" | "confirmGameplan" | "chat"
  >("loading");

  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);

  // The conversation thread (text bubbles + flashcards)
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState<string>("");
  const [loadingFetch, setLoadingFetch] = useState<boolean>(false);

  // --- NEW STATE for Goals & Flashcard Completion ---

  // 1) The array of goals returned by /api/gameplan, each with an ID + status:
  const [currentGoals, setCurrentGoals] = useState<FrontendGoal[]>([]);

  // 2) Which flashcards have been “submitted” (true/false per index):
  const [flashcardsSubmitted, setFlashcardsSubmitted] = useState<boolean[]>(
    []
  );

  // 3) The Supabase‐assigned gameplan ID, so we can mark it “completed” later:
  const [currentGameplanId, setCurrentGameplanId] = useState<string | null>(
    null
  );

  // 4) Whether to show the “I’ve completed this gameplan” button:
  const [showCompletionButton, setShowCompletionButton] = useState(false);

  // ---------------------------------------------------------------------------
  // 2a) On mount: verify auth and load profile
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (user === undefined) return; // still waiting

    if (user === null) {
      router.replace("/signin");
      return;
    }

    const fetchProfile = async () => {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (error || !profile) {
        router.replace("/profile");
        return;
      }

      setName(profile.full_name);
      setStage("selectTopic");
      setProfileLoading(false);
    };

    fetchProfile();
  }, [user, router]);

  // ---------------------------------------------------------------------------
  // 2b) Helper to append a message
  // ---------------------------------------------------------------------------
  const addMessage = useCallback((msg: Message) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  // ---------------------------------------------------------------------------
  // 2c) User selects a main topic
  // ---------------------------------------------------------------------------
  const handleTopicSelect = async (topic: string) => {
    setSelectedTopic(topic);
    addMessage({ sender: "user", type: "text", text: topic });

    setLoadingFetch(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: `I selected topic: ${topic}.`,
          selectedTopic: topic,
          selectedSkill: null,
          chatHistory: [
            ...messages,
            { sender: "user", type: "text", text: topic },
          ],
        }),
      });
      const json = await res.json();
      if ("botReply" in json) {
        addMessage({ sender: "bot", type: "text", text: json.botReply });
      } else {
        addMessage({
          sender: "bot",
          type: "text",
          text: `Error: ${(json as any).error ?? "Unknown error"}`,
        });
      }
      setStage("selectSkill");
    } catch (error) {
      console.error("Error in /api/chat (topic):", error);
      addMessage({
        sender: "bot",
        type: "text",
        text: "Sorry, I couldn’t confirm the topic right now. Please try again.",
      });
      setStage("selectSkill");
    } finally {
      setLoadingFetch(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 2d) User selects a specific skill
  // ---------------------------------------------------------------------------
  const handleSkillSelect = async (skill: string) => {
    setSelectedSkill(skill);
    addMessage({ sender: "user", type: "text", text: skill });

    setLoadingFetch(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: `I picked “${skill}.” Please give me a brief overview of ${skill}.`,
          selectedTopic,
          selectedSkill: skill,
          chatHistory: [
            ...messages,
            { sender: "user", type: "text", text: skill },
          ],
        }),
      });
      const json = await res.json();
      if ("botReply" in json) {
        addMessage({ sender: "bot", type: "text", text: json.botReply });
      } else {
        addMessage({
          sender: "bot",
          type: "text",
          text: `Error: ${(json as any).error ?? "Unknown error"}`,
        });
      }

      // Ask Yes/No about a gameplan
      addMessage({
        sender: "bot",
        type: "text",
        text: `Would you like me to create a week-long game plan for ${skill}? (Yes/No)`,
      });
      setStage("confirmGameplan");
    } catch (error) {
      console.error("Error in /api/chat (skill):", error);
      addMessage({
        sender: "bot",
        type: "text",
        text: "Sorry, I couldn’t fetch an overview right now. Please try again later.",
      });
      setStage("confirmGameplan");
    } finally {
      setLoadingFetch(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 2e) User answers Yes/No to “create a gameplan?”
  // ---------------------------------------------------------------------------
  const handleGameplanDecision = (decision: "yes" | "no") => {
    addMessage({ sender: "user", type: "text", text: decision });
    const wants = decision === "yes";

    setTimeout(() => {
      if (wants) {
        // First, insert the “generating…” bubble
        addMessage({
          sender: "bot",
          type: "text",
          text: `Great! Generating a week-long game plan for "${selectedSkill}" now...`,
        });
        // Then call generateGameplan()
        generateGameplan();
      } else {
        addMessage({
          sender: "bot",
          type: "text",
          text: `No problem. Feel free to continue chatting about "${selectedSkill}", and I’ll keep suggesting a game plan as we go.`,
        });
        setStage("chat");
      }
    }, 500);
  };

  // ---------------------------------------------------------------------------
  // 2f) Free‐form chat message
  // ---------------------------------------------------------------------------
  const handleChatSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg = inputText.trim();
    setInputText("");
    addMessage({ sender: "user", type: "text", text: userMsg });
    setLoadingFetch(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: userMsg,
          selectedTopic,
          selectedSkill,
          chatHistory: messages,
        }),
      });
      const json = await res.json();
      if ("botReply" in json) {
        addMessage({ sender: "bot", type: "text", text: json.botReply });
      } else {
        addMessage({
          sender: "bot",
          type: "text",
          text: `Error: ${(json as any).error ?? "Unknown error"}`,
        });
      }
    } catch (error) {
      console.error("Error in /api/chat (free‐form):", error);
      addMessage({
        sender: "bot",
        type: "text",
        text: "Sorry, something went wrong. Please try again.",
      });
    } finally {
      setLoadingFetch(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 2g) generateGameplan → insert goals and flashcards, then push messages
  // ---------------------------------------------------------------------------
  const generateGameplan = async () => {
    setLoadingFetch(true);
    try {
      const res = await fetch("/api/gameplan", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user!.id,
          topic: selectedTopic!,
          skill: selectedSkill!,
        }),
      });

      const json = await res.json();
      if ("goals" in json && "flashcards" in json && "gameplanId" in json) {
        const { goals, flashcards, gameplanId } = json as {
          goals: { id: string; description: string }[];
          flashcards: string[];
          gameplanId: string;
        };

        // 1) Build the “goals text” and push it as a bot message
        const goalsTextLines = goals.map((g, idx) => `\n${idx + 1}. ${g.description}`);
        const goalsText =
          "Here are your goals for the week:" + goalsTextLines.join("");
        addMessage({ sender: "bot", type: "text", text: goalsText });

        // 2) Set currentGoals (with initial status “not-started”)
        const frontendGoals: FrontendGoal[] = goals.map((g) => ({
          id: g.id,
          description: g.description,
          status: "not-started",
        }));
        setCurrentGoals(frontendGoals);

        // 3) Set up flashcardsSubmitted (all false initially)
        setFlashcardsSubmitted(Array(flashcards.length).fill(false));

        // 4) Parse each raw flashcard string into a FlashcardParsed object
        const parsedFCs: FlashcardParsed[] = flashcards.map((raw) =>
          parseFlashcardContent(raw)
        );

        // 5) Push a “flashcards” chat message so UI renders interactive cards
        addMessage({
          sender: "bot",
          type: "flashcards",
          flashcards: parsedFCs,
        });

        // 6) Store the Supabase gameplanId
        setCurrentGameplanId(gameplanId);

        // 7) Show the “I’ve completed this gameplan” button (initially disabled)
        setShowCompletionButton(true);

        // 8) Switch to “chat” stage so input box appears
        setStage("chat");
      } else {
        addMessage({
          sender: "bot",
          type: "text",
          text: `Error: ${(json as any).error ?? "Unable to generate game plan."}`,
        });
        setStage("chat");
      }
    } catch (error) {
      console.error("Error in /api/gameplan:", error);
      addMessage({
        sender: "bot",
        type: "text",
        text: "Sorry, I couldn’t generate a game plan right now. Please try again later.",
      });
      setStage("chat");
    } finally {
      setLoadingFetch(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 2h) Parse raw flashcard string → FlashcardParsed
  // ---------------------------------------------------------------------------
  function parseFlashcardContent(content: string): FlashcardParsed {
    const urlMatch = content.match(
      /https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/i
    );
    const videoUrl = urlMatch ? urlMatch[0] : null;

    const cleanedLines = content
      .split("\n")
      .filter((line) => !line.startsWith("Video: "))
      .map((l) => l.trim())
      .filter((l) => l !== "");

    const descriptionLines: string[] = [];
    const questionsSection: string[] = [];
    let inQuestions = false;
    for (const line of cleanedLines) {
      if (line.startsWith("Description:")) {
        descriptionLines.push(line.replace("Description:", "").trim());
      } else if (line.startsWith("Questions:")) {
        inQuestions = true;
      } else if (inQuestions) {
        questionsSection.push(line);
      }
    }

    const questions: MCQ[] = [];
    let currentQ: MCQ | null = null;
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

    return { videoUrl, descriptionLines, questions };
  }

  // ---------------------------------------------------------------------------
  // 2i) Handle “I’ve completed this gameplan” button
  // ---------------------------------------------------------------------------
  const handleCompleteGameplan = async () => {
    if (!currentGameplanId || !user) {
      console.error("No gameplanId or user before completing.");
      return;
    }

    // Mark the gameplan row as completed
    const { error } = await supabase
      .from("gameplans")
      .update({ completed: true })
      .eq("id", currentGameplanId);

    if (error) {
      console.error("Error marking gameplan completed:", error.message);
      addMessage({
        sender: "bot",
        type: "text",
        text: "Sorry, I couldn’t mark your gameplan as completed. Please try again.",
      });
      return;
    }

    // Reset state
    setMessages([]);
    setCurrentGameplanId(null);
    setShowCompletionButton(false);
    setCurrentGoals([]);
    setFlashcardsSubmitted([]);
    setSelectedTopic(null);
    setSelectedSkill(null);

    // Congratulate and ask what to explore next
    setStage("selectTopic");
    addMessage({
      sender: "bot",
      type: "text",
      text: "🎉 Congratulations on completing your gameplan! What would you like to explore next?",
    });
  };

  // ---------------------------------------------------------------------------
  // 2j) Update a goal’s status in Supabase & local state
  // ---------------------------------------------------------------------------
  const updateGoalStatus = async (
    goalId: string,
    newStatus: FrontendGoal["status"]
  ) => {
    // 1) Update in Supabase
    const { error } = await supabase
      .from("goals")
      .update({ status: newStatus })
      .eq("id", goalId);

    if (error) {
      console.error("Error updating goal status:", error.message);
      addMessage({
        sender: "bot",
        type: "text",
        text: "Sorry, I couldn’t update that goal’s status. Please try again.",
      });
      return;
    }

    // 2) Update local state
    setCurrentGoals((prev) =>
      prev.map((g) =>
        g.id === goalId
          ? { ...g, status: newStatus }
          : g
      )
    );
  };

  // ---------------------------------------------------------------------------
  // 2k) Called by each FlashcardCard when submitted
  // ---------------------------------------------------------------------------
  const markFlashcardSubmitted = (index: number) => {
    setFlashcardsSubmitted((prev) => {
      const copy = [...prev];
      copy[index] = true;
      return copy;
    });
  };

  // ---------------------------------------------------------------------------
  // 2l) Check if all goals are “completed”
  // ---------------------------------------------------------------------------
  const allGoalsCompleted =
    currentGoals.length > 0 &&
    currentGoals.every((g) => g.status === "completed");

  // ---------------------------------------------------------------------------
  // 2m) Check if all flashcards have been submitted
  // ---------------------------------------------------------------------------
  const allFlashcardsDone =
    flashcardsSubmitted.length > 0 &&
    flashcardsSubmitted.every((flag) => flag);

  // ---------------------------------------------------------------------------
  // 2n) Eligibility for “Complete” button
  // ---------------------------------------------------------------------------
  const canComplete = allGoalsCompleted && allFlashcardsDone;

  // ---------------------------------------------------------------------------
  // 2o) If auth or profile still loading, render nothing
  // ---------------------------------------------------------------------------
  if (stage === "loading" || profileLoading) {
    return null;
  }

  // ---------------------------------------------------------------------------
  // 3) Render JSX (Goals panel at top, then conversation/thread)
  // -----------------------------------------------------------------------------
  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-indigo-600 text-white p-4">
        <h1 className="text-xl">AI Coaching Chat</h1>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4">
        {/* 1) Goals Panel (always at top) */}
        {currentGoals.length > 0 && (
          <section className="mb-6 bg-white p-4 rounded shadow">
            <h2 className="text-xl font-medium mb-4">Your Goals</h2>
            <ul className="space-y-4">
              {currentGoals.map((goal) => (
                <li
                  key={goal.id}
                  className="flex justify-between items-center border border-gray-200 rounded p-4"
                >
                  <div>
                    <p className="font-medium">{goal.description}</p>
                  </div>
                  <div>
                    <select
                      value={goal.status}
                      onChange={(e) =>
                        updateGoalStatus(
                          goal.id,
                          e.target.value as FrontendGoal["status"]
                        )
                      }
                      className="border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="not-started">Not Started</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 2) Conversation Thread (including flashcards) */}
        <div className="space-y-4 mb-4">
          {messages.map((msg, idx) => {
            if (msg.type === "text") {
              return (
                <div
                  key={idx}
                  className={`flex ${
                    msg.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`rounded-lg px-4 py-2 max-w-xl whitespace-pre-wrap ${
                      msg.sender === "user"
                        ? "bg-indigo-600 text-white"
                        : "bg-white text-gray-800 shadow"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            } else {
              // msg.type === "flashcards"
              return (
                <div key={idx} className="flex justify-start">
                  <div className="w-full space-y-8">
                    {msg.flashcards.map((fc, j) => (
                      <FlashcardCard
                        key={j}
                        fc={fc}
                        index={j}
                        onComplete={() => markFlashcardSubmitted(j)}
                      />
                    ))}
                  </div>
                </div>
              );
            }
          })}
        </div>

        {/* 3) “I’ve completed this gameplan” Button */}
        {showCompletionButton && (
          <div className="mb-6 text-center">
            <button
              onClick={handleCompleteGameplan}
              disabled={!canComplete}
              className={`px-6 py-3 rounded-md text-white ${
                canComplete
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-gray-400 cursor-not-allowed"
              } transition`}
            >
              I’ve Completed This Gameplan
            </button>
            {!canComplete && (
              <p className="mt-2 text-sm text-gray-600">
                Please mark all goals as “Completed” and submit all flashcards
                to finish.
              </p>
            )}
          </div>
        )}

        {/* 4) Input / Selection Area Based on Stage */}
        {stage === "selectTopic" && (
          <div className="bg-white p-4 rounded shadow mb-4">
            <h2 className="font-medium mb-2">
              Hello {name}! What would you like to talk about today?
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {availableTopics.map((topic) => (
                <button
                  key={topic}
                  onClick={() => handleTopicSelect(topic)}
                  disabled={loadingFetch}
                  className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition"
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>
        )}

        {stage === "selectSkill" && selectedTopic && (
          <div className="bg-white p-4 rounded shadow mb-4">
            <h2 className="font-medium mb-2">
              Choose a skill area within "{selectedTopic}"
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {skillAreaMap[selectedTopic]?.map((skill) => (
                <button
                  key={skill}
                  onClick={() => handleSkillSelect(skill)}
                  disabled={loadingFetch}
                  className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition"
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>
        )}

        {stage === "confirmGameplan" && (
          <div className="bg-white p-4 rounded shadow mb-4">
            <h2 className="font-medium mb-4">
              Would you like a week-long game plan for “{selectedSkill}”?
            </h2>
            <div className="flex space-x-4">
              <button
                onClick={() => handleGameplanDecision("yes")}
                disabled={loadingFetch}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
              >
                Yes
              </button>
              <button
                onClick={() => handleGameplanDecision("no")}
                disabled={loadingFetch}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
              >
                No
              </button>
            </div>
          </div>
        )}

        {stage === "chat" && (
          <form onSubmit={handleChatSubmit} className="mt-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type your message..."
                className="flex-grow border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={loadingFetch}
              />
              <button
                type="submit"
                disabled={loadingFetch}
                className={`px-4 py-2 rounded text-white ${
                  loadingFetch
                    ? "bg-indigo-300 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700"
                } transition`}
              >
                {loadingFetch ? "Sending..." : "Send"}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

// -----------------------------------------------------------------------------
// 4) FlashcardCard Component (interactive embed + MCQs + flip animation)
// -----------------------------------------------------------------------------

interface FlashcardCardProps {
  fc: FlashcardParsed;
  index: number;
  onComplete: () => void;
}

function FlashcardCard({ fc, index, onComplete }: FlashcardCardProps) {
  const [answers, setAnswers] = useState<Map<number, string>>(new Map());
  const [showResults, setShowResults] = useState<boolean>(false);
  const [correctCount, setCorrectCount] = useState<number>(0);

  const handleOptionChange = (qIdx: number, letter: string) => {
    setAnswers((prev) => new Map(prev.set(qIdx, letter)));
  };

  const allAnswered = fc.questions.every((_, idx) => answers.has(idx));

  const handleSubmitAnswers = (e: React.FormEvent) => {
    e.preventDefault();
    let correct = 0;
    fc.questions.forEach((q, idx) => {
      const choice = answers.get(idx);
      if (choice === q.correct) correct++;
    });
    setCorrectCount(correct);
    setShowResults(true);
    // Mark this flashcard as submitted
    onComplete();
  };

  return (
    <div className="flip-card mb-8">
      <div className={`flip-card-inner ${showResults ? "flipped" : ""}`}>
        {/* FRONT SIDE: Video + Description + MCQs */}
        <div className="flip-card-front bg-white border border-gray-200 rounded-lg shadow-sm p-4">
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
          <div className="mb-4">
            {fc.descriptionLines.map((line, idx) => (
              <p key={idx} className="text-gray-800 whitespace-pre-wrap">
                {line}
              </p>
            ))}
          </div>

          <form onSubmit={handleSubmitAnswers}>
            {fc.questions.map((q, idx) => (
              <div key={idx} className="mb-4">
                <p className="font-medium mb-2">
                  {idx + 1}. {q.prompt}
                </p>
                <div className="space-y-1">
                  {q.options.map((opt, optIdx) => {
                    const letter = String.fromCharCode(97 + optIdx);
                    return (
                      <label
                        key={optIdx}
                        className="flex items-center space-x-2"
                      >
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

        {/* BACK SIDE: Results + “Review Again” */}
        <div
          className="flip-card-back bg-white border border-gray-200 rounded-lg shadow-sm p-4"
          style={{ transform: "rotateY(180deg)" }}
        >
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
                  Your answer: {userChoice?.toUpperCase() ?? "–"} | Correct:{" "}
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

      {/* Styles for 3D flip */}
      <style jsx>{`
        .flip-card {
          perspective: 1000px;
        }
        .flip-card-inner {
          transform-style: preserve-3d;
          transition: transform 0.6s ease-in-out;
        }
        .flipped {
          transform: rotateY(180deg);
        }
        .flip-card-front,
        .flip-card-back {
          backface-visibility: hidden;
        }
      `}</style>
    </div>
  );
}
