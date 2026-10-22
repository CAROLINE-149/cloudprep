import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Flame,
  Clock,
  Target,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import {
  DashData,
  loadDashboard,
  localDay,
  streakDays,
  weakTopics,
} from "../lib/dashboard";
function Ring({ pct }: { pct: number }) {
  const r = 40,
    c = 2 * Math.PI * r,
    p = Math.min(100, pct);
  return (
    <svg
      viewBox="0 0 100 100"
      className="h-24 w-24"
      role="img"
      aria-label={`${Math.round(p)} percent of daily goal`}
    >
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        strokeWidth="10"
        className="stroke-slate-200 dark:stroke-white/10"
      />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        strokeWidth="10"
        strokeLinecap="round"
        className="stroke-electric transition-all"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - p / 100)}
        transform="rotate(-90 50 50)"
      />
      <text
        x="50"
        y="55"
        textAnchor="middle"
        className="fill-current text-[18px] font-bold"
      >
        {Math.round(p)}%
      </text>
    </svg>
  );
}
const Stat = ({
  icon: I,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) => (
  <div className="card">
    <I size={18} className="text-violet2" aria-hidden />
    <p className="mt-2 text-2xl font-bold">{value}</p>
    <p className="text-xs text-slate-500">{label}</p>
  </div>
);
export default function Dashboard() {
  const { session, profile } = useAuth();
  const [d, setD] = useState<DashData | null>(null);
  const [err, setErr] = useState("");
  const load = useCallback(() => {
    setErr("");
    loadDashboard(session!.user.id)
      .then(setD)
      .catch(() => setErr("Could not load your dashboard."));
  }, [session]);
  useEffect(load, [load]);
  const m = useMemo(() => {
    if (!d) return null;
    const done = d.sessions.filter((s) => s.status === "completed"),
      today = localDay(new Date());
    const todayMin = done
      .filter(
        (s) => s.completed_at && localDay(new Date(s.completed_at)) === today,
      )
      .reduce((a, s) => a + (s.actual_min ?? s.duration_min), 0);
    const totalMin = done.reduce(
      (a, s) => a + (s.actual_min ?? s.duration_min),
      0,
    );
    const days = new Set(
      done
        .filter((s) => s.completed_at)
        .map((s) => localDay(new Date(s.completed_at!))),
    );
    const understood = d.status.filter((s) => s.state === "understood").length;
    const scores = d.attempts
      .map((a) => a.score_pct)
      .filter((x): x is number => x != null);
    const now = Date.now(),
      upcoming = d.sessions
        .filter(
          (s) =>
            s.status === "planned" &&
            new Date(s.starts_at).getTime() >= now - 36e5,
        )
        .slice(0, 4);
    const overdue = d.sessions.filter(
      (s) =>
        s.status === "planned" && new Date(s.starts_at).getTime() < now - 36e5,
    ).length;
    const weak = weakTopics(d);
    const lowConf = [...d.status]
      .filter((s) => s.confidence != null)
      .sort((a, b) => a.confidence! - b.confidence!)[0];
    const lowTopic = d.topics.find((t) => t.id === lowConf?.topic_id);
    return {
      todayMin,
      totalMin,
      streak: streakDays(days),
      understood,
      total: d.topics.length,
      avg: scores.length
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null,
      upcoming,
      overdue,
      weak,
      lowTopic,
      hasData: d.sessions.length + d.attempts.length + d.notes.length > 0,
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
  if (!d || !m || !profile) return <p role="status">Loading your dashboard…</p>;
  const goal = profile.daily_goal_min;
  const exam = profile.exam_date
    ? Math.ceil(
        (new Date(profile.exam_date + "T00:00:00").getTime() - Date.now()) /
          864e5,
      )
    : null;
  const next = m.upcoming[0];
  const rec = m.weak[0]
    ? {
        t: `Revise ${m.weak[0].topic!.title}`,
        s: `Your accuracy there is ${m.weak[0].pct}%.`,
        to: "/app/quiz",
      }
    : m.lowTopic
      ? {
          t: `Study ${m.lowTopic.title}`,
          s: "You rated your confidence lowest here.",
          to: "/app/flashcards",
        }
      : {
          t: "Set up your study plan",
          s: "A plan turns your exam date into daily sessions.",
          to: "/app/plan",
        };
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back
            {profile.display_name ? `, ${profile.display_name}` : ""}
          </h1>
          <p className="text-sm text-slate-500">
            {exam == null
              ? "No exam date set. Add one in Settings."
              : exam > 0
                ? `${exam} day${exam === 1 ? "" : "s"} until your exam`
                : exam === 0
                  ? "Your exam is today. Good luck!"
                  : "Your exam date has passed. Update it in Settings."}
          </p>
        </div>
        <Link to={next ? "/app/plan" : rec.to} className="btn-primary">
          {next ? `Continue: ${next.title}` : "Continue studying"}
          <ArrowRight size={16} />
        </Link>
      </div>
      {!m.hasData && (
        <div className="card border-electric/40">
          <h2 className="font-semibold">Get started</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
            <li>
              <Link className="text-electric underline" to="/app/plan">
                Generate your study plan
              </Link>
            </li>
            <li>
              <Link className="text-electric underline" to="/app/notes">
                Write your first note
              </Link>
            </li>
            <li>
              <Link className="text-electric underline" to="/app/quiz">
                Try a quiz
              </Link>
            </li>
          </ol>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Flame} label="Day streak" value={String(m.streak)} />
        <Stat
          icon={Clock}
          label="Total study time"
          value={`${Math.floor(m.totalMin / 60)}h ${m.totalMin % 60}m`}
        />
        <Stat
          icon={CheckCircle2}
          label="Topics understood"
          value={`${m.understood} / ${m.total}`}
        />
        <Stat
          icon={Target}
          label="Average quiz score"
          value={m.avg == null ? "No data yet" : `${m.avg}%`}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <section
          className="card flex items-center gap-4"
          aria-label="Daily goal"
        >
          <Ring pct={goal ? (100 * m.todayMin) / goal : 0} />
          <div>
            <h2 className="font-semibold">Daily goal</h2>
            <p className="text-sm text-slate-500">
              {m.todayMin} of {goal} min today
            </p>
          </div>
        </section>
        <section className="card md:col-span-2" aria-label="Recommended next">
          <h2 className="flex items-center gap-2 font-semibold">
            <Sparkles size={16} className="text-violet2" />
            Recommended next
          </h2>
          <p className="mt-2 font-medium">{rec.t}</p>
          <p className="text-sm text-slate-500">{rec.s}</p>
          <Link to={rec.to} className="btn-ghost mt-3">
            Start
          </Link>
        </section>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="card">
          <h2 className="font-semibold">Upcoming sessions</h2>
          {m.overdue > 0 && (
            <p className="mt-1 text-sm text-amber-600">
              ⚠ {m.overdue} overdue session{m.overdue > 1 ? "s" : ""}
            </p>
          )}
          {m.upcoming.length ? (
            <ul className="mt-2 space-y-2 text-sm">
              {m.upcoming.map((s) => (
                <li key={s.id} className="flex justify-between">
                  <span>{s.title}</span>
                  <span className="text-slate-500">
                    {new Date(s.starts_at).toLocaleString([], {
                      weekday: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {s.duration_min}m
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500">
              Nothing scheduled yet.
            </p>
          )}
        </section>
        <section className="card">
          <h2 className="font-semibold">Weakest topics</h2>
          {m.weak.length ? (
            <ul className="mt-2 space-y-2 text-sm">
              {m.weak.map((w) => (
                <li key={w.topic!.id} className="flex justify-between">
                  <span>{w.topic!.title}</span>
                  <span>
                    {w.pct}%{" "}
                    <span className="text-slate-500">({w.n} answers)</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500">
              Answer at least 3 questions in a topic to see where you need work.
            </p>
          )}
        </section>
        <section className="card">
          <h2 className="font-semibold">Recent notes</h2>
          {d.notes.length ? (
            <ul className="mt-2 space-y-1 text-sm">
              {d.notes.map((n) => (
                <li key={n.id}>{n.title}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500">No notes yet.</p>
          )}
        </section>
        <section className="card">
          <h2 className="font-semibold">Recent flashcards</h2>
          {d.cards.length ? (
            <ul className="mt-2 space-y-1 text-sm">
              {d.cards.map((c) => (
                <li key={c.id}>{c.front}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500">No flashcards yet.</p>
          )}
        </section>
      </div>
      <p className="text-xs text-slate-500">
        See your readiness estimate and charts under Progress & Readiness.
      </p>
    </div>
  );
}
