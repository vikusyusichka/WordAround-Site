/* Types + static config for Phase 6 Listening. Everything here is
   device-local (IndexedDB) — nothing goes to Firestore. Mirrors the iOS
   Listening Shared models; dates are epoch millis. */
import type { HomeSetPreviewItem } from '@/lib/homeTypes';

export type ListeningModeId =
  | 'listen-from-text'
  | 'import-audio'
  | 'import-video'
  | 'saved-practice';

export interface ListeningMenuItemDef {
  id: ListeningModeId;
  titleKey: string;
  subtitleKey: string;
  iconSystemName: string;
  accentColor: string;
  blobColor: string;
  enabled: boolean;
}

/* iOS ListeningMode.allModes + ListeningTheme colors. */
export const LISTENING_MENU_ITEMS: ListeningMenuItemDef[] = [
  {
    id: 'listen-from-text',
    titleKey: 'listening.menu.fromText.title',
    subtitleKey: 'listening.menu.fromText.subtitle',
    iconSystemName: 'headphones',
    accentColor: '#3394D1',
    blobColor: '#D6EBFA',
    enabled: true,
  },
  {
    id: 'import-audio',
    titleKey: 'listening.menu.importAudio.title',
    subtitleKey: 'listening.menu.importAudio.subtitle',
    iconSystemName: 'waveform.badge.plus',
    accentColor: '#8C66EB',
    blobColor: '#E6DBFA',
    enabled: true,
  },
  {
    id: 'import-video',
    titleKey: 'listening.menu.importVideo.title',
    subtitleKey: 'listening.menu.importVideo.subtitle',
    iconSystemName: 'film.stack',
    accentColor: '#29A89E',
    blobColor: '#D1F2ED',
    enabled: false,
  },
  {
    id: 'saved-practice',
    titleKey: 'listening.menu.saved.title',
    subtitleKey: 'listening.menu.saved.subtitle',
    iconSystemName: 'bookmark.fill',
    accentColor: '#ED6699',
    blobColor: '#FADBE7',
    enabled: false,
  },
];

/* --- Enums --- */

export type ListeningQuestionType = 'mainIdea' | 'details' | 'vocabulary' | 'trueFalse';
export const LISTENING_QUESTION_TYPES: ListeningQuestionType[] = [
  'mainIdea', 'details', 'vocabulary', 'trueFalse',
];

export type ListeningVoiceSpeed = 'slow' | 'normal' | 'fast';
export const LISTENING_VOICE_SPEEDS: ListeningVoiceSpeed[] = ['slow', 'normal', 'fast'];

/** Display labels (iOS raw values) + rate multipliers. Note the iOS quirk:
    TTS rates are ×0.85/×1.0/×1.2 while the display labels and audio
    playback rates are 0.75/1.0/1.25. */
export const VOICE_SPEED_META: Record<
  ListeningVoiceSpeed,
  { label: string; ttsRate: number; playbackRate: number }
> = {
  slow: { label: '0.75x', ttsRate: 0.85, playbackRate: 0.75 },
  normal: { label: '1.0x', ttsRate: 1.0, playbackRate: 1.0 },
  fast: { label: '1.25x', ttsRate: 1.2, playbackRate: 1.25 },
};

export type ListeningVoiceType = 'default' | 'female' | 'male';
export const LISTENING_VOICE_TYPES: ListeningVoiceType[] = ['default', 'female', 'male'];

export type ListeningSessionStatus = 'draft' | 'inProgress' | 'completed';

/* --- Question / result models --- */

export interface ListeningQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  type: ListeningQuestionType;
  explanation?: string;
}

export interface ListeningMistake {
  prompt: string;
  selectedAnswer: string;
  correctAnswer: string;
  explanation?: string;
}

export interface ListeningResult {
  id: string;
  comprehensionPercent: number;
  correctAnswers: number;
  totalQuestions: number;
  listeningTimeSeconds: number;
  speedLabel: string;
  mistakes: ListeningMistake[];
  hasQuestions: boolean;
}

/* --- Persisted session (iOS ListeningPersistedSession; local-only) --- */

export interface ListeningPersistedSession {
  id: string;
  modeID: ListeningModeId | string;
  title: string;
  languageId: string;
  level: string;
  createdAt: number;
  updatedAt: number;
  durationSeconds: number;
  elapsedSeconds: number;
  progress: number;
  playbackPosition: number;
  text?: string;
  /** IndexedDB media-blob key (iOS localAudioFileName equivalent). */
  mediaKey?: string;
  transcript?: string;
  voiceSpeed: ListeningVoiceSpeed;
  voiceType: ListeningVoiceType;
  showTextWhileListening: boolean;
  addQuestions: boolean;
  questions: ListeningQuestion[];
  /** question id → selected option index. */
  selectedAnswers: Record<string, number>;
  result?: ListeningResult;
  status: ListeningSessionStatus;
}

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);

/** iOS displayProgress: completed → 1; with questions → 50% listening + 50%
    answered, capped 0.99; else raw progress capped 0.99. */
export const displayProgress = (s: ListeningPersistedSession): number => {
  if (s.status === 'completed') return 1;
  if (s.addQuestions && s.questions.length > 0) {
    const answered = Object.keys(s.selectedAnswers).length / Math.max(s.questions.length, 1);
    return Math.min(clamp01(s.progress) * 0.5 + answered * 0.5, 0.99);
  }
  return Math.min(clamp01(s.progress), 0.99);
};

/* --- Setup (ListenFromText) --- */

export interface ListeningTextSetup {
  languageId: string;
  level: string;
  title: string;
  text: string;
  voiceSpeed: ListeningVoiceSpeed;
  voiceType: ListeningVoiceType;
  showTextWhileListening: boolean;
  addQuestions: boolean;
  questionCount: number;
  questionTypes: ListeningQuestionType[];
  estimatedMinutes: number;
}

/* iOS validation constants. */
export const LISTENING_MIN_CHARACTERS = 40;
export const LISTENING_MAX_CHARACTERS = 5000;
export const LISTENING_MIN_WORDS_FOR_QUESTIONS = 40;
export const LISTENING_QUESTION_COUNTS = [3, 5, 8];
export const LISTENING_WPM_ESTIMATE = 130;

/** iOS estimatedMinutes = max(1, words / 130). */
export const listeningEstimatedMinutes = (wordCount: number): number =>
  Math.max(1, Math.floor(wordCount / LISTENING_WPM_ESTIMATE));

/* BCP-47 speech locales for the web's 8-language subset. */
export const LISTENING_LOCALES: Record<string, string> = {
  english: 'en-US',
  spanish: 'es-ES',
  french: 'fr-FR',
  german: 'de-DE',
  italian: 'it-IT',
  ukrainian: 'uk-UA',
  polish: 'pl-PL',
  russian: 'ru-RU',
};

export const listeningLocaleFor = (languageId: string): string =>
  LISTENING_LOCALES[languageId] ?? 'en-US';

/* Landing progress card scaffold (numbers filled at render from the local
   store — this one is REAL, unlike the Writing/Reading stubs). */
export const LISTENING_TODAY_GOAL: HomeSetPreviewItem = {
  id: 'listening-today',
  title: '',
  subtitle: '',
  iconSystemName: 'headphones',
  currentValue: 0,
  totalValue: 15,
  unit: 'min',
  progress: 0,
  accentColor: '#3394D1',
  backgroundColor: 'var(--color-goal-bg)',
  progressBackgroundColor: 'var(--color-goal-progress-bg)',
  titleColor: 'var(--color-primary-blue-dark)',
  valueColor: 'var(--color-primary-blue-dark)',
  subtitleColor: 'var(--color-text-secondary)',
  iconBackground: '#ffffff',
  blobColor: '#D6EBFA',
};
