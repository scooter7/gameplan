// /src/pages/api/gameplan.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";
import { OpenAI } from "openai";

type GameplanRequestBody = {
  userId: string;
  topic: string;
  skill: string;
};

type GoalReturn = {
  id: string;
  description: string;
};

type GameplanResponse = {
  gameplanId: string;
  goals: GoalReturn[];
  flashcards: string[]; // always return as array of raw strings
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GameplanResponse | { error: string }>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res
      .status(405)
      .json({ error: `Method ${req.method} Not Allowed` });
  }

  // Initialize Supabase server‐side client for auth
  const supabaseServer = createPagesServerClient({ req, res });
  const {
    data: { session },
    error: sessionError,
  } = await supabaseServer.auth.getSession();

  if (sessionError || !session) {
    console.log("🚫 /api/gameplan unauthorized");
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { userId, topic, skill } = req.body as GameplanRequestBody;
  if (
    typeof userId !== "string" ||
    typeof topic !== "string" ||
    typeof skill !== "string"
  ) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  // Prepare OpenAI client
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    console.error("🔑 Missing OPENAI_API_KEY");
    return res
      .status(500)
      .json({ error: "Server misconfiguration: missing OpenAI API key" });
  }
  const openai = new OpenAI({ apiKey: openaiApiKey });

  // System prompt instructing GPT to return strict JSON
  const systemPrompt = `
You are an AI coaching assistant. Generate a week-long game plan for the skill area "${skill}" under topic "${topic}". 
Return a single JSON object with exactly these 2 fields:
1. "goals": an array of 1–3 concise goal descriptions (strings).
2. "flashcards": an array of 1–3 items. Each item can be either:
   • A single string that contains a YouTube video URL, a description, and 3–5 MCQs, OR
   • A JSON object with keys "video_url", "description", and "questions" (where "questions" is an array of lines like "1. …", "A) …", "Correct: …").
Do NOT include any text outside of that JSON object, and do not wrap the JSON in markdown code fences.
`;

  try {
    // Ask OpenAI for the gameplan JSON
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt.trim() }],
      temperature: 0.7,
    });

    const raw = completion.choices?.[0]?.message?.content ?? "";
    console.log("🔄 Raw gameplan from OpenAI:\n", raw);

    // Attempt to parse JSON out of the LLM response
    let parsed: { goals: unknown; flashcards: unknown };
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      // If parsing fails, try a regex to extract the JSON object substring
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        console.error("❌ Could not parse JSON from OpenAI:", err);
        return res
          .status(500)
          .json({ error: "Malformed gameplan data from OpenAI." });
      }
    }

    // Validate that "goals" is an array of strings
    if (
      !Array.isArray(parsed.goals) ||
      parsed.goals.some((g) => typeof g !== "string")
    ) {
      console.error("❌ 'goals' field is not an array of strings:", parsed);
      return res
        .status(500)
        .json({ error: "Malformed goals array from OpenAI." });
    }
    // Validate that "flashcards" is an array
    if (!Array.isArray(parsed.flashcards)) {
      console.error("❌ 'flashcards' field is not an array:", parsed);
      return res
        .status(500)
        .json({ error: "Malformed flashcards array from OpenAI." });
    }

    const goals = parsed.goals as string[];
    const rawFlashcards = parsed.flashcards as unknown[];

    // Normalize each flashcard into a raw string:
    const normalizedFlashcards: string[] = rawFlashcards.map((item) => {
      // If item is already a string, return as-is
      if (typeof item === "string") {
        return item.trim();
      }
      // If item is an object with keys "video_url", "description", "questions"
      if (
        typeof item === "object" &&
        item !== null &&
        "video_url" in (item as any) &&
        "description" in (item as any) &&
        "questions" in (item as any)
      ) {
        const obj = item as {
          video_url: string;
          description: string;
          questions: unknown[];
        };
        // Build a raw string that our front-end parser expects:
        let s = `Video: ${obj.video_url}\n`;
        s += `Description: ${obj.description}\n`;
        s += `Questions:\n`;
        // Each element of obj.questions is assumed to be a line (string)
        for (const qLine of obj.questions) {
          s += typeof qLine === "string" ? `${qLine}\n` : "";
        }
        return s.trim();
      }
      // Otherwise, fallback to stringifying it:
      return JSON.stringify(item);
    });

    // Insert a new row into "gameplans"
    const {
      data: insertedGameplan,
      error: gpError,
    } = await supabaseServer
      .from("gameplans")
      .insert({
        user_id: session.user.id,
        topic,
        skill,
        completed: false,
      })
      .select("id")
      .single();

    if (gpError || !insertedGameplan) {
      console.error("❌ Error inserting gameplan record:", gpError);
      // We proceed, but gameplanId might be null
    }
    const gameplanId = insertedGameplan?.id as string;

    // Compute tomorrow's date for goal.start_date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isoTomorrow = tomorrow.toISOString().split("T")[0];

    // Insert each goal into "goals", capturing id & description
    let returnedGoals: GoalReturn[] = [];
    if (gameplanId) {
      const goalsToInsert = goals.map((desc) => ({
        gameplan_id: gameplanId,
        description: desc,
        status: "not-started",
        start_date: isoTomorrow,
      }));
      const { data: insertedGoals, error: goalsError } =
        await supabaseServer
          .from("goals")
          .insert(goalsToInsert)
          .select("id, description");

      if (goalsError || !insertedGoals) {
        console.error("❌ Error inserting goals:", goalsError);
      } else {
        returnedGoals = insertedGoals.map((g) => ({
          id: g.id,
          description: g.description,
        }));
      }
    }

    // Insert each normalized flashcard into "flashcards"
    if (gameplanId) {
      const flashcardsToInsert = normalizedFlashcards.map((content) => ({
        gameplan_id: gameplanId,
        content,
      }));
      const { error: fcError } = await supabaseServer
        .from("flashcards")
        .insert(flashcardsToInsert);
      if (fcError) console.error("❌ Error inserting flashcards:", fcError);
    }

    // Return the newly created gameplan ID, goals array, and raw flashcard strings
    return res.status(200).json({
      gameplanId,
      goals: returnedGoals,
      flashcards: normalizedFlashcards,
    });
  } catch (err) {
    console.error("❌ OpenAI error in /api/gameplan:", err);
    return res
      .status(500)
      .json({ error: "Failed to generate gameplan. Please try again." });
  }
}
