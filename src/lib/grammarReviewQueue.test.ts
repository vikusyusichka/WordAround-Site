import { describe, expect, it } from 'vitest';

import { makeGrammarNote } from './grammarFactories';
import { DAY, makeReviewItem } from './grammarReview';
import { buildReviewQueue, orderDueItems, REVIEW_QUEUE_LIMIT } from './grammarReviewQueue';
import type { GrammarNote, GrammarNoteQuiz, GrammarReviewItem } from './models';

const note = (id: string, blocks: GrammarNote['contentBlocks'] = []): GrammarNote =>
  makeGrammarNote({
    id,
    ownerUID: 'u',
    topicId: 't',
    title: `Note ${id}`,
    noteType: 'rule',
    previewText: `Preview of ${id}`,
    contentBlocks: blocks,
    now: 0,
  });

const item = (noteId: string, overrides?: Partial<GrammarReviewItem>): GrammarReviewItem => ({
  ...makeReviewItem({
    id: `note_t_${noteId}`,
    ownerUID: 'u',
    sourceType: 'note',
    topicId: 't',
    noteId,
    title: `Item ${noteId}`,
    previewText: 'p',
    now: 0,
  }),
  ...overrides,
});

const richBlocks: GrammarNote['contentBlocks'] = [
  { id: 'b1', type: 'rule', text: 'Use ser for identity and origin', items: [], order: 0 },
  { id: 'b2', type: 'warning', text: 'Common mistake: estar for professions', items: [], order: 1 },
];

describe('buildReviewQueue', () => {
  it('strict pool precedence: manual wins over recommendations', () => {
    const notesById = new Map([['n1', note('n1', richBlocks)], ['n2', note('n2', richBlocks)]]);
    const q = buildReviewQueue({
      manualItems: [item('n1')],
      recentlyOpened: [item('n2')],
      recentlyEdited: [item('n2')],
      notesById,
    });
    expect(q.pool).toBe('manual');
    expect(q.cards.map((c) => c.note.id)).toEqual(['n1']);
  });

  it('falls back opened → edited when earlier pools are empty', () => {
    const notesById = new Map([['n2', note('n2', richBlocks)]]);
    expect(
      buildReviewQueue({ manualItems: [], recentlyOpened: [item('n2')], recentlyEdited: [], notesById }).pool,
    ).toBe('recentlyOpened');
    expect(
      buildReviewQueue({ manualItems: [], recentlyOpened: [], recentlyEdited: [item('n2')], notesById }).pool,
    ).toBe('recentlyEdited');
    const empty = buildReviewQueue({ manualItems: [], recentlyOpened: [], recentlyEdited: [], notesById });
    expect(empty.pool).toBeNull();
    expect(empty.cards).toHaveLength(0);
  });

  it('caps at the limit and preserves order; estimatedMinutes = 2/card', () => {
    const items = Array.from({ length: 25 }, (_, i) => item(`n${i}`));
    const notesById = new Map(items.map((it) => [it.noteId as string, note(it.noteId as string, richBlocks)]));
    const q = buildReviewQueue({ manualItems: items, recentlyOpened: [], recentlyEdited: [], notesById });
    expect(q.cards).toHaveLength(REVIEW_QUEUE_LIMIT);
    expect(q.cards[0].note.id).toBe('n0');
    expect(q.estimatedMinutes).toBe(40);
  });

  it('drops items whose note is missing; pool null when all dropped', () => {
    const notesById = new Map([['n1', note('n1', richBlocks)]]);
    const q = buildReviewQueue({
      manualItems: [item('missing'), item('n1')],
      recentlyOpened: [],
      recentlyEdited: [],
      notesById,
    });
    expect(q.cards).toHaveLength(1);
    expect(q.pool).toBe('manual');

    const allDropped = buildReviewQueue({
      manualItems: [item('missing')],
      recentlyOpened: [],
      recentlyEdited: [],
      notesById,
    });
    expect(allDropped.cards).toHaveLength(0);
    expect(allDropped.pool).toBeNull();
  });

  it('every card gets a question; note with unusable blocks falls back to the key-idea question', () => {
    // Only a heading — local generator throws, no best block → ultimate fallback.
    const bare = note('n1', [
      { id: 'b', type: 'heading', text: 'Only a heading', items: [], order: 0 },
    ]);
    const q = buildReviewQueue({
      manualItems: [item('n1')],
      recentlyOpened: [],
      recentlyEdited: [],
      notesById: new Map([['n1', bare]]),
    });
    expect(q.cards).toHaveLength(1);
    expect(q.cards[0].question.questionText).toBe('What is the key idea of this note?');
    expect(q.cards[0].question.correctAnswer).toBe('Preview of n1');
    // sourceText falls back to previewText when no usable block exists.
    expect(q.cards[0].sourceText).toBe('Preview of n1');
  });

  it('picks the best block by priority (rule first)', () => {
    const blocks: GrammarNote['contentBlocks'] = [
      { id: 'p', type: 'paragraph', text: 'A paragraph with plenty of words here', items: [], order: 0 },
      { id: 'r', type: 'rule', text: 'The rule text', secondaryText: 'detail', items: [], order: 1 },
    ];
    const q = buildReviewQueue({
      manualItems: [item('n1')],
      recentlyOpened: [],
      recentlyEdited: [],
      notesById: new Map([['n1', note('n1', blocks)]]),
    });
    expect(q.cards[0].sourceBlockType).toBe('rule');
    expect(q.cards[0].sourceText).toBe('The rule text');
    expect(q.cards[0].sourceSecondaryText).toBe('detail');
  });
});

describe('quiz-sourced cards', () => {
  const quizItem = (overrides?: Partial<GrammarReviewItem>): GrammarReviewItem => ({
    ...makeReviewItem({
      id: 'quiz_t_n1_q1',
      ownerUID: 'u',
      sourceType: 'quiz',
      topicId: 't',
      noteId: 'n1',
      quizId: 'q1',
      title: 'Failed quiz',
      previewText: 'p',
      now: 0,
    }),
    ...overrides,
  });

  const quiz: GrammarNoteQuiz = {
    id: 'q1',
    ownerUID: 'u',
    topicId: 't',
    noteId: 'n1',
    title: 'Ser vs estar',
    sourceNoteTitle: 'Note n1',
    questions: [
      {
        id: 'qa', type: 'multipleChoice', questionText: 'Which verb for origin?',
        options: ['ser', 'estar'], correctAnswer: 'ser', order: 0,
      },
      {
        id: 'qb', type: 'trueFalse', questionText: 'estar marks a permanent trait',
        options: ['True', 'False'], correctAnswer: 'False', order: 1,
      },
    ],
    createdAt: 0,
    updatedAt: 0,
  };

  const notesById = new Map([['n1', note('n1', richBlocks)]]);

  /* The point of the whole feature: an item is in the queue because that
     quiz was failed, so the card has to ask what was failed — not a fresh
     question generated from the note, which reviews something else. */
  it('asks the failed quiz its own question', () => {
    const queue = buildReviewQueue({
      manualItems: [quizItem()],
      recentlyOpened: [],
      recentlyEdited: [],
      notesById,
      quizzesById: new Map([['q1', quiz]]),
    });
    expect(queue.cards[0].question.questionText).toBe('Which verb for origin?');
    expect(queue.cards[0].question.correctAnswer).toBe('ser');
  });

  it('walks the quiz so a repeatedly failed quiz is not one question forever', () => {
    const second = buildReviewQueue({
      manualItems: [quizItem({ reviewCount: 1 })],
      recentlyOpened: [],
      recentlyEdited: [],
      notesById,
      quizzesById: new Map([['q1', quiz]]),
    });
    expect(second.cards[0].question.questionText).toBe('estar marks a permanent trait');

    /* And wraps rather than running off the end. */
    const wrapped = buildReviewQueue({
      manualItems: [quizItem({ reviewCount: 2 })],
      recentlyOpened: [],
      recentlyEdited: [],
      notesById,
      quizzesById: new Map([['q1', quiz]]),
    });
    expect(wrapped.cards[0].question.questionText).toBe('Which verb for origin?');
  });

  it('falls back to a generated question when the quiz is gone', () => {
    const queue = buildReviewQueue({
      manualItems: [quizItem()],
      recentlyOpened: [],
      recentlyEdited: [],
      notesById,
      quizzesById: new Map(),
    });
    expect(queue.cards).toHaveLength(1);
    expect(queue.cards[0].question.questionText).toBeTruthy();
    expect(queue.cards[0].question.questionText).not.toBe('Which verb for origin?');
  });

  it('leaves note-sourced items on generated questions', () => {
    const queue = buildReviewQueue({
      manualItems: [item('n1')],
      recentlyOpened: [],
      recentlyEdited: [],
      notesById,
      quizzesById: new Map([['q1', quiz]]),
    });
    expect(queue.cards[0].question.questionText).not.toBe('Which verb for origin?');
  });
});

describe('block selection', () => {
  it('picks a comparison block over a paragraph, and reviews it as a comparison', () => {
    const blocks: GrammarNote['contentBlocks'] = [
      { id: 'b1', type: 'paragraph', text: 'Both verbs translate as "to be".', items: [], order: 0 },
      {
        id: 'b2', type: 'comparison', text: 'ser for identity',
        secondaryText: 'estar for state', items: [], order: 1,
      },
    ];
    const queue = buildReviewQueue({
      manualItems: [item('n1')],
      recentlyOpened: [],
      recentlyEdited: [],
      notesById: new Map([['n1', note('n1', blocks)]]),
    });
    expect(queue.cards[0].sourceBlockType).toBe('comparison');
    expect(queue.cards[0].sourceText).toBe('ser for identity');
    expect(queue.cards[0].sourceSecondaryText).toBe('estar for state');
  });

  /* A note built entirely out of comparisons used to select nothing the
     generator understood, so the card fell through to the generic
     "key idea of this note" question. */
  it('asks a real question about a note made only of comparisons', () => {
    const blocks: GrammarNote['contentBlocks'] = [
      {
        id: 'b1', type: 'comparison', text: 'por for cause',
        secondaryText: 'para for purpose', items: [], order: 0,
      },
      {
        id: 'b2', type: 'comparison', text: 'ser for identity',
        secondaryText: 'estar for state', items: [], order: 1,
      },
    ];
    const queue = buildReviewQueue({
      manualItems: [item('n1')],
      recentlyOpened: [],
      recentlyEdited: [],
      notesById: new Map([['n1', note('n1', blocks)]]),
    });
    expect(queue.cards[0].question.questionText).not.toBe('What is the key idea of this note?');
    expect(queue.cards[0].question.questionText).toContain('por for cause');
  });

  it('skips subheading and image when nothing better is present', () => {
    const blocks: GrammarNote['contentBlocks'] = [
      { id: 'b1', type: 'subheading', text: 'Overview', items: [], order: 0 },
      { id: 'b2', type: 'image', text: 'A diagram', items: [], order: 1 },
      { id: 'b3', type: 'checklist', text: 'Check agreement in gender', items: [], order: 2 },
    ];
    const queue = buildReviewQueue({
      manualItems: [item('n1')],
      recentlyOpened: [],
      recentlyEdited: [],
      notesById: new Map([['n1', note('n1', blocks)]]),
    });
    expect(queue.cards[0].sourceBlockType).toBe('checklist');
  });
});

describe('orderDueItems', () => {
  const NOW = 100 * DAY;
  /* Reviewed `ago` days back with stability `s`: lower s/ago ratio = lower R. */
  const learned = (noteId: string, s: number, ago: number, extra?: Partial<GrammarReviewItem>) =>
    item(noteId, {
      id: `note_t_${noteId}_${s}_${ago}`,
      reviewCount: 2,
      lastReviewedAt: NOW - ago * DAY,
      stability: s,
      difficulty: 5,
      dueAt: NOW - DAY,
      ...extra,
    });

  it('lowest chance of remembering first, high priority ahead of the rest', () => {
    const solid = learned('a', 30, 10);
    const shaky = learned('b', 2, 10);
    const mistake = learned('c', 20, 1, { priority: 'high' });
    const out = orderDueItems([solid, shaky, mistake], { now: NOW, newAllowance: 10, limit: 20 });
    expect(out.map((i) => i.noteId)).toEqual(['c', 'b', 'a']);
  });

  it('never-reviewed items come after reviews and are capped by the allowance', () => {
    const fresh = ['n1', 'n2', 'n3'].map((n, k) => item(n, { createdAt: k }));
    const old = learned('x', 3, 5);
    const out = orderDueItems([...fresh, old], { now: NOW, newAllowance: 2, limit: 20 });
    expect(out.map((i) => i.noteId)).toEqual(['x', 'n1', 'n2']);
    expect(orderDueItems(fresh, { now: NOW, newAllowance: 0, limit: 20 })).toEqual([]);
  });

  it('a new high-priority card (fresh mistake, failed quiz) is not held back by the cap', () => {
    const mistake = item('m', { priority: 'high', createdAt: 5 });
    const plain = item('p', { createdAt: 1 });
    const out = orderDueItems([plain, mistake], { now: NOW, newAllowance: 0, limit: 20 });
    expect(out.map((i) => i.noteId)).toEqual(['m']);
  });

  it('avoids two cards from the same note in a row when it can', () => {
    const out = orderDueItems(
      [learned('a', 1, 10), learned('a', 2, 10), learned('b', 3, 10)],
      { now: NOW, newAllowance: 0, limit: 20 },
    );
    expect(out.map((i) => i.noteId)).toEqual(['a', 'b', 'a']);
  });

  it('respects the session limit', () => {
    const many = Array.from({ length: 30 }, (_, k) => learned(`n${k}`, 1 + k, 10));
    expect(orderDueItems(many, { now: NOW, newAllowance: 0, limit: 10 })).toHaveLength(10);
  });
});

describe('question rotation', () => {
  it('asks about a different block as the review count grows, and reveals that block', () => {
    const notesById = new Map([['n1', note('n1', richBlocks)]]);
    const at = (reviewCount: number) =>
      buildReviewQueue({
        manualItems: [item('n1', { reviewCount, lastReviewedAt: 0, stability: 1, dueAt: 0 })],
        recentlyOpened: [],
        recentlyEdited: [],
        notesById,
      }).cards[0];
    const first = at(0);
    const second = at(1);
    expect(first.sourceText).not.toBe(second.sourceText);
    expect(at(2).sourceText).toBe(first.sourceText);
  });
});

describe('mistake notes', () => {
  it('ask to correct the wrong sentence and never quiz the wrong form', () => {
    const mistake = makeGrammarNote({
      id: 'm1',
      ownerUID: 'u',
      topicId: 't',
      title: 'He go home',
      noteType: 'mistake',
      previewText: 'He goes home',
      contentBlocks: [
        { id: 'h', type: 'heading', text: 'Mistake', items: [], order: 0 },
        { id: 'q', type: 'quote', text: 'He go home every day after work', items: [], order: 1 },
        { id: 'e', type: 'example', text: 'He goes home every day after work', items: [], order: 2 },
        { id: 'p', type: 'paragraph', text: 'Third person singular takes -s.', items: [], order: 3 },
      ],
      now: 0,
    });
    const notesById = new Map([['m1', mistake]]);
    for (const reviewCount of [0, 1, 2]) {
      const card = buildReviewQueue({
        manualItems: [item('m1', { reviewCount, lastReviewedAt: 0, stability: 1, dueAt: 0 })],
        recentlyOpened: [],
        recentlyEdited: [],
        notesById,
      }).cards[0];
      expect(card.question.type).toBe('shortAnswer');
      expect(card.question.questionText).toContain('He go home every day after work');
      expect(card.question.correctAnswer).toBe('He goes home every day after work');
      expect(card.question.explanation).toBe('Third person singular takes -s.');
    }
  });

  it('review never asks true/false or multiple choice generated from a note', () => {
    const notesById = new Map([['n1', note('n1', richBlocks)]]);
    for (const reviewCount of [0, 1, 2, 3]) {
      const card = buildReviewQueue({
        manualItems: [item('n1', { reviewCount, lastReviewedAt: 0, stability: 1, dueAt: 0 })],
        recentlyOpened: [],
        recentlyEdited: [],
        notesById,
      }).cards[0];
      expect(['fillGap', 'shortAnswer']).toContain(card.question.type);
    }
  });
});
