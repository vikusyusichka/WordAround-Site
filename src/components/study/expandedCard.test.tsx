import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import '@/lib/i18n';
import { ExpandedCard } from './ExpandedCard';
import { initialStudyState, type StudyState } from '@/lib/studySession';
import { themeForColor } from '@/lib/setColors';
import type { Flashcard } from '@/lib/models';

const cards: Flashcard[] = [
  {
    id: 'c1',
    word: 'hello',
    translation: 'привіт',
    example: 'hi there',
    imageURL: 'https://example.com/hello.jpg',
  },
  { id: 'c2', word: 'bye', translation: 'бувай', example: '' },
];

const theme = themeForColor('blue');

const renderExpanded = (overrides: Partial<StudyState> = {}, dispatch = vi.fn(), onClose = vi.fn()) => {
  const state = { ...initialStudyState(cards), ...overrides };
  render(
    <ExpandedCard open state={state} theme={theme} dispatch={dispatch} onClose={onClose} />,
  );
  return { dispatch, onClose };
};

describe('ExpandedCard', () => {

  /* Regression. The overlay used to be wrapped in AnimatePresence, which waits
     for every motion child inside it to report its exit before removing the
     wrapper. The card unmounts while the overlay is open — a new one replaces
     it on every answer, and the round-end summary replaces the slot entirely —
     which left the wrapper waiting on a child that no longer existed. The exit
     never finished, so closing left an invisible full-screen dialog in the DOM
     that swallowed every click on the page behind it: "the buttons stopped
     responding after I left full screen". */
  it('leaves nothing behind when it closes, even after the card has changed', () => {
    const state = initialStudyState(cards);
    const { rerender } = render(
      <ExpandedCard open state={state} theme={theme} dispatch={vi.fn()} onClose={vi.fn()} />,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    /* Answering advances to the next card — the unmount that used to poison
       the exit. */
    const answered: StudyState = {
      ...state,
      currentCardIndex: 1,
      studiedCardIDs: new Set(['c1']),
    };
    rerender(
      <ExpandedCard open state={answered} theme={theme} dispatch={vi.fn()} onClose={vi.fn()} />,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    rerender(
      <ExpandedCard open={false} state={answered} theme={theme} dispatch={vi.fn()} onClose={vi.fn()} />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes cleanly from the round-end summary too', () => {
    const state = initialStudyState(cards);
    const finished: StudyState = { ...state, isShowingRoundFinish: true };
    const { rerender } = render(
      <ExpandedCard open state={finished} theme={theme} dispatch={vi.fn()} onClose={vi.fn()} />,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    rerender(
      <ExpandedCard open={false} state={finished} theme={theme} dispatch={vi.fn()} onClose={vi.fn()} />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('shows the image and the example — the two things no other screen shows', () => {
    renderExpanded();
    /* Both faces are in the DOM at once (the flip is a CSS transform), so each
       appears twice; what matters is that they appear at all. */
    expect(screen.getAllByText('Example: hi there').length).toBeGreaterThan(0);
    const images = screen.getAllByRole('presentation', { hidden: true });
    expect(images.some((img) => img.getAttribute('src') === cards[0].imageURL)).toBe(true);
  });

  it('renders both faces with their sublabels', () => {
    renderExpanded();
    expect(screen.getByText('hello')).toBeInTheDocument();
    expect(screen.getByText('привіт')).toBeInTheDocument();
    expect(screen.getByText('Word')).toBeInTheDocument();
    expect(screen.getByText('Translation')).toBeInTheDocument();
  });

  it('answers with the arrow keys and flips with space', () => {
    const { dispatch } = renderExpanded();
    fireEvent.keyDown(document, { key: 'ArrowRight' });
    fireEvent.keyDown(document, { key: 'ArrowLeft' });
    fireEvent.keyDown(document, { key: ' ' });
    expect(dispatch).toHaveBeenCalledWith({ type: 'KNOWN' });
    expect(dispatch).toHaveBeenCalledWith({ type: 'UNKNOWN' });
    expect(dispatch).toHaveBeenCalledWith({ type: 'FLIP' });
  });

  it('closes on Escape and on the close button', async () => {
    const user = userEvent.setup();
    const { onClose } = renderExpanded();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('shows the round summary instead of a card once the round is over', () => {
    renderExpanded({ isShowingRoundFinish: true });
    expect(screen.queryByText('Word')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /restart/i })).toBeInTheDocument();
  });
});
