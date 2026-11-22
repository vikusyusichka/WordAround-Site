/* Wraps the essaySession reducer with the AI network calls.
   AbortControllers live in refs (one per side-effect kind) so unmount /
   rapid re-fires cancel in-flight fetches instead of leaking controllers
   or racing dispatches. */
import { useCallback, useEffect, useReducer, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { recordPractice } from '@/lib/dailyPracticeStats';
import { checkGrammar } from '@/lib/grammarCheck';
import * as essayService from '@/lib/essayService';
import { scoreEssay } from '@/lib/essayScoring';
import {
  essayReducer,
  initialEssayState,
  type EssayAction,
} from '@/lib/essaySession';
import { HINTS_LIMIT, type EssayTopicMode } from '@/lib/essayTypes';

export const useEssaySession = () => {
  const { t } = useTranslation();
  const [state, dispatch] = useReducer(essayReducer, undefined, initialEssayState);
  const topicControllerRef = useRef<AbortController | null>(null);
  const hintControllerRef = useRef<AbortController | null>(null);
  const checkControllerRef = useRef<AbortController | null>(null);

  /* Cancel every in-flight request on unmount. */
  useEffect(
    () => () => {
      topicControllerRef.current?.abort();
      hintControllerRef.current?.abort();
      checkControllerRef.current?.abort();
    },
    [],
  );

  const generateTopic = useCallback(async (modeOverride?: EssayTopicMode) => {
    /* The mode switch dispatches and generates in one click, before the new
       mode reaches this closure — so the caller can name it. */
    const mode = modeOverride ?? state.topicMode;
    topicControllerRef.current?.abort();
    const controller = new AbortController();
    topicControllerRef.current = controller;

    if (mode === 'custom' && state.customTopicText.trim().length === 0) {
      dispatch({ type: 'GENERATION_FAIL', error: t('writing.essays.error.emptyCustomTopic') });
      return;
    }

    dispatch({ type: 'GENERATION_START' });
    try {
      const task =
        mode === 'suggested'
          ? await essayService.generateSuggestedTask(
              state.selectedLanguage,
              state.usedTaskTitles,
              controller.signal,
            )
          : await essayService.generateCustomTopicTask(
              state.customTopicText,
              state.selectedLanguage,
              controller.signal,
            );
      if (topicControllerRef.current !== controller) return;
      dispatch({ type: 'GENERATION_SUCCESS', task });
    } catch (e) {
      if (controller.signal.aborted) return;
      const message =
        e instanceof Error && e.message ? e.message : t('writing.essays.error.generationFailed');
      dispatch({ type: 'GENERATION_FAIL', error: message });
    }
  }, [state.topicMode, state.customTopicText, state.selectedLanguage, state.usedTaskTitles, t]);

  const requestHint = useCallback(async () => {
    if (!state.task) return;
    if (state.isRequestingHint) return;
    const limit = HINTS_LIMIT[state.selectedDifficulty];
    if (state.hintsUsedCount >= limit) return;

    hintControllerRef.current?.abort();
    const controller = new AbortController();
    hintControllerRef.current = controller;

    dispatch({ type: 'HINT_START' });
    try {
      const hint = await essayService.generateHint(
        {
          language: state.selectedLanguage,
          level: state.selectedDifficulty,
          topicTitle: state.task.title,
          task: state.task.task,
          essayText: state.essayText,
          previousHints: state.hints.map((h) => h.text),
        },
        controller.signal,
      );
      if (hintControllerRef.current !== controller) return;
      dispatch({ type: 'HINT_SUCCESS', hint });
    } catch (e) {
      if (controller.signal.aborted) return;
      const message =
        e instanceof Error && e.message ? e.message : t('writing.essays.hint.error');
      dispatch({ type: 'HINT_FAIL', error: message });
    }
  }, [
    state.task, state.isRequestingHint, state.selectedDifficulty, state.hintsUsedCount,
    state.selectedLanguage, state.essayText, state.hints, t,
  ]);

  const checkEssay = useCallback(async () => {
    if (!state.task) return;
    if (state.validation !== 'valid') return;
    if (state.isChecking) return;

    checkControllerRef.current?.abort();
    const controller = new AbortController();
    checkControllerRef.current = controller;

    dispatch({ type: 'CHECK_START' });
    try {
      const issues = await checkGrammar(state.essayText, state.selectedLanguage, controller.signal);
      if (checkControllerRef.current !== controller) return;
      const score = scoreEssay({
        text: state.essayText,
        topic: state.task.title,
        wordLimitMin: state.task.wordLimitMin,
        wordLimitMax: state.task.wordLimitMax,
        grammarIssues: issues,
        usedHints: state.hintsUsedCount,
        usedTranslations: state.usedTranslations,
        usedSynonyms: state.usedSynonyms,
        difficulty: state.selectedDifficulty,
      });
      /* Count only words not already counted by an earlier check of this
         essay towards today's writing goal (iOS recordWritingPracticeStats). */
      const delta = state.wordCount - state.lastRecordedWordCount;
      dispatch({
        type: 'CHECK_SUCCESS',
        issues,
        score,
        recordedWordCount: delta > 0 ? state.wordCount : undefined,
      });
      if (delta > 0) recordPractice({ skill: 'writing', value: delta, sourceModeID: 'essays' });
    } catch (e) {
      if (controller.signal.aborted) return;
      const message =
        e instanceof Error && e.message ? e.message : t('writing.essays.check.error');
      dispatch({ type: 'CHECK_FAIL', error: message });
    }
  }, [
    state.task, state.validation, state.isChecking, state.essayText,
    state.selectedLanguage, state.selectedDifficulty, state.hintsUsedCount,
    state.usedTranslations, state.usedSynonyms, state.wordCount, state.lastRecordedWordCount, t,
  ]);

  return {
    state,
    dispatch: dispatch as React.Dispatch<EssayAction>,
    generateTopic,
    requestHint,
    checkEssay,
  };
};
