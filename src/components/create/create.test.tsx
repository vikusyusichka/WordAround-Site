import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import '@/lib/i18n';
import { PrivacyToggle } from './PrivacyToggle';
import { IconPicker } from './IconPicker';
import { CardEditor } from './CardEditor';
import { EditSetScreen } from './EditSetScreen';
import { emptyCard, type DraftCard } from '@/lib/createSetValidation';
import { themeForColor } from '@/lib/setColors';
import type { FlashcardSet } from '@/lib/models';

/* The edit screen talks to Firestore through two hooks; stubbing them keeps
   this a test of the screen. */
const hooks = vi.hoisted(() => ({ mutate: vi.fn(), isPending: false, isError: false }));
vi.mock('@/hooks/useSets', () => ({
  useUpdateSet: () => ({
    mutate: hooks.mutate,
    isPending: hooks.isPending,
    isError: hooks.isError,
    error: null,
  }),
}));
vi.mock('@/hooks/useFolders', () => ({ useFoldersQuery: () => ({ data: [] }) }));

/* Stateful harness so the controlled inputs update on change (like the app). */
function CardEditorHarness() {
  const [cards, setCards] = useState<DraftCard[]>([emptyCard()]);
  return <CardEditor cards={cards} onChange={setCards} theme={themeForColor('red')} />;
}

describe('PrivacyToggle', () => {
  it('marks the active option and fires onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PrivacyToggle value="Private" onChange={onChange} theme={themeForColor('red')} />);
    expect(screen.getByRole('radio', { name: /Private/ })).toHaveAttribute('aria-checked', 'true');
    await user.click(screen.getByRole('radio', { name: /Public/ }));
    expect(onChange).toHaveBeenCalledWith('Public');
  });
});

describe('IconPicker', () => {
  it('fires onChange with the clicked icon', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <IconPicker
        value="rectangle.stack.fill"
        onChange={onChange}
        theme={themeForColor('red')}
        label="Icon"
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Choose icon' }));
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

const existingSet: FlashcardSet = {
  id: 'set1',
  ownerUID: 'u1',
  ownerEmail: 'e@x.co',
  title: 'Travel',
  description: 'Trips',
  privacy: 'Private',
  folderID: null,
  folderName: null,
  colorHex: '#4169F5',
  icon: { type: 'systemName', value: 'airplane' },
  cards: [{ id: 'c1', word: 'a', translation: 'b', example: '' }],
  createdAt: 1000,
  updatedAt: 2000,
};

describe('EditSetScreen', () => {
  it('opens with the set filled in and saves the edited values', async () => {
    const user = userEvent.setup();
    hooks.mutate.mockClear();
    render(<EditSetScreen set={existingSet} onClose={vi.fn()} />);

    const title = screen.getByDisplayValue('Travel');
    expect(screen.getByDisplayValue('Trips')).toBeInTheDocument();

    await user.clear(title);
    await user.type(title, 'Travel v2');
    await user.click(screen.getByRole('button', { name: /Save changes/ }));

    expect(hooks.mutate).toHaveBeenCalledOnce();
    const [{ setId, values }] = hooks.mutate.mock.calls[0];
    expect(setId).toBe('set1');
    expect(values).toMatchObject({ title: 'Travel v2', description: 'Trips', colorId: 'blue' });
  });

  it('refuses to save an empty title and closes on cancel', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    hooks.mutate.mockClear();
    render(<EditSetScreen set={existingSet} onClose={onClose} />);

    await user.clear(screen.getByDisplayValue('Travel'));
    await user.click(screen.getByRole('button', { name: /Save changes/ }));
    expect(hooks.mutate).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Set title is required.');

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
