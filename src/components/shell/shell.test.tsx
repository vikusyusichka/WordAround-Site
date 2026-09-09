import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import '@/lib/i18n';
import { RenameDialog } from './RenameDialog';
import { ReorderControls } from './ReorderControls';
import { ReorderToggle } from './ReorderToggle';

describe('RenameDialog', () => {
  it('starts from the current name and returns the trimmed new one', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <RenameDialog
        title="Rename text"
        initialValue="Old title"
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    );

    const field = screen.getByRole('textbox');
    expect(field).toHaveValue('Old title');

    await user.clear(field);
    await user.type(field, '  New title  ');
    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(onSubmit).toHaveBeenCalledWith('New title');
  });

  it('will not save an empty name', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <RenameDialog title="Rename" initialValue="x" onSubmit={onSubmit} onCancel={() => {}} />,
    );

    await user.clear(screen.getByRole('textbox'));
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('cancels on Escape', () => {
    const onCancel = vi.fn();
    render(
      <RenameDialog title="Rename" initialValue="x" onSubmit={() => {}} onCancel={onCancel} />,
    );
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});

describe('ReorderControls', () => {
  it('names what each button moves and blocks the ends', async () => {
    const user = userEvent.setup();
    const onMoveDown = vi.fn();
    render(
      <ReorderControls
        label="Verbs"
        isFirst
        isLast={false}
        onMoveUp={() => {}}
        onMoveDown={onMoveDown}
      />,
    );

    expect(screen.getByRole('button', { name: 'Move Verbs up' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Move Verbs down' }));
    expect(onMoveDown).toHaveBeenCalledOnce();
  });
});

describe('ReorderToggle', () => {
  it('switches between Arrange and Done', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const { rerender } = render(<ReorderToggle isEditing={false} onToggle={onToggle} />);

    const button = screen.getByRole('button', { name: /arrange/i });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    await user.click(button);
    expect(onToggle).toHaveBeenCalledOnce();

    rerender(<ReorderToggle isEditing onToggle={onToggle} />);
    expect(screen.getByRole('button', { name: /done/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('is unavailable when there is nothing to arrange', () => {
    render(<ReorderToggle isEditing={false} disabled onToggle={() => {}} />);
    expect(screen.getByRole('button', { name: /arrange/i })).toBeDisabled();
  });
});
