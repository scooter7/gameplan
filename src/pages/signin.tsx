// /src/pages/signin.tsx

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/router";
import {
  useUser,
  useSupabaseClient,
} from "@supabase/auth-helpers-react";

export default function SignIn() {
  const user = useUser();
  const supabase = useSupabaseClient();
  const router = useRouter();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isSigningUp, setIsSigningUp] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // If already signed in, redirect to index (which will forward to /profile or /chat)
  useEffect(() => {
    if (user) {
      router.replace("/");
    }
  }, [user, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    if (isSigningUp) {
      // Sign‐up flow
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) {
        setErrorMsg(error.message);
      } else {
        setErrorMsg(
          "Check your email for a confirmation link, then sign in."
        );
        setIsSigningUp(false);
        setEmail("");
        setPassword("");
      }
      setLoading(false);
    } else {
      // Sign‐in flow
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
      } else {
        // On success, Auth‐Helpers sets HttpOnly cookies automatically
        router.replace("/");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-semibold text-center mb-6">
          {isSigningUp ? "Create an Account" : "Sign In"}
        </h1>

        {errorMsg && (
          <div className="mb-4 px-4 py-2 bg-red-100 text-red-700 rounded">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <label htmlFor="password" className="block text-sm font-medium mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 rounded-md text-white ${
              loading
                ? "bg-indigo-300 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700"
            } transition`}
          >
            {loading
              ? isSigningUp
                ? "Creating Account..."
                : "Signing In..."
              : isSigningUp
              ? "Sign Up"
              : "Sign In"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          {isSigningUp
            ? "Already have an account?"
            : "Don’t have an account?"}{" "}
          <button
            onClick={() => {
              setErrorMsg("");
              setIsSigningUp(!isSigningUp);
            }}
            className="text-indigo-600 hover:underline focus:outline-none"
          >
            {isSigningUp ? "Sign In" : "Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}
