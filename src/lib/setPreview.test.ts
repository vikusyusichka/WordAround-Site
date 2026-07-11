import { describe, expect, it } from 'vitest';

import { mapSetToPreview } from './setPreview';
import type { FlashcardSet } from './models';

const baseSet: FlashcardSet = {
  id: 's1',
  ownerUID: 'u1',
  ownerEmail: '',
  title: 'Travel',
  description: '',
  privacy: 'Private',
  folderID: null,
  folderName: null,
  colorHex: '#3CCF91',
  icon: { type: 'systemName', value: 'airplane' },
  cards: [
    { id: 'c1', word: 'a', translation: 'b', example: '' },
    { id: 'c2', word: 'c', translation: 'd', example: '' },
  ],
  createdAt: 1,
  updatedAt: 1,
};

describe('mapSetToPreview', () => {
  it('uses the description when present, else the fallback', () => {
    expect(mapSetToPreview({ ...baseSet, description: 'Trips' }, '2 cards').subtitle).toBe('Trips');
    expect(mapSetToPreview(baseSet, '2 cards').subtitle).toBe('2 cards');
  });

  it('themes by the set color and carries the system icon', () => {
    const p = mapSetToPreview(baseSet, '2 cards');
    expect(p.accentColor).toBe('var(--color-cs-green)');
    expect(p.iconSystemName).toBe('airplane');
    expect(p.totalValue).toBe(2);
  });

  it('falls back to a default icon for non-systemName icons', () => {
    const p = mapSetToPreview({ ...baseSet, icon: { type: 'emoji', value: '🎉' } }, '0 cards');
    expect(p.iconSystemName).toBe('rectangle.stack.fill');
  });
});
