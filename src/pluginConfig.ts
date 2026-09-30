import { isoWeekKey } from './dates';

const PLUGIN_NAME = 'clever-fox-journal';

export interface GoalsState {
  goals: string[];
  weekKey: string;
  /** Goals suggested by a weekly review, waiting to be adopted next week. */
  nextGoals: string[] | null;
  nextFor: string;
}

const pad3 = (g: any): string[] => {
  const a = Array.isArray(g) ? g.map(String) : [];
  while (a.length < 3) a.push('');
  return a.slice(0, 3);
};

const parse = (s: any): any => { try { return s ? JSON.parse(s) : null; } catch { return null; } };

export async function loadGoals(): Promise<GoalsState> {
  const res: any = await window.Blinko.api.config.getPluginConfig.query({ pluginName: PLUGIN_NAME });
  const next = parse(res?.nextWeekGoals);
  return {
    goals: pad3(parse(res?.weeklyGoals)),
    weekKey: res?.goalsWeekKey ?? '',
    nextGoals: next ? pad3(next) : null,
    nextFor: res?.nextWeekFor ?? '',
  };
}

const set = (key: string, value: string) =>
  window.Blinko.api.config.setPluginConfig.mutate({ pluginName: PLUGIN_NAME, key, value });

export async function saveGoals(goals: string[]): Promise<void> {
  await set('weeklyGoals', JSON.stringify(goals));
  await set('goalsWeekKey', isoWeekKey());
}

/** Store review-suggested goals to be offered when next week's first morning form opens. */
export async function saveNextWeekGoals(goals: string[]): Promise<void> {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  await set('nextWeekGoals', JSON.stringify(pad3(goals)));
  await set('nextWeekFor', isoWeekKey(d));
}

export async function loadRecentPrompts(): Promise<string[]> {
  const res: any = await window.Blinko.api.config.getPluginConfig.query({ pluginName: PLUGIN_NAME });
  const v = parse(res?.recentPrompts);
  return Array.isArray(v) ? v.map(String) : [];
}

export async function saveRecentPrompts(prompts: string[]): Promise<void> {
  await set('recentPrompts', JSON.stringify(prompts.slice(-20)));
}
