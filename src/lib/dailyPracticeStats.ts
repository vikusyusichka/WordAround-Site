/* Daily practice stats — web port of DailyPracticeStatsService +
   LocalDailyPracticeStatsStore. Practice modes record what the learner did; the
   dashboard progress cards aggregate today's total.

   Units per skill (iOS parity):
   - speaking / listening / reading → SECONDS
   - writing                        → WORDS

   Entries are stamped with the start of the local day, so today's total resets
   at midnight on its own and older entries stay on disk. Storage is
   localStorage (the web equivalent of the iOS JSON file). */

export type DailyPracticeSkill = 'speaking' | 'listening' | 'reading' | 'writing';

export const DAILY_PRACTICE_SKILLS: DailyPracticeSkill[] = [
  'speaking',
  'listening',
  'reading',
  'writing',
];

export interface DailyPracticeEntry {
  id: string;
  skill: DailyPracticeSkill;
  /** Start of the local day, epoch millis. */
  date: number;
  createdAt: number;
  value: number;
  sourceModeID?: string;
  sessionId?: string;
}

const STORAGE_KEY = 'wa.dailyPracticeStats';
/* Keep the log from growing forever; 90 days is plenty for a daily card. */
const RETENTION_DAYS = 90;

/** Goal in the unit the dashboard card displays: minutes for time skills,
    words for writing (iOS defaultGoal). */
export const defaultGoal = (skill: DailyPracticeSkill): number =>
  skill === 'writing' ? 200 : 15;

export const startOfDay = (at: Date = new Date()): number => {
  const d = new Date(at);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const readAll = (): DailyPracticeEntry[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as DailyPracticeEntry[]) : [];
  } catch {
    return [];
  }
};

const writeAll = (entries: DailyPracticeEntry[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* private mode / quota — stats are a nicety, never break a session */
  }
};

export const fetchAllEntries = (): DailyPracticeEntry[] => readAll();

/** Fire-and-forget. Non-positive values are dropped, so it is safe to call from
    cleanup paths where the learner never actually practised (iOS parity). */
export const recordPractice = (params: {
  skill: DailyPracticeSkill;
  value: number;
  sourceModeID?: string;
  sessionId?: string;
}): void => {
  if (!Number.isFinite(params.value) || params.value <= 0) return;
  const now = Date.now();
  const entry: DailyPracticeEntry = {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${now}-${Math.random().toString(36).slice(2)}`,
    skill: params.skill,
    date: startOfDay(new Date(now)),
    createdAt: now,
    value: Math.round(params.value),
    ...(params.sourceModeID ? { sourceModeID: params.sourceModeID } : {}),
    ...(params.sessionId ? { sessionId: params.sessionId } : {}),
  };

  const cutoff = startOfDay() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const kept = readAll().filter((e) => e.date >= cutoff);
  kept.push(entry);
  writeAll(kept);
};

/** Raw total for today in the skill's storage unit (seconds or words). */
export const totalToday = (skill: DailyPracticeSkill, now: Date = new Date()): number => {
  const today = startOfDay(now);
  return readAll()
    .filter((e) => e.skill === skill && e.date === today)
    .reduce((sum, e) => sum + e.value, 0);
};

/** Today's total in the unit the card shows: whole minutes for time skills,
    words for writing. Seconds round DOWN so "0 min" is honest until a full
    minute of practice is done. */
export const totalTodayDisplay = (
  skill: DailyPracticeSkill,
  now: Date = new Date(),
): number => {
  const raw = totalToday(skill, now);
  return skill === 'writing' ? raw : Math.floor(raw / 60);
};

export interface DailyProgress {
  current: number;
  goal: number;
  /** Clamped 0…1 so the bar never overflows on an over-achieving day. */
  progress: number;
  unit: 'minutes' | 'words';
  remaining: number;
}

export const dailyProgress = (
  skill: DailyPracticeSkill,
  now: Date = new Date(),
  /** The learner's own goal for today, when they picked one (see dailyGoal). */
  goalOverride?: number,
): DailyProgress => {
  const current = totalTodayDisplay(skill, now);
  const goal =
    goalOverride !== undefined && Number.isFinite(goalOverride) && goalOverride > 0
      ? goalOverride
      : defaultGoal(skill);
  return {
    current,
    goal,
    progress: goal <= 0 ? 0 : Math.min(1, current / goal),
    unit: skill === 'writing' ? 'words' : 'minutes',
    remaining: Math.max(0, goal - current),
  };
};

/** Consecutive days of practice ending today — or ending yesterday, so a
    streak survives until the day it is actually missed. Any skill counts. */
export const currentStreak = (now: Date = new Date()): number => {
  const days = new Set(readAll().map((e) => e.date));
  if (days.size === 0) return 0;

  /* Calendar arithmetic, not minus-24h: on a DST change a fixed day in
     milliseconds lands at 23:00 or 01:00 and misses the day entirely. */
  const previousDay = (timestamp: number): number => {
    const d = new Date(timestamp);
    d.setDate(d.getDate() - 1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };

  const today = startOfDay(now);
  /* Nothing done today yet is not a broken streak — the day is not over. */
  let cursor = days.has(today) ? today : previousDay(today);

  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = previousDay(cursor);
  }
  return streak;
};

/** Test seam / "reset my stats". */
export const clearPracticeStats = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to unwind */
  }
};
