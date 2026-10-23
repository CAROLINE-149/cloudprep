import { supabase } from "./supabase";
export const AREA_LABEL: Record<string, string> = {
  cloud_concepts: "Cloud concepts",
  architecture_services: "Architecture & services",
  management_governance: "Management & governance",
};
export const localDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export interface Topic {
  id: string;
  title: string;
  skill_area: string;
}
export interface Session {
  id: string;
  title: string;
  starts_at: string;
  duration_min: number;
  status: string;
  completed_at: string | null;
  actual_min: number | null;
  topic_id: string | null;
}
export async function loadDashboard(uid: string) {
  const [t, ts, ss, at, aa, nt, fc] = await Promise.all([
    supabase.from("topics").select("id,title,skill_area").order("sort_order"),
    supabase.from("topic_status").select("topic_id,state,confidence"),
    supabase
      .from("study_sessions")
      .select(
        "id,title,starts_at,duration_min,status,completed_at,actual_min,topic_id",
      )
      .order("starts_at")
      .limit(1000),
    supabase
      .from("attempts")
      .select("score_pct,submitted_at")
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: false })
      .limit(20),
    supabase
      .from("attempt_answers")
      .select("is_correct, questions(topic_id)")
      .limit(2000),
    supabase
      .from("notes")
      .select("id,title,updated_at")
      .order("updated_at", { ascending: false })
      .limit(3),
    supabase
      .from("flashcards")
      .select("id,front,created_at")
      .eq("owner_id", uid)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);
  const bad = [t, ts, ss, at, aa, nt, fc].find((r) => r.error);
  if (bad?.error) throw bad.error;
  return {
    topics: (t.data ?? []) as Topic[],
    status: (ts.data ?? []) as {
      topic_id: string;
      state: string;
      confidence: number | null;
    }[],
    sessions: (ss.data ?? []) as Session[],
    attempts: (at.data ?? []) as { score_pct: number | null }[],
    answers: (aa.data ?? []) as unknown as {
      is_correct: boolean | null;
      questions: { topic_id: string } | null;
    }[],
    notes: (nt.data ?? []) as {
      id: string;
      title: string;
      updated_at: string;
    }[],
    cards: (fc.data ?? []) as { id: string; front: string }[],
  };
}
export type DashData = Awaited<ReturnType<typeof loadDashboard>>;
export function streakDays(days: Set<string>) {
  const d = new Date();
  if (!days.has(localDay(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(localDay(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
export function weakTopics(data: DashData, min = 3) {
  const m = new Map<string, { c: number; n: number }>();
  for (const a of data.answers) {
    const id = a.questions?.topic_id;
    if (!id || a.is_correct == null) continue;
    const x = m.get(id) ?? { c: 0, n: 0 };
    x.n++;
    if (a.is_correct) x.c++;
    m.set(id, x);
  }
  return [...m]
    .filter(([, v]) => v.n >= min)
    .map(([id, v]) => ({
      topic: data.topics.find((t) => t.id === id),
      pct: Math.round((100 * v.c) / v.n),
      n: v.n,
    }))
    .filter((w) => w.topic && w.pct < 70)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 3);
}
