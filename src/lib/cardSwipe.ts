/* Which way a flashcard was swiped — port of the rule inside
   FlashcardExpandedView.swift's DragGesture handler.

   Two things make it a swipe rather than a scroll: the drag has to travel far
   enough sideways, and it has to be more sideways than vertical. Without the
   second test, a thumb scrolling the page past a card would keep marking cards
   as known, which is the kind of bug that quietly corrupts someone's progress.

   Shared by the main card and the full-screen one so both read a gesture the
   same way. Direction mapping is iOS's: right = known, left = still learning
   (`updateProgress(for:direction:)`). */

export type SwipeOutcome = 'known' | 'unknown' | null;

export interface SwipeDelta {
  /** Horizontal travel, positive to the right. */
  dx: number;
  /** Vertical travel, sign irrelevant. */
  dy: number;
}

/** iOS uses 80pt; the same number reads well with a mouse drag too. */
export const SWIPE_THRESHOLD = 80;

export const swipeOutcome = (
  { dx, dy }: SwipeDelta,
  threshold: number = SWIPE_THRESHOLD,
): SwipeOutcome => {
  if (Math.abs(dx) <= Math.abs(dy)) return null;
  if (dx > threshold) return 'known';
  if (dx < -threshold) return 'unknown';
  return null;
};
