import { test, expect } from 'bun:test';
import { buildEntry, parseEntry, parseGoalChecks, parseMood, emptyFields, getSection } from './entry';
import { isoWeekKey, localDateKey } from './dates';

const goals = ['Ship v1', 'Run 3x', ''];
const d = new Date(2026, 8, 30, 23, 30); // late evening local

test('morning round-trips', () => {
  const f = { ...emptyFields(), dailyFocus: 'Deep work\nno email', gratitude: 'Coffee', mood: 'content', energy: 'low' };
  const text = buildEntry('morning', f, goals, d);
  expect(text).toContain('#journal/morning #journal/2026-09-30');
  const back = parseEntry('morning', text, goals);
  expect(back.dailyFocus).toBe('Deep work\nno email');
  expect(back.gratitude).toBe('Coffee');
  expect(back.selfCompassion).toBe('');
  expect(back.mood).toBe('content');
  expect(back.energy).toBe('low');
  expect(text).toContain('**Mood:** 😊 Content | **Energy:** 🪫 Low');
  expect(parseMood(text)).toMatchObject({ moodScore: 4, energyScore: 2 });
});

test('evening goal checks round-trip and skip empty goals', () => {
  const f = { ...emptyFields(), eveningWins: 'Shipped', goalChecks: [true, false, true], mood: 'joyful' };
  const text = buildEntry('evening', f, goals, d);
  expect(parseGoalChecks(text)).toEqual([{ goal: 'Ship v1', done: true }, { goal: 'Run 3x', done: false }]);
  const back = parseEntry('evening', text, goals);
  expect(back.goalChecks).toEqual([true, false, false]);
  expect(back.eveningWins).toBe('Shipped');
  expect(parseMood(text)).toEqual({ mood: 'joyful', energy: null, moodScore: 5, energyScore: null });
  expect(text).toContain('#journal/evening #journal/2026-09-30');
});

test('legacy v0.2 entries (no mood/goal check) still parse', () => {
  const legacy = '## 🦊 Morning Journal — x\n\n**Daily Focus**\nHello\n\n**Gratitude**\n_(none recorded)_\n\n#journal/morning #journal/2026-09-01';
  expect(getSection(legacy, 'Daily Focus')).toBe('Hello');
  expect(getSection(legacy, 'Gratitude')).toBe('');
  expect(parseMood(legacy)).toEqual({ mood: null, energy: null, moodScore: null, energyScore: null });
  expect(parseMood('**Mood:** 4/5 | **Energy:** 2/5')).toEqual({ mood: null, energy: null, moodScore: 4, energyScore: 2 });
});

test('date keys', () => {
  expect(localDateKey(d)).toBe('2026-09-30');
  expect(isoWeekKey(new Date(2026, 0, 1))).toBe('2026-W01');
  expect(isoWeekKey(new Date(2024, 11, 30))).toBe('2025-W01');
  expect(isoWeekKey(new Date(2027, 0, 3))).toBe('2026-W53');
});

import { streak, moodSeries, goalStats } from './stats';
test('streak, mood, goal stats', () => {
  const mk = (date: string, mood: number, done: boolean) => ({
    date,
    morning: { id: 1, content: `**Mood:** ${mood}/5 | **Energy:** 3/5\n#journal/morning` },
    evening: { id: 2, content: `**Goal Check**\n1. Ship — ${done ? '✅ progressed' : '⬜ not today'}\n\n**Mood:** ${mood + 1}/5 | **Energy:** 3/5` },
  });
  const days = [mk('2026-09-28', 2, true), mk('2026-09-29', 3, false)];
  expect(streak(days, new Date(2026, 8, 30))).toBe(2); // today not done yet -> counts from yesterday
  expect(streak(days, new Date(2026, 9, 2))).toBe(0);
  expect(moodSeries(days)[0].mood).toBe(2.5);
  expect(goalStats(days)).toEqual([{ goal: 'Ship', done: 1, total: 2 }]);
});

import { parseSuggestedGoals } from './journalData';
test('parseSuggestedGoals', () => {
  const md = '## Wins\nx\n## Suggested Goals for Next Week\n1. **Ship v1** beta\n2) Run 3x\n3. Sleep by 11\n4. extra\n';
  expect(parseSuggestedGoals(md)).toEqual(['Ship v1 beta', 'Run 3x', 'Sleep by 11']);
  expect(parseSuggestedGoals('nothing')).toEqual([]);
});

import { entryDate, parseGoalsList } from './entry';
test('entryDate and parseGoalsList', () => {
  const t = buildEntry('morning', emptyFields(), ['A', 'B', ''], new Date(2026, 2, 5));
  expect(entryDate(t)?.getDate()).toBe(5);
  expect(entryDate(t)?.getMonth()).toBe(2);
  expect(parseGoalsList(t)).toEqual(['A', 'B']);
  expect(entryDate('no tag')).toBeNull();
});

import { buildJournalRequest, buildExplorationRequest, FRAMEWORKS, EXPLORATION_SYSTEM, mainPrompt, THEMES } from './prompts';
test('guided prompts', () => {
  const first = buildJournalRequest([], () => 0);
  expect(first).toContain(THEMES[0]);
  expect(first).not.toContain('Earlier prompts');
  const req = buildJournalRequest(['What did you avoid today?'], () => 0.99);
  expect(req).toContain('- What did you avoid today?');
  expect(req).toContain(THEMES[THEMES.length - 1]);
  expect(new Set(Array.from({ length: 30 }, (_, i) => buildJournalRequest([], () => (i * 7919 % 100) / 100))).size).toBeGreaterThan(5);
  expect(FRAMEWORKS.map(f => f.num)).toEqual([1, 2, 3, 4]);
  for (const f of FRAMEWORKS) expect(EXPLORATION_SYSTEM).toContain(f.method);
  expect(EXPLORATION_SYSTEM).not.toContain('wait for the user');
  expect(buildExplorationRequest(FRAMEWORKS[2], ' procrastinating ')).toBe('Selected option: 3 (The Value & Meaning Alignment)\nBrief topic: procrastinating');
  expect(mainPrompt('Main?\n\nGo deeper:\n- a')).toBe('Main?');
});
