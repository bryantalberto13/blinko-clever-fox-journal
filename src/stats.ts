import { DayEntries } from './journalData';
import { parseGoalChecks, parseMood } from './entry';
import { localDateKey } from './dates';

/** Consecutive days with any entry, counting back from today (or yesterday if today isn't done yet). */
export function streak(days: DayEntries[], today = new Date()): number {
  const have = new Set(days.map(d => d.date));
  const d = new Date(today);
  if (!have.has(localDateKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (have.has(localDateKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

export interface MoodPoint {
  date: string;
  mood: number | null;
  energy: number | null;
  morningMood: string | null;
  eveningMood: string | null;
}

const avg = (xs: (number | null)[]): number | null => {
  const v = xs.filter((x): x is number => x != null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

/** Per-day mood/energy, averaging morning and evening ratings when both exist. */
export function moodSeries(days: DayEntries[]): MoodPoint[] {
  return days.map(d => {
    const m = d.morning ? parseMood(d.morning.content) : null;
    const e = d.evening ? parseMood(d.evening.content) : null;
    return {
      date: d.date,
      mood: avg([m?.moodScore ?? null, e?.moodScore ?? null]),
      energy: avg([m?.energyScore ?? null, e?.energyScore ?? null]),
      morningMood: m?.mood ?? null,
      eveningMood: e?.mood ?? null,
    };
  });
}

export interface GoalStat { goal: string; done: number; total: number }

export function goalStats(days: DayEntries[]): GoalStat[] {
  const map = new Map<string, GoalStat>();
  for (const d of days) {
    if (!d.evening) continue;
    for (const c of parseGoalChecks(d.evening.content)) {
      const s = map.get(c.goal) ?? { goal: c.goal, done: 0, total: 0 };
      s.total++;
      if (c.done) s.done++;
      map.set(c.goal, s);
    }
  }
  return [...map.values()];
}

export const mean = avg;
