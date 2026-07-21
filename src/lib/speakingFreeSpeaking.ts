/* Free Speaking transcript accumulation — pure, web port of the transcript
   handling in FreeSpeakingViewModel. A monologue: no AI replies, just chunks
   of learner speech (from STT or the text field) collected into an ordered
   transcript that feeds `speaking_feedback` at the end. */
import type { SpeakingMessage } from '@/lib/speakingTypes';

export interface FreeSpeakingTranscript {
  chunks: string[];
  messages: SpeakingMessage[];
  lastSubmitted: string;
}

export const emptyTranscript = (): FreeSpeakingTranscript => ({
  chunks: [],
  messages: [],
  lastSubmitted: '',
});

/* Append a spoken/typed chunk. Mirrors iOS handleFinalTranscript: trim, drop
   empties, and dedupe against the immediately preceding chunk (STT can fire the
   same final result twice). Returns the same object reference when nothing
   changed so callers can skip a re-render. */
export const appendTranscriptChunk = (
  state: FreeSpeakingTranscript,
  rawText: string,
): FreeSpeakingTranscript => {
  const trimmed = rawText.trim();
  if (trimmed.length === 0) return state;
  if (trimmed === state.lastSubmitted) return state;
  return {
    chunks: [...state.chunks, trimmed],
    messages: [...state.messages, { role: 'user', text: trimmed }],
    lastSubmitted: trimmed,
  };
};

export const transcriptText = (state: FreeSpeakingTranscript): string =>
  state.chunks.join(' ');

export const transcriptWordCount = (state: FreeSpeakingTranscript): number => {
  const text = transcriptText(state).trim();
  return text.length === 0 ? 0 : text.split(/\s+/).length;
};
