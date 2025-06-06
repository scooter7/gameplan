// /src/pages/profile.tsx

import { useState, useEffect } from "react";
import Link from "next/link";
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
  const [loading, setLoading] = useState(false); // For profile form
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // State for gameplans and related data
  const [gameplans, setGameplans] = useState<any[]>([]); // Consider defining a specific type for gameplan
  const [gameplanGoals, setGameplanGoals] = useState<Map<string, any[]>>(new Map());
  const [gameplanFlashcards, setGameplanFlashcards] = useState<Map<string, any[]>>(new Map());
  const [gameplansLoading, setGameplansLoading] = useState<boolean>(true);
  const [viewingDetailsOf, setViewingDetailsOf] = useState<string | null>(null);

  const incompleteGameplans = gameplans.filter(gp => !gp.completed);
  const completedGameplans = gameplans.filter(gp => gp.completed);

  // Redirect to /signin if not logged in
  useEffect(() => {
    if (user === undefined) return;
    if (user === null) {
      router.replace("/signin");
    }
  }, [user, router]);

  // Fetch existing profile data
  useEffect(() => {
    if (!user) return;

    const fetchUserProfile = async () => {
      setLoading(true);
      setErrorMsg(null); // Clear previous errors

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, role, gender, age")
        .eq("id", user.id)
        .single();

      if (error && error.code !== "PGRST116") { // PGRST116 = no rows found
        console.error("Error fetching profile:", error);
        setErrorMsg("Could not load profile data. Please try again.");
      } else if (data) {
        setFullName(data.full_name || "");
        setRole(data.role || "high-school");
        setGender(data.gender || "male");
        setAge(data.age || "");
      }
      setLoading(false);
    };

    fetchUserProfile();
  }, [user, supabase]);

  // Fetch gameplans, goals, and flashcards
  useEffect(() => {
    if (!user) return;

    const fetchGameplanData = async () => {
      setGameplansLoading(true);
      setErrorMsg(null); // Clear previous errors related to profile saving

      // 1. Fetch gameplans
      const { data: gameplanData, error: gameplanError } = await supabase
        .from("gameplans")
        .select("id, topic, skill, completed, created_at") // completed_at also removed
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (gameplanError) {
        console.error("Error fetching gameplans:", gameplanError);
        setErrorMsg("Could not load gameplan history.");
        setGameplansLoading(false);
        return;
      }

      setGameplans(gameplanData || []);
      const newGoalsMap = new Map<string, any[]>();
      const newFlashcardsMap = new Map<string, any[]>();

      if (gameplanData && gameplanData.length > 0) {
        try {
          for (const gp of gameplanData) {
            // 2. Fetch goals for each gameplan
            const { data: goalsData, error: goalsError } = await supabase
              .from("goals")
              .select("id, description, status")
              .eq("gameplan_id", gp.id);

            if (goalsError) {
              console.error(`Error fetching goals for gameplan ${gp.id}:`, goalsError);
              setErrorMsg(`Could not load goals for: ${gp.topic || gp.skill || gp.id}. An error occurred.`);
              // Storing empty array for this gameplan's goals to avoid issues downstream
              newGoalsMap.set(gp.id, []); 
            } else {
              newGoalsMap.set(gp.id, goalsData || []);
            }

            // 3. Process flashcards (assuming raw_flashcards is a text column with JSON strings)
            // In chat.tsx, flashcards were an array of strings from the API.
            // Here, let's assume 'raw_flashcards' column on 'gameplans' table stores the array of strings.
            // If it's a single JSON string representing the array: JSON.parse(gp.raw_flashcards)
            // If it's a Postgres array of text: gp.raw_flashcards (already an array)
            // 3. Process flashcards - This section will need to be updated if flashcards are fetched differently later.
            // For now, as raw_flashcards is removed from gameplan fetch, we'll just set an empty array.
            newFlashcardsMap.set(gp.id, []);
          }
        } catch (e) {
            console.error("Error processing goals or flashcards for gameplans:", e);
            setErrorMsg("Error loading details for gameplans.");
        }
      }
      
      setGameplanGoals(newGoalsMap);
      setGameplanFlashcards(newFlashcardsMap);
      setGameplansLoading(false);
    };

    fetchGameplanData();
  }, [user, supabase]);

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

    const { error } = await supabase.from("profiles").upsert({
      id: user!.id,
      full_name: fullName.trim(),
      role,
      gender,
      age: Number(age),
    });

    setLoading(false);
    if (error) {
      console.error("Error upserting profile:", error);
      setErrorMsg("Failed to save profile — please try again.");
    } else {
      setErrorMsg("Profile saved successfully!");
      // router.replace("/chat"); // Removed as per instructions
    }
  };

  if (user === undefined) { // Only return null if user state is not yet determined.
                           // Loading indicator will be handled by the button state and potential full-screen overlay if desired.
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

        {/* Gameplans Loading State */}
        {gameplansLoading && (
          <p className="text-center text-text-secondary italic my-4">Loading gameplans...</p>
        )}

        {/* In Progress Gameplans Section */}
        {!gameplansLoading && incompleteGameplans.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-semibold mb-4 text-secondary-dark">
              In Progress Gameplans
            </h2>
            <ul className="space-y-4">
              {incompleteGameplans.map((gp) => (
                <li key={gp.id} className="bg-white shadow-lg rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-grow">
                      <h3 className="text-lg font-semibold text-secondary-dark mb-1">
                        {gp.topic} - {gp.skill}
                      </h3>
                      <p className="text-sm text-text-secondary mb-3">
                        Created: {new Date(gp.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Link href={`/chat?gameplanId=${gp.id}`} legacyBehavior>
                      <a className="button button-primary text-sm py-2 px-4 whitespace-nowrap">
                        Continue Gameplan
                      </a>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {!gameplansLoading && incompleteGameplans.length === 0 && (
           <div className="mt-8">
             <h2 className="text-2xl font-semibold mb-4 text-secondary-dark">
              In Progress Gameplans
            </h2>
            <p className="text-center text-text-secondary italic my-4">
              No active gameplans. Start a new one in the Chat section!
            </p>
          </div>
        )}

        {/* Completed Gameplans Section */}
        {!gameplansLoading && completedGameplans.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-semibold mb-4 text-secondary-dark">
              Completed Gameplans
            </h2>
            <ul className="space-y-4">
              {completedGameplans.map((gp) => {
                const goals = gameplanGoals.get(gp.id) || [];
                const flashcards = gameplanFlashcards.get(gp.id) || [];
                const isViewing = viewingDetailsOf === gp.id;

                return (
                  <li key={gp.id} className="bg-white shadow-lg rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-grow">
                        <h3 className="text-lg font-semibold text-secondary-dark mb-1">
                          {gp.topic} - {gp.skill}
                        </h3>
                        <p className="text-sm text-text-secondary mb-3">
                          Completed: {gp.completed_at ? new Date(gp.completed_at).toLocaleDateString() : (gp.created_at ? new Date(gp.created_at).toLocaleDateString() : 'N/A')}
                        </p>
                      </div>
                      <button
                        onClick={() => setViewingDetailsOf(isViewing ? null : gp.id)}
                        className="button button-secondary text-sm py-2 px-4 whitespace-nowrap"
                      >
                        {isViewing ? "Hide Details" : "View Details"}
                      </button>
                    </div>

                    {/* Details Section */}
                    {isViewing && (
                      <div className="mt-4 p-4 border border-gray-200 rounded-md bg-gray-50">
                        <div>
                          <h4 className="text-md font-semibold mb-2 text-text-primary">Goals:</h4>
                          {goals.length > 0 ? (
                            <ul className="space-y-1">
                              {goals.map(goal => (
                                <li key={goal.id} className="text-sm mb-1 flex justify-between items-center">
                                  <span className="text-text-secondary">{goal.description}</span>
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    goal.status === 'completed' ? 'bg-tertiary text-white' : 
                                    goal.status === 'in-progress' ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-700'
                                  }`}>
                                    {goal.status}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : <p className="text-sm text-text-secondary italic my-2">No goals recorded for this gameplan.</p>}
                        </div>
                        <div className="mt-4">
                          <h4 className="text-md font-semibold mb-2 text-text-primary">Flashcards:</h4>
                          {flashcards.length > 0 ? (
                            <div className="space-y-2">
                              {flashcards.map((fc_raw: string, idx: number) => (
                                <pre key={idx} className="bg-gray-100 p-2 rounded text-xs whitespace-pre-wrap text-text-secondary">
                                  {fc_raw}
                                </pre>
                              ))}
                            </div>
                          ) : <p className="text-sm text-text-secondary italic my-2">No flashcards recorded for this gameplan.</p>}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {!gameplansLoading && completedGameplans.length === 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-semibold mb-4 text-secondary-dark">
              Completed Gameplans
            </h2>
            <p className="text-center text-text-secondary italic my-4">
              No completed gameplans yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
