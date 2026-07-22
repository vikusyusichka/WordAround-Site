/* Pronunciation Trainer session — web port of PronunciationTrainerViewModel.
   Loads focus-sound items, speaks them, and records the learner. Azure scoring
   is probed once and the UI degrades to unscored practice when unavailable. */
import { useCallback, useEffect, useRef, useState } from 'react';

import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { isPronunciationScoringAvailable } from '@/lib/azureSpeech';
import {
  fetchPronunciationItems,
  type PronunciationDifficulty,
  type PronunciationError,
  type PronunciationFocus,
  type PronunciationItem,
} from '@/lib/pronunciationTrainer';
import { speakingLocaleFor } from '@/lib/speakingTypes';
import { speakListening, stopListeningSpeech } from '@/lib/speech';

export interface PronunciationSetup {
  languageId: string;
  level: string;
  focus: PronunciationFocus;
  difficulty: PronunciationDifficulty;
  count: number;
}

export const usePronunciationTrainer = (setup: PronunciationSetup) => {
  const [items, setItems] = useState<PronunciationItem[]>([]);
  const [index, setIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [practisedIds, setPractisedIds] = useState<string[]>([]);
  /* null = still probing; false = Worker has no Azure credentials. */
  const [scoringAvailable, setScoringAvailable] = useState<boolean | null>(null);

  const recorder = useVoiceRecorder();
  const locale = speakingLocaleFor(setup.languageId);
  const seededRef = useRef(false);
  const loadingRef = useRef(false);

  const load = useCallback(() => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setIsLoading(true);
    setError(null);
    void fetchPronunciationItems({
      languageId: setup.languageId,
      level: setup.level,
      focus: setup.focus,
      difficulty: setup.difficulty,
      count: setup.count,
    })
      .then((result) => {
        setItems(result);
        setIndex(0);
        setPractisedIds([]);
      })
      .catch((e: PronunciationError) => setError(e.message))
      .finally(() => {
        setIsLoading(false);
        loadingRef.current = false;
      });
  }, [setup.languageId, setup.level, setup.focus, setup.difficulty, setup.count]);

  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    load();
    void isPronunciationScoringAvailable().then(setScoringAvailable);
  }, [load]);

  const current = items[index] ?? null;

  const listen = useCallback(
    (text?: string) => {
      const spoken = text ?? current?.text;
      if (!spoken) return;
      stopListeningSpeech();
      setIsSpeaking(true);
      speakListening(spoken, {
        locale,
        rate: 0.85, // slower still: single sounds/words need clarity
        voiceType: 'default',
        onEnd: () => setIsSpeaking(false),
      });
    },
    [current, locale],
  );

  const goTo = useCallback(
    (next: number) => {
      if (next < 0 || next >= items.length) return;
      stopListeningSpeech();
      setIsSpeaking(false);
      recorder.reset();
      setIndex(next);
    },
    [items.length, recorder],
  );

  const markPractised = useCallback(() => {
    if (!current) return;
    setPractisedIds((prev) => (prev.includes(current.id) ? prev : [...prev, current.id]));
    if (index < items.length - 1) goTo(index + 1);
  }, [current, index, items.length, goTo]);

  useEffect(() => {
    return () => stopListeningSpeech();
  }, []);

  return {
    items,
    current,
    index,
    total: items.length,
    isLoading,
    error,
    isSpeaking,
    scoringAvailable,
    practisedCount: practisedIds.length,
    recorder,
    listen,
    next: () => goTo(index + 1),
    previous: () => goTo(index - 1),
    markPractised,
    reload: load,
  };
};
