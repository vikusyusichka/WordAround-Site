import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import '@/lib/i18n';
import { StudyCard } from './StudyCard';
import { StudyControls } from './StudyControls';
import { FilterTabs } from './FilterTabs';
import { CardListRow } from './CardListRow';
import type { Flashcard } from '@/lib/models';

const card: Flashcard = { id: 'c1', word: 'hello', translation: 'привіт', example: 'hi there' };

describe('StudyCard', () => {
  it('renders the word and flips on click', async () => {
    const user = userEvent.setup();
    const onFlip = vi.fn();
    render(
      <StudyCard
        card={card}
        showTranslation={false}
        accent="#000"
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
        accent="#000"
        isMastered={false}
        onFlip={() => {}}
        onToggleMastered={() => {}}
        onSpeak={onSpeak}
      />,
    );
    await user.click(screen.getAllByRole('button', { name: /speak/i })[0]);
    expect(onSpeak).toHaveBeenCalledWith('hello', 'en-US');
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
        onChange={onChange}
      />,
    );
    expect(screen.getByRole('tab', { name: /All/ })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('tab', { name: /Studied/ }));
    expect(onChange).toHaveBeenCalledWith('studied');
  });
});

describe('CardListRow', () => {
  it('fires edit and delete', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<CardListRow card={card} index={0} accent="#000" onEdit={onEdit} onDelete={onDelete} />);
    await user.click(screen.getByRole('button', { name: /edit card/i }));
    await user.click(screen.getByRole('button', { name: /delete card/i }));
    expect(onEdit).toHaveBeenCalledOnce();
    expect(onDelete).toHaveBeenCalledOnce();
  });
});
