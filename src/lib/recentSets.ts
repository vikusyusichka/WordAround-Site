/* Remembers which set the learner opened last, so the home screen can offer
   it back under "Continue learning". Only the id is stored — the set itself is
   read from the sets query, so a renamed or deleted set can never go stale
   here. Device-local, like the practice log. */

const STORAGE_KEY = 'wa.lastOpenedSet';

export const recordOpenedSet = (setId: string): void => {
  if (!setId) return;
  try {
    localStorage.setItem(STORAGE_KEY, setId);
  } catch {
    /* storage full/unavailable — this is a convenience, never a blocker */
  }
};

export const lastOpenedSetId = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

export const forgetOpenedSet = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
};
