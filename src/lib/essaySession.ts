/* Pure reducer for the Essays practice screen — no I/O, timing lives in the
   hook. Web port of EssayPracticeViewModel.swift covering topic generation
   (4C1) + AI hints + local scoring based on LanguageTool grammar issues (4C2). */
import { scoreEssay } from '@/lib/essayScoring';
import {
  DEFAULT_DIFFICULTY,
  DEFAULT_LANGUAGE,
  computeWordCount,
  evaluateValidation,
  type EssayDifficulty,
  type EssayGeneratedHint,
  type EssayScore,
  type EssayTopicMode,
  type EssayValidation,
  type GeneratedEssayTask,
  type GrammarIssue,
  type GrammarLanguage,
} from '@/lib/essayTypes';

/** How many recent titles to remember for suggested-topic dedup — matches iOS. */
const AVOID_HISTORY_CAP = 12;

export interface EssayState {
  topicMode: EssayTopicMode;
  customTopicText: string;
  task: GeneratedEssayTask | null;
  isGenerating: boolean;
  generationError: string | null;
  essayText: string;
  wordCount: number;
  validation: EssayValidation;
  selectedLanguage: GrammarLanguage;
  selectedDifficulty: EssayDifficulty;
  /** Rolling window of the last N generated titles (most recent last). */
  usedTaskTitles: string[];

  /* 4C2 — AI hints */
  hints: EssayGeneratedHint[];
  /** Tracked separately so scoreEssay's independence sub-score sees the count
      even if the UI list is filtered/cleared later. */
  hintsUsedCount: number;
  isRequestingHint: boolean;
  hintError: string | null;

  /* 4C2 — grammar check + score */
  grammarIssues: GrammarIssue[];
  score: EssayScore | null;
  isChecking: boolean;
  checkError: string | null;

  /* 4C3 — helper toolbar usage (feeds the independence sub-score). */
  usedTranslations: number;
  usedSynonyms: number;
}

export type EssayAction =
  | { type: 'SET_TOPIC_MODE'; mode: EssayTopicMode }
  | { type: 'SET_CUSTOM_TOPIC'; text: string }
  | { type: 'SET_LANGUAGE'; language: GrammarLanguage }
  | { type: 'SET_DIFFICULTY'; difficulty: EssayDifficulty }
  | { type: 'SET_ESSAY_TEXT'; text: string }
  | { type: 'GENERATION_START' }
  | { type: 'GENERATION_SUCCESS'; task: GeneratedEssayTask }
  | { type: 'GENERATION_FAIL'; error: string }
  | { type: 'RESET_ESSAY' }
  /* 4C2 */
  | { type: 'HINT_START' }
  | { type: 'HINT_SUCCESS'; hint: EssayGeneratedHint }
  | { type: 'HINT_FAIL'; error: string }
  | { type: 'CHECK_START' }
  | { type: 'CHECK_SUCCESS'; issues: GrammarIssue[]; score: EssayScore }
  | { type: 'CHECK_FAIL'; error: string }
  | { type: 'CLEAR_FEEDBACK' }
  /* 4C3 */
  | { type: 'RECORD_TRANSLATION' }
  | { type: 'RECORD_SYNONYM' };

export const initialEssayState = (): EssayState => ({
  topicMode: 'suggested',
  customTopicText: '',
  task: null,
  isGenerating: false,
  generationError: null,
  essayText: '',
  wordCount: 0,
  validation: 'empty',
  selectedLanguage: DEFAULT_LANGUAGE,
  selectedDifficulty: DEFAULT_DIFFICULTY,
  usedTaskTitles: [],

  hints: [],
  hintsUsedCount: 0,
  isRequestingHint: false,
  hintError: null,

  grammarIssues: [],
  score: null,
  isChecking: false,
  checkError: null,

  usedTranslations: 0,
  usedSynonyms: 0,
});

/** Wipe every feedback-related field. Called on essay text change, new topic,
    or explicit reset — old score is stale as soon as the input changes. */
const clearedFeedback = (): Pick<EssayState, 'grammarIssues' | 'score' | 'checkError'> => ({
  grammarIssues: [],
  score: null,
  checkError: null,
});

/** Wipe every hint-related field. Called on new topic. */
const clearedHints = (): Pick<EssayState, 'hints' | 'hintsUsedCount' | 'hintError'> => ({
  hints: [],
  hintsUsedCount: 0,
  hintError: null,
});

/** Wipe helper-toolbar usage counters. Called on new topic. */
const clearedAssistance = (): Pick<EssayState, 'usedTranslations' | 'usedSynonyms'> => ({
  usedTranslations: 0,
  usedSynonyms: 0,
});

/** Recompute the score from the current state IF one already exists. Called
    whenever a usage counter changes (hint / translation / synonym) since the
    independence sub-score depends on all three. Returns the prior score
    unchanged when there's nothing to re-score. */
const rescore = (s: EssayState, overrides: Partial<Pick<EssayState,
  'hintsUsedCount' | 'usedTranslations' | 'usedSynonyms'>> = {}): EssayScore | null => {
  if (!s.score || !s.task) return s.score;
  return scoreEssay({
    text: s.essayText,
    topic: s.task.title,
    wordLimitMin: s.task.wordLimitMin,
    wordLimitMax: s.task.wordLimitMax,
    grammarIssues: s.grammarIssues,
    usedHints: overrides.hintsUsedCount ?? s.hintsUsedCount,
    usedTranslations: overrides.usedTranslations ?? s.usedTranslations,
    usedSynonyms: overrides.usedSynonyms ?? s.usedSynonyms,
    difficulty: s.selectedDifficulty,
  });
};

/* MARK: - Reducer */

export const essayReducer = (s: EssayState, action: EssayAction): EssayState => {
  switch (action.type) {
    case 'SET_TOPIC_MODE':
      if (action.mode === s.topicMode) return s;
      return { ...s, topicMode: action.mode, generationError: null };

    case 'SET_CUSTOM_TOPIC':
      return { ...s, customTopicText: action.text, generationError: null };

    case 'SET_LANGUAGE':
      return { ...s, selectedLanguage: action.language };

    case 'SET_DIFFICULTY':
      return { ...s, selectedDifficulty: action.difficulty };

    case 'SET_ESSAY_TEXT': {
      const wordCount = computeWordCount(action.text);
      const min = s.task?.wordLimitMin ?? 0;
      const max = s.task?.wordLimitMax ?? Number.MAX_SAFE_INTEGER;
      /* Editing invalidates the previous grammar-check + score. */
      return {
        ...s,
        essayText: action.text,
        wordCount,
        validation: evaluateValidation(wordCount, min, max),
        ...clearedFeedback(),
      };
    }

    case 'GENERATION_START':
      return { ...s, isGenerating: true, generationError: null };

    case 'GENERATION_SUCCESS': {
      const { task } = action;
      const nextTitles = [...s.usedTaskTitles, task.title].slice(-AVOID_HISTORY_CAP);
      return {
        ...s,
        task,
        isGenerating: false,
        generationError: null,
        selectedDifficulty: task.detectedLevel,
        essayText: '',
        wordCount: 0,
        validation: 'empty',
        usedTaskTitles: nextTitles,
        ...clearedFeedback(),
        ...clearedHints(),
        ...clearedAssistance(),
      };
    }

    case 'GENERATION_FAIL':
      return { ...s, isGenerating: false, generationError: action.error };

    case 'RESET_ESSAY':
      return {
        ...s,
        essayText: '',
        wordCount: 0,
        validation: 'empty',
        ...clearedFeedback(),
      };

    /* 4C2 — Hints */

    case 'HINT_START':
      return { ...s, isRequestingHint: true, hintError: null };

    case 'HINT_SUCCESS': {
      const hints = [...s.hints, action.hint];
      const hintsUsedCount = s.hintsUsedCount + 1;
      /* Re-score if one exists — independence depends on hint usage.
         iOS: recalculateScoreIfNeeded. */
      const score = rescore(s, { hintsUsedCount });
      return { ...s, hints, hintsUsedCount, isRequestingHint: false, hintError: null, score };
    }

    case 'HINT_FAIL':
      return { ...s, isRequestingHint: false, hintError: action.error };

    /* 4C2 — Check (grammar + score) */

    case 'CHECK_START':
      return { ...s, isChecking: true, checkError: null };

    case 'CHECK_SUCCESS':
      return {
        ...s,
        isChecking: false,
        checkError: null,
        grammarIssues: action.issues,
        score: action.score,
      };

    case 'CHECK_FAIL':
      return { ...s, isChecking: false, checkError: action.error };

    case 'CLEAR_FEEDBACK':
      return { ...s, ...clearedFeedback() };

    /* 4C3 — helper usage counters (re-score on change). */

    case 'RECORD_TRANSLATION': {
      const usedTranslations = s.usedTranslations + 1;
      return { ...s, usedTranslations, score: rescore(s, { usedTranslations }) };
    }

    case 'RECORD_SYNONYM': {
      const usedSynonyms = s.usedSynonyms + 1;
      return { ...s, usedSynonyms, score: rescore(s, { usedSynonyms }) };
    }

    default:
      return s;
  }
};
