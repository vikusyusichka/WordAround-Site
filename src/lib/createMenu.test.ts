import { describe, expect, it } from 'vitest';

import { CREATE_ITEMS, CREATE_ROUTES } from '@/lib/createMenu';

describe('create menu', () => {
  it('offers the same five actions iOS does', () => {
    expect(CREATE_ITEMS.map((item) => item.id)).toEqual([
      'folder',
      'set',
      'text',
      'audio',
      'essay',
    ]);
  });

  /* The test that was missing. Text, Audio and Essay had no route for three
     phases after their screens shipped, so picking them did nothing at all and
     nothing failed to say so. */
  it('sends every action somewhere', () => {
    for (const item of CREATE_ITEMS) {
      expect(CREATE_ROUTES[item.id], `no route for "${item.id}"`).toBeTruthy();
      expect(CREATE_ROUTES[item.id].startsWith('/')).toBe(true);
    }
  });

  it('has no route pointing at an action that does not exist', () => {
    const ids = new Set(CREATE_ITEMS.map((item) => item.id));
    for (const id of Object.keys(CREATE_ROUTES)) expect(ids.has(id)).toBe(true);
  });

  it('gives each action its own place on the radial arc', () => {
    const seats = CREATE_ITEMS.map((item) => `${item.x},${item.y}`);
    expect(new Set(seats).size).toBe(CREATE_ITEMS.length);
  });
});
