import { localDateKey } from './dates';

export type Mode = 'morning' | 'evening';

export interface EntryFields {
  // morning
  dailyFocus: string;
  gratitude: string;
  selfCompassion: string;
  // evening
  eveningWins: string;
  timeAbsorbedBy: string;
  reflection: string;
  goalChecks: boolean[]; // evening: did today move goal i forward
  // both
  mood: number | null; // 1-5
  energy: number | null; // 1-5
}

export const emptyFields = (): EntryFields => ({
  dailyFocus: '', gratitude: '', selfCompassion: '',
  eveningWins: '', timeAbsorbedBy: '', reflection: '',
  goalChecks: [false, false, false],
  mood: null, energy: null,
});

export const NONE = '_(none recorded)_';
const CHECK_ON = '✅ progressed';
const CHECK_OFF = '⬜ not today';

export function todayLabel(d = new Date()): string {
  return d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function moodLine(f: EntryFields): string | null {
  if (f.mood == null && f.energy == null) return null;
  return `**Mood:** ${f.mood ?? '-'}/5 | **Energy:** ${f.energy ?? '-'}/5`;
}

export function buildEntry(mode: Mode, f: EntryFields, goals: string[], date = new Date()): string {
  const lines: string[] = [];
  const activeGoals = goals.map((g, i) => ({ g: g.trim(), i })).filter(x => x.g);
  const section = (title: string, body: string) => lines.push(`**${title}**`, body.trim() || NONE, '');

  if (mode === 'morning') {
    lines.push(`## 🦊 Morning Journal — ${todayLabel(date)}`, '');
    if (activeGoals.length) {
      lines.push("**This Week's Top 3 Goals**");
      activeGoals.forEach((x, n) => lines.push(`${n + 1}. ${x.g}`));
      lines.push('');
    }
    section('Daily Focus', f.dailyFocus);
    section('Gratitude', f.gratitude);
    section('Self-Compassion Intention', f.selfCompassion);
  } else {
    lines.push(`## 🦊 Evening Journal — ${todayLabel(date)}`, '');
    if (activeGoals.length) {
      lines.push('**Goal Check**');
      activeGoals.forEach((x, n) => lines.push(`${n + 1}. ${x.g} — ${f.goalChecks[x.i] ? CHECK_ON : CHECK_OFF}`));
      lines.push('');
    }
    section('Evening Wins', f.eveningWins);
    section('What Actually Absorbed My Time Today', f.timeAbsorbedBy);
    section("Reflection / Tomorrow's Focus", f.reflection);
  }
  const ml = moodLine(f);
  if (ml) lines.push(ml, '');
  lines.push(`#journal/${mode} #journal/${localDateKey(date)}`);
  return lines.join('\n');
}

/** Text under a **Heading** line up to the next bold heading / mood line / tag line. */
export function getSection(content: string, heading: string): string {
  const lines = content.split('\n');
  const start = lines.findIndex(l => l.trim() === `**${heading}**`);
  if (start < 0) return '';
  const out: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i];
    if (/^\*\*.+\*\*/.test(l.trim()) || /^#journal\//.test(l.trim())) break;
    out.push(l);
  }
  const text = out.join('\n').trim();
  return text === NONE ? '' : text;
}

export interface ParsedGoalCheck { goal: string; done: boolean }

export function parseGoalChecks(content: string): ParsedGoalCheck[] {
  return getSection(content, 'Goal Check')
    .split('\n')
    .map(l => l.match(/^\d+\.\s+(.*?)\s+—\s+(✅|⬜)/))
    .filter((m): m is RegExpMatchArray => !!m)
    .map(m => ({ goal: m[1], done: m[2] === '✅' }));
}

export function parseMood(content: string): { mood: number | null; energy: number | null } {
  const m = content.match(/\*\*Mood:\*\*\s*(\d)\/5/);
  const e = content.match(/\*\*Energy:\*\*\s*(\d)\/5/);
  return { mood: m ? Number(m[1]) : null, energy: e ? Number(e[1]) : null };
}

/** Rebuild form state from a saved entry so it can be edited. Goals come from plugin config, matched by text. */
export function parseEntry(mode: Mode, content: string, goals: string[]): EntryFields {
  const f = emptyFields();
  const { mood, energy } = parseMood(content);
  f.mood = mood;
  f.energy = energy;
  if (mode === 'morning') {
    f.dailyFocus = getSection(content, 'Daily Focus');
    f.gratitude = getSection(content, 'Gratitude');
    f.selfCompassion = getSection(content, 'Self-Compassion Intention');
  } else {
    f.eveningWins = getSection(content, 'Evening Wins');
    f.timeAbsorbedBy = getSection(content, 'What Actually Absorbed My Time Today');
    f.reflection = getSection(content, "Reflection / Tomorrow's Focus");
    const checks = parseGoalChecks(content);
    f.goalChecks = goals.map(g => checks.find(c => c.goal === g.trim())?.done ?? false);
    while (f.goalChecks.length < 3) f.goalChecks.push(false);
  }
  return f;
}
