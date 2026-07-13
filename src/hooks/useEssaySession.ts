/* Wraps the essaySession reducer with the AI network calls.
   AbortController lives in a ref so unmount / rapid regenerate cancels the
   in-flight fetch instead of leaking a controller (or racing dispatches). */
import { useCallback, useEffect, useReducer, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import * as essayService from '@/lib/essayService';
import {
  essayReducer,
  initialEssayState,
  type EssayAction,
} from '@/lib/essaySession';

export const useEssaySession = () => {
  const { t } = useTranslation();
  const [state, dispatch] = useReducer(essayReducer, undefined, initialEssayState);
  const controllerRef = useRef<AbortController | null>(null);

  /* Cancel any in-flight request on unmount. */
  useEffect(
    () => () => {
      controllerRef.current?.abort();
    },
    [],
  );

  const generateTopic = useCallback(async () => {
    // Abort any previous request so state stays coherent.
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    if (state.topicMode === 'custom' && state.customTopicText.trim().length === 0) {
      dispatch({ type: 'GENERATION_FAIL', error: t('writing.essays.error.emptyCustomTopic') });
      return;
    }

    dispatch({ type: 'GENERATION_START' });
    try {
      const task =
        state.topicMode === 'suggested'
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
      // Only accept the result if we're still the current controller.
      if (controllerRef.current !== controller) return;
      dispatch({ type: 'GENERATION_SUCCESS', task });
    } catch (e) {
      if (controller.signal.aborted) return; // silent — user cancelled
      const message =
        e instanceof Error && e.message ? e.message : t('writing.essays.error.generationFailed');
      dispatch({ type: 'GENERATION_FAIL', error: message });
    }
  }, [state.topicMode, state.customTopicText, state.selectedLanguage, state.usedTaskTitles, t]);

  return {
    state,
    dispatch: dispatch as React.Dispatch<EssayAction>,
    generateTopic,
  };
};
