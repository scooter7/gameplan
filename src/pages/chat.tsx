// /src/pages/chat.tsx

import { useState, useEffect, useCallback, FormEvent } from "react";
import { useRouter } from "next/router";
import { useUser } from "@supabase/auth-helpers-react";
import { supabase } from "@/lib/supabaseClient";

// --- Types for Flashcards & Goals ----------------------------------------------

interface MCQ {
  prompt: string;
  options: string[];
  correct: string;
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

// --- Mapping of Main Topics → Skill Areas --------------------------------------

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

export default function ChatPage() {
  const user = useUser();
  const router = useRouter();

  // 1) Profile loading & name
  const [profileLoading, setProfileLoading] = useState<boolean>(true);
  const [name, setName] = useState<string>("");

  // 2) Preload topic list
  const [availableTopics] = useState<string[]>(Object.keys(skillAreaMap));

  // 3) Conversation stages
  const [stage, setStage] = useState<
    "loading" | "selectTopic" | "selectSkill" | "confirmGameplan" | "chat"
  >("loading");
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);

  // 4) Chat messages & input
  const [messages, setMessages] = useState<TextMessage[]>([]);
  const [inputText, setInputText] = useState<string>("");
  const [loadingFetch, setLoadingFetch] = useState<boolean>(false);

  // 5) Gameplan: goals & flashcards
  const [currentGoals, setCurrentGoals] = useState<FrontendGoal[]>([]);
  const [parsedFlashcards, setParsedFlashcards] = useState<FlashcardParsed[]>([]);
  const [flashcardsSubmitted, setFlashcardsSubmitted] = useState<boolean[]>(
    []
  );
  const [currentGameplanId, setCurrentGameplanId] = useState<string | null>(
    null
  );
  const [showCompletionButton, setShowCompletionButton] = useState(false);

  // --- 1) On mount: verify auth & fetch profile ---------------------------------
  useEffect(() => {
    if (user === undefined) return; // still loading
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

  // --- 2) Helper: append message to chat ----------------------------------------
  const addMessage = useCallback((msg: TextMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  // --- 3) Handle main topic selection -------------------------------------------
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

  // --- 4) Handle specific skill selection ---------------------------------------
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

      // Ask Yes/No about creating a gameplan
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

  // --- 5) Handle Yes/No decision for gameplan -----------------------------------
  const handleGameplanDecision = (decision: "yes" | "no") => {
    addMessage({ sender: "user", type: "text", text: decision });
    const wantsGameplan = decision === "yes";

    setTimeout(() => {
      if (wantsGameplan) {
        addMessage({
          sender: "bot",
          type: "text",
          text: `Great! Generating a week-long game plan for "${selectedSkill}" now...`,
        });
        generateGameplan();
      } else {
        addMessage({
          sender: "bot",
          type: "text",
          text: `No problem. Feel free to continue chatting about "${selectedSkill}", and I’ll keep suggesting a game plan as we go.`,
        });
        setStage("chat");
      }
    }, 300);
  };

  // --- 6) Handle free‐form chat from user ----------------------------------------
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
      console.error("Error in /api/chat (free-form):", error);
      addMessage({
        sender: "bot",
        type: "text",
        text: "Sorry, something went wrong. Please try again.",
      });
    } finally {
      setLoadingFetch(false);
    }
  };

  // --- 7) Generate a gameplan (goals + flashcards) -------------------------------
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
      if (
        typeof json === "object" &&
        "goals" in json &&
        "flashcards" in json &&
        "gameplanId" in json
      ) {
        const { goals, flashcards, gameplanId } = json as {
          goals: { id: string; description: string }[];
          flashcards: string[];
          gameplanId: string;
        };

        // 7a) Add “Here are your goals…” text to chat
        const goalsTextLines = goals.map(
          (g, idx) => `\n${idx + 1}. ${g.description}`
        );
        const goalsText =
          "Here are your goals for the week:" + goalsTextLines.join("");
        addMessage({ sender: "bot", type: "text", text: goalsText });

        // 7b) Save goals to state (all “not-started”)
        const frontendGoals: FrontendGoal[] = goals.map((g) => ({
          id: g.id,
          description: g.description,
          status: "not-started",
        }));
        setCurrentGoals(frontendGoals);

        // 7c) Initialize flashcard flags
        setFlashcardsSubmitted(Array(flashcards.length).fill(false));

        // 7d) Parse raw flashcards
        const parsedFCs: FlashcardParsed[] = flashcards.map((raw) =>
          parseFlashcardContent(raw)
        );

        // → Log parsed flashcards to console for debugging:
        console.log("Parsed flashcards:", parsedFCs);

        setParsedFlashcards(parsedFCs);

        // 7e) Save gameplanId & show “complete” button
        setCurrentGameplanId(gameplanId);
        setShowCompletionButton(true);
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

  // --- Helper: parse raw flashcard string → structured FlashcardParsed ----------

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

  // --- 8) Update goal status (Supabase + local UI) ------------------------------

  const updateGoalStatus = async (
    goalId: string,
    newStatus: FrontendGoal["status"]
  ) => {
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
    setCurrentGoals((prev) =>
      prev.map((g) => (g.id === goalId ? { ...g, status: newStatus } : g))
    );
  };

  // --- 9) Mark a flashcard as submitted ------------------------------------------

  const markFlashcardSubmitted = (index: number) => {
    setFlashcardsSubmitted((prev) => {
      const copy = [...prev];
      copy[index] = true;
      return copy;
    });
  };

  // --- 10) Check if all goals & flashcards are done ------------------------------

  const allGoalsCompleted =
    currentGoals.length > 0 &&
    currentGoals.every((g) => g.status === "completed");
  const allFlashcardsDone =
    flashcardsSubmitted.length > 0 &&
    flashcardsSubmitted.every((flag) => flag);
  const canComplete = allGoalsCompleted && allFlashcardsDone;

  // --- 11) Handle “I’ve completed this gameplan” --------------------------------

  const handleCompleteGameplan = async () => {
    if (!currentGameplanId || !user) return;

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

    // Reset entire chat state and go back to topic selection
    setMessages([]);
    setParsedFlashcards([]);
    setCurrentGameplanId(null);
    setShowCompletionButton(false);
    setCurrentGoals([]);
    setFlashcardsSubmitted([]);
    setSelectedTopic(null);
    setSelectedSkill(null);

    setStage("selectTopic");
    addMessage({
      sender: "bot",
      type: "text",
      text: "🎉 Congratulations on completing your gameplan! What would you like to explore next?",
    });
  };

  // If still loading profile or user is null, render nothing
  if (stage === "loading" || profileLoading) {
    return null;
  }

  // --- RENDER ---------------------------------------------------------------------

  return (
    <div className="relative min-h-screen bg-liferamp page-container">
      {/*
        Everything that follows lives “above” the background image.
        All interactive UI sits in one .card so it never gets obscured.
      */}
      <div className="mx-auto my-6 w-full max-w-4xl card">
        {/* ---------- HEADER ---------- */}
        <header className="mb-4">
          <h1 className="text-2xl font-heading text-secondary-dark">
            AI Coaching Chat
          </h1>
        </header>

        {/* ---------- GOALS PANEL (if any) ---------- */}
        {currentGoals.length > 0 && (
          <section className="mb-6">
            <h2 className="text-xl font-heading text-secondary-dark mb-2">
              Your Goals
            </h2>
            <ul className="space-y-4">
              {currentGoals.map((goal) => (
                <li
                  key={goal.id}
                  className="flex justify-between items-center bg-surface rounded-lg p-4 shadow-sm"
                >
                  <span className="font-body text-text-secondary">
                    {goal.description}
                  </span>
                  <select
                    value={goal.status}
                    onChange={(e) =>
                      updateGoalStatus(
                        goal.id,
                        e.target.value as FrontendGoal["status"]
                      )
                    }
                    className="input w-auto"
                  >
                    <option value="not-started">Not Started</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ---------- FLASHCARDS SECTION (directly under goals) ---------- */}
        {parsedFlashcards.length > 0 && (
          <section className="space-y-8 mb-6">
            {parsedFlashcards.map((fc, j) => (
              <FlashcardCard
                key={j}
                fc={fc}
                index={j}
                onComplete={() => markFlashcardSubmitted(j)}
              />
            ))}
          </section>
        )}

        {/* ---------- CHAT THREAD (narrative + other messages) ---------- */}
        <section className="space-y-4 mb-6">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${
                msg.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`rounded-lg px-5 py-3 max-w-xl whitespace-pre-wrap ${
                  msg.sender === "user"
                    ? "bg-secondary text-surface"
                    : "bg-surface text-text-primary shadow"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
        </section>

        {/* ---------- “I’ve completed this gameplan” BUTTON ---------- */}
        {showCompletionButton && (
          <div className="mb-6 text-center">
            <button
              onClick={handleCompleteGameplan}
              disabled={!canComplete}
              className={`button ${
                canComplete ? "button-primary" : "opacity-50 cursor-not-allowed"
              }`}
            >
              I’ve Completed This Gameplan
            </button>
            {!canComplete && (
              <p className="mt-2 text-sm text-text-secondary">
                Please mark all goals as “Completed” and submit all flashcards
                to finish.
              </p>
            )}
          </div>
        )}

        {/* ---------- SELECTION / INPUT AREA BY STAGE ---------- */}
        {stage === "selectTopic" && (
          <section className="mb-6">
            <h2 className="font-heading text-lg mb-4 text-secondary-dark">
              Hello {name}! What would you like to talk about today?
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {availableTopics.map((topic) => (
                <button
                  key={topic}
                  onClick={() => handleTopicSelect(topic)}
                  disabled={loadingFetch}
                  className="button button-primary text-sm"
                >
                  {topic}
                </button>
              ))}
            </div>
          </section>
        )}

        {stage === "selectSkill" && selectedTopic && (
          <section className="mb-6">
            <h2 className="font-heading text-lg mb-4 text-secondary-dark">
              Choose a skill area within “{selectedTopic}”
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {skillAreaMap[selectedTopic]?.map((skill) => (
                <button
                  key={skill}
                  onClick={() => handleSkillSelect(skill)}
                  disabled={loadingFetch}
                  className="button button-primary text-sm"
                >
                  {skill}
                </button>
              ))}
            </div>
          </section>
        )}

        {stage === "confirmGameplan" && (
          <section className="mb-6">
            <h2 className="font-heading text-lg text-secondary-dark mb-4">
              Would you like a week-long game plan for “{selectedSkill}”?
            </h2>
            <div className="flex space-x-4">
              <button
                onClick={() => handleGameplanDecision("yes")}
                disabled={loadingFetch}
                className="button button-primary"
              >
                Yes
              </button>
              <button
                onClick={() => handleGameplanDecision("no")}
                disabled={loadingFetch}
                className="button button-secondary"
              >
                No
              </button>
            </div>
          </section>
        )}

        {stage === "chat" && (
          <form
            onSubmit={handleChatSubmit}
            className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-full max-w-2xl px-4"
          >
            <div className="flex">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type your message..."
                className="input flex-grow"
                disabled={loadingFetch}
              />
              <button
                type="submit"
                disabled={loadingFetch}
                className="button button-primary ml-2"
              >
                {loadingFetch ? "Sending..." : "Send"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// --- FlashcardCard Component (flip‐animation using your globals.css) ------------

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
    onComplete();
  };

  return (
    // By adding `min-h-[350px]`, each flashcard container has at least 350px height.
    <div className="flashcard-container min-h-[350px] mb-8">
      <div className={`flashcard ${showResults ? "is-flipped" : ""}`}>
        {/* FRONT FACE */}
        <div className="flashcard-face flashcard-front">
          {fc.videoUrl ? (
            // This ensures the iframe is always a 16:9 box.
            <div className="relative w-full pb-[56.25%] mb-4">
              <iframe
                src={fc.videoUrl.replace("watch?v=", "embed/")}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute top-0 left-0 w-full h-full rounded-lg"
                title="YouTube Video"
              />
            </div>
          ) : (
            // If no valid videoUrl, show a placeholder
            <div className="h-48 bg-gray-200 text-center flex items-center justify-center rounded-lg mb-4">
              <span className="font-body text-text-secondary">
                (no video URL provided)
              </span>
            </div>
          )}

          <div className="mb-4 space-y-2 flashcard-content-scrollable">
            {fc.descriptionLines.map((line, idx) => (
              <p key={idx} className="font-body text-text-secondary">
                {line}
              </p>
            ))}
          </div>

          <form onSubmit={handleSubmitAnswers}>
            {fc.questions.map((q, idx) => (
              <div key={idx} className="mb-4">
                <p className="font-heading text-base mb-2">
                  {idx + 1}. {q.prompt}
                </p>
                <div className="space-y-2">
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
                          className="h-5 w-5 text-secondary-dark border-gray-300 rounded-full focus:ring-secondary-dark"
                          disabled={showResults}
                        />
                        <span className="font-body text-text-secondary">
                          {opt}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}

            <button
              type="submit"
              disabled={!allAnswered || showResults}
              className={`button w-full ${
                !allAnswered || showResults
                  ? "opacity-50 cursor-not-allowed"
                  : "button-primary"
              }`}
            >
              Submit Answers
            </button>
          </form>
        </div>

        {/* BACK FACE */}
        <div className="flashcard-face flashcard-back">
          <h3 className="text-xl font-heading mb-3 text-secondary-dark">
            Results
          </h3>
          <p className="mb-4 font-body">
            You answered {correctCount} out of {fc.questions.length} correctly.
          </p>
          <div className="space-y-4 flashcard-content-scrollable">
            {fc.questions.map((q, idx) => {
              const userChoice = answers.get(idx);
              const isCorrect = userChoice === q.correct;
              return (
                <div key={idx}>
                  <p className="font-heading mb-1">
                    {idx + 1}. {q.prompt}
                  </p>
                  {q.options.map((opt, optIdx) => {
                    const letter = String.fromCharCode(97 + optIdx);
                    let textClass = "text-text-primary";
                    if (letter === q.correct) textClass = "text-tertiary";
                    else if (letter === userChoice && !isCorrect)
                      textClass = "text-error";
                    return (
                      <p
                        key={optIdx}
                        className={`ml-4 ${textClass} font-body`}
                      >
                        {letter}) {opt}
                      </p>
                    );
                  })}
                  <p className="italic text-sm mt-1 font-body">
                    Your answer: {userChoice?.toUpperCase() ?? "–"} | Correct:{" "}
                    {q.correct.toUpperCase()}
                  </p>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => setShowResults(false)}
            className="button button-primary mt-4"
          >
            Review Again
          </button>
        </div>
      </div>
    </div>
  );
}
