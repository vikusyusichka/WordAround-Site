/* Reading-session hook — wraps the pure reducer with timing + network side
   effects: 1s timer (when the readingTimer toggle is on), MyMemory word
   translation (cached — the free API is rate-limited), partial-progress save
   on unmount, and completion persistence. */
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { recordPractice } from '@/lib/dailyPracticeStats';
import { translate } from '@/lib/essayAssistance';
import { ESSAY_LANGUAGES, findLanguage } from '@/lib/essayTypes';
import { generateReadingQuestions, maxQuestionsForFocus } from '@/lib/readingQuestionService';
import {
  initialReadingSessionState,
  readingProgressEstimate,
  readingSessionReducer,
} from '@/lib/readingSession';
import { markReadingCompleted, updateReadingProgress } from '@/lib/readingStorageService';
import { assistanceFromToggles } from '@/lib/readingTypes';
import type { ReadingLibraryItem } from '@/lib/models';

/** iOS defaultTargetLanguage: device language if supported and ≠ text
    language; else English; else Ukrainian (when the text is English). */
export const defaultTranslationTarget = (textLanguageId: string): string => {
  const device = (navigator.language ?? 'en').slice(0, 2).toLowerCase();
  const match = ESSAY_LANGUAGES.find((l) => l.shortTitle.toLowerCase() === device);
  if (match && match.id !== textLanguageId) return match.id;
  if (textLanguageId !== 'english') return 'english';
  return 'ukrainian';
};

export const useReadingSession = (item: ReadingLibraryItem) => {
  const qc = useQueryClient();
  const [state, dispatch] = useReducer(readingSessionReducer, initialReadingSessionState);
  const assistance = assistanceFromToggles(item.toggles);

  const [targetLanguageId, setTargetLanguageId] = useState(() =>
    defaultTranslationTarget(item.languageCode),
  );
  const [translation, setTranslation] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState(false);
  const translateAbort = useRef<AbortController | null>(null);
  const cache = useRef(new Map<string, string>());

  /* Freeze the latest state for the unmount-save effect. */
  const stateRef = useRef(state);
  stateRef.current = state;

  /* Seed questions once per item. */
  useEffect(() => {
    dispatch({
      type: 'START',
      questions: generateReadingQuestions({
        content: item.fullText,
        title: item.title,
        preview: item.preview,
        focus: item.readingFocus,
        enabledTypes: item.enabledQuestionTypes,
        maxQuestions: maxQuestionsForFocus(item.readingFocus),
      }),
    });
  }, [item.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* 1-second timer while the session is live (iOS starts it only when the
     readingTimer assistance toggle is on). */
  useEffect(() => {
    if (!assistance.readingTimer) return;
    const interval = setInterval(() => dispatch({ type: 'TICK' }), 1000);
    return () => clearInterval(interval);
  }, [assistance.readingTimer]);

  /* Partial progress on unmount (never marks complete — capped 0.99). */
  useEffect(() => {
    return () => {
      translateAbort.current?.abort();
      const s = stateRef.current;
      if (s.phase !== 'completed') {
        void updateReadingProgress(item.ownerUID, item.id, {
          progress: readingProgressEstimate(s),
        })
          .then(() => qc.invalidateQueries({ queryKey: ['readingItems'] }))
          .catch(() => {});
      }
    };
  }, [item.id, item.ownerUID, qc]);

  const translateWord = useCallback(
    async (word: string, targetId?: string) => {
      const target = targetId ?? targetLanguageId;
      setTranslation(null);
      setTranslationError(false);
      const key = `${word.toLowerCase()}|${target}`;
      const cached = cache.current.get(key);
      if (cached) {
        setTranslation(cached);
        return;
      }
      translateAbort.current?.abort();
      const controller = new AbortController();
      translateAbort.current = controller;
      setIsTranslating(true);
      try {
        const result = await translate(
          word,
          findLanguage(item.languageCode),
          findLanguage(target),
          controller.signal,
        );
        cache.current.set(key, result);
        setTranslation(result);
      } catch (e) {
        if (!(e instanceof DOMException && e.name === 'AbortError')) {
          setTranslationError(true);
        }
      } finally {
        setIsTranslating(false);
      }
    },
    [item.languageCode, targetLanguageId],
  );

  const handleWordTap = useCallback(
    (word: string) => {
      const isDeselect = stateRef.current.selectedWord === word;
      dispatch({ type: 'WORD_TAP', word });
      if (isDeselect) {
        translateAbort.current?.abort();
        setTranslation(null);
        setTranslationError(false);
        return;
      }
      if (assistance.translationOnTap) void translateWord(word);
    },
    [assistance.translationOnTap, translateWord],
  );

  const selectTarget = useCallback(
    (languageId: string) => {
      setTargetLanguageId(languageId);
      const word = stateRef.current.selectedWord;
      if (word && assistance.translationOnTap) void translateWord(word, languageId);
    },
    [assistance.translationOnTap, translateWord],
  );

  const finishSession = useCallback(() => {
    dispatch({ type: 'FINISH', wordCount: item.wordCount });
  }, [item.wordCount]);

  /* Persist completion once the reducer has scored the session.

     The failure used to go into a bare `catch {}`: the result screen appeared,
     Firestore never heard about it, and the session came back unfinished on the
     next reload with nothing having said so. Now the result screen carries the
     bad news and the reader can retry. */
  const persistedRef = useRef(false);
  const [saveFailed, setSaveFailed] = useState(false);

  const persistCompletion = useCallback(() => {
    if (!state.result) return;
    setSaveFailed(false);
    void markReadingCompleted(item.ownerUID, item.id, {
      readingTimeSeconds: state.result.readingTimeSeconds,
      comprehensionScore: state.result.comprehensionPercent / 100,
    })
      .then(() => qc.invalidateQueries({ queryKey: ['readingItems'] }))
      .catch((error: unknown) => {
        console.error('[useReadingSession] could not mark the text complete', error);
        setSaveFailed(true);
      });
  }, [state.result, item.id, item.ownerUID, qc]);

  useEffect(() => {
    if (state.phase === 'completed' && state.result && !persistedRef.current) {
      persistedRef.current = true;
      recordPractice({
        skill: 'reading',
        value: state.result.readingTimeSeconds,
        sourceModeID: item.modeID,
      });
      persistCompletion();
    }
  }, [state.phase, state.result, item.modeID, persistCompletion]);

  return {
    state,
    dispatch,
    assistance,
    targetLanguageId,
    translation,
    isTranslating,
    translationError,
    handleWordTap,
    selectTarget,
    finishSession,
    saveFailed,
    retrySave: persistCompletion,
  };
};
