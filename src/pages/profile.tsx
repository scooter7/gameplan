// /src/pages/profile.tsx

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useUser } from "@supabase/auth-helpers-react";
import { supabase } from "@/lib/supabaseClient";

export default function ProfilePage() {
  const user = useUser();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<
    | "high-school"
    | "college"
    | "young-professional"
    | "mid-career"
    | "late-career"
  >("high-school");
  const [gender, setGender] = useState<"male" | "female" | "other">("male");
  const [age, setAge] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Redirect to /signin if not logged in
  useEffect(() => {
    if (user === undefined) return;
    if (user === null) {
      router.replace("/signin");
    }
  }, [user, router]);

  // If profile already exists, skip to /chat
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
        router.replace("/chat");
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    });

    if (error) {
      console.error("Error inserting profile:", error);
      setErrorMsg("Failed to save profile — please try again.");
      setLoading(false);
    } else {
      router.replace("/chat");
    }
  };

  if (loading || user === undefined) {
    return null;
  }

  return (
    <div className="relative min-h-screen bg-insights profile-container">
      <div className="mx-auto my-12 w-full max-w-lg card">
        <h1 className="text-3xl font-heading mb-6 text-secondary-dark text-center">
          Complete Your Profile
        </h1>

        {errorMsg && (
          <div className="mb-4 text-error font-body text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Full Name */}
          <div>
            <label
              htmlFor="fullName"
              className="block text-sm font-body text-text-secondary mb-1"
            >
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              required
              className="input"
            />
          </div>

          {/* Role */}
          <div>
            <label
              htmlFor="role"
              className="block text-sm font-body text-text-secondary mb-1"
            >
              What best describes you?
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) =>
                setRole(
                  e.target.value as
                    | "high-school"
                    | "college"
                    | "young-professional"
                    | "mid-career"
                    | "late-career"
                )
              }
              className="input"
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
            <label
              htmlFor="gender"
              className="block text-sm font-body text-text-secondary mb-1"
            >
              Gender
            </label>
            <select
              id="gender"
              value={gender}
              onChange={(e) =>
                setGender(e.target.value as "male" | "female" | "other")
              }
              className="input"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other / Prefer not to say</option>
            </select>
          </div>

          {/* Age */}
          <div>
            <label
              htmlFor="age"
              className="block text-sm font-body text-text-secondary mb-1"
            >
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
              placeholder="Your age"
              required
              className="input"
            />
          </div>

          {/* Save Profile */}
          <div className="text-center pt-6">
            <button
              type="submit"
              disabled={loading}
              className={`button w-full ${
                loading ? "opacity-50 cursor-not-allowed" : "button-primary"
              }`}
            >
              {loading ? "Saving…" : "Save Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
