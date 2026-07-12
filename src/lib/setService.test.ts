import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/firebase', () => ({ db: { __db: true } }));

const fs = vi.hoisted(() => {
  class Timestamp {
    millis: number;
    constructor(m: number) {
      this.millis = m;
    }
    static fromMillis(m: number) {
      return new Timestamp(m);
    }
    toMillis() {
      return this.millis;
    }
  }
  return {
    Timestamp,
    setDoc: vi.fn().mockResolvedValue(undefined),
    updateDoc: vi.fn().mockResolvedValue(undefined),
    getDocs: vi.fn(),
    deleteDoc: vi.fn().mockResolvedValue(undefined),
    collection: vi.fn((_db: unknown, ...segs: string[]) => ({ path: segs.join('/') })),
    doc: vi.fn((col: { path: string }, id: string) => ({ path: `${col.path}/${id}` })),
    query: vi.fn((col: unknown, ...rest: unknown[]) => ({ col, rest })),
    orderBy: vi.fn((field: string, dir: string) => ({ field, dir })),
    where: vi.fn((field: string, op: string, value: unknown) => ({ field, op, value })),
  };
});

vi.mock('firebase/firestore', () => fs);

import { createSet, deleteSet, fetchSets, updateSetCards } from './setService';
import type { FlashcardSet } from './models';

const set: FlashcardSet = {
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
  cards: [{ id: 'c1', word: 'a', translation: 'b', example: 'c', imageURL: 'http://img' }],
  createdAt: 1000,
  updatedAt: 2000,
};

describe('setService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('createSet writes cards, icon, and Timestamps to the set doc', async () => {
    await createSet(set);
    const [ref, data] = fs.setDoc.mock.calls[0];
    expect(ref.path).toBe('users/u1/flashcardSets/set1');
    expect(data.icon).toEqual({ type: 'systemName', value: 'airplane' });
    expect(data.cards[0]).toMatchObject({ word: 'a', translation: 'b', imageURL: 'http://img' });
    expect(data.createdAt.toMillis()).toBe(1000);
  });

  it('fetchSets maps docs (cards + icon + millis) ordered by createdAt desc', async () => {
    fs.getDocs.mockResolvedValue({
      docs: [
        {
          data: () => ({
            id: 'set1',
            ownerUID: 'u1',
            title: 'Travel',
            colorHex: '#4169F5',
            icon: { type: 'systemName', value: 'airplane' },
            cards: [{ id: 'c1', word: 'a', translation: 'b', example: '' }],
            createdAt: new fs.Timestamp(5000),
            updatedAt: new fs.Timestamp(6000),
          }),
        },
      ],
    });
    const result = await fetchSets('u1');
    expect(result[0].cards).toHaveLength(1);
    expect(result[0].icon).toEqual({ type: 'systemName', value: 'airplane' });
    expect(result[0].createdAt).toBe(5000);
    expect(fs.orderBy).toHaveBeenCalledWith('createdAt', 'desc');
  });

  it('deleteSet targets the right doc', async () => {
    await deleteSet('set1', 'u1');
    expect(fs.deleteDoc.mock.calls[0][0].path).toBe('users/u1/flashcardSets/set1');
  });

  it('updateSetCards writes only cards + updatedAt', async () => {
    await updateSetCards('u1', 'set1', set.cards);
    const [ref, data] = fs.updateDoc.mock.calls[0];
    expect(ref.path).toBe('users/u1/flashcardSets/set1');
    expect(data.cards[0]).toMatchObject({ word: 'a', translation: 'b' });
    expect(data.updatedAt).toBeInstanceOf(fs.Timestamp);
    expect(data.title).toBeUndefined();
  });
});
