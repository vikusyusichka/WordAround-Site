import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import '@/lib/i18n';
import { WritingMenuGrid } from './WritingMenuGrid';
import { WriteWordsCells } from './WriteWordsCells';
import { SetSelectionModal } from './SetSelectionModal';
import type { FlashcardSet } from '@/lib/models';

/* --- Fixtures ------------------------------------------------------------- */

const makeSet = (overrides: Partial<FlashcardSet> = {}): FlashcardSet => ({
  id: 'set-1',
  ownerUID: 'u',
  ownerEmail: 'u@e',
  title: 'Travel',
  description: 'Trip words',
  privacy: 'private',
  folderID: null,
  folderName: null,
  colorHex: '#8ca1f5',
  icon: { type: 'systemName', value: 'airplane' },
  cards: [
    { id: 'c1', word: 'hola', translation: 'привіт', example: '' },
    { id: 'c2', word: 'gracias', translation: 'дякую', example: '' },
  ],
  createdAt: 0,
  updatedAt: 0,
  ...overrides,
});

const emptySet = makeSet({ id: 'set-empty', title: 'Empty', cards: [] });

/* Mock useSetsQuery so the modal doesn't need Firebase. Vitest hoists vi.mock. */
const mockSets = vi.hoisted(() => ({ current: [] as FlashcardSet[] }));

vi.mock('@/hooks/useSets', () => ({
  useSetsQuery: () => ({ data: mockSets.current, isLoading: false }),
}));

const withQuery = (children: React.ReactNode) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

/* --- WritingMenuGrid ------------------------------------------------------ */

describe('WritingMenuGrid', () => {
  it('renders 3 cards; Write from sets + Essays are clickable, Grammar notes is coming-soon', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<WritingMenuGrid onSelect={onSelect} />);

    expect(screen.getByText('Write from sets')).toBeInTheDocument();
    expect(screen.getByText('Essays')).toBeInTheDocument();
    expect(screen.getByText('Grammar notes')).toBeInTheDocument();

    // Only Grammar notes is still disabled — shows a "Coming soon" chip.
    expect(screen.getAllByText(/coming soon/i)).toHaveLength(1);

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
    // Click Write from sets (first enabled card by iteration order).
    await user.click(buttons[0]);
    expect(onSelect).toHaveBeenCalledWith('writeFromSets');
    // Click Essays.
    await user.click(buttons[1]);
    expect(onSelect).toHaveBeenCalledWith('essays');
  });
});

/* --- WriteWordsCells ------------------------------------------------------ */

describe('WriteWordsCells', () => {
  it('renders one visible cell per answer letter (spaces are gaps)', () => {
    render(
      <WriteWordsCells
        correctAnswer="cat"
        typedAnswer=""
        hintRevealed={0}
        validation="idle"
      />,
    );
    // 3 letters → 3 cells (no space gaps in "cat").
    const cells = document.querySelectorAll('.grid.place-items-center');
    expect(cells.length).toBe(3);
  });

  it('paints typed letters and hint prefix', () => {
    render(
      <WriteWordsCells
        correctAnswer="apple"
        typedAnswer="ap"
        hintRevealed={1}
        validation="idle"
      />,
    );
    // Hint reveals "a" (index 0). Typed "a","p" occupy indexes 0,1.
    // Cell 0 shows "a" (from hint or typed — both match); cell 1 shows "p".
    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.getByText('p')).toBeInTheDocument();
  });
});

/* --- SetSelectionModal ---------------------------------------------------- */

describe('SetSelectionModal', () => {
  it('filters out sets with no cards and calls onSelect with the tapped set', async () => {
    const user = userEvent.setup();
    mockSets.current = [makeSet(), emptySet];
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(withQuery(<SetSelectionModal open onClose={onClose} onSelect={onSelect} />));

    // The eligible set renders; the empty one does not.
    expect(screen.getByText('Travel')).toBeInTheDocument();
    expect(screen.queryByText('Empty')).not.toBeInTheDocument();

    await user.click(screen.getByText('Travel'));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'set-1' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders the empty state when no eligible sets exist', () => {
    mockSets.current = [emptySet];
    render(
      withQuery(<SetSelectionModal open onClose={() => {}} onSelect={() => {}} />),
    );
    expect(screen.getByText(/No sets with words/i)).toBeInTheDocument();
  });

  it('closes on backdrop click', async () => {
    const user = userEvent.setup();
    mockSets.current = [makeSet()];
    const onClose = vi.fn();
    render(withQuery(<SetSelectionModal open onClose={onClose} onSelect={() => {}} />));
    await user.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalled();
  });
});
