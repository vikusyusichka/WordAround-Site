import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import '@/lib/i18n';
import { PrivacyToggle } from './PrivacyToggle';
import { IconPicker } from './IconPicker';
import { CardEditor } from './CardEditor';
import { emptyCard, type DraftCard } from '@/lib/createSetValidation';

/* Stateful harness so the controlled inputs update on change (like the app). */
function CardEditorHarness() {
  const [cards, setCards] = useState<DraftCard[]>([emptyCard()]);
  return <CardEditor cards={cards} onChange={setCards} />;
}

describe('PrivacyToggle', () => {
  it('marks the active option and fires onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PrivacyToggle value="Private" onChange={onChange} />);
    expect(screen.getByRole('radio', { name: /Private/ })).toHaveAttribute('aria-checked', 'true');
    await user.click(screen.getByRole('radio', { name: /Public/ }));
    expect(onChange).toHaveBeenCalledWith('Public');
  });
});

describe('IconPicker', () => {
  it('fires onChange with the clicked icon', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<IconPicker value="rectangle.stack.fill" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'star.fill' }));
    expect(onChange).toHaveBeenCalledWith('star.fill');
  });
});

describe('CardEditor', () => {
  it('adds and removes cards', async () => {
    const user = userEvent.setup();
    render(<CardEditorHarness />);

    expect(screen.getAllByPlaceholderText('Word')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: /Add card/ }));
    expect(screen.getAllByPlaceholderText('Word')).toHaveLength(2);

    const removeButtons = screen.getAllByRole('button', { name: /Remove card/ });
    expect(removeButtons).toHaveLength(2);
    await user.click(removeButtons[0]);
    expect(screen.getAllByPlaceholderText('Word')).toHaveLength(1);
  });

  it('edits a card field', async () => {
    const user = userEvent.setup();
    render(<CardEditorHarness />);
    const word = screen.getByPlaceholderText('Word');
    await user.type(word, 'hola');
    expect(word).toHaveValue('hola');
  });
});
