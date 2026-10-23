export type Rating = "know" | "almost" | "practice";
export interface Sched {
  ease: number;
  interval_days: number;
  reps: number;
  lapses: number;
}
export const NEW_SCHED: Sched = {
  ease: 2.5,
  interval_days: 0,
  reps: 0,
  lapses: 0,
};
/** SM-2 variant. Ratings map to quality 5 / 3 / 1. Missed cards return in 10 minutes and count as lapses. */
export function nextSchedule(s: Sched, r: Rating, now = new Date()) {
  const q = r === "know" ? 5 : r === "almost" ? 3 : 1;
  const ease = Math.max(
    1.3,
    s.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)),
  );
  if (q < 3)
    return {
      ease,
      interval_days: 0,
      reps: 0,
      lapses: s.lapses + 1,
      due_at: new Date(+now + 10 * 6e4).toISOString(),
    };
  const reps = s.reps + 1;
  const interval_days =
    reps === 1
      ? 1
      : reps === 2
        ? q === 3
          ? 3
          : 6
        : Math.max(1, Math.round(s.interval_days * ease));
  return {
    ease,
    interval_days,
    reps,
    lapses: s.lapses,
    due_at: new Date(+now + interval_days * 864e5).toISOString(),
  };
}
