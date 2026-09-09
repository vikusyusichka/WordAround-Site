import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import '@/lib/i18n';
import { StudyCard } from './StudyCard';
import { StudyControls } from './StudyControls';
import { FilterTabs } from './FilterTabs';
import { CardListRow } from './CardListRow';
import * as speech from '@/lib/speech';
import { themeForColor } from '@/lib/setColors';
import type { Flashcard } from '@/lib/models';

const card: Flashcard = { id: 'c1', word: 'hello', translation: 'привіт', example: 'hi there' };
const theme = themeForColor('blue');

describe('StudyCard', () => {
  it('renders the word and flips on click', async () => {
    const user = userEvent.setup();
    const onFlip = vi.fn();
    render(
      <StudyCard
        card={card}
        showTranslation={false}
        theme={theme}
        isMastered={false}
        onFlip={onFlip}
        onToggleMastered={() => {}}
        onSpeak={() => {}}
      />,
    );
    expect(screen.getByText('hello')).toBeInTheDocument();
    expect(screen.getByText('привіт')).toBeInTheDocument(); // back face present in DOM
    await user.click(screen.getByRole('button', { name: /flip/i }));
    expect(onFlip).toHaveBeenCalled();
  });

  it('speaks the word via the speaker button', async () => {
    const user = userEvent.setup();
    const onSpeak = vi.fn();
    render(
      <StudyCard
        card={card}
        showTranslation={false}
        theme={theme}
        isMastered={false}
        onFlip={() => {}}
        onToggleMastered={() => {}}
        onSpeak={onSpeak}
      />,
    );
    await user.click(screen.getAllByRole('button', { name: /speak/i })[0]);
    expect(onSpeak).toHaveBeenCalledWith('hello', 'en-US');
  });

  it('offers the full-screen view, the only place the image is shown', async () => {
    const user = userEvent.setup();
    const onExpand = vi.fn();
    render(
      <StudyCard
        card={card}
        showTranslation={false}
        theme={theme}
        isMastered={false}
        onFlip={() => {}}
        onToggleMastered={() => {}}
        onSpeak={() => {}}
        onExpand={onExpand}
      />,
    );
    await user.click(screen.getAllByRole('button', { name: /full screen/i })[0]);
    expect(onExpand).toHaveBeenCalledOnce();
  });
});

describe('StudyControls', () => {
  it('fires known / unknown / flip', async () => {
    const user = userEvent.setup();
    const onKnown = vi.fn();
    const onUnknown = vi.fn();
    const onFlip = vi.fn();
    render(<StudyControls onKnown={onKnown} onUnknown={onUnknown} onFlip={onFlip} />);
    await user.click(screen.getByRole('button', { name: /I knew it/i }));
    await user.click(screen.getByRole('button', { name: /Still learning/i }));
    expect(onKnown).toHaveBeenCalledOnce();
    expect(onUnknown).toHaveBeenCalledOnce();
  });
});

describe('FilterTabs', () => {
  it('marks the active tab and fires onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <FilterTabs
        value="all"
        counts={{ all: 3, studied: 1, remaining: 2, mastered: 0 }}
        theme={theme}
        onChange={onChange}
      />,
    );
    expect(screen.getByRole('tab', { name: /All/ })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('tab', { name: /Studied/ }));
    expect(onChange).toHaveBeenCalledWith('studied');
  });
});

describe('CardListRow', () => {
  const renderRow = (overrides: Partial<Flashcard> = {}, props: Record<string, unknown> = {}) =>
    render(
      <CardListRow
        card={{ ...card, ...overrides }}
        index={0}
        theme={theme}
        isMastered={false}
        onToggleMastered={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
        {...props}
      />,
    );

  it('fires edit and delete', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    renderRow({}, { onEdit, onDelete });
    await user.click(screen.getByRole('button', { name: /edit card/i }));
    await user.click(screen.getByRole('button', { name: /delete card/i }));
    expect(onEdit).toHaveBeenCalledOnce();
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it('shows the example sentence, which has no other home on this screen', () => {
    renderRow();
    expect(screen.getByText('Example: hi there')).toBeInTheDocument();
  });

  it('leaves the example row out entirely when there is no example', () => {
    renderRow({ example: '   ' });
    expect(screen.queryByText(/^Example:/)).not.toBeInTheDocument();
  });

  it('toggles the mastered heart', async () => {
    const user = userEvent.setup();
    const onToggleMastered = vi.fn();
    renderRow({}, { onToggleMastered });
    const heart = screen.getByRole('button', { name: /mastered/i });
    expect(heart).toHaveAttribute('aria-pressed', 'false');
    await user.click(heart);
    expect(onToggleMastered).toHaveBeenCalledOnce();
  });

  it('speaks the word and then the translation', async () => {
    const user = userEvent.setup();
    const spoken: { text: string; lang: string }[] = [];
    vi.spyOn(speech, 'speakSequence').mockImplementation((parts) => {
      spoken.push(...parts);
    });
    renderRow();
    await user.click(screen.getByRole('button', { name: /speak/i }));
    expect(spoken).toEqual([
      { text: 'hello', lang: 'en-US' },
      { text: 'привіт', lang: 'uk-UA' },
    ]);
  });
});
