import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import '@/lib/i18n';
import { CardEditDialog } from './CardEditDialog';
import type { Flashcard } from '@/lib/models';

/* The dialog uploads through this, and signs in through that. Neither is what
   these tests are about: the logic worth pinning down is which picture ends up
   on the saved card. */
const uploadCardImage = vi.fn(async () => 'https://example.com/uploaded.jpg');
vi.mock('@/lib/setImageService', () => ({
  uploadCardImage: (...args: unknown[]) => uploadCardImage(...(args as [])),
}));
vi.mock('@/hooks/useFolders', () => ({ useUid: () => 'uid-1' }));

const withImage: Flashcard = {
  id: 'c1',
  word: 'hello',
  translation: 'привіт',
  example: '',
  imageURL: 'https://example.com/existing.jpg',
};

const renderDialog = (card: Flashcard | null, onSave = vi.fn()) => {
  render(
    <CardEditDialog card={card} setId="set-1" open onSave={onSave} onClose={vi.fn()} />,
  );
  return onSave;
};

describe('CardEditDialog', () => {
  it('offers a way to add a picture, which the editor used not to have at all', () => {
    renderDialog(null);
    expect(screen.getByRole('button', { name: /add image/i })).toBeInTheDocument();
  });

  /* alt="" makes it presentational, so it is queried by role 'presentation'
     rather than 'img' — the same way the expanded card's test finds it. */
  const picture = () => screen.queryByRole('presentation', { hidden: true });

  it('shows the picture a card already has', () => {
    renderDialog(withImage);
    expect(picture()).toHaveAttribute('src', withImage.imageURL);
  });

  /* The whole point of keeping `imageCleared` separate from "no file picked":
     editing the word must not quietly drop the picture. */
  it('keeps the existing picture when only the text is edited', async () => {
    const user = userEvent.setup();
    const onSave = renderDialog(withImage);

    await user.clear(screen.getByDisplayValue('hello'));
    await user.type(screen.getByPlaceholderText(/word/i), 'hey');
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ imageURL: withImage.imageURL }));
    expect(uploadCardImage).not.toHaveBeenCalled();
  });

  it('drops the picture when it is removed', async () => {
    const user = userEvent.setup();
    const onSave = renderDialog(withImage);

    await user.click(screen.getByRole('button', { name: /remove image/i }));
    expect(picture()).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^save$/i }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ imageURL: undefined }));
  });
});
