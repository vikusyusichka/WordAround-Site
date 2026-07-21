import { describe, expect, it } from 'vitest';

import {
  appendTranscriptChunk,
  emptyTranscript,
  transcriptText,
  transcriptWordCount,
} from './speakingFreeSpeaking';

describe('appendTranscriptChunk', () => {
  it('appends a trimmed chunk as both a chunk and a user message', () => {
    const s = appendTranscriptChunk(emptyTranscript(), '  Hello world  ');
    expect(s.chunks).toEqual(['Hello world']);
    expect(s.messages).toEqual([{ role: 'user', text: 'Hello world' }]);
    expect(s.lastSubmitted).toBe('Hello world');
  });

  it('ignores empty/whitespace-only input (same reference back)', () => {
    const base = emptyTranscript();
    expect(appendTranscriptChunk(base, '   ')).toBe(base);
    expect(appendTranscriptChunk(base, '')).toBe(base);
  });

  it('dedupes an immediate repeat of the last chunk', () => {
    const a = appendTranscriptChunk(emptyTranscript(), 'I like coffee');
    const b = appendTranscriptChunk(a, 'I like coffee');
    expect(b).toBe(a);
    expect(b.chunks).toHaveLength(1);
  });

  it('allows the same text again after a different chunk in between', () => {
    let s = appendTranscriptChunk(emptyTranscript(), 'yes');
    s = appendTranscriptChunk(s, 'no');
    s = appendTranscriptChunk(s, 'yes');
    expect(s.chunks).toEqual(['yes', 'no', 'yes']);
    expect(s.messages).toHaveLength(3);
  });
});

describe('transcript helpers', () => {
  it('transcriptText joins chunks with a space', () => {
    let s = appendTranscriptChunk(emptyTranscript(), 'one two');
    s = appendTranscriptChunk(s, 'three');
    expect(transcriptText(s)).toBe('one two three');
  });

  it('transcriptWordCount counts words across chunks; 0 when empty', () => {
    expect(transcriptWordCount(emptyTranscript())).toBe(0);
    let s = appendTranscriptChunk(emptyTranscript(), 'one two');
    s = appendTranscriptChunk(s, 'three four five');
    expect(transcriptWordCount(s)).toBe(5);
  });
});
