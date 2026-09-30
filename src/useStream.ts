import { useState, useRef, useEffect } from 'preact/hooks';
import { streamCompletion } from './streamClient';

export type StreamStatus = 'idle' | 'streaming' | 'done' | 'error';

/** Streams an AI completion into `text`; aborts on unmount. */
export function useStream() {
  const [text, setText] = useState('');
  const [status, setStatus] = useState<StreamStatus>('idle');
  const [error, setError] = useState('');
  const ref = useRef<AbortController | null>(null);

  useEffect(() => () => ref.current?.abort(), []);

  async function run(question: string, systemPrompt: string): Promise<string | null> {
    ref.current?.abort();
    ref.current = new AbortController();
    setText('');
    setError('');
    setStatus('streaming');
    try {
      const full = await streamCompletion({ question, systemPrompt, signal: ref.current.signal }, setText);
      setStatus('done');
      return full;
    } catch (e: any) {
      if (e?.name === 'AbortError') { setStatus('idle'); return null; }
      setError(e?.message || 'Generation failed');
      setStatus('error');
      return null;
    }
  }

  return {
    text, status, error, run,
    stop: () => ref.current?.abort(),
    reset: () => { ref.current?.abort(); setText(''); setError(''); setStatus('idle'); },
  };
}
