export interface Option { key: string; label: string; emoji: string; score: number }

/** score = valence 1 (low) .. 5 (high), used only for charts/averages. */
export const MOODS: Option[] = [
  { key: 'joyful', label: 'Joyful', emoji: '😄', score: 5 },
  { key: 'grateful', label: 'Grateful', emoji: '🥰', score: 5 },
  { key: 'motivated', label: 'Motivated', emoji: '🤩', score: 5 },
  { key: 'content', label: 'Content', emoji: '😊', score: 4 },
  { key: 'calm', label: 'Calm', emoji: '😌', score: 4 },
  { key: 'hopeful', label: 'Hopeful', emoji: '🙂', score: 4 },
  { key: 'neutral', label: 'Neutral', emoji: '😐', score: 3 },
  { key: 'tired', label: 'Tired', emoji: '😴', score: 2 },
  { key: 'anxious', label: 'Anxious', emoji: '😰', score: 2 },
  { key: 'frustrated', label: 'Frustrated', emoji: '😤', score: 2 },
  { key: 'sad', label: 'Sad', emoji: '😔', score: 1 },
  { key: 'overwhelmed', label: 'Overwhelmed', emoji: '😩', score: 1 },
];

export const ENERGIES: Option[] = [
  { key: 'charged', label: 'Charged', emoji: '⚡', score: 5 },
  { key: 'energized', label: 'Energized', emoji: '🔥', score: 4 },
  { key: 'steady', label: 'Steady', emoji: '🔋', score: 3 },
  { key: 'low', label: 'Low', emoji: '🪫', score: 2 },
  { key: 'drained', label: 'Drained', emoji: '💤', score: 1 },
];

export const findOption = (list: Option[], key: string | null | undefined) => list.find(o => o.key === key);

/** Text stored in the note, e.g. "😊 Content". */
export const optionText = (o: Option) => `${o.emoji} ${o.label}`;

/** Recognise an option (by label) or a legacy "4/5" rating inside a saved value segment. */
export function parseOption(list: Option[], segment: string): { key: string | null; score: number | null } {
  const seg = segment.trim();
  const byLabel = list.find(o => new RegExp(`\\b${o.label}\\b`, 'i').test(seg));
  if (byLabel) return { key: byLabel.key, score: byLabel.score };
  const legacy = seg.match(/(\d)\s*\/\s*5/);
  return { key: null, score: legacy ? Number(legacy[1]) : null };
}
