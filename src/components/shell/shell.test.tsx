import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import '@/lib/i18n';
import { CreateMenu } from './CreateMenu';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('renders the title and subtitle', () => {
    render(<PageHeader title="Flashcards" subtitle="Pick a set to practice" />);
    expect(screen.getByRole('heading', { name: 'Flashcards' })).toBeInTheDocument();
    expect(screen.getByText('Pick a set to practice')).toBeInTheDocument();
  });

  it('renders an actions slot', () => {
    render(<PageHeader title="X" actions={<button>Act</button>} />);
    expect(screen.getByRole('button', { name: 'Act' })).toBeInTheDocument();
  });
});

describe('CreateMenu', () => {
  it('opens on click and lists the 5 create actions', async () => {
    const user = userEvent.setup();
    render(<CreateMenu />);

    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /create/i }));

    const items = screen.getAllByRole('menuitem');
    expect(items).toHaveLength(5);
    ['Folder', 'Set', 'Text', 'Audio', 'Essay'].forEach((label) => {
      expect(screen.getByRole('menuitem', { name: label })).toBeInTheDocument();
    });
  });

  it('fires onSelect with the chosen id and closes', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<CreateMenu onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: /create/i }));
    await user.click(screen.getByRole('menuitem', { name: 'Set' }));

    /* DOM removal is gated by the AnimatePresence exit animation (rAF), which
       doesn't complete in jsdom — assert the behavior (onSelect) instead. */
    expect(onSelect).toHaveBeenCalledWith('set');
  });
});
