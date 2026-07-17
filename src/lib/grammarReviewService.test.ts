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
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    deleteDoc: vi.fn().mockResolvedValue(undefined),
    collection: vi.fn((_db: unknown, ...segs: string[]) => ({ path: segs.join('/') })),
    doc: vi.fn((col: { path: string }, id: string) => ({ path: `${col.path}/${id}` })),
    query: vi.fn((col: unknown, ...rest: unknown[]) => ({ col, rest })),
    where: vi.fn((field: string, op: string, value: unknown) => ({ field, op, value })),
    orderBy: vi.fn((field: string, dir: string) => ({ field, dir })),
    limit: vi.fn((n: number) => ({ limit: n })),
  };
});

vi.mock('firebase/firestore', () => fs);

import { makeReviewItem } from './grammarReview';
import {
  fetchDueReviewItems,
  markReviewed,
  reviewItemFromFirestore,
  upsertReviewItem,
} from './grammarReviewService';

const item = makeReviewItem({
  id: 'quiz_t_n_q',
  ownerUID: 'u1',
  sourceType: 'quiz',
  topicId: 't',
  noteId: 'n',
  quizId: 'q',
  title: 'Quiz item',
  previewText: 'p',
  priority: 'high',
  now: 1_000,
});

describe('grammarReviewService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('upsert on a NEW doc writes zeroed counters', async () => {
    fs.getDoc.mockResolvedValue({ exists: () => false });
    const out = await upsertReviewItem(item);
    expect(out.reviewCount).toBe(0);
    const [ref, data] = fs.setDoc.mock.calls[0];
    expect(ref.path).toBe('users/u1/grammarReviewItems/quiz_t_n_q');
    expect(data.priority).toBe('high');
    expect(data.quizId).toBe('q');
  });

  it('upsert on an EXISTING doc preserves learning history', async () => {
    fs.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        id: 'quiz_t_n_q', ownerUID: 'u1', sourceType: 'quiz', topicId: 't',
        noteId: 'n', quizId: 'q', title: 'old', previewText: 'old',
        priority: 'normal', dueAt: new fs.Timestamp(500),
        lastReviewedAt: new fs.Timestamp(400), nextReviewAt: new fs.Timestamp(900),
        reviewCount: 7, correctStreak: 3, incorrectStreak: 1, mistakeCount: 2,
        createdAt: new fs.Timestamp(100), updatedAt: new fs.Timestamp(400),
      }),
    });
    const out = await upsertReviewItem(item);
    // History preserved…
    expect(out.reviewCount).toBe(7);
    expect(out.correctStreak).toBe(3);
    expect(out.incorrectStreak).toBe(1);
    expect(out.mistakeCount).toBe(2);
    expect(out.lastReviewedAt).toBe(400);
    expect(out.nextReviewAt).toBe(900);
    expect(out.createdAt).toBe(100);
    // …while identity/content comes from the incoming item.
    expect(out.title).toBe('Quiz item');
    expect(out.priority).toBe('high');
  });

  it('markReviewed persists the advanced schedule', async () => {
    const out = await markReviewed(item, 'good', 10_000);
    expect(out.reviewCount).toBe(1);
    expect(out.dueAt).toBe(10_000 + 3 * 24 * 3600 * 1000);
    const [, data] = fs.setDoc.mock.calls[0];
    expect(data.dueAt.toMillis()).toBe(out.dueAt);
    expect(data.reviewCount).toBe(1);
  });

  it('fetchDueReviewItems queries dueAt <= now ordered asc with a limit', async () => {
    fs.getDocs.mockResolvedValue({ docs: [] });
    await fetchDueReviewItems('u1', 30);
    expect(fs.where.mock.calls[0][0]).toBe('dueAt');
    expect(fs.where.mock.calls[0][1]).toBe('<=');
    expect(fs.orderBy).toHaveBeenCalledWith('dueAt', 'asc');
    expect(fs.limit).toHaveBeenCalledWith(30);
  });

  it('reviewItemFromFirestore defaults + null handling', () => {
    const parsed = reviewItemFromFirestore({
      id: 'x', ownerUID: 'u', sourceType: 'bogus', topicId: 't',
      noteId: null, quizId: null, title: '', previewText: '',
      priority: 'weird', dueAt: new fs.Timestamp(1),
      lastReviewedAt: null, nextReviewAt: null,
      createdAt: new fs.Timestamp(1), updatedAt: new fs.Timestamp(1),
    });
    expect(parsed.sourceType).toBe('note');
    expect(parsed.priority).toBe('normal');
    expect(parsed.noteId).toBeUndefined();
    expect(parsed.lastReviewedAt).toBeUndefined();
    expect(parsed.reviewCount).toBe(0);
  });
});
