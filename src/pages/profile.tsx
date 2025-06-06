// /src/pages/profile.tsx

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useUser } from "@supabase/auth-helpers-react";
import { supabase } from "@/lib/supabaseClient";

export default function ProfilePage() {
  const user = useUser();
  const router = useRouter();

  // Form state
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"high-school" | "college" | "young-professional" | "mid-career" | "late-career">("high-school");
  const [gender, setGender] = useState<"male" | "female" | "other">("male");
  const [age, setAge] = useState<number | "">("");

  // Loading / error state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // If the user is not signed in, redirect to /signin
  useEffect(() => {
    if (user === undefined) return; // still checking
    if (user === null) {
      router.replace("/signin");
    }
  }, [user, router]);

  // On mount, check if profile already exists; if so, redirect to /chat
  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      setLoading(true);
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();

      if (profile && !error) {
        // If a profile row exists, skip form and go to /chat
        router.replace("/chat");
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user, router]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!fullName.trim()) {
      setErrorMsg("Please enter your full name.");
      return;
    }
    if (!age || age < 1) {
      setErrorMsg("Please enter a valid age.");
      return;
    }

    setErrorMsg(null);
    setLoading(true);

    const { error } = await supabase.from("profiles").insert({
      id: user!.id,
      full_name: fullName.trim(),
      role,
      gender,
      age: Number(age),
      // NOTE: no 'topics' column anymore
    });

    if (error) {
      console.error("Error inserting profile:", error);
      setErrorMsg("Failed to save profile — please try again.");
      setLoading(false);
    } else {
      // Successfully created profile → redirect to /chat
      router.replace("/chat");
    }
  };

  if (loading || user === undefined) {
    return null; // or a spinner
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-semibold mb-6 text-center">
          Complete Your Profile
        </h1>

        {errorMsg && (
          <div className="mb-4 text-red-600 font-medium">{errorMsg}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label htmlFor="fullName" className="block font-medium mb-1">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Your full name"
              required
            />
          </div>

          {/* Role */}
          <div>
            <label htmlFor="role" className="block font-medium mb-1">
              What best describes you?
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) =>
                setRole(e.target.value as
                  | "high-school"
                  | "college"
                  | "young-professional"
                  | "mid-career"
                  | "late-career")
              }
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="high-school">High School Student</option>
              <option value="college">College Student</option>
              <option value="young-professional">Young Professional</option>
              <option value="mid-career">Mid-Career Professional</option>
              <option value="late-career">Late-Career Professional</option>
            </select>
          </div>

          {/* Gender */}
          <div>
            <label htmlFor="gender" className="block font-medium mb-1">
              Gender
            </label>
            <select
              id="gender"
              value={gender}
              onChange={(e) =>
                setGender(e.target.value as "male" | "female" | "other")
              }
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other / Prefer not to say</option>
            </select>
          </div>

          {/* Age */}
          <div>
            <label htmlFor="age" className="block font-medium mb-1">
              Age
            </label>
            <input
              id="age"
              type="number"
              min={1}
              value={age}
              onChange={(e) =>
                setAge(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Your age"
              required
            />
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-md text-white ${
                loading
                  ? "bg-indigo-300 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700"
              } transition`}
            >
              {loading ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
