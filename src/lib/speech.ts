/* Text-to-speech via the Web Speech API — web substitute for iOS
   AVSpeechSynthesizer. No-op where speechSynthesis is unavailable. */

const pickVoice = (lang: string): SpeechSynthesisVoice | undefined => {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === lang) ??
    voices.find((v) => v.lang.startsWith(lang.split('-')[0])) ??
    undefined
  );
};

export const isSpeechSupported = (): boolean =>
  typeof window !== 'undefined' && 'speechSynthesis' in window;

/** Speak `text` in `lang` (e.g. 'en-US' for the word, 'uk-UA' for the
    translation — matching iOS), cancelling anything in progress. */
export const speak = (text: string, lang = 'en-US'): void => {
  if (!isSpeechSupported() || !text.trim()) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  const voice = pickVoice(lang);
  if (voice) utterance.voice = voice;
  utterance.rate = 0.9;
  utterance.pitch = 1.02;
  window.speechSynthesis.speak(utterance);
};

/* --- Listening TTS (Phase 6) — long-form speech with voice-type and rate
   control, pause/resume/stop. Web port of AVFoundationListeningSpeechService;
   gender picking uses the iOS name-hint lists since the Web Speech API has no
   gender attribute. --- */

const MALE_HINTS = ['daniel', 'aaron', 'fred', 'tom', 'alex', 'rishi', 'jacques', 'martin', 'nathan', 'lee', 'male', 'david', 'mark'];
const FEMALE_HINTS = ['samantha', 'karen', 'moira', 'tessa', 'allison', 'ava', 'zira', 'fiona', 'martha', 'victoria', 'female', 'susan', 'hazel'];

export type SpeechVoiceType = 'default' | 'female' | 'male';

const pickListeningVoice = (
  lang: string,
  voiceType: SpeechVoiceType,
): SpeechSynthesisVoice | undefined => {
  const voices = window.speechSynthesis.getVoices();
  const prefix = lang.split('-')[0];
  const matching = voices.filter((v) => v.lang === lang || v.lang.startsWith(prefix));
  if (matching.length === 0) return undefined;
  if (voiceType !== 'default') {
    const hints = voiceType === 'male' ? MALE_HINTS : FEMALE_HINTS;
    const byHint = matching.find((v) =>
      hints.some((hint) => v.name.toLowerCase().includes(hint)),
    );
    if (byHint) return byHint;
  }
  return matching.find((v) => v.lang === lang) ?? matching[0];
};

export interface ListeningSpeechOptions {
  locale: string;
  rate: number;
  voiceType: SpeechVoiceType;
  onStart?: () => void;
  onEnd?: () => void;
}

/** Speak long-form text with rate/voice control. `onEnd` fires only on
    natural completion — not when stopped (iOS didCancel parity). */
export const speakListening = (text: string, options: ListeningSpeechOptions): void => {
  if (!isSpeechSupported()) {
    options.onEnd?.();
    return;
  }
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    options.onEnd?.();
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(trimmed);
  utterance.lang = options.locale;
  const voice = pickListeningVoice(options.locale, options.voiceType);
  if (voice) utterance.voice = voice;
  utterance.rate = 0.9 * options.rate;
  utterance.pitch = 1.0;
  utterance.onstart = () => options.onStart?.();
  utterance.onend = () => options.onEnd?.();
  /* onerror covers cancel() in some browsers — intentionally NOT wired to
     onEnd so user-stops don't count as completion. */
  window.speechSynthesis.speak(utterance);
};

export const pauseListeningSpeech = (): void => {
  if (isSpeechSupported()) window.speechSynthesis.pause();
};

export const resumeListeningSpeech = (): void => {
  if (isSpeechSupported()) window.speechSynthesis.resume();
};

export const stopListeningSpeech = (): void => {
  if (isSpeechSupported()) window.speechSynthesis.cancel();
};
