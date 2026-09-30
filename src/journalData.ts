import { localDateKey } from './dates';

export interface DayEntries {
  date: string;
  morning?: string;
  evening?: string;
}

const DAY_TAG = /#journal\/(\d{4}-\d{2}-\d{2})(?=\s|$)/;

/** Fetch journal notes in the last `days` days and group AM/PM by the per-day tag. */
export async function fetchJournalDays(days: number): Promise<DayEntries[]> {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);

  const size = 100;
  const notes: any[] = [];
  for (let page = 1; page <= 10; page++) {
    // notes.list has no tag-name filter, so text-search the tag prefix and filter precisely below.
    // startDate/endDate are only applied when both are supplied.
    const batch: any[] = await window.Blinko.api.notes.list.mutate({
      searchText: '#journal/',
      startDate: start,
      endDate: end,
      page,
      size,
      orderBy: 'asc',
      type: -1,
    });
    notes.push(...batch);
    if (batch.length < size) break;
  }

  const byDay = new Map<string, DayEntries>();
  for (const n of notes) {
    const content: string = n.content ?? '';
    const isMorning = /#journal\/morning(?=\s|$)/.test(content);
    const isEvening = /#journal\/evening(?=\s|$)/.test(content);
    if (!isMorning && !isEvening) continue;
    const date = content.match(DAY_TAG)?.[1] ?? localDateKey(new Date(n.createdAt));
    const day = byDay.get(date) ?? { date };
    // Keep the latest entry if several were written for one slot.
    if (isMorning) day.morning = content;
    if (isEvening) day.evening = content;
    byDay.set(date, day);
  }
  return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
}

const stripTags = (s: string) => s.replace(/#journal\/\S+/g, '').trim();

export const SYSTEM_PROMPT = `You are a warm but honest accountability coach analysing a person's structured journal (Clever Fox style: morning intentions, evening reflections, weekly top-3 goals).
Be specific, quote short phrases from the entries, and never invent facts. If data is thin, say so.
Respond in Markdown with exactly these sections:
## Snapshot
2-3 sentences on the overall period.
## Mood & Energy Patterns
Recurring emotional themes and how they shift across days/weekdays.
## Recurring Blockers & Time Sinks
Patterns in "what actually absorbed my time" and any repeated obstacles.
## Goal Progress
For each weekly goal mentioned, whether the entries show real movement.
## Intention vs. Reality
Day by day, compare the morning Daily Focus with the evening wins/time-sink/reflection. Flag discrepancies explicitly (e.g. "Mon: planned X, day was absorbed by Y"). Note days missing a morning or evening entry.
## Suggestions
3 concrete, kind, small experiments for the next week.`;

export function buildQuestion(days: DayEntries[], rangeDays: number): string {
  const body = days
    .map(d => [
      `### ${d.date}`,
      '**MORNING**',
      d.morning ? stripTags(d.morning) : '_(no morning entry)_',
      '**EVENING**',
      d.evening ? stripTags(d.evening) : '_(no evening entry)_',
    ].join('\n'))
    .join('\n\n---\n\n');
  return `Analyse my journal entries from the last ${rangeDays} days (${days.length} days with entries).\n\n${body}`;
}
