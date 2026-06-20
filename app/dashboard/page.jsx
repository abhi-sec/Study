"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const statuses = ["To Do", "In Progress", "Completed"];

const priorityStyles = {
  High: "bg-red-100 text-red-700",
  Medium: "bg-amber-100 text-amber-700",
  Low: "bg-emerald-100 text-emerald-700",
};

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [topics, setTopics] = useState([]);
  const [title, setTitle] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [draggingId, setDraggingId] = useState(null);
  const [error, setError] = useState("");

  const todayKey = new Date().toISOString().slice(0, 10);

  const loadBoard = async () => {
    const response = await fetch("/api/tasks");
    if (!response.ok) {
      setError("Failed to load board");
      return;
    }

    const data = await response.json();
    setTopics(data.topics);
    setUser(data.user);
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (res) => {
        if (!res.ok) {
          router.push("/");
          return null;
        }
        const data = await res.json();
        if (data.session.role !== "user") {
          router.push("/");
          return null;
        }
        setSession(data.session);
        return data.session;
      })
      .then((sessionData) => {
        if (sessionData) loadBoard();
      });
  }, []);

  const createTopic = async (event) => {
    event.preventDefault();
    setError("");

    const tags = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, tags, priority }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "Failed to create topic");
      return;
    }

    setTopics((previous) => [data, ...previous]);
    setTitle("");
    setTagsInput("");
    setPriority("Medium");
  };

  const updateTopic = async (id, payload) => {
    const response = await fetch(`/api/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      setError("Failed to update topic");
      return;
    }

    const updated = await response.json();
    setTopics((previous) => previous.map((item) => (item._id === updated._id ? updated : item)));
    await loadBoard();
  };

  const deleteTopic = async (id) => {
    const response = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("Failed to delete topic");
      return;
    }
    setTopics((previous) => previous.filter((item) => item._id !== id));
  };

  const markRevision = async (taskId, revisionId) => {
    const response = await fetch(`/api/tasks/${taskId}/revision/${revisionId}`, {
      method: "PATCH",
    });

    if (!response.ok) {
      setError("Failed to update revision");
      return;
    }

    const updated = await response.json();
    setTopics((previous) => previous.map((item) => (item._id === updated._id ? updated : item)));
  };

  const byStatus = (status) => topics.filter((topic) => topic.status === status);

  const revisionItems = useMemo(
    () =>
      topics.flatMap((topic) =>
        (topic.revisions || [])
          .filter((revision) => !revision.isReviewed && String(revision.targetDate).slice(0, 10) <= todayKey)
          .map((revision) => ({
            topicId: topic._id,
            topicTitle: topic.title,
            revision,
          }))
      ),
    [topics, todayKey]
  );

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="rounded-2xl bg-gradient-to-r from-slate-900 to-slate-700 text-white p-6 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <div>
            <p className="text-sm text-slate-200">Welcome, {session?.username}</p>
            <h1 className="text-3xl font-bold">Current Streak: {user?.currentStreak ?? 0} days</h1>
            <p className="mt-2 text-sm text-rose-200 font-medium">Miss one day or leave revisions unchecked and your account is permanently deleted.</p>
          </div>
          <button className="rounded-lg bg-white/15 border border-white/30 px-4 py-2" onClick={logout}>
            Logout
          </button>
        </header>

        <section className="bg-white rounded-2xl p-5 shadow">
          <h2 className="text-lg font-semibold mb-3">Create Topic</h2>
          <form className="grid gap-3 md:grid-cols-4" onSubmit={createTopic}>
            <input
              className="rounded-lg border px-3 py-2 md:col-span-2"
              placeholder="Topic title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
            <input
              className="rounded-lg border px-3 py-2"
              placeholder="Tags (comma separated)"
              value={tagsInput}
              onChange={(event) => setTagsInput(event.target.value)}
            />
            <select className="rounded-lg border px-3 py-2" value={priority} onChange={(event) => setPriority(event.target.value)}>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
            <button className="rounded-lg bg-slate-900 text-white py-2 md:col-span-4">Add Topic</button>
          </form>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {statuses.map((status) => (
            <div
              key={status}
              className="bg-white rounded-2xl shadow p-4"
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (draggingId) updateTopic(draggingId, { status });
                setDraggingId(null);
              }}
            >
              <h3 className="font-semibold text-slate-900 mb-3">{status}</h3>
              <div className="space-y-3 min-h-24">
                {byStatus(status).map((topic) => (
                  <article
                    key={topic._id}
                    draggable
                    onDragStart={() => setDraggingId(topic._id)}
                    className="border rounded-xl p-3 bg-slate-50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-medium">{topic.title}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${priorityStyles[topic.priority]}`}>{topic.priority}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(topic.tags || []).map((tag) => (
                        <span key={`${topic._id}-${tag}`} className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                    {topic.status !== "Completed" && (
                      <button
                        className="mt-3 text-xs text-emerald-700 font-medium"
                        onClick={() => updateTopic(topic._id, { status: "Completed" })}
                      >
                        Mark Completed
                      </button>
                    )}
                    <button className="mt-3 ml-4 text-xs text-red-600" onClick={() => deleteTopic(topic._id)}>
                      Delete
                    </button>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="bg-white rounded-2xl p-5 shadow">
          <h2 className="text-lg font-semibold mb-3">Daily Revision Panel</h2>
          {revisionItems.length === 0 ? (
            <p className="text-sm text-slate-500">No pending revisions due today.</p>
          ) : (
            <ul className="space-y-2">
              {revisionItems.map(({ topicId, topicTitle, revision }) => (
                <li key={revision._id} className="flex items-center gap-3 border rounded-lg p-3">
                  <input type="checkbox" onChange={() => markRevision(topicId, revision._id)} checked={revision.isReviewed} readOnly />
                  <div>
                    <p className="font-medium">{topicTitle}</p>
                    <p className="text-xs text-slate-500">Review Day {revision.intervalDays}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
