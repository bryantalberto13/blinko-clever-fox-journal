import { useState, useRef, useEffect } from 'preact/hooks';
import type { JSXInternal } from 'preact/src/jsx';
import {
  fetchJournalDays, buildQuestion, buildReviewQuestion, parseSuggestedGoals,
  SYSTEM_PROMPT, REVIEW_PROMPT, DayEntries,
} from './journalData';
import { streamCompletion } from './streamClient';
import { localDateKey } from './dates';
import { streak, moodSeries, goalStats, mean, MoodPoint } from './stats';
import { saveNextWeekGoals } from './pluginConfig';

type Kind = 'insights' | 'review';
type Status = 'idle' | 'loading' | 'streaming' | 'done' | 'error';

const HISTORY_DAYS = 60;

function MoodChart({ points }: { points: MoodPoint[] }) {
  const w = 300, h = 80, pad = 8;
  const n = points.length;
  const x = (i: number) => (n === 1 ? w / 2 : pad + (i * (w - 2 * pad)) / (n - 1));
  const y = (v: number) => h - pad - ((v - 1) / 4) * (h - 2 * pad);
  const line = (key: 'mood' | 'energy') => {
    const segs = points
      .map((p, i) => (p[key] == null ? null : `${x(i).toFixed(1)},${y(p[key] as number).toFixed(1)}`))
      .filter(Boolean);
    return segs.length > 1 ? segs.join(' ') : '';
  };
  return (
    <div className="mb-3">
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label="Mood and energy over time">
        {[1, 3, 5].map(v => (
          <line key={v} x1={pad} x2={w - pad} y1={y(v)} y2={y(v)} stroke="currentColor" stroke-opacity="0.12" />
        ))}
        <polyline points={line('mood')} fill="none" stroke="currentColor" stroke-width="2" />
        <polyline points={line('energy')} fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="4 3" stroke-opacity="0.6" />
        {points.map((p, i) => p.mood != null && <circle key={`m${i}`} cx={x(i)} cy={y(p.mood)} r="2.5" fill="currentColor" />)}
        {points.map((p, i) => p.energy != null && <circle key={`e${i}`} cx={x(i)} cy={y(p.energy)} r="2" fill="currentColor" fill-opacity="0.6" />)}
      </svg>
      <div className="flex gap-4 text-xs text-desc">
        <span>━ Mood</span><span>╍ Energy</span><span>(1–5, daily average)</span>
      </div>
    </div>
  );
}

export function InsightsPanel(): JSXInternal.Element {
  const [range, setRange] = useState(7);
  const [history, setHistory] = useState<DayEntries[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [kind, setKind] = useState<Kind>('insights');
  const [status, setStatus] = useState<Status>('idle');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetchJournalDays(HISTORY_DAYS)
      .then(setHistory)
      .catch((e) => setError(e?.message || 'Could not load journal entries'))
      .finally(() => setLoadingHistory(false));
    return () => abortRef.current?.abort();
  }, []);

  const cutoff = localDateKey(new Date(Date.now() - range * 86400000));
  const inRange = history.filter(d => d.date >= cutoff);
  const points = moodSeries(inRange);
  const hasMood = points.some(p => p.mood != null || p.energy != null);
  const stats = goalStats(inRange);
  const busy = status === 'loading' || status === 'streaming';

  async function run(k: Kind) {
    const days = k === 'review' ? history.filter(d => d.date >= localDateKey(new Date(Date.now() - 7 * 86400000))) : inRange;
    setKind(k);
    setOutput('');
    setError('');
    if (days.length === 0) {
      setStatus('error');
      setError(`No journal entries found in the last ${k === 'review' ? 7 : range} days.`);
      return;
    }
    try {
      abortRef.current = new AbortController();
      setStatus('streaming');
      const question = k === 'review'
        ? buildReviewQuestion(days, goalStats(days), mean(moodSeries(days).map(p => p.mood)), mean(moodSeries(days).map(p => p.energy)))
        : buildQuestion(days, range);
      await streamCompletion(
        { question, systemPrompt: k === 'review' ? REVIEW_PROMPT : SYSTEM_PROMPT, signal: abortRef.current.signal },
        setOutput,
      );
      setStatus('done');
    } catch (e: any) {
      if (e?.name === 'AbortError') { setStatus('idle'); return; }
      setError(e?.message || 'Analysis failed');
      setStatus('error');
    }
  }

  async function saveAsNote() {
    try {
      const tag = kind === 'review' ? 'review' : 'insights';
      const title = kind === 'review' ? 'Weekly Review' : `Journal Insights — last ${range} days`;
      await window.Blinko.api.notes.upsert.mutate({
        content: `## 🦊 ${title} (${localDateKey()})\n\n${output}\n\n#journal/${tag}`,
        type: 0,
      });
      window.Blinko.toast.success('Saved as a note');
      window.Blinko.globalRefresh();
    } catch (e: any) {
      window.Blinko.toast.error(e?.message || 'Failed to save');
    }
  }

  const suggested = kind === 'review' && status === 'done' ? parseSuggestedGoals(output) : [];

  async function adoptGoals() {
    try {
      await saveNextWeekGoals(suggested);
      window.Blinko.toast.success("Saved — they'll be offered in next week's first morning entry");
    } catch (e: any) {
      window.Blinko.toast.error(e?.message || 'Failed to save goals');
    }
  }

  const btn = 'inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md bg-primary text-primary-foreground disabled:opacity-50';
  const s = streak(history);

  return (
    <div className="max-w-xl mx-auto p-2" style={{ minWidth: '320px' }}>
      <div className="flex items-center gap-3 mb-3 text-sm">
        <span className="font-semibold">🔥 {loadingHistory ? '…' : s}-day streak</span>
        <span className="text-desc">{loadingHistory ? '' : `${inRange.length} journaled day(s) in range`}</span>
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <select
          value={range}
          disabled={busy}
          onChange={(e) => setRange(Number((e.currentTarget as HTMLSelectElement).value))}
          className="px-2 py-1.5 border rounded-md text-sm bg-primary!"
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      {hasMood && <MoodChart points={points} />}

      {stats.length > 0 && (
        <div className="mb-3 text-sm">
          <div className="text-xs text-desc mb-1">Goal follow-through</div>
          {stats.map(g => (
            <div key={g.goal} className="flex items-center gap-2 py-0.5">
              <div className="flex-1 truncate">{g.goal}</div>
              <div style={{ width: 96, height: 8, borderRadius: 4, background: 'rgba(128,128,128,.25)', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'currentColor', width: `${(100 * g.done) / g.total}%` }} />
              </div>
              <div className="text-xs" style={{ width: 40, textAlign: 'right' }}>{g.done}/{g.total}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <button className={btn} disabled={busy || loadingHistory} onClick={() => run('insights')}>
          {busy && kind === 'insights' ? 'Analyzing…' : '🦊 Analyze trends'}
        </button>
        <button className={btn} disabled={busy || loadingHistory} onClick={() => run('review')}>
          {busy && kind === 'review' ? 'Reviewing…' : '📅 Weekly review'}
        </button>
        {status === 'streaming' && (
          <button className="text-sm underline" onClick={() => abortRef.current?.abort()}>Stop</button>
        )}
      </div>

      {error && <div className="text-sm text-red-500 mb-2">{error}</div>}
      {output && (
        <>
          <div className="text-sm p-3 border rounded-md overflow-auto" style={{ whiteSpace: 'pre-wrap', maxHeight: '40vh' }}>
            {output}
          </div>
          {status === 'done' && (
            <div className="flex gap-2 mt-3 flex-wrap">
              <button className={btn} onClick={saveAsNote}>Save as note</button>
              {suggested.length > 0 && (
                <button className={btn} onClick={adoptGoals}>Use as next week's goals</button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
