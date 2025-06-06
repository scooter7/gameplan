// /src/pages/signin.tsx

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useUser, useSessionContext } from "@supabase/auth-helpers-react";

export default function SignInPage() {
  const { supabaseClient } = useSessionContext();
  const user = useUser();
  const router = useRouter();

  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      router.replace("/chat");
    }
  }, [user, router]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }
    router.replace("/chat");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPwd) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    setErrorMsg(null);
    setLoading(true);

    const { error } = await supabaseClient.auth.signUp({
      email,
      password,
    });
    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }
    router.push("/profile");
  };

  // --- If still determining auth, show nothing ---
  if (user === undefined) {
    return null;
  }

  return (
    <div className="relative min-h-screen bg-connect auth-container">
      <div className="mx-auto my-12 w-full max-w-md card">
        <h1 className="text-3xl font-heading mb-6 text-secondary-dark text-center">
          {mode === "signin" ? "Sign In" : "Create Account"}
        </h1>

        {errorMsg && (
          <div className="mb-4 text-error font-body text-center">
            {errorMsg}
          </div>
        )}

        {mode === "signin" ? (
          <form onSubmit={handleSignIn} className="space-y-4">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-body text-text-secondary mb-1"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="input"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-body text-text-secondary mb-1"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="********"
                className="input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`button w-full ${
                loading ? "opacity-50 cursor-not-allowed" : "button-primary"
              }`}
            >
              {loading ? "Signing In…" : "Sign In"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            {/* Email */}
            <div>
              <label
                htmlFor="reg-email"
                className="block text-sm font-body text-text-secondary mb-1"
              >
                Email
              </label>
              <input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="input"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="reg-password"
                className="block text-sm font-body text-text-secondary mb-1"
              >
                Password
              </label>
              <input
                id="reg-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="********"
                className="input"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="reg-confirmPwd"
                className="block text-sm font-body text-text-secondary mb-1"
              >
                Confirm Password
              </label>
              <input
                id="reg-confirmPwd"
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                required
                placeholder="********"
                className="input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`button w-full ${
                loading ? "opacity-50 cursor-not-allowed" : "button-primary"
              }`}
            >
              {loading ? "Registering…" : "Create Account"}
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-sm font-body text-text-secondary">
          {mode === "signin" ? (
            <>
              Don’t have an account?{" "}
              <button
                onClick={() => {
                  setErrorMsg(null);
                  setMode("register");
                }}
                className="text-primary-light font-medium"
              >
                Create one
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={() => {
                  setErrorMsg(null);
                  setMode("signin");
                }}
                className="text-secondary  font-medium"
              >
                Sign In
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
