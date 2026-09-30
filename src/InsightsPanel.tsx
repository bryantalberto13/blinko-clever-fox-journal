import { useState, useRef } from 'preact/hooks';
import type { JSXInternal } from 'preact/src/jsx';
import { fetchJournalDays, buildQuestion, SYSTEM_PROMPT } from './journalData';
import { streamCompletion } from './streamClient';
import { localDateKey } from './dates';

export function InsightsPanel(): JSXInternal.Element {
  const [range, setRange] = useState(7);
  const [status, setStatus] = useState<'idle' | 'loading' | 'streaming' | 'done' | 'error'>('idle');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [dayCount, setDayCount] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  async function analyze() {
    setStatus('loading');
    setOutput('');
    setError('');
    try {
      const days = await fetchJournalDays(range);
      setDayCount(days.length);
      if (days.length === 0) {
        setStatus('error');
        setError(`No journal entries found in the last ${range} days.`);
        return;
      }
      abortRef.current = new AbortController();
      setStatus('streaming');
      await streamCompletion(
        { question: buildQuestion(days, range), systemPrompt: SYSTEM_PROMPT, signal: abortRef.current.signal },
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
      const content = `## 🦊 Journal Insights — last ${range} days (${localDateKey()})\n\n${output}\n\n#journal/insights`;
      await window.Blinko.api.notes.upsert.mutate({ content, type: 0 });
      window.Blinko.toast.success('Insights saved as a note');
      window.Blinko.globalRefresh();
    } catch (e: any) {
      window.Blinko.toast.error(e?.message || 'Failed to save insights');
    }
  }

  const busy = status === 'loading' || status === 'streaming';
  const btn = 'inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md bg-primary text-primary-foreground disabled:opacity-50';

  return (
    <div className="max-w-xl mx-auto p-2" style={{ minWidth: '320px' }}>
      <div className="flex items-center gap-2 mb-3">
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
        <button className={btn} disabled={busy} onClick={analyze}>
          {status === 'loading' ? 'Gathering entries…' : status === 'streaming' ? 'Analyzing…' : '🦊 Analyze'}
        </button>
        {status === 'streaming' && (
          <button className="text-sm underline" onClick={() => abortRef.current?.abort()}>Stop</button>
        )}
      </div>
      {error && <div className="text-sm text-red-500 mb-2">{error}</div>}
      {output && (
        <>
          <div className="text-xs text-desc mb-1">Based on {dayCount} day(s) of entries</div>
          <div className="text-sm p-3 border rounded-md overflow-auto" style={{ whiteSpace: 'pre-wrap', maxHeight: '50vh' }}>
            {output}
          </div>
          {status === 'done' && (
            <button className={`${btn} mt-3`} onClick={saveAsNote}>Save as note</button>
          )}
        </>
      )}
    </div>
  );
}
