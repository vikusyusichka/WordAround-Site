/* Azure Speech token client — web port of the iOS azure-token fetch.
   The Azure key lives only in the Worker. Pronunciation SCORING (the Speech SDK
   PronunciationAssessment) needs a working token; when the Worker has no valid
   Azure credentials this endpoint fails and the whole scoring feature degrades
   to "record + play yourself back", which still works offline of Azure.

   NOTE: the Speech SDK itself is deliberately NOT a dependency yet — the token
   endpoint currently answers 502 ("Azure rejected the speech credentials"), so
   shipping a large SDK that cannot run would be dead weight. Once the Worker has
   valid credentials, add `microsoft-cognitiveservices-speech-sdk` and implement
   `assessPronunciation()` on top of `fetchAzureToken()`. */
import { env } from '@/lib/env';

export const AZURE_TOKEN_PATH = '/api/speech/azure-token';
const TIMEOUT_MS = 15_000;
/* iOS caches the token ~8 min (Azure tokens live 10). */
const TOKEN_TTL_MS = 8 * 60 * 1000;

export interface AzureToken {
  token: string;
  region: string;
}

export type AzureSpeechErrorCode = 'not-configured' | 'network' | 'invalid-response';

export interface AzureSpeechError extends Error {
  code: AzureSpeechErrorCode;
  status?: number;
}

const makeError = (
  code: AzureSpeechErrorCode,
  message: string,
  status?: number,
): AzureSpeechError => Object.assign(new Error(message), { code, status }) as AzureSpeechError;

let cached: { value: AzureToken; expiresAt: number } | null = null;

/** Test seam — drops the module-level token cache. */
export const __resetAzureTokenCache = (): void => {
  cached = null;
};

export const fetchAzureToken = async (signal?: AbortSignal): Promise<AzureToken> => {
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const controller = new AbortController();
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true });
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${env.aiWorkerUrl}${AZURE_TOKEN_PATH}`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
  } catch (e) {
    throw makeError('network', e instanceof Error ? e.message : 'Network error');
  } finally {
    clearTimeout(timeout);
  }

  let dto: { token?: string; region?: string; error?: string };
  try {
    dto = (await response.json()) as typeof dto;
  } catch {
    throw makeError('invalid-response', 'Azure token endpoint returned an unexpected response.');
  }

  /* Any non-2xx here means the Worker has no usable Azure credentials — this is
     the expected state today, so it is a first-class "not configured", not a crash. */
  if (!response.ok) {
    throw makeError(
      'not-configured',
      dto.error?.trim() || 'Pronunciation scoring is not configured.',
      response.status,
    );
  }

  const token = dto.token?.trim() ?? '';
  const region = dto.region?.trim() ?? '';
  if (token.length === 0 || region.length === 0) {
    throw makeError('not-configured', 'Pronunciation scoring is not configured.');
  }

  const value: AzureToken = { token, region };
  cached = { value, expiresAt: Date.now() + TOKEN_TTL_MS };
  return value;
};

/** True when the Worker can hand out an Azure token, i.e. scoring is usable.
    Never throws — callers use it to pick between the scored and unscored UI. */
export const isPronunciationScoringAvailable = async (
  signal?: AbortSignal,
): Promise<boolean> => {
  try {
    await fetchAzureToken(signal);
    return true;
  } catch {
    return false;
  }
};
