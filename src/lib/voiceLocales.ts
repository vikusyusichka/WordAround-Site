/* BCP-47 locale for speech synthesis and recognition, one per language the
   setup screens offer. Every entry in ESSAY_LANGUAGES must appear here: a gap
   falls through to en-US, so picking Czech gave an English-speaking tutor and
   English recognition with nothing on screen to say so.

   This lives on its own, away from any one module, because both Speaking and
   Listening speak. Listening used to keep a second, shorter map of its own —
   eight languages against this one's thirty — while the "no voice for this
   language" warning beside its picker was computed from THIS map. So the
   warning said a Czech voice was available and the synthesiser was handed
   en-US. One map means the two halves cannot disagree again.

   A locale here means the app ASKS for that language. Whether the browser can
   answer is a separate question — voices and recognition support vary by
   browser and operating system, and Esperanto in particular has no system
   voice anywhere. See hasVoiceForLanguage(). */
const VOICE_LOCALES: Record<string, string> = {
  english: 'en-US',
  spanish: 'es-ES',
  french: 'fr-FR',
  german: 'de-DE',
  italian: 'it-IT',
  portuguese: 'pt-PT',
  dutch: 'nl-NL',
  catalan: 'ca-ES',
  galician: 'gl-ES',
  esperanto: 'eo',
  polish: 'pl-PL',
  ukrainian: 'uk-UA',
  russian: 'ru-RU',
  czech: 'cs-CZ',
  slovak: 'sk-SK',
  croatian: 'hr-HR',
  serbian: 'sr-RS',
  slovenian: 'sl-SI',
  bulgarian: 'bg-BG',
  romanian: 'ro-RO',
  hungarian: 'hu-HU',
  greek: 'el-GR',
  turkish: 'tr-TR',
  swedish: 'sv-SE',
  danish: 'da-DK',
  norwegian: 'nb-NO',
  finnish: 'fi-FI',
  lithuanian: 'lt-LT',
  latvian: 'lv-LV',
  estonian: 'et-EE',
};

export const voiceLocaleFor = (languageId: string): string =>
  VOICE_LOCALES[languageId] ?? 'en-US';

/* Does this browser actually have a voice for the language? Asking for a
   locale is not the same as being able to speak it, and a silent wrong-voice
   session is worse than a warning. Returns null while the voice list is still
   loading (Chrome populates it asynchronously). */
export const hasVoiceForLanguage = (languageId: string): boolean | null => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  const locale = voiceLocaleFor(languageId).toLowerCase();
  const base = locale.split('-')[0];
  return voices.some((v) => v.lang.toLowerCase().split('-')[0] === base);
};
