"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [username, setUsername] = useState("");
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [error, setError] = useState("");

  const ensureAdmin = async () => {
    const response = await fetch("/api/auth/me");
    if (!response.ok) {
      router.push("/");
      return false;
    }

    const data = await response.json();
    if (data.session.role !== "admin") {
      router.push("/");
      return false;
    }

    return true;
  };

  const loadUsers = async () => {
    const response = await fetch("/api/admin/users");
    if (!response.ok) {
      setError("Failed to load users");
      return;
    }
    setUsers(await response.json());
  };

  useEffect(() => {
    ensureAdmin().then((ok) => {
      if (ok) loadUsers();
    });
  }, []);

  const addUser = async (event) => {
    event.preventDefault();
    setError("");

    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, timezone }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "Failed to create user");
      return;
    }

    setUsers((previous) => [{ ...data, topicCount: 0, completedCount: 0 }, ...previous]);
    setUsername("");
  };

  const deleteUser = async (id) => {
    const response = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("Failed to delete user");
      return;
    }

    setUsers((previous) => previous.filter((user) => user._id !== id));
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <section className="max-w-6xl mx-auto space-y-6">
        <header className="bg-white rounded-2xl shadow p-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Admin Control Terminal</h1>
            <p className="text-sm text-slate-500">Manage users and monitor survival streaks.</p>
          </div>
          <button className="rounded-lg bg-slate-900 text-white px-4 py-2" onClick={logout}>
            Logout
          </button>
        </header>

        <section className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Create User</h2>
          <form className="grid md:grid-cols-3 gap-3" onSubmit={addUser}>
            <input
              className="rounded-lg border px-3 py-2"
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              required
            />
            <input
              className="rounded-lg border px-3 py-2"
              placeholder="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              required
            />
            <button className="rounded-lg bg-emerald-600 text-white px-4 py-2">Add User</button>
          </form>
          {error && <p className="mt-3 text-red-600 text-sm">{error}</p>}
        </section>

        <section className="bg-white rounded-2xl shadow p-6 overflow-auto">
          <h2 className="text-lg font-semibold mb-4">Users</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Username</th>
                <th className="py-2">Timezone</th>
                <th className="py-2">Streak</th>
                <th className="py-2">Topics</th>
                <th className="py-2">Completed</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id} className="border-b">
                  <td className="py-2 font-medium">{user.username}</td>
                  <td className="py-2">{user.timezone}</td>
                  <td className="py-2">{user.currentStreak}</td>
                  <td className="py-2">{user.topicCount}</td>
                  <td className="py-2">{user.completedCount}</td>
                  <td className="py-2">
                    <button className="text-red-600" onClick={() => deleteUser(user._id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </section>
    </main>
  );
}
