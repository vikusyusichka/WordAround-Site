/* Shadowing session — web port of ShadowingViewModel, minus Azure scoring.
   Loads AI phrases, walks them one at a time, speaks the model audio (TTS) and
   lets the learner record + play themselves back. */
import { useCallback, useEffect, useRef, useState } from 'react';

import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import {
  fetchShadowingPhrases,
  recentShadowingPhrases,
  rememberShadowingPhrases,
  type ShadowingCategoryId,
  type ShadowingError,
  type ShadowingPhrase,
} from '@/lib/shadowing';
import { speakingLocaleFor } from '@/lib/speakingTypes';
import { speakListening, stopListeningSpeech } from '@/lib/speech';

export interface ShadowingSetup {
  languageId: string;
  level: string;
  category: ShadowingCategoryId;
  count: number;
}

export const useShadowing = (setup: ShadowingSetup) => {
  const [phrases, setPhrases] = useState<ShadowingPhrase[]>([]);
  const [index, setIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  const recorder = useVoiceRecorder();
  const locale = speakingLocaleFor(setup.languageId);
  const seededRef = useRef(false);
  const loadingRef = useRef(false);

  const load = useCallback(() => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setIsLoading(true);
    setError(null);
    void fetchShadowingPhrases({
      languageId: setup.languageId,
      level: setup.level,
      category: setup.category,
      count: setup.count,
      avoidPhrases: recentShadowingPhrases(setup.languageId, setup.level, setup.category),
    })
      .then((result) => {
        setPhrases(result);
        setIndex(0);
        setCompletedIds([]);
        rememberShadowingPhrases(
          setup.languageId,
          setup.level,
          setup.category,
          result.map((p) => p.text),
        );
      })
      .catch((e: ShadowingError) => setError(e.message))
      .finally(() => {
        setIsLoading(false);
        loadingRef.current = false;
      });
  }, [setup.languageId, setup.level, setup.category, setup.count]);

  /* Ref guard only — cancelling in cleanup would drop the sole request
     under StrictMode's mount→cleanup→mount (see the 7B note). */
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    load();
  }, [load]);

  const current = phrases[index] ?? null;

  const listen = useCallback(() => {
    if (!current) return;
    stopListeningSpeech();
    setIsSpeaking(true);
    speakListening(current.text, {
      locale,
      rate: 0.9, // slightly slow: shadowing is about matching rhythm
      voiceType: 'default',
      onEnd: () => setIsSpeaking(false),
    });
  }, [current, locale]);

  const goTo = useCallback(
    (next: number) => {
      if (next < 0 || next >= phrases.length) return;
      stopListeningSpeech();
      setIsSpeaking(false);
      recorder.reset();
      setIndex(next);
    },
    [phrases.length, recorder],
  );

  const markDone = useCallback(() => {
    if (!current) return;
    setCompletedIds((prev) => (prev.includes(current.id) ? prev : [...prev, current.id]));
    if (index < phrases.length - 1) goTo(index + 1);
  }, [current, index, phrases.length, goTo]);

  useEffect(() => {
    return () => stopListeningSpeech();
  }, []);

  return {
    phrases,
    current,
    index,
    total: phrases.length,
    isLoading,
    error,
    isSpeaking,
    completedCount: completedIds.length,
    isCurrentDone: current ? completedIds.includes(current.id) : false,
    recorder,
    listen,
    next: () => goTo(index + 1),
    previous: () => goTo(index - 1),
    markDone,
    reload: load,
  };
};
