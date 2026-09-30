import { useState, useRef, useEffect } from 'preact/hooks';
import type { JSXInternal } from 'preact/src/jsx';
import {
  buildQuestion, buildReviewQuestion, parseSuggestedGoals, SYSTEM_PROMPT, REVIEW_PROMPT, DayEntries,
} from './journalData';
import { streamCompletion } from './streamClient';
import { localDateKey } from './dates';
import { moodSeries, goalStats, mean } from './stats';
import { saveNextWeekGoals } from './pluginConfig';

export type Kind = 'insights' | 'review';
type Status = 'idle' | 'streaming' | 'done' | 'error';

interface Props {
  kind: Kind;
  history: DayEntries[];
  onBack: () => void;
}

const daysAgo = (n: number) => localDateKey(new Date(Date.now() - n * 86400000));

export function AnalysisView({ kind, history, onBack }: Props): JSXInternal.Element {
  const [range, setRange] = useState(7);
  const [status, setStatus] = useState<Status>('idle');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [savedNote, setSavedNote] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const isReview = kind === 'review';

  async function run() {
    const span = isReview ? 7 : range;
    const days = history.filter(d => d.date >= daysAgo(span));
    setOutput('');
    setError('');
    setSavedNote(false);
    if (days.length === 0) {
      setStatus('error');
      setError(`No check-ins found in the last ${span} days.`);
      return;
    }
    try {
      abortRef.current = new AbortController();
      setStatus('streaming');
      const series = moodSeries(days);
      const question = isReview
        ? buildReviewQuestion(days, goalStats(days), mean(series.map(p => p.mood)), mean(series.map(p => p.energy)))
        : buildQuestion(days, span);
      await streamCompletion(
        { question, systemPrompt: isReview ? REVIEW_PROMPT : SYSTEM_PROMPT, signal: abortRef.current.signal },
        setOutput,
      );
      setStatus('done');
    } catch (e: any) {
      if (e?.name === 'AbortError') { setStatus('idle'); return; }
      setError(e?.message || 'Analysis failed');
      setStatus('error');
    }
  }

  // Opening the view is the user's request to run it.
  useEffect(() => {
    run();
    return () => abortRef.current?.abort();
  }, []);

  async function saveAsNote() {
    try {
      const tag = isReview ? 'review' : 'insights';
      const title = isReview ? 'Weekly Report' : `Trend Analysis — last ${range} days`;
      await window.Blinko.api.notes.upsert.mutate({
        content: `## 🦊 ${title} (${localDateKey()})\n\n${output}\n\n#journal/${tag}`,
        type: 0,
      });
      setSavedNote(true);
      window.Blinko.toast.success('Saved as a note');
      window.Blinko.globalRefresh();
    } catch (e: any) {
      window.Blinko.toast.error(e?.message || 'Failed to save');
    }
  }

  const suggested = isReview && status === 'done' ? parseSuggestedGoals(output) : [];
  const [adopted, setAdopted] = useState(false);

  async function adoptGoals() {
    try {
      await saveNextWeekGoals(suggested);
      setAdopted(true);
      window.Blinko.toast.success("Saved — they'll be offered in next week's first morning check-in");
    } catch (e: any) {
      window.Blinko.toast.error(e?.message || 'Failed to save goals');
    }
  }

  const busy = status === 'streaming';
  return (
    <div>
      <div className="cf-row" style={{ marginBottom: 6 }}>
        <button className="cf-link" onClick={onBack}>← Back</button>
      </div>
      <h1>{isReview ? '📅 Weekly report' : '📈 Analyze trends'}</h1>
      <div className="cf-sub">
        {isReview
          ? 'Goal completion, wins, time sinks and mood for the last 7 days, plus suggested goals for next week.'
          : 'Mood patterns, recurring blockers, goal progress, and morning intentions compared with evening reality.'}
      </div>

      <div className="cf-row" style={{ marginBottom: 14 }}>
        {!isReview && (
          <select value={range} disabled={busy} onChange={(e) => setRange(Number((e.currentTarget as HTMLSelectElement).value))}>
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        )}
        <button className="cf-btn" disabled={busy} onClick={run}>{busy ? 'Analyzing…' : 'Run again'}</button>
        {busy && <button className="cf-link" onClick={() => abortRef.current?.abort()}>Stop</button>}
      </div>

      {error && <div className="cf-err">{error}</div>}
      {output && <div className="cf-out">{output}</div>}
      {busy && !output && <div className="cf-muted">Reading your check-ins…</div>}

      {status === 'done' && (
        <div className="cf-row" style={{ marginTop: 14 }}>
          <button className="cf-btn" disabled={savedNote} onClick={saveAsNote}>{savedNote ? 'Saved ✓' : 'Save as note'}</button>
          {suggested.length > 0 && (
            <button className="cf-btn ghost" disabled={adopted} onClick={adoptGoals}>
              {adopted ? "Goals saved ✓" : "Use as next week's goals"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
