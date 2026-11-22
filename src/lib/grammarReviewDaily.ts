/* How many never-reviewed cards the learner has met today, so the daily
   new-card cap holds across several sessions in one day. Per device, in
   localStorage, like the rest of the Notes preferences; a lost counter only
   means a few extra new cards, never a lost schedule. */
const KEY = 'grammarNotes.reviewNewToday';

const today = (now: number) => {
  const d = new Date(now);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

export const newReviewedToday = (now: number = Date.now()): number => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { day?: string; count?: number };
    return parsed.day === today(now) && typeof parsed.count === 'number' ? parsed.count : 0;
  } catch {
    return 0;
  }
};

export const recordNewReviewed = (now: number = Date.now()): void => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ day: today(now), count: newReviewedToday(now) + 1 }));
  } catch {
    /* best-effort */
  }
};
