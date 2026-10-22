import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { askAI, AIError } from "../lib/ai";
import Chat, { Bubble } from "../components/Chat";
interface Past {
  id: string;
  topic_id: string;
  status: string;
  summary: string | null;
  started_at: string;
}
type M = Bubble & { hidden?: boolean };
export default function Tutor() {
  useAuth();
  const [topics, setTopics] = useState<{ id: string; title: string }[]>([]);
  const [past, setPast] = useState<Past[]>([]);
  const [topic, setTopic] = useState("");
  const [diff, setDiff] = useState("beginner");
  const [goal, setGoal] = useState("understand the basics");
  const [beg, setBeg] = useState(false);
  const [sid, setSid] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<M[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [summary, setSummary] = useState("");
  const load = async () => {
    const [t, p] = await Promise.all([
      supabase.from("topics").select("id,title").order("sort_order"),
      supabase
        .from("tutor_sessions")
        .select("id,topic_id,status,summary,started_at")
        .order("started_at", { ascending: false })
        .limit(10),
    ]);
    if (t.error || p.error) return setErr("Could not load tutor data.");
    setTopics(t.data ?? []);
    setPast((p.data ?? []) as Past[]);
    if (!topic && t.data?.[0]) setTopic(t.data[0].id);
  };
  useEffect(() => {
    load();
  }, []);
  const body = (list: M[], end = false) => ({
    mode: "tutor",
    messages: list.map(({ role, content }) => ({ role, content })).slice(-20),
    topic_id: topic,
    difficulty: diff,
    goal,
    beginner: beg,
    end,
  });
  const save = (id: string, list: M[], extra: Record<string, unknown> = {}) =>
    supabase
      .from("tutor_sessions")
      .update({ transcript: list, ...extra })
      .eq("id", id);
  const turn = async (id: string, list: M[]) => {
    setBusy(true);
    setErr("");
    try {
      const reply = await askAI(body(list));
      const n = [...list, { role: "assistant" as const, content: reply }];
      setMsgs(n);
      save(id, n);
    } catch (e) {
      setErr(e instanceof AIError ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };
  const begin = async () => {
    if (!topic) return setErr("Choose a topic.");
    setErr("");
    setSummary("");
    const r = await supabase
      .from("tutor_sessions")
      .insert({
        topic_id: topic,
        difficulty: diff,
        goal,
        mode: beg ? "beginner" : "standard",
      })
      .select("id")
      .single();
    if (r.error) return setErr("Could not start the session.");
    const first: M[] = [
      {
        role: "user",
        content: beg
          ? "I am a complete beginner. Please teach me from the beginning, starting with a quick diagnostic question."
          : "Please begin with a quick diagnostic question.",
        hidden: true,
      },
    ];
    setSid(r.data.id);
    setMsgs(first);
    turn(r.data.id, first);
  };
  const send = (t: string) => {
    const n = [...msgs, { role: "user" as const, content: t }];
    setMsgs(n);
    turn(sid!, n);
  };
  const end = async () => {
    setBusy(true);
    setErr("");
    try {
      const s = await askAI(body(msgs, true));
      setSummary(s);
      await save(sid!, msgs, {
        summary: s,
        status: "completed",
        ended_at: new Date().toISOString(),
      });
      setSid(null);
      load();
    } catch (e) {
      setErr(e instanceof AIError ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };
  const restart = async () => {
    if (sid && !confirm("Discard this session and start over?")) return;
    if (sid)
      await supabase
        .from("tutor_sessions")
        .update({ status: "abandoned", ended_at: new Date().toISOString() })
        .eq("id", sid);
    setSid(null);
    setMsgs([]);
    setSummary("");
    load();
  };
  const name = (id: string) =>
    topics.find((t) => t.id === id)?.title ?? "Topic";
  if (sid)
    return (
      <div className="mx-auto max-w-3xl space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="mr-auto text-xl font-bold">AI Tutor: {name(topic)}</h1>
          <button className="btn-ghost !py-1.5" disabled={busy} onClick={end}>
            End &amp; summarize
          </button>
          <button className="btn-ghost !py-1.5" onClick={restart}>
            Restart
          </button>
        </div>
        <p className="text-xs text-slate-500">
          You are learning with an AI tutor, not a human.
        </p>
        <Chat
          msgs={msgs.filter((m) => !m.hidden)}
          busy={busy}
          error={err}
          onSend={send}
          onRetry={() => turn(sid, msgs)}
          placeholder="Type your answer…"
        />
      </div>
    );
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">AI Tutor</h1>
        <p className="text-sm text-slate-500">
          A guided, one-question-at-a-time lesson powered by AI. This is not a
          live human tutor.
        </p>
      </div>
      {summary && (
        <section className="card" role="status">
          <h2 className="font-semibold">Session summary</h2>
          <p className="mt-1 whitespace-pre-wrap text-sm">{summary}</p>
          <div className="mt-2 flex gap-2">
            <Link className="btn-ghost" to="/app/quiz">
              Practice this topic
            </Link>
            <Link className="btn-ghost" to="/app/flashcards">
              Flashcards
            </Link>
          </div>
        </section>
      )}
      <section className="card space-y-3" aria-label="Start a lesson">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="tp">
              Topic
            </label>
            <select
              id="tp"
              className="input"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            >
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="df">
              Difficulty
            </label>
            <select
              id="df"
              className="input"
              value={diff}
              onChange={(e) => setDiff(e.target.value)}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="gl">
            Learning goal
          </label>
          <select
            id="gl"
            className="input"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          >
            <option>understand the basics</option>
            <option>prepare for exam-style questions</option>
            <option>review and fill gaps</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={beg}
            onChange={(e) => setBeg(e.target.checked)}
          />
          Teach me from the beginning (complete beginner)
        </label>
        {err && (
          <p role="alert" className="text-sm text-red-600">
            ⚠ {err}
          </p>
        )}
        <button className="btn-primary" onClick={begin}>
          Start lesson
        </button>
      </section>
      <section aria-label="Past sessions">
        <h2 className="mb-2 font-semibold">Past sessions</h2>
        {past.length ? (
          <ul className="space-y-2 text-sm">
            {past.map((p) => (
              <li key={p.id} className="card !p-3">
                <p className="font-medium">
                  {name(p.topic_id)} · {p.status} ·{" "}
                  {new Date(p.started_at).toLocaleDateString()}
                </p>
                {p.summary && (
                  <details>
                    <summary className="cursor-pointer">Summary</summary>
                    <p className="mt-1 whitespace-pre-wrap">{p.summary}</p>
                  </details>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No sessions yet.</p>
        )}
      </section>
    </div>
  );
}
