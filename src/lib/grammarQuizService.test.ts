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
  };
});

vi.mock('firebase/firestore', () => fs);

const ai = vi.hoisted(() => ({ generateJSON: vi.fn() }));
vi.mock('@/lib/aiClient', () => ai);

import {
  createQuiz,
  deleteQuiz,
  generateQuizQuestions,
  quizFromFirestore,
} from './grammarQuizService';
import type { GrammarNote, GrammarNoteQuiz } from './models';

const quiz: GrammarNoteQuiz = {
  id: 'z1',
  ownerUID: 'u1',
  topicId: 't1',
  noteId: 'n1',
  title: 'Quiz: Ser vs Estar',
  sourceNoteTitle: 'Ser vs Estar',
  questions: [
    {
      id: 'q1', type: 'trueFalse', questionText: 'True or False: x?',
      options: ['True', 'False'], correctAnswer: 'True', explanation: 'because', order: 0,
    },
  ],
  createdAt: 1_000,
  updatedAt: 2_000,
};

const note: GrammarNote = {
  id: 'n1', ownerUID: 'u1', topicId: 't1', title: 'Ser vs Estar', noteType: 'rule',
  previewText: '', createdAt: 0, updatedAt: 0,
  contentBlocks: [
    { id: 'b1', type: 'rule', text: 'Use ser for identity', items: [], order: 0 },
  ],
};

describe('grammarQuizService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('createQuiz writes to the quizzes subcollection and flips hasQuiz on the note', async () => {
    await createQuiz(quiz);
    const [ref, data] = fs.setDoc.mock.calls[0];
    expect(ref.path).toBe('users/u1/grammarNoteTopics/t1/notes/n1/quizzes/z1');
    expect(data.questions[0].explanation).toBe('because');
    expect(data.createdAt.toMillis()).toBe(1_000);
    const [noteRef, patch] = fs.updateDoc.mock.calls[0];
    expect(noteRef.path).toBe('users/u1/grammarNoteTopics/t1/notes/n1');
    expect(patch.hasQuiz).toBe(true);
  });

  it('deleteQuiz clears hasQuiz only when the collection is now empty', async () => {
    fs.getDocs.mockResolvedValueOnce({ empty: false, docs: [] });
    await deleteQuiz('u1', 't1', 'n1', 'z1');
    expect(fs.deleteDoc.mock.calls[0][0].path).toBe(
      'users/u1/grammarNoteTopics/t1/notes/n1/quizzes/z1',
    );
    expect(fs.updateDoc).not.toHaveBeenCalled();

    fs.getDocs.mockResolvedValueOnce({ empty: true, docs: [] });
    await deleteQuiz('u1', 't1', 'n1', 'z1');
    expect(fs.updateDoc.mock.calls[0][1].hasQuiz).toBe(false);
  });

  it('quizFromFirestore round-trips, sorts questions by order, defaults unknown type', () => {
    const parsed = quizFromFirestore({
      id: 'z1', ownerUID: 'u1', topicId: 't1', noteId: 'n1', title: 'T', sourceNoteTitle: 'S',
      questions: [
        { id: 'q2', type: 'bogus', questionText: 'Q2', correctAnswer: 'a', order: 1, explanation: null },
        { id: 'q1', type: 'fillGap', questionText: 'Q1 _____', correctAnswer: 'b', order: 0 },
      ],
      createdAt: new fs.Timestamp(5_000),
      updatedAt: new fs.Timestamp(6_000),
    });
    expect(parsed.questions.map((x) => x.id)).toEqual(['q1', 'q2']);
    expect(parsed.questions[1].type).toBe('shortAnswer'); // unknown → shortAnswer
    expect(parsed.questions[1].explanation).toBeUndefined(); // null → undefined
    expect(parsed.createdAt).toBe(5_000);
  });

  it('generateQuizQuestions maps the DTO through the validator', async () => {
    ai.generateJSON.mockResolvedValue({
      questions: [
        {
          type: 'multipleChoice', questionText: '  Which?  ',
          options: ['a', 'b', 'A'], correctAnswer: 'a', explanation: 'why',
        },
        { type: 'unknownType', questionText: 'Explain', correctAnswer: 'because' },
      ],
    });
    const out = await generateQuizQuestions(note, {
      questionCount: 2,
      allowedTypes: ['multipleChoice', 'shortAnswer'],
    });
    expect(ai.generateJSON.mock.calls[0][0].task).toBe('grammar_quiz_generation');
    expect(ai.generateJSON.mock.calls[0][0].prompt).toContain('Note title: Ser vs Estar');
    expect(out[0].type).toBe('multipleChoice');
    expect(out[0].questionText).toBe('Which?');
    expect(out[0].options).toEqual(['a', 'b']); // deduped
    expect(out[1].type).toBe('shortAnswer'); // unknown type falls back
    expect(out.map((x) => x.order)).toEqual([0, 1]);
  });
});
