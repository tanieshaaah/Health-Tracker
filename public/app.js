import React, { useEffect, useMemo, useState } from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";
import { AuthProvider, useAuth, AuthPage } from "./auth.js";

const h = React.createElement;

const defaultForm = {
  date: new Date().toISOString().slice(0, 10),
  steps: 7500,
  sleep: 7.5,
  water: 8,
  mood: "Focused",
  notes: ""
};

const moodOptions = ["Energetic", "Focused", "Calm", "Tired", "Stressed"];

const getAuthHeaders = () => {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const api = {
  async listEntries() {
    const response = await fetch("/api/entries", {
      headers: getAuthHeaders()
    });
    return response.json();
  },
  async stats() {
    const response = await fetch("/api/stats", {
      headers: getAuthHeaders()
    });
    return response.json();
  },
  async createEntry(entry) {
    const response = await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(entry)
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.errors?.join(" ") || "Unable to save entry.");
    }

    return payload;
  },
  async deleteEntry(id) {
    const response = await fetch(`/api/entries/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const payload = await response.json();
      throw new Error(payload.errors?.join(" ") || "Unable to delete entry.");
    }
  }
};

function Stat({ label, value, tone }) {
  return h(
    "article",
    { className: `stat stat-${tone}` },
    h("span", null, label),
    h("strong", null, value)
  );
}

function getHealthInsight(stats) {
  if (!stats || stats.entryCount === 0) {
    return "Add your first daily entry to receive a personalized health insight.";
  }

  if (stats.averageSleep >= 7 && stats.averageSleep <= 9) {
    return "Your average sleep is healthy. Keep protecting that recovery routine.";
  }

  if (stats.averageSteps < 6000) {
    return "Try increasing daily steps with a short walk or movement break.";
  }

  if (stats.averageWater < 6) {
    return "Your water average is a little low. Add a few hydration reminders today.";
  }

  return "Your habits look balanced across movement, sleep, and hydration.";
}

function HealthInsight({ stats }) {
  return h(
    "section",
    { className: "insight-card", "aria-label": "Health insight" },
    h("div", null, h("p", { className: "eyebrow compact" }, "Health Insight"), h("h2", null, getHealthInsight(stats))),
    h("p", null, "This IoB-style insight uses your average steps, sleep, and water values to turn daily behavior data into a simple wellness suggestion.")
  );
}

function EntryForm({ onCreate }) {
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSaving(true);

    try {
      await onCreate(form);
      setForm({ ...defaultForm, date: new Date().toISOString().slice(0, 10) });
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setIsSaving(false);
    }
  };

  return h(
    "form",
    { className: "tracker-form", onSubmit: handleSubmit },
    h(
      "div",
      { className: "form-grid" },
      h("label", null, "Date", h("input", { type: "date", name: "date", value: form.date, onChange: updateField, required: true })),
      h("label", null, "Steps", h("input", { type: "number", name: "steps", min: "0", value: form.steps, onChange: updateField, required: true })),
      h("label", null, "Sleep", h("input", { type: "number", name: "sleep", min: "0", max: "24", step: "0.1", value: form.sleep, onChange: updateField, required: true })),
      h("label", null, "Water", h("input", { type: "number", name: "water", min: "0", value: form.water, onChange: updateField, required: true }))
    ),
    h(
      "label",
      null,
      "Mood",
      h(
        "select",
        { name: "mood", value: form.mood, onChange: updateField },
        moodOptions.map((mood) => h("option", { key: mood }, mood))
      )
    ),
    h(
      "label",
      null,
      "Notes",
      h("textarea", {
        name: "notes",
        rows: "3",
        value: form.notes,
        onChange: updateField,
        placeholder: "What affected your health today?"
      })
    ),
    error ? h("p", { className: "error" }, error) : null,
    h("button", { type: "submit", disabled: isSaving }, isSaving ? "Saving..." : "Add daily entry")
  );
}

function EntryList({ entries, onDelete }) {
  if (!entries.length) {
    return h("p", { className: "empty" }, "No entries yet. Add today's health snapshot to begin.");
  }

  return h(
    "div",
    { className: "entry-list" },
    entries.map((entry) =>
      h(
        "article",
        { className: "entry", key: entry.id },
        h(
          "div",
          null,
          h("time", { dateTime: entry.date }, new Date(entry.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })),
          h("h3", null, entry.mood),
          h("p", null, entry.notes || "No notes added.")
        ),
        h(
          "div",
          { className: "entry-metrics" },
          h("span", null, `${entry.steps.toLocaleString()} steps`),
          h("span", null, `${entry.sleep}h sleep`),
          h("span", null, `${entry.water} glasses`)
        ),
        h(
          "button",
          {
            className: "ghost",
            type: "button",
            onClick: () => onDelete(entry.id),
            "aria-label": `Delete entry from ${entry.date}`
          },
          "Delete"
        )
      )
    )
  );
}

function App() {
  const { user, isLoading, logout } = useAuth();
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [notice, setNotice] = useState("");

  const loadData = async () => {
    const [entryData, statData] = await Promise.all([api.listEntries(), api.stats()]);
    setEntries(entryData);
    setStats(statData);
  };

  useEffect(() => {
    if (user) {
      loadData().finally(() => setIsLoadingData(false));
    }
  }, [user]);

  const createEntry = async (entry) => {
    await api.createEntry(entry);
    await loadData();
    setNotice("Entry saved through the REST API.");
  };

  const deleteEntry = async (id) => {
    await api.deleteEntry(id);
    await loadData();
    setNotice("Entry deleted from the server.");
  };

  const weeklyGoal = useMemo(() => {
    const latestSeven = entries.slice(0, 7);
    const totalSteps = latestSeven.reduce((total, entry) => total + entry.steps, 0);
    return Math.min(100, Math.round((totalSteps / 56000) * 100));
  }, [entries]);

  if (isLoading) {
    return h("div", { className: "loading" }, "Loading...");
  }

  if (!user) {
    return h(AuthPage, { onAuthSuccess: () => setIsLoadingData(true) });
  }

  return h(
    "main",
    null,
    h(
      "header",
      { className: "app-header" },
      h("div", { className: "user-info" }, `Welcome, ${user.name || user.email}${user.age ? ` | Age ${user.age}` : ""}!`),
      h("button", { className: "logout-btn", onClick: logout }, "Logout")
    ),
    h(
      "section",
      { className: "hero" },
      h(
        "div",
        null,
        h("p", { className: "eyebrow" }, "Daily Wellness Companion"),
        h("h1", null, "VitalRoad Health Tracker"),
        h("p", null, "Track the daily habits that shape your energy, from steps and sleep to hydration, mood, and personal notes.")
      ),
      h(
        "div",
        { className: "progress-panel", "aria-label": "Weekly goal progress" },
        h("span", null, "Weekly step goal"),
        h("strong", null, `${weeklyGoal}%`),
        h("div", { className: "progress-track" }, h("div", { style: { width: `${weeklyGoal}%` } }))
      )
    ),
    h(
      "section",
      { className: "stats-grid", "aria-label": "Health statistics" },
      h(Stat, { label: "Entries", value: stats?.entryCount ?? 0, tone: "mint" }),
      h(Stat, { label: "Avg steps", value: (stats?.averageSteps ?? 0).toLocaleString(), tone: "blue" }),
      h(Stat, { label: "Avg sleep", value: `${stats?.averageSleep ?? 0}h`, tone: "gold" }),
      h(Stat, { label: "Avg water", value: `${stats?.averageWater ?? 0}`, tone: "rose" })
    ),
    h(HealthInsight, { stats }),
    notice ? h("p", { className: "notice" }, notice) : null,
    h(
      "section",
      { className: "workspace" },
      h("div", null, h("h2", null, "Daily check-in"), h(EntryForm, { onCreate: createEntry })),
      h(
        "div",
        null,
        h("h2", null, "Recent entries"),
        isLoadingData ? h("p", { className: "empty" }, "Loading entries...") : h(EntryList, { entries, onDelete: deleteEntry })
      )
    )
  );
}

createRoot(document.getElementById("root")).render(h(AuthProvider, null, h(App)));

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {});
  });
}
