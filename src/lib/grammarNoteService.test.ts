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
    getDocs: vi.fn(),
    deleteDoc: vi.fn().mockResolvedValue(undefined),
    collection: vi.fn((_db: unknown, ...segs: string[]) => ({ path: segs.join('/') })),
    doc: vi.fn((col: { path: string }, id: string) => ({ path: `${col.path}/${id}` })),
    query: vi.fn((col: unknown, ...rest: unknown[]) => ({ col, rest })),
    orderBy: vi.fn((field: string, dir: string) => ({ field, dir })),
  };
});

vi.mock('firebase/firestore', () => fs);

import { createNote, deleteNote, fetchNotes, noteFromFirestore } from './grammarNoteService';
import type { GrammarNote } from './models';

const note: GrammarNote = {
  id: 'n1',
  ownerUID: 'u1',
  topicId: 't1',
  title: 'Ser vs Estar',
  noteType: 'rule',
  previewText: 'Use ser for identity…',
  contentBlocks: [
    { id: 'b1', type: 'heading', text: 'Ser vs Estar', items: [], order: 0 },
    { id: 'b2', type: 'example', text: 'Soy alto', secondaryText: 'I am tall', items: [], order: 1 },
    { id: 'b3', type: 'bulletList', text: '', items: ['ser = identity', 'estar = state'], order: 2 },
  ],
  createdAt: 1_000,
  updatedAt: 2_000,
};

describe('grammarNoteService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('createNote writes to the notes subcollection with serialized blocks', async () => {
    await createNote(note);
    const [ref, data] = fs.setDoc.mock.calls[0];
    expect(ref.path).toBe('users/u1/grammarNoteTopics/t1/notes/n1');
    expect(data.noteType).toBe('rule');
    expect(data.contentBlocks).toHaveLength(3);
    // secondaryText null when absent, string when present.
    expect(data.contentBlocks[0].secondaryText).toBeNull();
    expect(data.contentBlocks[1].secondaryText).toBe('I am tall');
    expect(data.contentBlocks[2].items).toEqual(['ser = identity', 'estar = state']);
    expect(data.createdAt.toMillis()).toBe(1_000);
  });

  it('noteFromFirestore round-trips + sorts blocks by order', () => {
    const raw = {
      id: 'n1', ownerUID: 'u1', topicId: 't1', title: 'Ser vs Estar',
      noteType: 'rule', previewText: 'p',
      contentBlocks: [
        { id: 'b2', type: 'example', text: 'Soy alto', secondaryText: 'I am tall', items: [], order: 1 },
        { id: 'b1', type: 'heading', text: 'H', secondaryText: null, items: [], order: 0 },
      ],
      createdAt: new fs.Timestamp(5_000),
      updatedAt: new fs.Timestamp(6_000),
    };
    const parsed = noteFromFirestore(raw);
    expect(parsed.contentBlocks.map((b) => b.id)).toEqual(['b1', 'b2']); // sorted by order
    expect(parsed.contentBlocks[0].secondaryText).toBeUndefined(); // null → undefined
    expect(parsed.contentBlocks[1].secondaryText).toBe('I am tall');
    expect(parsed.createdAt).toBe(5_000);
  });

  it('unknown noteType/blockType fall back to standard/paragraph', () => {
    const parsed = noteFromFirestore({
      id: 'n', ownerUID: 'u', topicId: 't', title: '', noteType: 'bogus', previewText: '',
      contentBlocks: [{ id: 'b', type: 'bogus', text: 'x', items: [], order: 0 }],
    });
    expect(parsed.noteType).toBe('standard');
    expect(parsed.contentBlocks[0].type).toBe('paragraph');
  });

  it('fetchNotes orders by updatedAt desc', async () => {
    fs.getDocs.mockResolvedValue({ docs: [] });
    await fetchNotes('u1', 't1');
    expect(fs.orderBy).toHaveBeenCalledWith('updatedAt', 'desc');
  });

  it('deleteNote targets the right subcollection doc', async () => {
    await deleteNote('u1', 't1', 'n1');
    expect(fs.deleteDoc.mock.calls[0][0].path).toBe('users/u1/grammarNoteTopics/t1/notes/n1');
  });
});
