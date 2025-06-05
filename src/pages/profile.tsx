// /src/pages/profile.tsx

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/router";
import { useUser } from "@supabase/auth-helpers-react";
import { supabase } from "@/lib/supabaseClient";

type RoleOption =
  | "High School Student"
  | "College Student"
  | "Young Professional"
  | "Mid-Career Professional"
  | "Late-Career Professional";

type GenderOption = "Male" | "Female" | "Non-Binary" | "Prefer Not to Say";

const roleOptions: RoleOption[] = [
  "High School Student",
  "College Student",
  "Young Professional",
  "Mid-Career Professional",
  "Late-Career Professional",
];

const genderOptions: GenderOption[] = [
  "Male",
  "Female",
  "Non-Binary",
  "Prefer Not to Say",
];

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

export default function Profile() {
  const user = useUser();
  const router = useRouter();

  // Form state
  const [name, setName] = useState<string>("");
  const [role, setRole] = useState<RoleOption>("High School Student");
  const [gender, setGender] = useState<GenderOption>("Prefer Not to Say");
  const [age, setAge] = useState<number | "">( "");
  const [topics, setTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Check for existing profile; if exists, redirect to /chat
  useEffect(() => {
    if (user === undefined) return; // still loading auth state

    if (user === null) {
      router.replace("/signin");
      return;
    }

    // If user is signed in, check if a profile row already exists
    const fetchProfile = async () => {
      const { data: existingProfile, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows found; ignore that here
        console.error("Error checking profile:", error.message);
      }

      if (existingProfile) {
        router.replace("/chat");
      }
    };

    fetchProfile();
  }, [user, router]);

  const handleTopicToggle = (topic: string) => {
    setTopics((prev) =>
      prev.includes(topic)
        ? prev.filter((t) => t !== topic)
        : [...prev, topic]
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    // Basic validation
    if (!name.trim()) {
      setErrorMsg("Please enter your name.");
      return;
    }
    if (age === "" || typeof age === "number" ? age < 1 : true) {
      setErrorMsg("Please enter a valid age.");
      return;
    }
    if (topics.length === 0) {
      setErrorMsg("Select at least one topic you'd like to discuss.");
      return;
    }

    setLoading(true);

    // Insert new profile row using user's UUID as PK
    const { error } = await supabase.from("profiles").insert({
      id: user!.id,
      full_name: name.trim(),
      role,
      gender,
      age: Number(age),
      topics,
    });

    if (error) {
      console.error("Error inserting profile:", error.message);
      setErrorMsg("There was an error saving your profile. Please try again.");
      setLoading(false);
    } else {
      router.replace("/chat");
    }
  };

  // While auth status is loading, render nothing
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-lg w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-semibold text-center mb-6">
          Complete Your Profile
        </h1>

        {errorMsg && (
          <div className="mb-4 px-4 py-2 bg-red-100 text-red-700 rounded">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Name */}
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Full Name
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          {/* Role */}
          <label htmlFor="role" className="block text-sm font-medium mb-1">
            I am a:
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as RoleOption)}
            className="w-full border border-gray-300 rounded px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {roleOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>

          {/* Gender */}
          <label htmlFor="gender" className="block text-sm font-medium mb-1">
            Gender
          </label>
          <select
            id="gender"
            value={gender}
            onChange={(e) => setGender(e.target.value as GenderOption)}
            className="w-full border border-gray-300 rounded px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {genderOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>

          {/* Age */}
          <label htmlFor="age" className="block text-sm font-medium mb-1">
            Age
          </label>
          <input
            id="age"
            type="number"
            min={1}
            required
            value={age}
            onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))}
            className="w-full border border-gray-300 rounded px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          {/* Topics Multi-Select */}
          <fieldset className="mb-4">
            <legend className="text-sm font-medium mb-2">
              Which of the following would you like to talk about today?
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {topicOptions.map((topic) => (
                <label key={topic} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={topics.includes(topic)}
                    onChange={() => handleTopicToggle(topic)}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                  />
                  <span className="text-gray-700">{topic}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 rounded-md text-white ${
              loading
                ? "bg-indigo-300 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700"
            } transition`}
          >
            {loading ? "Saving Profile..." : "Save Profile"}
          </button>
        </form>
      </div>
    </div>
  );
}
