import { useState, useEffect } from 'preact/hooks';
import type { JSXInternal } from 'preact/src/jsx';
import { fetchJournalDays, DayEntries, SavedEntry } from './journalData';
import { Composer } from './Composer';
import { AnalysisView, Kind } from './AnalysisView';
import { localDateKey } from './dates';
import { Mode, entryDate, getSection, parseMood } from './entry';
import { streak, moodSeries, goalStats, MoodPoint } from './stats';
import { MOODS, ENERGIES, findOption } from './moods';

const HISTORY_DAYS = 90;

type View =
  | { name: 'home' }
  | { name: 'compose'; mode: Mode; date: Date; existing: SavedEntry | null; morning?: SavedEntry }
  | { name: 'analysis'; kind: Kind };

function MoodChart({ points }: { points: MoodPoint[] }) {
  const w = 640, h = 110, pad = 12;
  const n = points.length;
  const x = (i: number) => (n === 1 ? w / 2 : pad + (i * (w - 2 * pad)) / (n - 1));
  const y = (v: number) => h - pad - ((v - 1) / 4) * (h - 2 * pad);
  const line = (key: 'mood' | 'energy') =>
    points.map((p, i) => (p[key] == null ? null : `${x(i).toFixed(1)},${y(p[key] as number).toFixed(1)}`)).filter(Boolean).join(' ');
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label="Mood and energy over time">
        {[1, 3, 5].map(v => <line key={v} x1={pad} x2={w - pad} y1={y(v)} y2={y(v)} stroke="currentColor" stroke-opacity="0.12" />)}
        <polyline points={line('mood')} fill="none" stroke="#f97316" stroke-width="2.5" />
        <polyline points={line('energy')} fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="4 3" stroke-opacity="0.55" />
        {points.map((p, i) => p.mood != null && <circle key={`m${i}`} cx={x(i)} cy={y(p.mood)} r="4" fill="#f97316" />)}
      </svg>
      <div className="cf-muted">
        <span style={{ color: '#f97316' }}>━</span> Mood &nbsp; ╍ Energy &nbsp; (daily average)
      </div>
    </div>
  );
}

function entryPreview(mode: Mode, content: string): string {
  const key = mode === 'morning' ? 'Daily Focus' : 'Evening Wins';
  const t = getSection(content, key).replace(/\s+/g, ' ');
  return t || (mode === 'morning' ? 'Morning check-in' : 'Evening check-in');
}

export function CheckInsPage(): JSXInternal.Element {
  const [view, setView] = useState<View>({ name: 'home' });
  const [history, setHistory] = useState<DayEntries[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try {
      setHistory(await fetchJournalDays(HISTORY_DAYS));
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Could not load check-ins');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const backHome = () => setView({ name: 'home' });
  const today = history.find(d => d.date === localDateKey());

  if (view.name === 'compose') {
    return (
      <Composer
        mode={view.mode}
        date={view.date}
        existing={view.existing}
        morning={view.morning}
        onCancel={backHome}
        onSaved={() => { backHome(); load(); }}
      />
    );
  }
  if (view.name === 'analysis') {
    return <AnalysisView kind={view.kind} history={history} onBack={backHome} />;
  }

  const recent = history.filter(d => d.date >= localDateKey(new Date(Date.now() - 14 * 86400000)));
  const points = moodSeries(recent);
  const hasMood = points.some(p => p.mood != null || p.energy != null);
  const stats = goalStats(recent);
  const now = new Date();

  const status = (mode: Mode) => {
    const e = mode === 'morning' ? today?.morning : today?.evening;
    const icon = mode === 'morning' ? '🌅' : '🌙';
    return (
      <div className="cf-status">
        <span className="ic">{icon}</span>
        <div className="cf-grow">
          <div style={{ fontWeight: 700 }}>{mode === 'morning' ? 'Morning check-in' : 'Evening check-in'}</div>
          {e ? <div className="cf-done">✓ Done today</div> : <div className="cf-muted">Not done yet</div>}
        </div>
        <button
          className={e ? 'cf-btn ghost' : 'cf-btn'}
          onClick={() => setView({ name: 'compose', mode, date: now, existing: e ?? null, morning: today?.morning })}
        >
          {e ? 'Edit' : 'Start'}
        </button>
      </div>
    );
  };

  const items = history
    .flatMap(d => [
      d.morning && { mode: 'morning' as Mode, d, e: d.morning },
      d.evening && { mode: 'evening' as Mode, d, e: d.evening },
    ])
    .filter((x): x is { mode: Mode; d: DayEntries; e: SavedEntry } => !!x)
    .sort((a, b) => (a.d.date === b.d.date ? (a.mode === 'evening' ? -1 : 1) : b.d.date.localeCompare(a.d.date)));

  return (
    <div>
      <h1>🦊 Personal Check Ins</h1>
      <div className="cf-sub">
        🔥 {loading ? '…' : streak(history)}-day streak
      </div>

      <div className="cf-card">
        <h2>Today</h2>
        <div className="cf-row">{status('morning')}{status('evening')}</div>
      </div>

      <div className="cf-row" style={{ marginBottom: 16 }}>
        <button className="cf-btn" disabled={loading} onClick={() => setView({ name: 'analysis', kind: 'insights' })}>📈 Analyze trends</button>
        <button className="cf-btn" disabled={loading} onClick={() => setView({ name: 'analysis', kind: 'review' })}>📅 Weekly report</button>
      </div>

      {error && <div className="cf-err">{error}</div>}

      {hasMood && (
        <div className="cf-card">
          <h2>Last 14 days</h2>
          <div className="cf-strip">
            {points.map(p => {
              const m = findOption(MOODS, p.eveningMood ?? p.morningMood);
              return (
                <div key={p.date} title={m ? m.label : 'no mood'}>
                  <span className="em">{m ? m.emoji : '·'}</span>
                  <span>{p.date.slice(8)}</span>
                </div>
              );
            })}
          </div>
          <MoodChart points={points} />
          {stats.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div className="cf-muted" style={{ marginBottom: 4 }}>Goal follow-through</div>
              {stats.map(g => (
                <div key={g.goal} className="cf-goalrow">
                  <div className="cf-grow" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.goal}</div>
                  <div className="cf-bar"><div style={{ width: `${(100 * g.done) / g.total}%` }} /></div>
                  <div className="cf-muted" style={{ width: 36, textAlign: 'right' }}>{g.done}/{g.total}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="cf-card">
        <h2>History</h2>
        {loading && <div className="cf-muted">Loading…</div>}
        {!loading && items.length === 0 && <div className="cf-muted">No check-ins yet — start with today's above.</div>}
        {items.map(({ mode, d, e }) => {
          const pm = parseMood(e.content);
          const mood = findOption(MOODS, pm.mood);
          const energy = findOption(ENERGIES, pm.energy);
          const date = entryDate(e.content) ?? new Date();
          return (
            <div key={e.id} className="cf-item">
              <div className="em">{mood ? mood.emoji : mode === 'morning' ? '🌅' : '🌙'}</div>
              <div className="tx">
                <div>
                  <b>{d.date}</b>
                  <span className="cf-badge">{mode}</span>
                  {mood && <span className="cf-badge">{mood.label}</span>}
                  {energy && <span className="cf-badge">{energy.emoji} {energy.label}</span>}
                </div>
                <div className="cf-muted">{entryPreview(mode, e.content)}</div>
              </div>
              <button
                className="cf-btn ghost"
                onClick={() => setView({ name: 'compose', mode, date, existing: e, morning: d.morning })}
              >
                Edit
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
