/* Human wording for review intervals: "10 min", "3 days", "2 mo", "1 yr".
   Shared by the rating buttons, the summary and the note's review button so
   one interval is never spelled two ways. */
import type { TFunction } from 'i18next';

import { DAY } from '@/lib/grammarReview';
import type { GrammarReviewItem } from '@/lib/models';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

export const formatReviewInterval = (ms: number, t: TFunction): string => {
  if (ms < HOUR) {
    return t('writing.grammar.review.interval.minutes', { count: Math.max(1, Math.round(ms / MINUTE)) });
  }
  if (ms < DAY) {
    return t('writing.grammar.review.interval.hours', { count: Math.round(ms / HOUR) });
  }
  const days = Math.round(ms / DAY);
  if (days < 31) return t('writing.grammar.review.interval.days', { count: days });
  if (days < 365) return t('writing.grammar.review.interval.months', { count: Math.round(days / 30.4) });
  return t('writing.grammar.review.interval.years', { count: Math.round((days / 365) * 10) / 10 });
};

/* Typing an answer must not trigger review shortcuts. */
export const isTypingTarget = (el: EventTarget | null) =>
  el instanceof HTMLElement &&
  (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' || el.isContentEditable);

const FORECAST_DAYS = 7;

/** Cards falling due on each of the next seven days. Cards already due are
    left out: the queue decides what can be reviewed now (it caps new cards
    and drops cards whose note is gone), so the caller adds its own count to
    today rather than this guessing at it. */
export const reviewForecast = (
  items: Iterable<GrammarReviewItem>,
  now: number = Date.now(),
): number[] => {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const counts = new Array<number>(FORECAST_DAYS).fill(0);
  for (const item of items) {
    const offset = Math.floor((item.dueAt - start.getTime()) / 86_400_000);
    if (item.dueAt > now && offset < FORECAST_DAYS) counts[offset] += 1;
  }
  return counts;
};
