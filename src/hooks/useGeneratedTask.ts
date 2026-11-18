/* Generates one exam task and keeps it while the screen is open. Recent
   topics for the same task are remembered on this device so "another task"
   does not hand back the one just done. */
import { useCallback, useEffect, useRef, useState } from 'react';

import { generateTask, type GeneratedTask, type TaskRef } from '@/lib/exams/generation';

const RECENT_LIMIT = 15;

const recentKey = (ref: TaskRef) =>
  `wa.exams.recent.${ref.exam.id}.${ref.variant.id}.${ref.section.id}.${ref.task.id}`;

export const readRecentTitles = (ref: TaskRef): string[] => {
  try {
    const raw = localStorage.getItem(recentKey(ref));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : [];
  } catch {
    return [];
  }
};

export const rememberTitle = (ref: TaskRef, title: string): void => {
  try {
    const next = [...readRecentTitles(ref).filter((t) => t !== title), title].slice(-RECENT_LIMIT);
    localStorage.setItem(recentKey(ref), JSON.stringify(next));
  } catch {
    /* Storage unavailable (private mode) — repeats are merely possible. */
  }
};

type State =
  | { status: 'generating' }
  | { status: 'ready'; task: GeneratedTask }
  | { status: 'error'; message: string };

export const useGeneratedTask = (ref: TaskRef | undefined) => {
  const [state, setState] = useState<State>({ status: 'generating' });
  const controller = useRef<AbortController | null>(null);
  const refKey = ref ? recentKey(ref) : '';

  const run = useCallback(() => {
    if (!ref) return;
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setState({ status: 'generating' });
    generateTask(ref, { avoidTitles: readRecentTitles(ref), signal: current.signal })
      .then((task) => {
        if (current.signal.aborted) return;
        rememberTitle(ref, task.title);
        setState({ status: 'ready', task });
      })
      .catch((error: unknown) => {
        if (current.signal.aborted) return;
        setState({ status: 'error', message: error instanceof Error ? error.message : String(error) });
      });
    // The ref object is rebuilt each render; its key identifies the task.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refKey]);

  useEffect(() => {
    run();
    return () => controller.current?.abort();
  }, [run]);

  return { state, regenerate: run };
};
