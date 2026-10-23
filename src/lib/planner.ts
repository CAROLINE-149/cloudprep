export interface PlanTopic {
  id: string;
  title: string;
  objectives: string[];
  conf: number;
}
export interface PlanInput {
  start: Date;
  exam: Date;
  dailyMin: number;
  days: number[];
  topics: PlanTopic[];
}
export interface Draft {
  topic_id: string | null;
  title: string;
  objective: string;
  activity: string;
  starts_at: string;
  duration_min: number;
}
const ACT = [
  "Read the Microsoft Learn module and make notes",
  "Review with flashcards",
  "Take a short quiz on this topic",
  "Explain it in your own words, then fix gaps",
];
export function generatePlan(i: PlanInput): {
  sessions: Draft[];
  warnings: string[];
} {
  const warnings: string[] = [],
    daily = Math.max(10, i.dailyMin),
    out: Draft[] = [];
  const dates: Date[] = [];
  const d = new Date(i.start);
  d.setHours(0, 0, 0, 0);
  const end = new Date(i.exam);
  end.setHours(0, 0, 0, 0);
  for (; d < end; d.setDate(d.getDate() + 1))
    if (i.days.includes(d.getDay())) dates.push(new Date(d));
  if (!dates.length)
    return {
      sessions: [],
      warnings: [
        "No study days fit before your exam date. Pick a later date or more study days.",
      ],
    };
  const pr =
    dates.length >= 4
      ? Math.max(1, Math.min(3, Math.floor(dates.length * 0.2)))
      : 0;
  const learn = dates.slice(0, dates.length - pr),
    practice = dates.slice(dates.length - pr);
  if (!learn.length)
    return {
      sessions: [],
      warnings: ["Too little time before the exam to plan learning sessions."],
    };
  const need = i.topics.map(
    (t) => Math.max(1, t.objectives.length) * 12 * (1 + (5 - t.conf) * 0.15),
  );
  const cap = learn.length * daily,
    total = need.reduce((a, b) => a + b, 0),
    scale = Math.min(1, cap / total);
  if (scale < 1)
    warnings.push(
      `Time is tight: sessions were shortened to ${Math.round(scale * 100)}% of the ideal. Adding study days or daily minutes would help.`,
    );
  const left = need.map((n) => Math.max(15, Math.round((n * scale) / 5) * 5));
  const chunk = i.topics.map(() => 0);
  let ti = 0;
  const at = (day: Date, used: number) => {
    const x = new Date(day);
    x.setHours(18, 0, 0, 0);
    x.setMinutes(used);
    return x.toISOString();
  };
  for (const day of learn) {
    let used = 0;
    while (ti < i.topics.length && daily - used >= 10) {
      const t = i.topics[ti],
        m = Math.min(daily - used, left[ti]),
        k = chunk[ti]++;
      out.push({
        topic_id: t.id,
        title: `Study: ${t.title}`,
        objective:
          t.objectives[k % Math.max(1, t.objectives.length)] ?? t.title,
        activity: ACT[k % ACT.length],
        starts_at: at(day, used),
        duration_min: m,
      });
      used += m;
      left[ti] -= m;
      if (left[ti] <= 0) ti++;
    }
  }
  if (ti < i.topics.length)
    warnings.push(
      "Not every topic fit in the available days. Regenerate with more study time.",
    );
  practice.forEach((day, k) =>
    out.push({
      topic_id: null,
      title:
        k === practice.length - 1
          ? "Final revision and practice test"
          : "Practice test and review",
      objective: "Test yourself across all skill areas and review weak topics",
      activity: "Take a timed practice test, then review every wrong answer",
      starts_at: at(day, 0),
      duration_min: Math.max(30, daily),
    }),
  );
  return { sessions: out, warnings };
}
