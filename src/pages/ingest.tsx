// /src/pages/ingest.tsx

import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import { useUser } from "@supabase/auth-helpers-react";
import { supabase } from "@/lib/supabaseClient";

const topicOptions = [
  "Leadership",
  "Resilience",
  "Collaboration",
  "Communication",
  "Personal Well Being",
  "Critical Thinking",
  "Career Development",
  "Global Fluency",
  "Creativity",
  "Technology",
];

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

export default function IngestPage() {
  const user = useUser();
  const router = useRouter();

  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  useEffect(() => {
    if (user === undefined) return;
    if (user === null) {
      router.replace("/signin");
    }
  }, [user, router]);

  const toggleTopic = (topic: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] || null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!file) {
      setErrorMsg("Please select a document to upload.");
      return;
    }
    if (selectedTopics.length === 0 && selectedSkills.length === 0) {
      setErrorMsg("Select at least one topic or skill area.");
      return;
    }

    setUploading(true);

    // Upload file to Supabase Storage (bucket: "documents")
    const fileExt = file.name.split(".").pop();
    const filePath = `${user!.id}/${Date.now()}.${fileExt}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("documents")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError.message);
      setErrorMsg("Failed to upload the document. Try again.");
      setUploading(false);
      return;
    }

    // Get public URL (or you can keep it private and generate signed URLs)
    const { publicUrl, error: urlError } = supabase.storage
      .from("documents")
      .getPublicUrl(filePath);

    if (urlError) {
      console.error("Storage URL error:", urlError.message);
      setErrorMsg("Failed to retrieve document URL. Try again.");
      setUploading(false);
      return;
    }

    // Insert metadata into "documents" table
    const { error: insertError } = await supabase.from("documents").insert({
      user_id: user!.id,
      file_path: filePath,
      file_url: publicUrl,
      topics: selectedTopics,
      skills: selectedSkills,
      uploaded_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error("Error inserting document record:", insertError.message);
      setErrorMsg("Failed to save document metadata. Try again.");
      setUploading(false);
      return;
    }

    setSuccessMsg("Document uploaded successfully!");
    setFile(null);
    setSelectedTopics([]);
    setSelectedSkills([]);
    setUploading(false);
  };

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-semibold mb-6">Ingest a Document</h1>

        {errorMsg && (
          <div className="mb-4 px-4 py-2 bg-red-100 text-red-700 rounded">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 px-4 py-2 bg-green-100 text-green-700 rounded">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* File Input */}
          <label className="block text-sm font-medium mb-1">
            Select Document (PDF or Word)
          </label>
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileChange}
            className="mb-6"
          />

          {/* Topic Multi-Select */}
          <fieldset className="mb-6">
            <legend className="text-sm font-medium mb-2">
              Assign to Topics (multi-select)
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {topicOptions.map((topic) => (
                <label key={topic} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedTopics.includes(topic)}
                    onChange={() => toggleTopic(topic)}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                  />
                  <span className="text-gray-700">{topic}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Skill Area Multi-Select */}
          <fieldset className="mb-6">
            <legend className="text-sm font-medium mb-2">
              Assign to Skill Areas (multi-select)
            </legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {Object.values(skillAreaMap)
                .flat()
                .map((skill) => (
                  <label key={skill} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedSkills.includes(skill)}
                      onChange={() => toggleSkill(skill)}
                      className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                    />
                    <span className="text-gray-700">{skill}</span>
                  </label>
                ))}
            </div>
          </fieldset>

          <button
            type="submit"
            disabled={uploading}
            className={`w-full py-2 rounded-md text-white ${
              uploading
                ? "bg-indigo-300 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700"
            } transition`}
          >
            {uploading ? "Uploading..." : "Upload Document"}
          </button>
        </form>
      </div>
    </Layout>
  );
}