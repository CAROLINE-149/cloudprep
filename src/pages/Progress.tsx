import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "../lib/supabase";
import { AREA_LABEL, localDay, streakDays } from "../lib/dashboard";
import { readiness } from "../lib/readiness";
export default function Progress() {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState("");
  const load = () => {
    setErr("");
    Promise.all([
      supabase
        .from("attempts")
        .select("kind,score_pct,submitted_at")
        .not("submitted_at", "is", null)
        .order("submitted_at")
        .limit(500),
      supabase
        .from("attempt_answers")
        .select(
          "question_id,is_correct,questions(stem,topic_id,topics(title,skill_area))",
        )
        .limit(5000),
      supabase
        .from("study_sessions")
        .select("completed_at,actual_min,duration_min")
        .eq("status", "completed")
        .limit(2000),
      supabase.from("card_schedule").select("interval_days").limit(3000),
      supabase.from("flashcards").select("id", { count: "exact", head: true }),
    ])
      .then((r) => {
        const bad = r.find((x) => x.error);
        if (bad) {
          setErr("Could not load your progress.");
          return;
        }
        setD({
          att: r[0].data,
          ans: r[1].data,
          ses: r[2].data,
          sch: r[3].data,
          cards: r[4].count ?? 0,
        });
      })
      .catch(() => setErr("Could not load your progress."));
  };
  useEffect(load, []);
  const m = useMemo(() => {
    if (!d) return null;
    const area: Record<string, { c: number; n: number }> = {},
      topic = new Map<string, { t: string; c: number; n: number }>(),
      miss = new Map<string, { s: string; bad: number }>(),
      distinct = new Set<string>();
    for (const a of d.ans) {
      const t = a.questions?.topics;
      if (!t || a.is_correct == null) continue;
      distinct.add(a.question_id);
      const A = (area[t.skill_area] ??= { c: 0, n: 0 });
      A.n++;
      if (a.is_correct) A.c++;
      const T = topic.get(a.questions.topic_id) ?? { t: t.title, c: 0, n: 0 };
      T.n++;
      if (a.is_correct) T.c++;
      topic.set(a.questions.topic_id, T);
      if (!a.is_correct) {
        const x = miss.get(a.question_id) ?? { s: a.questions.stem, bad: 0 };
        x.bad++;
        miss.set(a.question_id, x);
      }
    }
    const tests = d.att
      .filter((x: any) => x.kind === "practice_test")
      .map((x: any) => ({
        date: new Date(x.submitted_at).toLocaleDateString(),
        score: x.score_pct,
      }));
    const days = new Set<string>();
    d.ses.forEach(
      (s: any) =>
        s.completed_at && days.add(localDay(new Date(s.completed_at))),
    );
    d.att.forEach((a: any) => days.add(localDay(new Date(a.submitted_at))));
    let act = 0;
    for (let k = 0; k < 14; k++) {
      const x = new Date();
      x.setDate(x.getDate() - k);
      if (days.has(localDay(x))) act++;
    }
    const tot = d.ses.reduce(
        (a: number, s: any) => a + (s.actual_min ?? s.duration_min),
        0,
      ),
      n = d.ans.length,
      c = d.ans.filter((a: any) => a.is_correct).length;
    const r = readiness({
      tests: [...tests].reverse().map((t: any) => t.score),
      area,
      distinct: distinct.size,
      activeDays14: act,
    });
    return {
      area,
      topics: [...topic]
        .map(([, v]) => ({ ...v, pct: Math.round((100 * v.c) / v.n) }))
        .sort((a, b) => a.pct - b.pct),
      miss: [...miss.values()].sort((a, b) => b.bad - a.bad).slice(0, 5),
      tests,
      tot,
      acc: n ? Math.round((100 * c) / n) : null,
      n,
      streak: streakDays(days),
      sessions: d.ses.length,
      mastered: d.sch.filter((s: any) => s.interval_days >= 21).length,
      reviewed: d.sch.length,
      cards: d.cards,
      r,
    };
  }, [d]);
  if (err)
    return (
      <div role="alert" className="card">
        {err}{" "}
        <button className="btn-ghost ml-2" onClick={load}>
          Retry
        </button>
      </div>
    );
  if (!m) return <p role="status">Loading…</p>;
  const areaData = Object.keys(AREA_LABEL).map((k) => ({
    name: AREA_LABEL[k],
    accuracy: m.area[k] ? Math.round((100 * m.area[k].c) / m.area[k].n) : 0,
    n: m.area[k]?.n ?? 0,
  }));
  const weak = m.topics.filter((t) => t.n >= 3 && t.pct < 70).slice(0, 3);
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <h1 className="text-2xl font-bold">Progress &amp; readiness</h1>
      <section className="card space-y-2" aria-label="Readiness estimate">
        <h2 className="font-semibold">Readiness estimate</h2>
        {m.r.ready ? (
          <>
            <p className="text-3xl font-bold">
              {m.r.score}%{" "}
              <span className="text-base font-medium text-slate-500">
                · {m.r.band}
              </span>
            </p>
            <p className="text-sm">
              Calculated as 50% your last 3 practice-test scores (
              {m.r.parts.test}%), 30% accuracy across all skill areas weighted
              by the published exam weightings ({m.r.parts.area}%), and 20%
              study consistency over the last 14 days ({m.r.parts.cons}%).
            </p>
          </>
        ) : (
          <>
            <p className="font-medium">Not enough data yet.</p>
            <ul className="list-disc pl-5 text-sm">
              {m.r.missing.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </>
        )}
        <p className="text-xs text-slate-500">
          This is an educational indicator based on your activity in this app.
          It is not an official Microsoft score and does not predict or
          guarantee an exam result.
        </p>
      </section>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          [
            "Practice accuracy",
            m.acc == null ? "No data yet" : `${m.acc}% (${m.n} answers)`,
          ],
          ["Study time", `${Math.floor(m.tot / 60)}h ${m.tot % 60}m`],
          ["Sessions completed", String(m.sessions)],
          ["Day streak", String(m.streak)],
          ["Flashcards reviewed", `${m.reviewed} / ${m.cards}`],
          ["Flashcards mastered", String(m.mastered)],
          ["Practice tests", String(m.tests.length)],
        ].map(([l, v]) => (
          <div key={l} className="card !p-3">
            <p className="text-lg font-bold">{v}</p>
            <p className="text-xs text-slate-500">{l}</p>
          </div>
        ))}
      </div>
      <section className="card" aria-label="Accuracy by skill area">
        <h2 className="font-semibold">Accuracy by skill area</h2>
        {m.n ? (
          <>
            <div className="h-56" aria-hidden>
              <ResponsiveContainer>
                <BarChart data={areaData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} unit="%" />
                  <Tooltip />
                  <Bar
                    dataKey="accuracy"
                    fill="#2f6bff"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-2 text-sm">
              {areaData.map((a) => (
                <li key={a.name}>
                  {a.name}:{" "}
                  {a.n ? `${a.accuracy}% (${a.n} answers)` : "no answers yet"}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            Answer some practice questions to see this chart.
          </p>
        )}
      </section>
      <section className="card" aria-label="Practice test history">
        <h2 className="font-semibold">Practice-test scores</h2>
        {m.tests.length ? (
          <>
            <div className="h-52" aria-hidden>
              <ResponsiveContainer>
                <LineChart data={m.tests}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} unit="%" />
                  <Tooltip />
                  <Line dataKey="score" stroke="#7c5cff" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-sm">
              Scores: {m.tests.map((t: any) => `${t.score}%`).join(", ")}
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            No practice tests yet.{" "}
            <Link className="text-electric underline" to="/app/practice">
              Take one
            </Link>
            .
          </p>
        )}
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="card">
          <h2 className="font-semibold">Accuracy by topic</h2>
          {m.topics.length ? (
            <ul className="mt-2 space-y-1 text-sm">
              {m.topics.map((t) => (
                <li key={t.t} className="flex justify-between">
                  <span>{t.t}</span>
                  <span>
                    {t.pct}% ({t.n})
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500">No data yet.</p>
          )}
        </section>
        <section className="card">
          <h2 className="font-semibold">Frequently missed</h2>
          {m.miss.length ? (
            <ul className="mt-2 space-y-2 text-sm">
              {m.miss.map((x) => (
                <li key={x.s}>
                  {x.s}{" "}
                  <span className="text-slate-500">(missed {x.bad}×)</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500">Nothing missed yet.</p>
          )}
        </section>
      </div>
      <section className="card">
        <h2 className="font-semibold">Recommended next</h2>
        {weak.length ? (
          <>
            <p className="text-sm">
              Focus on {weak.map((w) => w.t).join(", ")}. Then regenerate your
              study plan so these topics get more time.
            </p>
            <div className="mt-2 flex gap-2">
              <Link to="/app/quiz" className="btn-ghost">
                Practice missed questions
              </Link>
              <Link to="/app/plan" className="btn-ghost">
                Update study plan
              </Link>
            </div>
          </>
        ) : (
          <p className="text-sm">
            {m.n
              ? "No weak topics right now. Take a full practice test to check your coverage."
              : "Start with a quiz or a practice test to get personalized recommendations."}
          </p>
        )}
      </section>
    </div>
  );
}
