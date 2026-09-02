/* "What do you want to do today?" — the learner picks one skill and how much
   of it, and that replaces the built-in goal for the rest of the day. Stored
   per day in localStorage: a new day means the choice is made again, which is
   the point of a daily goal.

   Deliberately device-local, like the practice log it feeds. */
import type { DailyPracticeSkill } from '@/lib/dailyPracticeStats';

const STORAGE_KEY = 'wa.dailyGoal';

export interface DailyGoal {
  skill: DailyPracticeSkill;
  /** Minutes for the time skills, words for writing. */
  target: number;
}

/** Offered targets per skill, in the unit the progress card shows. */
export const GOAL_OPTIONS: Record<DailyPracticeSkill, number[]> = {
  speaking: [5, 15, 30],
  listening: [5, 15, 30],
  reading: [5, 15, 30],
  writing: [100, 200, 400],
};

interface StoredGoal extends DailyGoal {
  /** Start of the local day the goal was set for, epoch millis. */
  date: number;
}

const startOfDay = (at: Date = new Date()): number => {
  const d = new Date(at);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const isSkill = (value: unknown): value is DailyPracticeSkill =>
  value === 'speaking' || value === 'listening' || value === 'reading' || value === 'writing';

/** Today's chosen goal, or null when none was set today. */
export const readTodayGoal = (now: Date = new Date()): DailyGoal | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const stored = parsed as Partial<StoredGoal>;
    if (stored.date !== startOfDay(now)) return null;
    if (!isSkill(stored.skill)) return null;
    if (typeof stored.target !== 'number' || !Number.isFinite(stored.target) || stored.target <= 0) {
      return null;
    }
    return { skill: stored.skill, target: stored.target };
  } catch {
    return null;
  }
};

export const setTodayGoal = (goal: DailyGoal, now: Date = new Date()): void => {
  try {
    const stored: StoredGoal = { ...goal, date: startOfDay(now) };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    /* storage full/unavailable — the goal is a convenience, never a blocker */
  }
};

export const clearTodayGoal = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
};

/** The goal to show for a skill: the learner's choice wins for that skill. */
export const goalOverrideFor = (
  skill: DailyPracticeSkill,
  now: Date = new Date(),
): number | undefined => {
  const chosen = readTodayGoal(now);
  return chosen && chosen.skill === skill ? chosen.target : undefined;
};
