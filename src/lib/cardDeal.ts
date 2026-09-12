/* The arc a flashcard travels when the next one is dealt in.

   The first version slid straight in along x, which reads as a filmstrip
   scrolling past rather than a card being dealt onto a table. A hand dealing a
   card swings it: out to the side and a little low, up and over through the
   middle, then flat. Three keyframes are enough to suggest that, and the
   rotation is what sells it — a card that stays perfectly level through a
   curve looks like it is on rails.

   A tween rather than a spring. A spring overshoots and settles, which is
   lively on a small motion and fidgety on a big one; this one eases out and
   stops. */

/** Which side the incoming card comes FROM. `null` on the first card of a
    round, where there is nothing to deal away from. */
export type DealFrom = 'left' | 'right' | null;

/** The answered card flew `outcome`-ward, so the next one comes from the
    opposite side. */
export const dealFromOutcome = (outcome: 'known' | 'unknown'): DealFrom =>
  outcome === 'known' ? 'left' : 'right';

/* A type alias rather than an interface on purpose: Motion's animation target
   allows arbitrary `--custom-property` keys, and TypeScript grants an implicit
   index signature to type aliases but not to interfaces. As an interface this
   shape is rejected at the call site for a reason that has nothing to do with
   its fields. */
export type DealMotion = {
  x: number[];
  y: number[];
  rotate: number[];
  transition: {
    duration: number;
    times: number[];
    ease: number[];
  };
};

/** How far out the card starts, and how high the arc lifts it. Both in px:
    the card is a fixed size on screen, so fixed distances keep the gesture the
    same weight on a phone and on a monitor. */
const REACH = 440;
const LIFT = 52;
const TILT = 11;

/* easeOutCubic. Fast enough to feel responsive, slow enough to follow. */
const EASE = [0.22, 0.61, 0.36, 1];
const DURATION = 0.46;

/** The `animate` value for a card being dealt in from `from`.
    `null` (or reduced motion) settles it in place with no travel. */
export const dealMotion = (from: DealFrom, prefersReducedMotion = false): DealMotion => {
  const direction = from === 'right' ? 1 : from === 'left' ? -1 : 0;

  if (direction === 0 || prefersReducedMotion) {
    return {
      x: [0, 0, 0],
      y: [0, 0, 0],
      rotate: [0, 0, 0],
      /* Not zero: a zero-length tween can leave the transform mid-flight if one
         was already running. A very short one always lands. */
      transition: { duration: 0.01, times: [0, 0.5, 1], ease: EASE },
    };
  }

  return {
    /* The midpoint sits well inside the start, not halfway: most of the
       distance is covered early, so the card arrives rather than drifts. */
    x: [direction * REACH, direction * (REACH * 0.3), 0],
    y: [LIFT * 0.8, -LIFT, 0],
    rotate: [direction * TILT, direction * (TILT * 0.35), 0],
    transition: { duration: DURATION, times: [0, 0.55, 1], ease: EASE },
  };
};
