/* Exam prep — playing a listening script with the browser's voices.

   Each speaker keeps one voice for the whole recording (alternating female /
   male where the browser has both), so a conversation sounds like one. This
   is the stand-in until server TTS exists; quality depends on the voices the
   device ships. */

import { isSpeechSupported, pickListeningVoice } from '@/lib/speech';
import { voiceLocaleFor } from '@/lib/voiceLocales';

export interface ScriptLine {
  speaker: string;
  text: string;
}

let playToken = 0;

/** Plays `script` line by line; `onEnd` fires only when it finishes on its own. */
export const playScript = (
  script: ScriptLine[],
  languageId: string,
  callbacks: { onLine?: (index: number) => void; onEnd?: () => void } = {},
): void => {
  if (!isSpeechSupported() || script.length === 0) {
    callbacks.onEnd?.();
    return;
  }
  const token = ++playToken;
  window.speechSynthesis.cancel();
  const locale = voiceLocaleFor(languageId);
  const speakers = [...new Set(script.map((line) => line.speaker))];
  const voiceFor = (speaker: string) =>
    pickListeningVoice(locale, speakers.indexOf(speaker) % 2 === 0 ? 'female' : 'male');

  const speakAt = (index: number) => {
    if (token !== playToken) return;
    const line = script[index];
    if (!line) {
      callbacks.onEnd?.();
      return;
    }
    callbacks.onLine?.(index);
    const utterance = new SpeechSynthesisUtterance(line.text);
    utterance.lang = locale;
    const voice = voiceFor(line.speaker);
    if (voice) utterance.voice = voice;
    utterance.rate = 0.95;
    /* Different pitch keeps two speakers apart when the device has one voice. */
    utterance.pitch = speakers.indexOf(line.speaker) % 2 === 0 ? 1.05 : 0.85;
    utterance.onend = () => window.setTimeout(() => speakAt(index + 1), 350);
    window.speechSynthesis.speak(utterance);
  };
  speakAt(0);
};

export const stopScript = (): void => {
  playToken += 1;
  if (isSpeechSupported()) window.speechSynthesis.cancel();
};

/** Reads one examiner question aloud. */
export const speakQuestion = (text: string, languageId: string): void => {
  playScript([{ speaker: 'examiner', text }], languageId);
};
