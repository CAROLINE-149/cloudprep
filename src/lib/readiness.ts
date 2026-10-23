export const AREA_MID: Record<string, number> = {
  cloud_concepts: 27.5,
  architecture_services: 37.5,
  management_governance: 32.5,
};
export interface RInput {
  tests: number[];
  area: Record<string, { c: number; n: number }>;
  distinct: number;
  activeDays14: number;
}
/** Educational indicator only. Needs >=2 practice tests, >=20 distinct questions, >=5 answers in every skill area. */
export function readiness(i: RInput) {
  const missing: string[] = [];
  if (i.tests.length < 2)
    missing.push(
      `Complete ${2 - i.tests.length} more practice test${i.tests.length === 1 ? "" : "s"}`,
    );
  if (i.distinct < 20)
    missing.push(`Answer ${20 - i.distinct} more different questions`);
  for (const [k, l] of [
    ["cloud_concepts", "Cloud concepts"],
    ["architecture_services", "Architecture & services"],
    ["management_governance", "Management & governance"],
  ] as const)
    if ((i.area[k]?.n ?? 0) < 5)
      missing.push(`Answer at least 5 questions in ${l}`);
  if (missing.length) return { ready: false as const, missing };
  const t = i.tests.slice(0, 3),
    test = t.reduce((a, b) => a + b, 0) / t.length;
  const w = Object.entries(AREA_MID),
    area =
      w.reduce((a, [k, m]) => a + m * (i.area[k].c / i.area[k].n) * 100, 0) /
      w.reduce((a, [, m]) => a + m, 0);
  const cons = Math.min(1, i.activeDays14 / 14) * 100,
    score = Math.round(0.5 * test + 0.3 * area + 0.2 * cons);
  return {
    ready: true as const,
    score,
    band:
      score >= 85
        ? "Strong"
        : score >= 70
          ? "Approaching"
          : score >= 50
            ? "Building"
            : "Early stages",
    parts: {
      test: Math.round(test),
      area: Math.round(area),
      cons: Math.round(cons),
    },
  };
}
