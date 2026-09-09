import { describe, expect, it } from 'vitest';

import { SWIPE_THRESHOLD, swipeOutcome } from '@/lib/cardSwipe';

describe('swipeOutcome', () => {
  it('reads a decisive drag right as known and left as still learning', () => {
    expect(swipeOutcome({ dx: 140, dy: 10 })).toBe('known');
    expect(swipeOutcome({ dx: -140, dy: 10 })).toBe('unknown');
  });

  it('ignores a drag that never reaches the threshold', () => {
    expect(swipeOutcome({ dx: SWIPE_THRESHOLD, dy: 0 })).toBeNull();
    expect(swipeOutcome({ dx: -SWIPE_THRESHOLD, dy: 0 })).toBeNull();
    expect(swipeOutcome({ dx: 12, dy: 0 })).toBeNull();
  });

  it('ignores a drag that is more vertical than horizontal', () => {
    /* Someone scrolling the page past the card must not answer it. */
    expect(swipeOutcome({ dx: 150, dy: 200 })).toBeNull();
    expect(swipeOutcome({ dx: -150, dy: -200 })).toBeNull();
  });

  it('treats a diagonal that leans sideways as a swipe', () => {
    expect(swipeOutcome({ dx: 200, dy: 90 })).toBe('known');
  });

  it('honours a custom threshold', () => {
    expect(swipeOutcome({ dx: 30, dy: 2 }, 20)).toBe('known');
    expect(swipeOutcome({ dx: 30, dy: 2 }, 200)).toBeNull();
  });
});
