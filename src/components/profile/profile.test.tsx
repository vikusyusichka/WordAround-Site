import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/lib/i18n';
import { DELETE_CONFIRMATION_WORD, DeleteAccountDialog } from './DeleteAccountDialog';
import { ProfileAvatar } from './ProfileAvatar';
import { ProfileStatCard } from './ProfileStatCard';
import { SettingsRow } from './SettingsRow';
import { ToggleSwitch } from './ToggleSwitch';
import { filterLanguages } from '@/lib/languages';

describe('SettingsRow', () => {
  it('shows the title and the current value, and fires on click', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <SettingsRow icon="globe" title="Language" trailing="Українська" onClick={onClick} />,
    );

    expect(screen.getByText('Language')).toBeInTheDocument();
    expect(screen.getByText('Українська')).toBeInTheDocument();

    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders the support entries as real links that open in a new tab', () => {
    render(<SettingsRow icon="doc.text.fill" title="Terms" href="https://example.com/terms" />);
    const link = screen.getByRole('link', { name: /Terms/ });
    expect(link).toHaveAttribute('href', 'https://example.com/terms');
    expect(link).toHaveAttribute('target', '_blank');
  });
});

describe('ProfileAvatar', () => {
  it('shows initials when there is no photo', () => {
    render(<ProfileAvatar size={72} color="blue" initials="AK" />);
    expect(screen.getByText('AK')).toBeInTheDocument();
  });

  it('falls back to the initials when the photo fails to load', () => {
    render(
      <ProfileAvatar size={72} color="blue" initials="AK" photoURL="https://example.com/x.jpg" />,
    );
    /* A blocked or deleted avatar URL must not leave an empty circle. */
    fireEvent.error(screen.getByRole('presentation', { hidden: true }));
    expect(screen.getByText('AK')).toBeInTheDocument();
  });
});

describe('ProfileStatCard', () => {
  it('renders the value above its caption', () => {
    render(<ProfileStatCard icon="clock.fill" value="42 min" label="Practice time" />);
    expect(screen.getByText('42 min')).toBeInTheDocument();
    expect(screen.getByText('Practice time')).toBeInTheDocument();
  });
});

describe('ToggleSwitch', () => {
  it('is an accessible switch that reports its new value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ToggleSwitch checked={false} label="Daily reminder" onChange={onChange} />);

    const toggle = screen.getByRole('switch', { name: 'Daily reminder' });
    await user.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('cannot be operated while disabled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ToggleSwitch checked={false} label="Daily reminder" disabled onChange={onChange} />);

    await user.click(screen.getByRole('switch', { name: 'Daily reminder' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('DeleteAccountDialog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('keeps the delete button locked until the confirmation word is typed', async () => {
    const user = userEvent.setup();
    render(<DeleteAccountDialog open onClose={vi.fn()} />);

    const confirm = screen.getByRole('button', { name: /Delete my account/i });
    expect(confirm).toBeDisabled();

    const field = screen.getByRole('textbox');
    await user.type(field, 'delete me');
    expect(confirm).toBeDisabled();

    await user.clear(field);
    await user.type(field, DELETE_CONFIRMATION_WORD.toLowerCase());
    /* Case-insensitive on purpose — the word is the deliberate part, not the
       shift key. */
    expect(confirm).toBeEnabled();
  });

  it('closes on Cancel', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<DeleteAccountDialog open onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe('filterLanguages', () => {
  it('keeps the whole list for an empty query', () => {
    expect(filterLanguages('')).toHaveLength(30);
    expect(filterLanguages('   ')).toHaveLength(30);
  });

  it('finds a language by its English name, its own name or its code', () => {
    expect(filterLanguages('ukrainian').map((l) => l.code)).toEqual(['uk']);
    expect(filterLanguages('Українська').map((l) => l.code)).toEqual(['uk']);
    expect(filterLanguages('uk').map((l) => l.code)).toEqual(['uk']);
  });

  it('is case-insensitive and returns nothing for a miss', () => {
    expect(filterLanguages('POLISH').map((l) => l.code)).toEqual(['pl']);
    expect(filterLanguages('klingon')).toEqual([]);
  });
});
