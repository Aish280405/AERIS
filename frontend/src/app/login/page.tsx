"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Wind, LogIn, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Invalid email or password");
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen app-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: "linear-gradient(135deg, #06b6d4, #3b82f6)" }}>
            <Wind size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">AERIS</h1>
          <p className="text-sm text-muted mt-2">Urban AQI Intelligence Platform</p>
        </div>

        {/* Login card */}
        <div className="card">
          <h2 className="text-xl font-bold mb-1">Welcome back</h2>
          <p className="text-sm text-muted mb-6">Sign in to your account</p>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm mb-4">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
              <label className="block text-sm font-medium mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-2.5 rounded-xl surface-subtle text-sm outline-none focus:ring-2 focus:ring-brand-500/30 transition-all"
              />
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
                  <LogIn size={16} />
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-muted">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-brand-400 hover:underline font-medium">
              Create one
            </Link>
          </div>
        </div>

        {/* Demo credentials */}
        <div className="mt-4 card !p-4">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Demo Accounts
          </p>
          <div className="space-y-1.5 text-xs text-secondary">
            <p><span className="font-medium">Citizen:</span> citizen@aeris.io / password123</p>
            <p><span className="font-medium">Authority:</span> admin@aeris.io / password123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
