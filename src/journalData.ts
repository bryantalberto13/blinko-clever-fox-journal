import { localDateKey } from './dates';
import { GoalStat } from './stats';

export interface SavedEntry { id: number; content: string }

export interface DayEntries {
  date: string;
  morning?: SavedEntry;
  evening?: SavedEntry;
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
    if (isMorning) day.morning = { id: n.id, content };
    if (isEvening) day.evening = { id: n.id, content };
    byDay.set(date, day);
  }
  return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Today's morning/evening notes (if any), for pre-fill and edit-in-place. */
export async function fetchToday(): Promise<DayEntries | undefined> {
  const today = localDateKey();
  return (await fetchJournalDays(1)).find(d => d.date === today);
}

const stripTags = (s: string) => s.replace(/#journal\/\S+/g, '').trim();

export const SYSTEM_PROMPT = `You are a warm but honest accountability coach analysing a person's structured journal (Clever Fox style: morning intentions, evening reflections, weekly top-3 goals).
Be specific, quote short phrases from the entries, and never invent facts. If data is thin, say so.
Entries may include Mood and Energy descriptors (e.g. "😊 Content", "🪫 Low"; older entries may use N/5 ratings) and evening Goal Check lines (✅ = the goal moved forward that day).
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
      d.morning ? stripTags(d.morning.content) : '_(no morning entry)_',
      '**EVENING**',
      d.evening ? stripTags(d.evening.content) : '_(no evening entry)_',
    ].join('\n'))
    .join('\n\n---\n\n');
  return `Analyse my journal entries from the last ${rangeDays} days (${days.length} days with entries).\n\n${body}`;
}

export const REVIEW_PROMPT = `You are a warm but honest coach running a weekly review of a person's structured journal (morning intentions, evening reflections, weekly top-3 goals with daily goal checks, mood and energy descriptors such as "😰 Anxious" or "🪫 Low").
Be specific, quote short phrases, never invent facts, and say so when data is thin.
Respond in Markdown with exactly these sections:
## Week in Brief
2-3 sentences.
## Goal Completion
For each goal: how many days it moved forward (use the provided goal stats) and what the entries say about why.
## Wins
The most meaningful wins, grouped by theme.
## Where the Time Went
What actually absorbed the week versus what was planned in the morning entries.
## Mood & Energy
Patterns and what seemed to move them up or down.
## Suggested Goals for Next Week
Exactly 3 numbered goals (one line each, no sub-bullets, no extra commentary in that section), carrying over unfinished goals when still important and choosing realistic scope based on this week's evidence.`;

export function buildReviewQuestion(days: DayEntries[], stats: GoalStat[], avgMood: number | null, avgEnergy: number | null): string {
  const head = [
    `Weekly review over the last 7 days (${days.length} days with entries).`,
    stats.length ? 'Goal stats (days moved forward / days checked):\n' + stats.map(g => `- ${g.goal}: ${g.done}/${g.total}`).join('\n') : 'No goal checks were recorded.',
    `Average mood score: ${avgMood?.toFixed(1) ?? 'n/a'}, average energy score: ${avgEnergy?.toFixed(1) ?? 'n/a'} (1 = lowest, 5 = highest).`,
  ].join('\n\n');
  return `${head}\n\n${buildQuestion(days, 7).split('\n\n').slice(1).join('\n\n')}`;
}

/** Pull the 3 numbered goals out of the review's "Suggested Goals for Next Week" section. */
export function parseSuggestedGoals(md: string): string[] {
  const m = md.match(/##\s*Suggested Goals for Next Week\s*\n([\s\S]*?)(?=\n##\s|$)/i);
  if (!m) return [];
  return m[1].split('\n')
    .map(l => l.match(/^\s*\d+[.)]\s+(.*\S)/)?.[1]?.replace(/\*\*/g, '').trim())
    .filter((x): x is string => !!x)
    .slice(0, 3);
}

export interface TaggedNote { id: number; content: string; createdAt: string | Date }

/** Recent notes carrying an exact #journal/<tag> tag (newest first). notes.list has no tag filter, so text-search then verify. */
export async function fetchTagged(tag: string, pages = 3): Promise<TaggedNote[]> {
  const re = new RegExp(`#journal/${tag}(?=\\s|$)`);
  const size = 50;
  const out: TaggedNote[] = [];
  for (let page = 1; page <= pages; page++) {
    const batch: any[] = await window.Blinko.api.notes.list.mutate({
      searchText: `#journal/${tag}`, page, size, orderBy: 'desc', type: -1,
    });
    out.push(...batch.filter(n => re.test(n.content ?? '')).map(n => ({ id: n.id, content: n.content, createdAt: n.createdAt })));
    if (batch.length < size) break;
  }
  return out;
}
