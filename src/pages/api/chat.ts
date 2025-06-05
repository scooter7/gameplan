// /src/pages/api/chat.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";
import { OpenAI } from "openai";

type ChatRequestBody = {
  userMessage: string;
  selectedTopic: string | null;
  selectedSkill: string | null;
  chatHistory: { sender: "user" | "bot"; text: string }[];
};

type ChatResponse = {
  botReply: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ChatResponse | { error: string }>
) {
  // Only allow POST
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  // Initialize Supabase server client using the “pages” helper
  const supabaseServer = createPagesServerClient({ req, res });
  const {
    data: { session },
    error: sessionError,
  } = await supabaseServer.auth.getSession();

  if (sessionError || !session) {
    console.log("🚫 /api/chat unauthorized");
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Parse and validate request body
  const { userMessage, selectedTopic, selectedSkill, chatHistory } =
    req.body as ChatRequestBody;
  if (typeof userMessage !== "string" || userMessage.trim() === "") {
    return res.status(400).json({ error: "Invalid userMessage" });
  }

  // Prepare OpenAI client
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    console.error("🔑 Missing OPENAI_API_KEY in environment");
    return res
      .status(500)
      .json({ error: "Server misconfiguration: missing OpenAI API key" });
  }
  const openai = new OpenAI({ apiKey: openaiApiKey });

  // Build messages array for OpenAI chat completion
  const messages: { role: "system" | "user" | "assistant"; content: string }[] =
    [];

  // Construct a system prompt
  const systemPrompt = [
    "You are an AI coaching assistant for Liferramp360.",
    `The user’s selected topic is: "${selectedTopic ?? "none"}".`,
    `The user’s selected skill area is: "${selectedSkill ?? "none"}".`,
    "Maintain a helpful, encouraging tone and build on the user’s input.",
  ].join(" ");
  messages.push({ role: "system", content: systemPrompt });

  // Inject prior conversation history
  if (Array.isArray(chatHistory)) {
    for (const msg of chatHistory) {
      if (msg.sender === "user") {
        messages.push({ role: "user", content: msg.text });
      } else {
        messages.push({ role: "assistant", content: msg.text });
      }
    }
  }

  // Finally, append the current user message
  messages.push({ role: "user", content: userMessage });

  try {
    // Call OpenAI’s chat completion endpoint
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7,
    });

    const botReply = completion.choices?.[0]?.message?.content?.trim() ?? "";
    return res.status(200).json({ botReply });
  } catch (err) {
    console.error("❌ OpenAI error in /api/chat:", err);
    return res
      .status(500)
      .json({ error: "Failed to get response from OpenAI" });
  }
}
