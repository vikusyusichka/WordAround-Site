import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import '@/lib/i18n';
import { WritingMenuGrid } from './WritingMenuGrid';
import { WriteWordsCells } from './WriteWordsCells';
import { WriteWordsControls } from './WriteWordsControls';
import { WriteWordsResultScreen } from './WriteWordsResultScreen';
import { WriteWordsSettingsSheet } from './WriteWordsSettingsSheet';
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
  it('renders 3 clickable cards (all enabled) and fires each action', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<WritingMenuGrid onSelect={onSelect} />);

    expect(screen.getByText('Write from sets')).toBeInTheDocument();
    expect(screen.getByText('Essays')).toBeInTheDocument();
    expect(screen.getByText('Grammar notes')).toBeInTheDocument();

    // All three are enabled now — no "Coming soon" chips.
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
    await user.click(buttons[0]);
    expect(onSelect).toHaveBeenCalledWith('writeFromSets');
    await user.click(buttons[1]);
    expect(onSelect).toHaveBeenCalledWith('essays');
    await user.click(buttons[2]);
    expect(onSelect).toHaveBeenCalledWith('grammarNotes');
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

/* --- WriteWordsControls (4B — difficulty-aware) --------------------------- */

describe('WriteWordsControls', () => {
  const baseProps = {
    isHintAvailable: true,
    canSkip: true,
    skipsRemainingText: null,
    canSubmit: true,
    onHint: () => {},
    onSkip: () => {},
    onSubmit: () => {},
  };

  it('shows Hint + Skip + Check when allowed', () => {
    render(<WriteWordsControls {...baseProps} showHint showSkip />);
    expect(screen.getByRole('button', { name: /hint/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /skip/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /check/i })).toBeInTheDocument();
  });

  it('hides Hint + Skip in hard mode (showHint/showSkip false)', () => {
    render(<WriteWordsControls {...baseProps} showHint={false} showSkip={false} />);
    expect(screen.queryByRole('button', { name: /hint/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /skip/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /check/i })).toBeInTheDocument();
  });

  it('shows the medium "N skips left" caption', () => {
    render(
      <WriteWordsControls {...baseProps} showHint showSkip skipsRemainingText="1 skip left" />,
    );
    expect(screen.getByText('1 skip left')).toBeInTheDocument();
  });
});

/* --- WriteWordsResultScreen (4B) ------------------------------------------ */

describe('WriteWordsResultScreen', () => {
  const stats = { total: 8, completed: 8, skipped: 0, hints: 0, streak: 8, difficulty: 'hard' as const };

  it('win (hard) shows the perfect-round message', () => {
    render(
      <WriteWordsResultScreen
        result="win"
        stats={stats}
        wrongAnswer={null}
        onTryAgain={() => {}}
        onExit={() => {}}
      />,
    );
    expect(screen.getByText(/Round complete!/i)).toBeInTheDocument();
    expect(screen.getByText(/Perfect round!/i)).toBeInTheDocument();
  });

  it('wrong-answer lose shows the answer detail rows', () => {
    render(
      <WriteWordsResultScreen
        result="wrongAnswer"
        stats={{ ...stats, completed: 3, streak: 3 }}
        wrongAnswer={{ word: 'manzana', userAnswer: 'банан', correctAnswer: 'яблуко' }}
        onTryAgain={() => {}}
        onExit={() => {}}
      />,
    );
    expect(screen.getByText(/Wrong answer/i)).toBeInTheDocument();
    expect(screen.getByText('manzana')).toBeInTheDocument();
    expect(screen.getByText('банан')).toBeInTheDocument();
    expect(screen.getByText('яблуко')).toBeInTheDocument();
  });

  it('timeout lose fires Try again', async () => {
    const user = userEvent.setup();
    const onTryAgain = vi.fn();
    render(
      <WriteWordsResultScreen
        result="timeout"
        stats={{ ...stats, completed: 4, streak: 3 }}
        wrongAnswer={null}
        onTryAgain={onTryAgain}
        onExit={() => {}}
      />,
    );
    expect(screen.getByText(/Time's up/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(onTryAgain).toHaveBeenCalled();
  });
});

/* --- WriteWordsSettingsSheet (4B) ----------------------------------------- */

describe('WriteWordsSettingsSheet', () => {
  it('renders 2 modes + 3 difficulties and fires the callbacks', async () => {
    const user = userEvent.setup();
    const onSelectMode = vi.fn();
    const onSelectDifficulty = vi.fn();
    render(
      <WriteWordsSettingsSheet
        open
        trainingMode="wordToTranslation"
        difficulty="easy"
        onSelectMode={onSelectMode}
        onSelectDifficulty={onSelectDifficulty}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText('Word → Translation')).toBeInTheDocument();
    expect(screen.getByText('Translation → Word')).toBeInTheDocument();
    expect(screen.getByText('Easy')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('Hard')).toBeInTheDocument();

    await user.click(screen.getByText('Translation → Word'));
    expect(onSelectMode).toHaveBeenCalledWith('translationToWord');

    await user.click(screen.getByText('Hard'));
    expect(onSelectDifficulty).toHaveBeenCalledWith('hard');
  });
});
