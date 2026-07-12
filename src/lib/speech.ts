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
