import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/* We need `env.aiWorkerUrl` at import time — stub Vite's runtime env BEFORE
   importing aiClient. env.ts is `as const`, so we just mock the whole module. */
vi.mock('@/lib/env', () => ({
  env: {
    aiWorkerUrl: 'https://example.test/ai',
    firebase: {
      apiKey: 'x', authDomain: 'x', projectId: 'x', storageBucket: 'x',
      messagingSenderId: 'x', appId: 'x',
    },
  },
}));

// Imports come AFTER the mock so the module resolves against the mock.
const { generateJSON, generateText } = await import('./aiClient');

const mockFetchOnce = (init: ResponseInit, body: unknown) => {
  const response = new Response(typeof body === 'string' ? body : JSON.stringify(body), init);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
};

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('generateText', () => {
  it('POSTs to the worker URL and returns the trimmed text field', async () => {
    mockFetchOnce({ status: 200 }, { text: '  {"a":1}  ', providerUsed: 'gemini' });
    const out = await generateText({ prompt: 'p', task: 'essay_generation' });
    expect(out).toBe('{"a":1}');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const call = (fetch as any).mock.calls[0];
    expect(call[0]).toBe('https://example.test/ai');
    expect(call[1].method).toBe('POST');
    expect(JSON.parse(call[1].body)).toEqual({ prompt: 'p', task: 'essay_generation' });
  });

  it('throws ai/server-error when the worker returns an error envelope', async () => {
    mockFetchOnce({ status: 200 }, { error: 'Rate limited' });
    await expect(generateText({ prompt: 'p', task: 't' })).rejects.toMatchObject({
      code: 'ai/server-error',
      message: 'Rate limited',
    });
  });

  it('throws ai/server-error on non-2xx', async () => {
    mockFetchOnce({ status: 502 }, { error: 'Bad gateway' });
    await expect(generateText({ prompt: 'p', task: 't' })).rejects.toMatchObject({
      code: 'ai/server-error',
      status: 502,
    });
  });

  it('throws ai/empty-response when text is missing/blank', async () => {
    mockFetchOnce({ status: 200 }, { text: '   ' });
    await expect(generateText({ prompt: 'p', task: 't' })).rejects.toMatchObject({
      code: 'ai/empty-response',
    });
  });

  it('throws ai/network when fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    await expect(generateText({ prompt: 'p', task: 't' })).rejects.toMatchObject({
      code: 'ai/network',
    });
  });
});

describe('generateJSON', () => {
  it('cleans fenced JSON and parses it', async () => {
    mockFetchOnce({ status: 200 }, { text: '```json\n{"title":"Space","tips":["a","b"]}\n```' });
    const out = await generateJSON<{ title: string; tips: string[] }>({ prompt: 'p', task: 't' });
    expect(out).toEqual({ title: 'Space', tips: ['a', 'b'] });
  });

  it('injects responseMimeType=application/json when caller did not', async () => {
    mockFetchOnce({ status: 200 }, { text: '{"a":1}' });
    await generateJSON({ prompt: 'p', task: 't' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const call = (fetch as any).mock.calls[0];
    expect(JSON.parse(call[1].body).responseMimeType).toBe('application/json');
  });

  it('throws ai/malformed-json when the text is not JSON at all', async () => {
    mockFetchOnce({ status: 200 }, { text: 'Sorry, I cannot do that.' });
    await expect(generateJSON({ prompt: 'p', task: 't' })).rejects.toMatchObject({
      code: 'ai/malformed-json',
    });
  });
});
