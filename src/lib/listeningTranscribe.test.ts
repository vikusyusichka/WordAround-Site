import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/env', () => ({ env: { aiWorkerUrl: 'https://worker.test' } }));

import {
  activeCueAt,
  estimatedCues,
  sentenceCues,
  transcribeLanguageCode,
  transcribeMedia,
  TranscriptionError,
  type ListeningSubtitleCue,
} from './listeningTranscribe';

const cue = (start: number, end: number, text: string): ListeningSubtitleCue => ({
  id: `${start}`,
  startTime: start,
  endTime: end,
  text,
  order: 0,
});

describe('transcribeMedia', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('POSTs multipart with language/level/mode/file to the transcribe endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        transcriptText: 'Hello world.',
        subtitles: [{ id: 'a', startTime: 1, endTime: 2, text: 'Hello' }],
        durationSeconds: 2,
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const result = await transcribeMedia(new Blob(['x']), {
      fileName: 'clip.mp3',
      languageId: 'ukrainian',
      level: 'B1',
    });
    expect(fetchMock.mock.calls[0][0]).toBe('https://worker.test/api/listening/transcribe');
    const form = fetchMock.mock.calls[0][1].body as FormData;
    expect(form.get('language')).toBe('uk');
    expect(form.get('level')).toBe('B1');
    expect(form.get('mode')).toBe('importVideo');
    expect(form.get('file')).toBeInstanceOf(Blob);
    expect(result.transcriptText).toBe('Hello world.');
    expect(result.subtitles).toHaveLength(1);
  });

  it('maps 413 → tooLarge, error JSON → server, empty transcript → emptyTranscript', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 413, json: async () => ({}) }));
    await expect(
      transcribeMedia(new Blob(['x']), { fileName: 'a.mp3', languageId: 'english', level: 'A1' }),
    ).rejects.toMatchObject({ code: 'tooLarge' });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 500, json: async () => ({ error: 'boom' }),
    }));
    await expect(
      transcribeMedia(new Blob(['x']), { fileName: 'a.mp3', languageId: 'english', level: 'A1' }),
    ).rejects.toMatchObject({ code: 'server', message: 'boom' });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ transcriptText: '  ', subtitles: [] }),
    }));
    await expect(
      transcribeMedia(new Blob(['x']), { fileName: 'a.mp3', languageId: 'english', level: 'A1' }),
    ).rejects.toMatchObject({ code: 'emptyTranscript' });
  });

  it('language codes come from shortTitle lowercased', () => {
    expect(transcribeLanguageCode('english')).toBe('en');
    expect(transcribeLanguageCode('german')).toBe('de');
    expect(new TranscriptionError('network', 'x').code).toBe('network');
  });
});

describe('sentenceCues (Whisper word-cue merging)', () => {
  it('merges word cues into sentences, breaking on sentence-ending punctuation', () => {
    const words = ['Hello', 'there', 'friend.', 'How', 'are', 'you?'];
    const cues = words.map((w, i) => cue(i, i + 1, w));
    const merged = sentenceCues(cues);
    expect(merged).toHaveLength(2);
    expect(merged[0].text).toBe('Hello there friend.');
    expect(merged[0].startTime).toBe(0);
    expect(merged[0].endTime).toBe(3);
    expect(merged[1].text).toBe('How are you?');
  });

  it('breaks on maxWords 14 even without punctuation', () => {
    const cues = Array.from({ length: 30 }, (_, i) => cue(i, i + 1, `word${i}`));
    const merged = sentenceCues(cues);
    expect(merged.length).toBeGreaterThan(1);
    for (const m of merged) {
      expect(m.text.split(' ').length).toBeLessThanOrEqual(14);
    }
  });

  it('leaves sentence-level cues untouched (avg ≥ 3 words)', () => {
    const cues = [cue(0, 4, 'This is a full sentence already.'), cue(4, 8, 'And another one follows here.')];
    expect(sentenceCues(cues)).toHaveLength(2);
  });
});

describe('estimatedCues + activeCueAt', () => {
  it('spreads sentences evenly across the duration', () => {
    const cues = estimatedCues('First one here. Second one there. Third finishes.', 30);
    expect(cues).toHaveLength(3);
    expect(cues[0].startTime).toBe(0);
    expect(cues[0].endTime).toBe(10);
    expect(cues[2].endTime).toBe(30);
  });

  it('activeCueAt picks the containing cue', () => {
    const cues = [cue(0, 5, 'a'), cue(5, 10, 'b')];
    expect(activeCueAt(cues, 4.9)?.text).toBe('a');
    expect(activeCueAt(cues, 5)?.text).toBe('b');
    expect(activeCueAt(cues, 11)).toBeUndefined();
  });
});
