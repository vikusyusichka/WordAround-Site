/* Pure reducer for the Essays practice screen — no I/O, timing lives in the
   hook. Web port of the topic/editor slice of EssayPracticeViewModel.swift
   (scoring/hints/grammar-check pieces are deliberately out of 4C1 scope). */
import {
  DEFAULT_DIFFICULTY,
  DEFAULT_LANGUAGE,
  computeWordCount,
  evaluateValidation,
  type EssayDifficulty,
  type EssayTopicMode,
  type EssayValidation,
  type GeneratedEssayTask,
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
  | { type: 'RESET_ESSAY' };

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
});

/* MARK: - Reducer */

export const essayReducer = (s: EssayState, action: EssayAction): EssayState => {
  switch (action.type) {
    case 'SET_TOPIC_MODE':
      if (action.mode === s.topicMode) return s;
      return {
        ...s,
        topicMode: action.mode,
        // Switching modes clears prior errors — a fresh generation is expected.
        generationError: null,
      };

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
      return {
        ...s,
        essayText: action.text,
        wordCount,
        validation: evaluateValidation(wordCount, min, max),
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
        /* Sync UI difficulty to the AI-detected level, matching iOS
           applyGeneratedTask (EssayPracticeViewModel.swift:805-810). */
        selectedDifficulty: task.detectedLevel,
        essayText: '',
        wordCount: 0,
        validation: 'empty',
        usedTaskTitles: nextTitles,
      };
    }

    case 'GENERATION_FAIL':
      return { ...s, isGenerating: false, generationError: action.error };

    case 'RESET_ESSAY':
      return { ...s, essayText: '', wordCount: 0, validation: 'empty' };

    default:
      return s;
  }
};
