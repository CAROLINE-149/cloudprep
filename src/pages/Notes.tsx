import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pin, Plus, Trash2, Upload, ArrowLeft, Sparkles } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
interface Note {
  id: string;
  title: string;
  body_md: string;
  topic_id: string | null;
  pinned: boolean;
  updated_at: string;
}
const MAX = 1_000_000,
  OK = ["text/plain", "text/markdown", ""];
export default function Notes() {
  const { session } = useAuth();
  const uid = session!.user.id;
  const nav = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [topics, setTopics] = useState<{ id: string; title: string }[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [tf, setTf] = useState("");
  const [err, setErr] = useState("");
  const [save, setSave] = useState<"saved" | "saving" | "error">("saved");
  const [state, setState] = useState("");
  const [ready, setReady] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<number>();
  const load = useCallback(async () => {
    const [n, t] = await Promise.all([
      supabase
        .from("notes")
        .select("id,title,body_md,topic_id,pinned,updated_at")
        .order("pinned", { ascending: false })
        .order("updated_at", { ascending: false })
        .limit(500),
      supabase.from("topics").select("id,title").order("sort_order"),
    ]);
    if (n.error) {
      setErr("Could not load notes.");
      return;
    }
    setErr("");
    setNotes((n.data ?? []) as Note[]);
    setTopics(t.data ?? []);
    setReady(true);
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const cur = notes.find((n) => n.id === sel);
  useEffect(() => {
    setState("");
    if (!cur?.topic_id) return;
    supabase
      .from("topic_status")
      .select("state")
      .eq("topic_id", cur.topic_id)
      .maybeSingle()
      .then(({ data }) => setState(data?.state ?? ""));
  }, [sel, cur?.topic_id]);
  const edit = (p: Partial<Note>) => {
    if (!cur) return;
    setNotes((ns) => ns.map((n) => (n.id === cur.id ? { ...n, ...p } : n)));
    setSave("saving");
    clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      const r = await supabase.from("notes").update(p).eq("id", cur.id);
      setSave(r.error ? "error" : "saved");
    }, 800);
  };
  const create = async (title = "Untitled", body = "") => {
    const r = await supabase
      .from("notes")
      .insert({ title, body_md: body, topic_id: tf || null })
      .select("id,title,body_md,topic_id,pinned,updated_at")
      .single();
    if (r.error) return setErr("Could not create the note.");
    setNotes((n) => [r.data as Note, ...n]);
    setSel(r.data.id);
  };
  const remove = async () => {
    if (!cur || !confirm("Delete this note?")) return;
    const r = await supabase.from("notes").delete().eq("id", cur.id);
    if (r.error) return setErr("Could not delete.");
    setNotes((n) => n.filter((x) => x.id !== cur.id));
    setSel(null);
  };
  const pin = async () => {
    if (!cur) return;
    const v = !cur.pinned;
    setNotes((ns) =>
      ns.map((n) => (n.id === cur.id ? { ...n, pinned: v } : n)),
    );
    await supabase.from("notes").update({ pinned: v }).eq("id", cur.id);
  };
  const mark = async (s: string) => {
    if (!cur?.topic_id) return;
    const r = await supabase
      .from("topic_status")
      .upsert({ user_id: uid, topic_id: cur.topic_id, state: s });
    if (r.error) return setErr("Could not update topic status.");
    setState(s);
  };
  const upload = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setErr("");
    if (!/\.(txt|md)$/i.test(f.name) || !OK.includes(f.type))
      return setErr(
        "Only .txt and .md files are supported for now (PDF support needs server-side extraction).",
      );
    if (f.size > MAX)
      return setErr("That file is over 1 MB. Please use a smaller file.");
    try {
      const text = await f.text();
      if (!text.trim()) return setErr("That file is empty.");
      await create(f.name.replace(/\.\w+$/, ""), text);
    } catch {
      setErr("Could not read that file.");
    }
  };
  const flash = () => {
    const ta = taRef.current;
    const s =
      ta && ta.selectionStart !== ta.selectionEnd
        ? ta.value.slice(ta.selectionStart, ta.selectionEnd)
        : "";
    nav("/app/flashcards", {
      state: {
        front: cur!.title,
        back: s,
        note_id: cur!.id,
        topic_id: cur!.topic_id,
      },
    });
  };
  const list = notes.filter(
    (n) =>
      (!tf || n.topic_id === tf) &&
      (!q ||
        (n.title + " " + n.body_md).toLowerCase().includes(q.toLowerCase())),
  );
  if (!ready && !err) return <p role="status">Loading…</p>;
  return (
    <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-[18rem_1fr]">
      <section
        className={`space-y-3 ${sel ? "hidden md:block" : ""}`}
        aria-label="Notes list"
      >
        <div className="flex items-center gap-2">
          <h1 className="mr-auto text-2xl font-bold">Notes</h1>
          <label
            className="btn-ghost !p-2 cursor-pointer"
            title="Upload .txt or .md"
          >
            <Upload size={18} />
            <span className="sr-only">Upload a text file</span>
            <input
              type="file"
              accept=".txt,.md,text/plain,text/markdown"
              className="sr-only"
              onChange={upload}
            />
          </label>
          <button
            className="btn-primary !p-2"
            aria-label="New note"
            onClick={() => create()}
          >
            <Plus size={18} />
          </button>
        </div>
        <input
          className="input"
          type="search"
          aria-label="Search notes"
          placeholder="Search notes…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="input"
          aria-label="Filter by topic"
          value={tf}
          onChange={(e) => setTf(e.target.value)}
        >
          <option value="">All topics</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
        {err && (
          <p role="alert" className="text-sm text-red-600">
            ⚠ {err}
          </p>
        )}
        {list.length ? (
          <ul className="space-y-1">
            {list.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => setSel(n.id)}
                  className={`w-full rounded-xl p-2 text-left text-sm ${n.id === sel ? "bg-electric/15" : "hover:bg-slate-100 dark:hover:bg-white/10"}`}
                >
                  <span className="font-medium">
                    {n.pinned && "📌 "}
                    {n.title || "Untitled"}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {n.body_md.slice(0, 60) || "Empty note"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="card text-sm text-slate-500">
            {notes.length
              ? "No notes match your search."
              : "No notes yet. Create one, or upload a text file, to start building your study notes."}
          </div>
        )}
      </section>
      <section
        className={sel ? "" : "hidden md:block"}
        aria-label="Note editor"
      >
        {cur ? (
          <div className="card space-y-3">
            <div className="flex items-center gap-2">
              <button
                className="btn-ghost !p-2 md:hidden"
                aria-label="Back to list"
                onClick={() => setSel(null)}
              >
                <ArrowLeft size={18} />
              </button>
              <input
                className="input font-semibold"
                aria-label="Note title"
                maxLength={150}
                value={cur.title}
                onChange={(e) => edit({ title: e.target.value })}
              />
              <button
                className="btn-ghost !p-2"
                aria-pressed={cur.pinned}
                aria-label={cur.pinned ? "Unpin note" : "Pin note"}
                onClick={pin}
              >
                <Pin size={18} className={cur.pinned ? "fill-current" : ""} />
              </button>
              <button
                className="btn-ghost !p-2"
                aria-label="Delete note"
                onClick={remove}
              >
                <Trash2 size={18} />
              </button>
            </div>
            <select
              className="input"
              aria-label="Topic"
              value={cur.topic_id ?? ""}
              onChange={(e) => edit({ topic_id: e.target.value || null })}
            >
              <option value="">No topic</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
            <textarea
              ref={taRef}
              className="input min-h-[40vh] font-mono"
              aria-label="Note body"
              placeholder="Write your notes here. Plain text is shown exactly as typed."
              value={cur.body_md}
              onChange={(e) => edit({ body_md: e.target.value })}
            />
            <p role="status" className="text-xs text-slate-500">
              {save === "saving"
                ? "Saving…"
                : save === "error"
                  ? "⚠ Not saved. Check your connection and keep editing to retry."
                  : "✓ All changes saved"}
            </p>
            {cur.topic_id && (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span>Topic status:</span>
                {[
                  ["understood", "✓ Understood"],
                  ["needs_revision", "↻ Needs revision"],
                ].map(([v, l]) => (
                  <button
                    key={v}
                    aria-pressed={state === v}
                    onClick={() => mark(v)}
                    className={`btn !py-1.5 ${state === v ? "bg-electric text-white" : "btn-ghost"}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-3 dark:border-white/10">
              <button className="btn-ghost" onClick={flash}>
                Create flashcard (select text first)
              </button>
              <button className="btn-ghost" onClick={() => nav("/app/plan")}>
                Add to study plan
              </button>
              <button
                className="btn-ghost"
                onClick={() =>
                  nav("/app/buddy", {
                    state: {
                      prompt: `Explain these study notes in simple terms, correct any mistakes, and tell me what I may be missing:\n\n${cur!.title}\n${cur!.body_md.slice(0, 3000)}`,
                    },
                  })
                }
              >
                <Sparkles size={14} />
                Explain with AI
              </button>
            </div>
          </div>
        ) : (
          <div className="card hidden text-sm text-slate-500 md:block">
            Select a note, or create a new one.
          </div>
        )}
      </section>
    </div>
  );
}
