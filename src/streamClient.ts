import { createTRPCClient, httpBatchStreamLink } from '@trpc/client';
import superjson from 'superjson';

/**
 * window.Blinko.api uses a non-streaming link, but `ai.completions` is an async-generator
 * mutation, so we build our own streaming tRPC client (same auth the app uses).
 */
export function createStreamApi(): any {
  return createTRPCClient<any>({
    links: [
      httpBatchStreamLink({
        url: new URL('/api/trpc', window.location.origin).toString(),
        transformer: superjson,
        headers: () => {
          const token = (window.Blinko.store?.userStore as any)?.token;
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}

/** Streams a completion from the user's configured Main Chat Model; calls onText with the accumulated text. */
export async function streamCompletion(
  opts: { question: string; systemPrompt: string; signal?: AbortSignal },
  onText: (full: string) => void,
): Promise<string> {
  const api = createStreamApi();
  const res = await api.ai.completions.mutate(
    {
      question: opts.question,
      conversations: [],
      systemPrompt: opts.systemPrompt,
      withRAG: false,
      withTools: false,
      withOnline: false,
    },
    { signal: opts.signal },
  );
  let full = '';
  for await (const item of res) {
    const chunk = item?.chunk;
    if (!chunk) continue;
    if (chunk.type === 'error') {
      throw new Error(chunk.error?.message || chunk.error?.name || 'AI error');
    }
    if (chunk.type === 'text-delta') {
      full += chunk.textDelta ?? chunk.text ?? '';
      onText(full);
    }
  }
  return full;
}
