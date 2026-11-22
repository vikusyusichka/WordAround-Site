import { describe, expect, it } from 'vitest';

import { DAY, makeReviewItem } from './grammarReview';
import { reviewForecast } from './grammarReviewFormat';

const at = (dueAt: number) => ({
  ...makeReviewItem({
    id: `i${dueAt}`, ownerUID: 'u', sourceType: 'note', topicId: 't', noteId: 'n',
    title: 'T', previewText: 'p', now: 0,
  }),
  dueAt,
});

describe('reviewForecast', () => {
  /* Noon on a fixed local day, so "later today" and "tomorrow" are clear. */
  const now = new Date(2026, 10, 22, 12, 0, 0).getTime();

  it('leaves out cards already due — the queue owns today’s due count', () => {
    expect(reviewForecast([at(now - DAY), at(now - 1)], now)).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it('counts later today, the following days, and ignores beyond a week', () => {
    const out = reviewForecast([at(now + 60_000), at(now + DAY), at(now + 3 * DAY), at(now + 9 * DAY)], now);
    expect(out).toEqual([1, 1, 0, 1, 0, 0, 0]);
  });
});
