import { beforeEach, describe, expect, it, vi } from 'vitest';

const topicSvc = vi.hoisted(() => ({
  ensureMistakesTopic: vi.fn(),
  setNotesCount: vi.fn().mockResolvedValue(undefined),
}));
const noteSvc = vi.hoisted(() => ({
  fetchNoteBySavedIssueKey: vi.fn(),
  createNote: vi.fn().mockResolvedValue(undefined),
  fetchNotes: vi.fn().mockResolvedValue([{ id: 'existing' }, { id: 'new' }]),
}));
const reviewSvc = vi.hoisted(() => ({
  upsertReviewItem: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/grammarTopicService', () => topicSvc);
vi.mock('@/lib/grammarNoteService', () => noteSvc);
vi.mock('@/lib/grammarReviewService', () => reviewSvc);

import {
  buildMistakeBlocks,
  buildMistakeNote,
  buildSavedIssueKey,
  saveMistake,
} from './grammarMistakeService';
import type { GrammarNote } from './models';

const payload = {
  original: 'I am agree with you',
  corrected: 'I agree with you',
  explanation: 'Agree is a verb, not an adjective.',
};

const mistakesTopic = {
  id: 'common_mistakes', ownerUID: 'u1', title: 'Common Mistakes', description: '',
  icon: 'exclamationmark.triangle.fill', colorHex: '#F4729A', notesCount: 0,
  isPinned: true, isMistakesTopic: true, createdAt: 0, updatedAt: 0,
};

describe('buildSavedIssueKey', () => {
  it('lowercases, collapses whitespace, pipe-joins (incl. sourceIssueId slot)', () => {
    expect(buildSavedIssueKey({ ...payload, original: '  I  AM agree\nwith you ' })).toBe(
      '|i am agree with you|i agree with you|agree is a verb, not an adjective.',
    );
    expect(buildSavedIssueKey({ ...payload, sourceIssueId: 'LT-1' })).toMatch(/^lt-1\|/);
  });
});

describe('buildMistakeBlocks', () => {
  it('heading "Mistake" · quote original · example corrected · paragraph explanation', () => {
    const blocks = buildMistakeBlocks(payload);
    expect(blocks.map((b) => b.type)).toEqual(['heading', 'quote', 'example', 'paragraph']);
    expect(blocks[0].text).toBe('Mistake');
    expect(blocks[1].text).toBe('I am agree with you');
    expect(blocks[2].text).toBe('I agree with you');
    expect(blocks.map((b) => b.order)).toEqual([0, 1, 2, 3]);
  });

  it('skips empty explanation', () => {
    const blocks = buildMistakeBlocks({ ...payload, explanation: '  ' });
    expect(blocks.map((b) => b.type)).toEqual(['heading', 'quote', 'example']);
  });
});

describe('buildMistakeNote', () => {
  it('title = original (50 cap), preview = corrected, noteType mistake', () => {
    const long = 'x'.repeat(80);
    const note = buildMistakeNote({ ...payload, original: long }, {
      ownerUID: 'u1', topicId: 't1', now: 5,
    });
    expect(note.title).toHaveLength(50);
    expect(note.previewText).toBe('I agree with you');
    expect(note.noteType).toBe('mistake');
    expect(note.savedIssueKey).toBeDefined();
    expect(note.createdAt).toBe(5);
  });
});

describe('saveMistake', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    topicSvc.ensureMistakesTopic.mockResolvedValue(mistakesTopic);
    noteSvc.fetchNotes.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
  });

  it('dedup: returns duplicate without creating', async () => {
    const existing = { id: 'n-existing' } as GrammarNote;
    noteSvc.fetchNoteBySavedIssueKey.mockResolvedValue(existing);
    const out = await saveMistake(payload, 'u1');
    expect(out.status).toBe('duplicate');
    expect(noteSvc.createNote).not.toHaveBeenCalled();
    expect(reviewSvc.upsertReviewItem).not.toHaveBeenCalled();
  });

  it('saves: creates the note, syncs notesCount, queues a high-priority review item', async () => {
    noteSvc.fetchNoteBySavedIssueKey.mockResolvedValue(null);
    const before = Date.now();
    const out = await saveMistake(payload, 'u1');
    expect(out.status).toBe('saved');
    const created = noteSvc.createNote.mock.calls[0][0] as GrammarNote;
    expect(created.topicId).toBe('common_mistakes');
    expect(created.noteType).toBe('mistake');
    expect(topicSvc.setNotesCount).toHaveBeenCalledWith('u1', 'common_mistakes', 2);
    const reviewItem = reviewSvc.upsertReviewItem.mock.calls[0][0];
    expect(reviewItem.id).toBe(`mistake_common_mistakes_${created.id}`);
    expect(reviewItem.priority).toBe('high');
    expect(reviewItem.sourceType).toBe('mistake');
    expect(reviewItem.dueAt).toBeGreaterThanOrEqual(before + 60 * 60 * 1000 - 1000);
  });
});
