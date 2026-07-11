import { describe, expect, it } from 'vitest';

import { validateFolder } from './folderValidation';

describe('validateFolder', () => {
  it('requires a name', () => {
    expect(validateFolder({ title: '   ', description: '' })).toBe('folders.error.nameRequired');
  });

  it('rejects a name over 80 chars', () => {
    expect(validateFolder({ title: 'x'.repeat(81), description: '' })).toBe(
      'folders.error.nameTooLong',
    );
  });

  it('rejects a description over 120 chars', () => {
    expect(validateFolder({ title: 'Travel', description: 'y'.repeat(121) })).toBe(
      'folders.error.descTooLong',
    );
  });

  it('accepts a valid folder', () => {
    expect(validateFolder({ title: 'Travel', description: 'Trips' })).toBeNull();
  });
});
