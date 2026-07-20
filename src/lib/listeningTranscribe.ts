/* Whisper transcription — web port of CloudflareListeningTranscriptionService
   + ListeningSubtitleBuilder. Multipart POST to the AI worker's
   /api/listening/transcribe endpoint; the worker returns word-level Whisper
   cues that get merged into sentence cues client-side. */
import { env } from '@/lib/env';
import { findLanguage } from '@/lib/essayTypes';

export interface ListeningSubtitleCue {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  order: number;
  translation?: string;
}

export interface ListeningTranscription {
  transcriptText: string;
  subtitles: ListeningSubtitleCue[];
  vttText?: string;
  detectedLanguage?: string;
  durationSeconds?: number;
}

export class TranscriptionError extends Error {
  code: 'tooLarge' | 'server' | 'network' | 'emptyTranscript' | 'badResponse';
  constructor(code: TranscriptionError['code'], message: string) {
    super(message);
    this.code = code;
  }
}

const TRANSCRIBE_TIMEOUT_MS = 300_000;

const cueFromRaw = (raw: unknown, index: number): ListeningSubtitleCue => {
  const data = (raw ?? {}) as Record<string, unknown>;
  return {
    id: String(data.id ?? crypto.randomUUID()),
    startTime: typeof data.startTime === 'number' ? data.startTime : 0,
    endTime: typeof data.endTime === 'number' ? data.endTime : 0,
    text: String(data.text ?? ''),
    order: typeof data.order === 'number' ? data.order : index,
  };
};

/** iOS multipart language code = GrammarLanguage.shortTitle.lowercased(). */
export const transcribeLanguageCode = (languageId: string): string =>
  findLanguage(languageId).shortTitle.toLowerCase();

export const transcribeMedia = async (
  file: Blob,
  params: { fileName: string; languageId: string; level: string },
  signal?: AbortSignal,
): Promise<ListeningTranscription> => {
  const form = new FormData();
  form.append('language', transcribeLanguageCode(params.languageId));
  form.append('level', params.level);
  form.append('mode', 'importVideo');
  form.append('file', file, params.fileName);

  const controller = new AbortController();
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true });
  const timeout = setTimeout(() => controller.abort(), TRANSCRIBE_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${env.aiWorkerUrl}/api/listening/transcribe`, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError' && signal?.aborted) throw e;
    throw new TranscriptionError('network', 'Upload failed. Check your connection and try again.');
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    let serverMessage = '';
    try {
      serverMessage = ((await response.json()) as { error?: string }).error ?? '';
    } catch {
      /* non-JSON error body */
    }
    if (response.status === 413) {
      throw new TranscriptionError(
        'tooLarge',
        serverMessage || 'That file is too large to transcribe.',
      );
    }
    throw new TranscriptionError('server', serverMessage || `Transcription failed (${response.status}).`);
  }

  let data: Record<string, unknown>;
  try {
    data = (await response.json()) as Record<string, unknown>;
  } catch {
    throw new TranscriptionError('badResponse', 'Transcription returned an unexpected response.');
  }

  const transcriptText = String(data.transcriptText ?? '').trim();
  if (transcriptText.length === 0) {
    throw new TranscriptionError('emptyTranscript', 'No speech was found in this file.');
  }

  const subtitles = Array.isArray(data.subtitles)
    ? data.subtitles.map(cueFromRaw).sort((a, b) => a.startTime - b.startTime)
    : [];

  return {
    transcriptText,
    subtitles,
    vttText: typeof data.vttText === 'string' ? data.vttText : undefined,
    detectedLanguage:
      typeof data.detectedLanguage === 'string' ? data.detectedLanguage : undefined,
    durationSeconds:
      typeof data.durationSeconds === 'number' ? data.durationSeconds : undefined,
  };
};

/* --- Subtitle builder (ListeningSubtitleBuilder) --- */

const SENTENCE_END_RE = /[.!?]["']?\s*$/;
const MAX_WORDS_PER_CUE = 14;
const MAX_CUE_DURATION = 8;

const wordCountOf = (text: string) => text.split(/\s+/).filter((w) => w.length > 0).length;

/** Merge Whisper word-level cues into sentence cues. Only merges when the
    average words-per-cue is < 3 (i.e. the input really is word-level). */
export const sentenceCues = (cues: ListeningSubtitleCue[]): ListeningSubtitleCue[] => {
  if (cues.length === 0) return [];
  const ordered = [...cues].sort((a, b) => a.startTime - b.startTime);
  const totalWords = ordered.reduce((sum, c) => sum + wordCountOf(c.text), 0);
  if (totalWords / ordered.length >= 3) return ordered;

  const merged: ListeningSubtitleCue[] = [];
  let current: ListeningSubtitleCue | null = null;
  let currentWords = 0;

  const flush = () => {
    if (current) {
      merged.push({ ...current, order: merged.length });
      current = null;
      currentWords = 0;
    }
  };

  for (const cue of ordered) {
    const text = cue.text.trim();
    if (text.length === 0) continue;
    /* Local non-null snapshot — the `flush` closure mutation breaks TS
       narrowing on `current` otherwise. */
    const active: ListeningSubtitleCue = current
      ? { ...current, endTime: cue.endTime, text: `${current.text} ${text}` }
      : { ...cue, id: crypto.randomUUID(), text };
    currentWords = current ? currentWords + wordCountOf(text) : wordCountOf(text);
    current = active;
    const duration = active.endTime - active.startTime;
    if (
      SENTENCE_END_RE.test(active.text) ||
      currentWords >= MAX_WORDS_PER_CUE ||
      duration >= MAX_CUE_DURATION
    ) {
      flush();
    }
  }
  flush();
  return merged;
};

/** Fallback when no cues exist: split the transcript into sentences and
    spread them evenly across the duration. */
export const estimatedCues = (
  transcript: string,
  durationSeconds: number,
): ListeningSubtitleCue[] => {
  const sentences: string[] = [];
  let currentSentence = '';
  for (const ch of transcript) {
    currentSentence += ch;
    if (ch === '.' || ch === '!' || ch === '?') {
      const cleaned = currentSentence.trim();
      if (cleaned.length > 0) sentences.push(cleaned);
      currentSentence = '';
    }
  }
  const tail = currentSentence.trim();
  if (tail.length > 0) sentences.push(tail);
  if (sentences.length === 0 || durationSeconds <= 0) return [];

  const per = durationSeconds / sentences.length;
  return sentences.map((text, i) => ({
    id: crypto.randomUUID(),
    startTime: i * per,
    endTime: (i + 1) * per,
    text,
    order: i,
  }));
};

/** Active cue for a playback time (iOS cue.contains). */
export const activeCueAt = (
  cues: ListeningSubtitleCue[],
  time: number,
): ListeningSubtitleCue | undefined =>
  cues.find((c) => time >= c.startTime && time < c.endTime);
