import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import '@/lib/i18n';
import { ColorPicker } from '@/components/create/ColorPicker';
import { FolderForm } from './FolderForm';
import { FolderCard } from './FolderCard';
import type { Folder } from '@/lib/models';

const folder: Folder = {
  id: 'f1',
  ownerUID: 'u1',
  title: 'Travel',
  description: 'Trips abroad',
  colorHex: '#4169F5',
  createdAt: 1,
  updatedAt: 1,
};

describe('ColorPicker', () => {
  it('renders 6 swatches and fires onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ColorPicker value="blue" onChange={onChange} />);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(6);
    expect(screen.getByRole('radio', { name: 'blue' })).toHaveAttribute('aria-checked', 'true');
    await user.click(screen.getByRole('radio', { name: 'green' }));
    expect(onChange).toHaveBeenCalledWith('green');
  });
});

describe('FolderForm', () => {
  it('shows a validation error on empty title', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<FolderForm submitLabel="Create folder" onSubmit={onSubmit} onCancel={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Create folder' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Folder name is required.');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits trimmed values with the mapped color hex', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <FolderForm submitLabel="Create folder" initialColor="green" onSubmit={onSubmit} onCancel={() => {}} />,
    );
    await user.type(screen.getByPlaceholderText('e.g. Travel'), '  Travel  ');
    await user.click(screen.getByRole('button', { name: 'Create folder' }));
    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Travel',
      description: '',
      colorHex: '#3CCF91',
    });
  });
});

describe('FolderCard', () => {
  it('renders the title and fires open/delete', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const onDelete = vi.fn();
    render(<FolderCard folder={folder} setCount={0} onOpen={onOpen} onDelete={onDelete} />);

    expect(screen.getByText('Travel')).toBeInTheDocument();
    await user.click(screen.getByText('Travel'));
    expect(onOpen).toHaveBeenCalledOnce();

    await user.click(screen.getByRole('button', { name: 'Delete folder' }));
    expect(onDelete).toHaveBeenCalledOnce();
  });
});
