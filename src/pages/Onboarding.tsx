import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export default function Onboarding() {
  const { session, refreshProfile } = useAuth();
  const nav = useNavigate();
  const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
  const [name, setName] = useState("");
  const [exam, setExam] = useState("");
  const [goal, setGoal] = useState(45);
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [level, setLevel] = useState("beginner");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [topics, setTopics] = useState<{ id: string; title: string }[]>([]);
  const [conf, setConf] = useState<Record<string, number>>({});
  useEffect(() => {
    supabase
      .from("topics")
      .select("id,title")
      .order("sort_order")
      .then(({ data }) => setTopics(data ?? []));
  }, []);
  const toggle = (d: number) =>
    setDays((p) =>
      p.includes(d) ? p.filter((x) => x !== d) : [...p, d].sort(),
    );
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    if (exam && exam < tomorrow)
      return setErr("Exam date must be in the future.");
    if (days.length === 0) return setErr("Pick at least one study day.");
    if (goal < 10 || goal > 480)
      return setErr("Daily goal must be between 10 and 480 minutes.");
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: name.trim() || null,
        exam_date: exam || null,
        daily_goal_min: goal,
        study_days: days,
        knowledge_level: level,
        onboarded: true,
      })
      .eq("id", session!.user.id);
    if (error) {
      setErr("Could not save your answers. Please try again.");
      setBusy(false);
      return;
    }
    const rows = Object.entries(conf).map(([topic_id, confidence]) => ({
      user_id: session!.user.id,
      topic_id,
      confidence,
      state: "not_started",
    }));
    if (rows.length) {
      const r = await supabase.from("topic_status").upsert(rows);
      if (r.error) {
        setErr("Saved your profile, but not topic confidence.");
      }
    }
    await refreshProfile();
    nav("/app");
  };
  return (
    <div className="grid min-h-screen place-items-center px-4 py-8">
      <form onSubmit={submit} className="card w-full max-w-lg space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Let’s set up your study plan</h1>
          <p className="text-sm text-slate-500">
            You can change all of this later in Settings.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="n">
            What should we call you?
          </label>
          <input
            id="n"
            className="input"
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="d">
            Exam date (optional)
          </label>
          <input
            id="d"
            className="input"
            type="date"
            min={tomorrow}
            value={exam}
            onChange={(e) => setExam(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="g">
            Study time per day (minutes)
          </label>
          <input
            id="g"
            className="input"
            type="number"
            min={10}
            max={480}
            step={5}
            value={goal}
            onChange={(e) => setGoal(+e.target.value)}
          />
        </div>
        <fieldset>
          <legend className="label">Preferred study days</legend>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((l, i) => (
              <button
                type="button"
                key={l}
                aria-pressed={days.includes(i)}
                onClick={() => toggle(i)}
                className={`btn !px-3 !py-1.5 ${days.includes(i) ? "bg-electric text-white" : "btn-ghost"}`}
              >
                {days.includes(i) ? "✓ " : ""}
                {l}
              </button>
            ))}
          </div>
        </fieldset>
        <div>
          <label className="label" htmlFor="l">
            Current knowledge of cloud computing
          </label>
          <select
            id="l"
            className="input"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          >
            <option value="beginner">Complete beginner</option>
            <option value="some">Some experience</option>
            <option value="comfortable">Fairly comfortable</option>
          </select>
        </div>
        {topics.length > 0 && (
          <fieldset>
            <legend className="label">
              How confident are you? (1 = new to me, 5 = strong)
            </legend>
            <div className="space-y-2">
              {topics.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <label htmlFor={`c${t.id}`} className="flex-1">
                    {t.title}
                  </label>
                  <select
                    id={`c${t.id}`}
                    className="input !w-20"
                    value={conf[t.id] ?? ""}
                    onChange={(e) =>
                      setConf((p) => ({ ...p, [t.id]: +e.target.value }))
                    }
                  >
                    <option value="" disabled>
                      –
                    </option>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </fieldset>
        )}
        {err && (
          <p role="alert" className="text-sm text-red-600">
            ⚠ {err}
          </p>
        )}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? "Saving…" : "Save and continue"}
        </button>
      </form>
    </div>
  );
}
