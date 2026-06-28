"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Wind, UserPlus, AlertCircle, Shield, Users } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"citizen" | "authority">("citizen");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create account");
        setLoading(false);
        return;
      }

      // Auto sign in after signup
      const signInRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      setLoading(false);

      if (signInRes?.error) {
        setError("Account created but sign-in failed. Please log in.");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setLoading(false);
      setError("Something went wrong");
    }
  };

  return (
    <div className="min-h-screen app-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: "linear-gradient(135deg, #06b6d4, #3b82f6)" }}
          >
            <Wind size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">AERIS</h1>
          <p className="text-sm text-muted mt-2">
            Urban AQI Intelligence Platform
          </p>
        </div>

        {/* Signup card */}
        <div className="card">
          <h2 className="text-xl font-bold mb-1">Create Account</h2>
          <p className="text-sm text-muted mb-6">
            Join the air quality intelligence network
          </p>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm mb-4">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ujjwal Kumar"
                required
                className="w-full px-4 py-2.5 rounded-xl surface-subtle text-sm outline-none focus:ring-2 focus:ring-brand-500/30 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-2.5 rounded-xl surface-subtle text-sm outline-none focus:ring-2 focus:ring-brand-500/30 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                required
                minLength={6}
                className="w-full px-4 py-2.5 rounded-xl surface-subtle text-sm outline-none focus:ring-2 focus:ring-brand-500/30 transition-all"
              />
            </div>

            {/* Role selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Role</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole("citizen")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    role === "citizen"
                      ? "border-brand-500 bg-brand-500/10"
                      : "surface-subtle hover:border-[var(--border-strong)]"
                  }`}
                >
                  <Users
                    size={18}
                    className={
                      role === "citizen" ? "text-brand-400" : "text-muted"
                    }
                  />
                  <p className="text-sm font-medium mt-1.5">Citizen</p>
                  <p className="text-[11px] text-muted">
                    View AQI, forecasts & advisories
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("authority")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    role === "authority"
                      ? "border-brand-500 bg-brand-500/10"
                      : "surface-subtle hover:border-[var(--border-strong)]"
                  }`}
                >
                  <Shield
                    size={18}
                    className={
                      role === "authority" ? "text-brand-400" : "text-muted"
                    }
                  />
                  <p className="text-sm font-medium mt-1.5">Authority</p>
                  <p className="text-[11px] text-muted">
                    Full access + enforcement
                  </p>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus size={16} />
                  Create Account
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-muted">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-brand-400 hover:underline font-medium"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
