/* The list/grid preference behind the library screens' view switch, and the
   one grid definition they share so folders, sets and notes stay in step.
   Each screen keeps its own choice — someone may want folders as tiles and
   sets as a list, and one shared setting would be a guess about which. */
import { useState } from 'react';

export type CardView = 'row' | 'tile';

const storageKeyFor = (screen: string) => `wa.view.${screen}`;

export const useCardView = (screen: string): [CardView, (next: CardView) => void] => {
  const [view, setView] = useState<CardView>(() => {
    try {
      return localStorage.getItem(storageKeyFor(screen)) === 'tile' ? 'tile' : 'row';
    } catch {
      return 'row';
    }
  });

  const choose = (next: CardView) => {
    setView(next);
    try {
      localStorage.setItem(storageKeyFor(screen), next);
    } catch {
      /* a view preference is never worth failing over */
    }
  };

  return [view, choose];
};

export const cardGridClass = (view: CardView) =>
  view === 'tile'
    ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5 xl:grid-cols-4 2xl:grid-cols-5'
    : 'flex flex-col gap-(--spacing-home-sets-gap)';
