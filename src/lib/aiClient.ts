/* Shared client for the Cloudflare Worker AI proxy. Every AI feature in
   Phases 4-7 goes through this file — one place to own the request/response
   contract, timeout, and error shape. Web port of iOS GeminiEssayAPIClient's
   `requestJSON` (minus the essay-specific plumbing). */
import { env } from '@/lib/env';
import { cleanJSONText } from '@/lib/aiTextCleaner';

const DEFAULT_TIMEOUT_MS = 45_000;

export interface WorkerRequest {
  prompt: string;
  /** Selects the provider chain server-side (e.g. `essay_generation` →
      the "analysis" chain). Missing/unknown tasks default to analysis. */
  task: string;
  /** `application/json` asks the model to return raw JSON; omit for prose. */
  responseMimeType?: 'application/json';
}

/** Error thrown by aiClient. `code` mirrors the FirebaseError convention used
    elsewhere in the app (see authService), so callers can branch on it. */
export interface AIClientError extends Error {
  code:
    | 'ai/timeout'
    | 'ai/network'
    | 'ai/server-error'
    | 'ai/empty-response'
    | 'ai/malformed-json';
  status?: number;
}

const makeError = (code: AIClientError['code'], message: string, status?: number): AIClientError =>
  Object.assign(new Error(message), { code, status }) as AIClientError;

interface WorkerResponse {
  text?: string;
  error?: string;
  providerUsed?: string;
  fallbackUsed?: boolean;
}

/* withTimeout via Promise.race matches setImageService.ts:42-48. AbortSignal
   would work too but the caller may pass their own signal (e.g. useEffect
   cleanup) which we thread through to fetch — we timeout on top of that. */
const withTimeout = <T>(promise: Promise<T>, ms: number, onTimeout: () => void): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => {
        onTimeout();
        reject(makeError('ai/timeout', `AI request timed out after ${ms}ms`));
      }, ms),
    ),
  ]);

/** Low-level: POST to the worker and return raw `text`. Throws AIClientError
    on any failure. */
export const generateText = async (
  req: WorkerRequest,
  signal?: AbortSignal,
): Promise<string> => {
  const controller = new AbortController();
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true });

  const fetchPromise = fetch(env.aiWorkerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(req),
    signal: controller.signal,
  });

  let response: Response;
  try {
    response = await withTimeout(fetchPromise, DEFAULT_TIMEOUT_MS, () => controller.abort());
  } catch (e) {
    // Timeout has code 'ai/timeout' already; anything else is a network fault.
    if (e && typeof e === 'object' && 'code' in e) throw e as AIClientError;
    throw makeError('ai/network', e instanceof Error ? e.message : 'Network error');
  }

  let envelope: WorkerResponse;
  try {
    envelope = (await response.json()) as WorkerResponse;
  } catch {
    if (!response.ok) {
      throw makeError('ai/server-error', `Server returned ${response.status}`, response.status);
    }
    throw makeError('ai/malformed-json', 'Server response was not valid JSON');
  }

  if (!response.ok) {
    throw makeError(
      'ai/server-error',
      envelope.error?.trim() || `Server returned ${response.status}`,
      response.status,
    );
  }

  if (envelope.error) {
    throw makeError('ai/server-error', envelope.error);
  }

  const text = envelope.text?.trim() ?? '';
  if (text.length === 0) throw makeError('ai/empty-response', 'AI returned an empty response');

  return text;
};

/** JSON-typed: runs `generateText` → `cleanJSONText` → `JSON.parse<T>`.
    Sets responseMimeType to application/json when the caller didn't. */
export const generateJSON = async <T>(
  req: WorkerRequest,
  signal?: AbortSignal,
): Promise<T> => {
  const rawText = await generateText(
    { responseMimeType: 'application/json', ...req },
    signal,
  );
  const cleaned = cleanJSONText(rawText);
  try {
    return JSON.parse(cleaned) as T;
  } catch (e) {
    throw makeError(
      'ai/malformed-json',
      `AI returned data that could not be parsed: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
};
