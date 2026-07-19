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
    where: vi.fn((field: string, op: string, value: unknown) => ({ field, op, value })),
  };
});

vi.mock('firebase/firestore', () => fs);

import {
  fetchReadingItems,
  markReadingCompleted,
  readingItemFromFirestore,
  saveReadingItem,
  updateReadingProgress,
} from './readingStorageService';
import type { ReadingLibraryItem } from './models';

const item: ReadingLibraryItem = {
  id: 'r1',
  ownerUID: 'u1',
  modeID: 'my-texts',
  title: 'A Morning in the City',
  preview: 'The city wakes slowly…',
  fullText: 'The city wakes slowly. Vendors open their stalls.',
  difficulty: 'B1',
  estimatedMinutes: 1,
  createdAt: 1_000,
  updatedAt: 2_000,
  progress: 0,
  tags: [],
  sourceType: 'pastedText',
  status: 'new',
  selections: { detectedDifficulty: 'B1', manualDifficulty: '' },
  toggles: { translationOnTap: true, readingTimer: false },
  languageCode: 'english',
  wordCount: 9,
  characterCount: 50,
  detectedDifficulty: 'B1',
  readingFocus: 'mainIdea',
  enabledQuestionTypes: ['comprehension', 'trueFalse'],
  lastReadCharacterIndex: 0,
};

describe('readingStorageService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('saveReadingItem writes userId (iOS parity) to users/{uid}/readingItems', async () => {
    await saveReadingItem(item);
    const [ref, data] = fs.setDoc.mock.calls[0];
    expect(ref.path).toBe('users/u1/readingItems/r1');
    expect(data.userId).toBe('u1');
    expect(data.ownerUID).toBeUndefined();
    expect(data.modeID).toBe('my-texts');
    expect(data.lastOpenedAt).toBeNull();
    expect(data.createdAt.toMillis()).toBe(1_000);
  });

  it('round-trips through readingItemFromFirestore with defaults', () => {
    const parsed = readingItemFromFirestore({
      id: 'r2', userId: 'u1', modeID: 'my-texts', title: 'T', preview: '', fullText: 'x',
      difficulty: 'bogus', progress: 1.7, sourceType: 'weird', status: 'nope',
      selections: { a: 1 }, toggles: { b: 1 },
      createdAt: new fs.Timestamp(5), updatedAt: new fs.Timestamp(6), lastOpenedAt: null,
      enabledQuestionTypes: ['comprehension', 'bogus'],
    });
    expect(parsed.ownerUID).toBe('u1');
    expect(parsed.difficulty).toBe('B1'); // unknown → B1
    expect(parsed.progress).toBe(1); // clamped
    expect(parsed.sourceType).toBe('pastedText');
    expect(parsed.status).toBe('new');
    expect(parsed.selections).toEqual({ a: '1' });
    expect(parsed.toggles).toEqual({ b: true });
    expect(parsed.enabledQuestionTypes).toEqual(['comprehension']); // unknown filtered
    expect(parsed.lastOpenedAt).toBeUndefined();
  });

  it('fetchReadingItems filters by modeID and sorts by lastOpenedAt??updatedAt desc', async () => {
    const raw = (id: string, updated: number, opened?: number) => ({
      data: () => ({
        id, userId: 'u1', modeID: 'my-texts', title: id, preview: '', fullText: '',
        createdAt: new fs.Timestamp(1), updatedAt: new fs.Timestamp(updated),
        lastOpenedAt: opened !== undefined ? new fs.Timestamp(opened) : null,
      }),
    });
    fs.getDocs.mockResolvedValue({
      docs: [raw('old', 100), raw('opened', 50, 900), raw('recent', 500)],
    });
    const items = await fetchReadingItems('u1', 'my-texts');
    expect(fs.where).toHaveBeenCalledWith('modeID', '==', 'my-texts');
    expect(items.map((i) => i.id)).toEqual(['opened', 'recent', 'old']);
  });

  it('updateReadingProgress clamps to 0.99 and sets inProgress', async () => {
    await updateReadingProgress('u1', 'r1', { progress: 1.0 });
    const [, data] = fs.updateDoc.mock.calls[0];
    expect(data.progress).toBe(0.99);
    expect(data.status).toBe('inProgress');
  });

  it('markReadingCompleted writes progress 1 + score + time', async () => {
    await markReadingCompleted('u1', 'r1', { readingTimeSeconds: 95, comprehensionScore: 0.8 });
    const [, data] = fs.updateDoc.mock.calls[0];
    expect(data.progress).toBe(1);
    expect(data.status).toBe('completed');
    expect(data.readingTimeSeconds).toBe(95);
    expect(data.comprehensionScore).toBe(0.8);
  });
});
