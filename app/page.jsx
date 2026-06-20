"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState("user");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    const payload = {
      username,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    if (mode === "admin") payload.password = password;

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error || "Login failed");
      return;
    }

    if (data.role === "admin") {
      router.push("/admin-dashboard");
      return;
    }

    router.push("/dashboard");
  };

  return (
    <main className="min-h-screen bg-slate-100 p-6 flex items-center justify-center">
      <section className="w-full max-w-md rounded-2xl bg-white shadow-lg p-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">Study Tracker Login</h1>
          <p className="text-sm text-slate-500">Permadeath mode enabled. Stay consistent daily.</p>
        </div>

        <div className="flex rounded-xl border overflow-hidden">
          <button
            className={`flex-1 py-2 text-sm font-medium ${mode === "user" ? "bg-slate-900 text-white" : "bg-white text-slate-700"}`}
            onClick={() => setMode("user")}
            type="button"
          >
            User
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium ${mode === "admin" ? "bg-slate-900 text-white" : "bg-white text-slate-700"}`}
            onClick={() => setMode("admin")}
            type="button"
          >
            Admin
          </button>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          <div>
            <label className="text-sm font-medium text-slate-700">Username</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              required
            />
          </div>

          {mode === "admin" && (
            <div>
              <label className="text-sm font-medium text-slate-700">Password</label>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button className="w-full rounded-lg bg-slate-900 text-white py-2 font-medium disabled:opacity-50" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </section>
    </main>
  );
}
