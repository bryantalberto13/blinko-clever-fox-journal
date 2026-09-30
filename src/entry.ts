import { localDateKey } from './dates';
import { MOODS, ENERGIES, findOption, optionText, parseOption } from './moods';

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
  mood: string | null; // key from MOODS
  energy: string | null; // key from ENERGIES
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
  const m = findOption(MOODS, f.mood);
  const e = findOption(ENERGIES, f.energy);
  if (!m && !e) return null;
  return `**Mood:** ${m ? optionText(m) : '-'} | **Energy:** ${e ? optionText(e) : '-'}`;
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

export interface ParsedMood {
  mood: string | null;
  energy: string | null;
  /** 1-5 valence for charts; also populated for legacy "4/5" entries. */
  moodScore: number | null;
  energyScore: number | null;
}

export function parseMood(content: string): ParsedMood {
  const m = content.match(/\*\*Mood:\*\*\s*([^|\n]*)/);
  const e = content.match(/\*\*Energy:\*\*\s*([^|\n]*)/);
  const pm = m ? parseOption(MOODS, m[1]) : { key: null, score: null };
  const pe = e ? parseOption(ENERGIES, e[1]) : { key: null, score: null };
  return { mood: pm.key, energy: pe.key, moodScore: pm.score, energyScore: pe.score };
}

/** Goal texts from a morning entry's "This Week's Top 3 Goals" list. */
export function parseGoalsList(content: string): string[] {
  return getSection(content, "This Week's Top 3 Goals")
    .split('\n')
    .map(l => l.match(/^\d+\.\s+(.*\S)/)?.[1])
    .filter((x): x is string => !!x);
}

/** Local date of an entry from its #journal/YYYY-MM-DD tag. */
export function entryDate(content: string): Date | null {
  const m = content.match(/#journal\/(\d{4})-(\d{2})-(\d{2})(?=\s|$)/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
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
