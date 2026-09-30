import { useState, useEffect } from 'preact/hooks';
import type { JSXInternal } from 'preact/src/jsx';
import { JOURNAL_SYSTEM, buildJournalRequest, mainPrompt } from './prompts';
import { loadRecentPrompts, saveRecentPrompts } from './pluginConfig';
import { useStream } from './useStream';
import { PastEntries } from './PastEntries';
import { todayLabel, getSection } from './entry';

export const GUIDED_TAG = 'guided';

export function buildGuidedNote(prompt: string, response: string): string {
  const quoted = prompt.trim().split('\n').map(l => `> ${l}`).join('\n');
  return `## 🧭 Guided Journal — ${todayLabel()}\n\n**Prompt**\n${quoted}\n\n**Response**\n${response.trim()}\n\n#journal/${GUIDED_TAG}`;
}

const previewOf = (content: string) => getSection(content, 'Prompt').replace(/^>\s?/gm, '').split('\n')[0].trim() || 'Guided journal entry';

export function GuidedJournal(): JSXInternal.Element {
  const stream = useStream();
  const [recent, setRecent] = useState<string[]>([]);
  const [response, setResponse] = useState('');
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => { loadRecentPrompts().then(setRecent).catch(() => {}); }, []);

  async function generate() {
    const full = await stream.run(buildJournalRequest(recent), JOURNAL_SYSTEM);
    if (full) {
      const next = [...recent, mainPrompt(full)];
      setRecent(next);
      saveRecentPrompts(next).catch(() => {});
    }
  }

  async function save() {
    setSaving(true);
    try {
      await window.Blinko.api.notes.upsert.mutate({ content: buildGuidedNote(stream.text, response), type: 0 });
      window.Blinko.toast.success('Journal entry saved 🧭');
      window.Blinko.globalRefresh();
      setResponse('');
      setRefreshKey(k => k + 1);
    } catch (e: any) {
      window.Blinko.toast.error(e?.message || 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  }

  const busy = stream.status === 'streaming';
  const hasPrompt = stream.status === 'done' && stream.text.trim().length > 0;

  return (
    <div>
      <h1>🧭 Guided Journal</h1>
      <div className="cf-sub">A fresh, different prompt each time to help you explore what's going on inside.</div>

      <div className="cf-row" style={{ marginBottom: 16 }}>
        <button className="cf-btn" disabled={busy} onClick={generate}>
          {busy ? 'Thinking…' : hasPrompt ? '✨ New prompt' : '✨ Generate a prompt'}
        </button>
        {busy && <button className="cf-link" onClick={stream.stop}>Stop</button>}
      </div>

      {stream.error && <div className="cf-err">{stream.error}</div>}

      {stream.text && (
        <div className="cf-card">
          <div className="cf-muted" style={{ marginBottom: 6 }}>Your prompt</div>
          <div className="cf-quote" style={{ fontSize: 16 }}>{stream.text}</div>
        </div>
      )}

      {hasPrompt && (
        <div className="cf-card">
          <label className="cf-lbl">Your reflection</label>
          <textarea
            style={{ minHeight: 180 }}
            value={response}
            placeholder="Write freely — there are no wrong answers."
            onInput={(e) => setResponse((e.currentTarget as HTMLTextAreaElement).value)}
          />
          <div className="cf-row" style={{ marginTop: 12 }}>
            <button className="cf-btn" disabled={saving || !response.trim()} onClick={save}>{saving ? 'Saving…' : 'Save to journal'}</button>
            <span className="cf-muted">Saved as a note tagged #journal/{GUIDED_TAG}</span>
          </div>
        </div>
      )}

      <PastEntries tag={GUIDED_TAG} refreshKey={refreshKey} preview={previewOf} />
    </div>
  );
}
