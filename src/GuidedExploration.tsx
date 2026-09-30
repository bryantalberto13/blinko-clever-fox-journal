import { useState } from 'preact/hooks';
import type { JSXInternal } from 'preact/src/jsx';
import { FRAMEWORKS, Framework, EXPLORATION_SYSTEM, buildExplorationRequest } from './prompts';
import { useStream } from './useStream';
import { PastEntries } from './PastEntries';
import { todayLabel, getSection } from './entry';

export const EXPLORATION_TAG = 'exploration';

export function buildExplorationNote(topic: string, fw: Framework, questions: string, reflections: string): string {
  return [
    `## 🔍 Guided Exploration — ${todayLabel()}`, '',
    '**On my mind**', topic.trim(), '',
    '**Framework**', `${fw.emoji} ${fw.name}`, '',
    '**Questions**', questions.trim(), '',
    '**My reflections**', reflections.trim() || '_(none yet)_', '',
    `#journal/${EXPLORATION_TAG}`,
  ].join('\n');
}

const previewOf = (content: string) => getSection(content, 'On my mind').replace(/\s+/g, ' ') || 'Guided exploration';

export function GuidedExploration(): JSXInternal.Element {
  const stream = useStream();
  const [topic, setTopic] = useState('');
  const [fw, setFw] = useState<Framework | null>(null);
  const [used, setUsed] = useState<{ topic: string; fw: Framework } | null>(null);
  const [reflections, setReflections] = useState('');
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const busy = stream.status === 'streaming';
  const ready = topic.trim().length > 0 && !!fw;

  async function generate() {
    if (!fw) return;
    setUsed({ topic, fw });
    await stream.run(buildExplorationRequest(fw, topic), EXPLORATION_SYSTEM);
  }

  async function save() {
    if (!used) return;
    setSaving(true);
    try {
      await window.Blinko.api.notes.upsert.mutate({
        content: buildExplorationNote(used.topic, used.fw, stream.text, reflections),
        type: 0,
      });
      window.Blinko.toast.success('Exploration saved 🔍');
      window.Blinko.globalRefresh();
      setReflections('');
      setTopic('');
      setFw(null);
      setUsed(null);
      stream.reset();
      setRefreshKey(k => k + 1);
    } catch (e: any) {
      window.Blinko.toast.error(e?.message || 'Failed to save exploration');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1>🔍 Guided Exploration</h1>
      <div className="cf-sub">Describe what's on your mind, choose a lens, and get questions to help you understand it.</div>

      <div className="cf-card">
        <label className="cf-lbl">What's the problem at hand, or what would you like to think through?</label>
        <textarea
          value={topic}
          placeholder="e.g. I keep procrastinating on a work project… / I get defensive during arguments…"
          onInput={(e) => setTopic((e.currentTarget as HTMLTextAreaElement).value)}
        />

        <h2 style={{ marginTop: 16 }}>Choose a framework</h2>
        <div className="cf-fws">
          {FRAMEWORKS.map(f => (
            <button
              key={f.id}
              type="button"
              className={`cf-fw${fw?.id === f.id ? ' on' : ''}`}
              aria-pressed={fw?.id === f.id}
              onClick={() => setFw(f)}
            >
              <div className="t"><span className="e">{f.emoji}</span> Option {f.num}: {f.name}</div>
              <div className="cf-muted">{f.bestFor}</div>
            </button>
          ))}
        </div>

        <div className="cf-row" style={{ marginTop: 14 }}>
          <button className="cf-btn" disabled={!ready || busy} onClick={generate}>
            {busy ? 'Generating…' : stream.text ? 'Regenerate questions' : 'Generate questions'}
          </button>
          {busy && <button className="cf-link" onClick={stream.stop}>Stop</button>}
        </div>
      </div>

      {stream.error && <div className="cf-err">{stream.error}</div>}

      {stream.text && (
        <div className="cf-card">
          <div className="cf-muted" style={{ marginBottom: 6 }}>
            {used ? `${used.fw.emoji} ${used.fw.name}` : ''}
          </div>
          <div className="cf-out" style={{ maxHeight: 'none' }}>{stream.text}</div>
        </div>
      )}

      {stream.status === 'done' && used && (
        <div className="cf-card">
          <label className="cf-lbl">Your reflections</label>
          <textarea
            style={{ minHeight: 200 }}
            value={reflections}
            placeholder="Write your answers here, in your own words."
            onInput={(e) => setReflections((e.currentTarget as HTMLTextAreaElement).value)}
          />
          <div className="cf-row" style={{ marginTop: 12 }}>
            <button className="cf-btn" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save to journal'}</button>
            <span className="cf-muted">Saved as a note tagged #journal/{EXPLORATION_TAG}</span>
          </div>
        </div>
      )}

      <div className="cf-muted" style={{ margin: '4px 0 16px' }}>
        A self-reflection tool, not therapy or medical advice. If you're in crisis, please contact local emergency services or a crisis line.
      </div>

      <PastEntries tag={EXPLORATION_TAG} refreshKey={refreshKey} preview={previewOf} />
    </div>
  );
}
