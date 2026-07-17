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
    updateDoc: vi.fn().mockResolvedValue(undefined),
    collection: vi.fn((_db: unknown, ...segs: string[]) => ({ path: segs.join('/') })),
    doc: vi.fn((col: { path: string }, id: string) => ({ path: `${col.path}/${id}` })),
    query: vi.fn((col: unknown, ...rest: unknown[]) => ({ col, rest })),
    orderBy: vi.fn((field: string, dir: string) => ({ field, dir })),
  };
});

vi.mock('firebase/firestore', () => fs);

import { createTopic, deleteTopic, ensureMistakesTopic, fetchTopics, setNotesCount } from './grammarTopicService';
import type { GrammarNoteTopic } from './models';

const topic: GrammarNoteTopic = {
  id: 't1',
  ownerUID: 'u1',
  title: 'Spanish verbs',
  description: 'ser vs estar etc.',
  icon: 'book.pages.fill',
  colorHex: '#4F7CFF',
  notesCount: 0,
  isPinned: false,
  isMistakesTopic: false,
  createdAt: 1_000,
  updatedAt: 2_000,
};

describe('grammarTopicService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('createTopic writes to users/{uid}/grammarNoteTopics/{id} with Timestamps', async () => {
    await createTopic(topic);
    const [ref, data] = fs.setDoc.mock.calls[0];
    expect(ref.path).toBe('users/u1/grammarNoteTopics/t1');
    expect(data.title).toBe('Spanish verbs');
    expect(data.createdAt).toBeInstanceOf(fs.Timestamp);
    expect(data.createdAt.toMillis()).toBe(1_000);
    expect(data.notesCount).toBe(0);
  });

  it('fetchTopics maps docs + converts Timestamps, ordered by createdAt desc', async () => {
    fs.getDocs.mockResolvedValue({
      docs: [
        {
          data: () => ({
            id: 't1',
            ownerUID: 'u1',
            title: 'Spanish verbs',
            description: 'x',
            icon: 'book.pages.fill',
            colorHex: '#4F7CFF',
            notesCount: 3,
            isPinned: false,
            isMistakesTopic: false,
            createdAt: new fs.Timestamp(5_000),
            updatedAt: new fs.Timestamp(6_000),
          }),
        },
      ],
    });
    const result = await fetchTopics('u1');
    expect(result).toHaveLength(1);
    expect(result[0].notesCount).toBe(3);
    expect(result[0].createdAt).toBe(5_000);
    expect(fs.orderBy).toHaveBeenCalledWith('createdAt', 'desc');
  });

  it('setNotesCount clamps to >= 0 and writes updatedAt', async () => {
    await setNotesCount('u1', 't1', -2);
    const [ref, data] = fs.updateDoc.mock.calls[0];
    expect(ref.path).toBe('users/u1/grammarNoteTopics/t1');
    expect(data.notesCount).toBe(0);
    expect(data.updatedAt).toBeInstanceOf(fs.Timestamp);
  });

  it('deleteTopic targets the right doc', async () => {
    await deleteTopic('t1', 'u1');
    expect(fs.deleteDoc.mock.calls[0][0].path).toBe('users/u1/grammarNoteTopics/t1');
  });
});

describe('ensureMistakesTopic (4D5)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the existing mistakes topic when one is flagged', async () => {
    fs.getDocs.mockResolvedValue({
      docs: [
        { data: () => ({ ...raw(), id: 'custom-id', isMistakesTopic: true, title: 'My mistakes' }) },
      ],
    });
    const topic = await ensureMistakesTopic('u1');
    expect(topic.id).toBe('custom-id');
    expect(fs.setDoc).not.toHaveBeenCalled();
  });

  it('creates the fixed common_mistakes topic when none exists', async () => {
    fs.getDocs.mockResolvedValue({ docs: [{ data: () => raw() }] });
    const topic = await ensureMistakesTopic('u1');
    expect(topic.id).toBe('common_mistakes');
    expect(topic.title).toBe('Common Mistakes');
    expect(topic.isPinned).toBe(true);
    expect(topic.isMistakesTopic).toBe(true);
    expect(topic.colorHex).toBe('#F4729A');
    const [ref, data] = fs.setDoc.mock.calls[0];
    expect(ref.path).toBe('users/u1/grammarNoteTopics/common_mistakes');
    expect(data.isMistakesTopic).toBe(true);
  });
});

function raw() {
  return {
    id: 't-normal', ownerUID: 'u1', title: 'Normal', description: '',
    icon: 'book.pages.fill', colorHex: '#4F7CFF', notesCount: 0,
    isPinned: false, isMistakesTopic: false,
    createdAt: new fs.Timestamp(1), updatedAt: new fs.Timestamp(1),
  };
}
