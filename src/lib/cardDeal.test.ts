import { describe, expect, it } from 'vitest';

import { dealFromOutcome, dealMotion } from './cardDeal';

describe('dealFromOutcome', () => {
  /* The answered card flies the way you sent it, so the next one has to come
     from the other side — otherwise two cards cross in the same direction and
     the deck seems to run backwards. */
  it('brings the next card in from the side opposite the answer', () => {
    expect(dealFromOutcome('known')).toBe('left');
    expect(dealFromOutcome('unknown')).toBe('right');
  });
});

describe('dealMotion', () => {
  it('travels an arc, not a straight line', () => {
    const { x, y, rotate } = dealMotion('right');
    /* Lands centred and level whichever way it came. */
    expect(x.at(-1)).toBe(0);
    expect(y.at(-1)).toBe(0);
    expect(rotate.at(-1)).toBe(0);
    /* The midpoint leaves the straight line between start and end — that is
       what makes it a curve rather than a slide. */
    expect(y[1]).toBeLessThan(0);
    expect(y[0]).toBeGreaterThan(0);
    expect(rotate[0]).not.toBe(0);
  });

  it('mirrors for the other side', () => {
    const right = dealMotion('right');
    const left = dealMotion('left');
    expect(left.x[0]).toBe(-right.x[0]);
    expect(left.rotate[0]).toBe(-right.rotate[0]);
    /* The lift does not mirror — a card arcs upward from either side. */
    expect(left.y).toEqual(right.y);
  });

  it('stays put on the first card of a round', () => {
    const { x, y, rotate } = dealMotion(null);
    expect(x.every((v) => v === 0)).toBe(true);
    expect(y.every((v) => v === 0)).toBe(true);
    expect(rotate.every((v) => v === 0)).toBe(true);
  });

  it('holds still when the reader has asked for less motion', () => {
    const { x, y, transition } = dealMotion('right', true);
    expect(x.every((v) => v === 0)).toBe(true);
    expect(y.every((v) => v === 0)).toBe(true);
    /* Still a real, if tiny, tween: a zero-length one can strand a transform
       that was already mid-flight. */
    expect(transition.duration).toBeGreaterThan(0);
  });

  it('eases out rather than springing, so a big card does not wobble', () => {
    expect(dealMotion('left').transition.ease).toEqual([0.22, 0.61, 0.36, 1]);
  });
});
