/* Grammar-quiz persistence + AI generation — web port of
   GrammarNoteQuizService.swift + GrammarQuizAIService.swift. Quizzes live at
   users/{uid}/grammarNoteTopics/{topicId}/notes/{noteId}/quizzes/{quizId};
   create/delete keep the parent note's `hasQuiz` flag in sync. */
import { deleteDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';

import { generateJSON } from '@/lib/aiClient';
import { buildQuizPrompt, type QuizPromptOptions } from '@/lib/grammarQuizPrompts';
import { validateQuizQuestions } from '@/lib/grammarQuizValidator';
import {
  grammarNoteDoc,
  grammarQuizDoc,
  grammarQuizzesCollection,
  millisToTs,
  tsToMillis,
} from '@/lib/firestore';
import type {
  GrammarNote,
  GrammarNoteQuiz,
  GrammarQuizQuestion,
  GrammarQuizQuestionType,
} from '@/lib/models';

const QUESTION_TYPES: GrammarQuizQuestionType[] = [
  'multipleChoice', 'trueFalse', 'fillGap', 'shortAnswer',
];

/* --- Firestore mapping --- */

const questionToFirestore = (q: GrammarQuizQuestion) => ({
  id: q.id,
  type: q.type,
  questionText: q.questionText,
  options: q.options,
  correctAnswer: q.correctAnswer,
  explanation: q.explanation ?? null,
  order: q.order,
});

const questionFromFirestore = (raw: unknown, index: number): GrammarQuizQuestion => {
  const data = (raw ?? {}) as Record<string, unknown>;
  const type = QUESTION_TYPES.includes(data.type as GrammarQuizQuestionType)
    ? (data.type as GrammarQuizQuestionType)
    : 'shortAnswer';
  const explanation = data.explanation;
  return {
    id: String(data.id ?? crypto.randomUUID()),
    type,
    questionText: String(data.questionText ?? ''),
    options: Array.isArray(data.options) ? data.options.map((o) => String(o)) : [],
    correctAnswer: String(data.correctAnswer ?? ''),
    explanation:
      typeof explanation === 'string' && explanation.length > 0 ? explanation : undefined,
    order: typeof data.order === 'number' ? data.order : index,
  };
};

const toFirestore = (quiz: GrammarNoteQuiz) => ({
  id: quiz.id,
  ownerUID: quiz.ownerUID,
  topicId: quiz.topicId,
  noteId: quiz.noteId,
  title: quiz.title,
  sourceNoteTitle: quiz.sourceNoteTitle,
  questions: quiz.questions.map(questionToFirestore),
  createdAt: millisToTs(quiz.createdAt),
  updatedAt: millisToTs(quiz.updatedAt),
});

export const quizFromFirestore = (data: Record<string, unknown>): GrammarNoteQuiz => ({
  id: String(data.id ?? ''),
  ownerUID: String(data.ownerUID ?? ''),
  topicId: String(data.topicId ?? ''),
  noteId: String(data.noteId ?? ''),
  title: String(data.title ?? ''),
  sourceNoteTitle: String(data.sourceNoteTitle ?? ''),
  questions: Array.isArray(data.questions)
    ? data.questions.map(questionFromFirestore).sort((a, b) => a.order - b.order)
    : [],
  createdAt: tsToMillis(data.createdAt),
  updatedAt: tsToMillis(data.updatedAt),
});

/* --- CRUD --- */

export const fetchQuizzes = async (
  uid: string,
  topicId: string,
  noteId: string,
): Promise<GrammarNoteQuiz[]> => {
  const snapshot = await getDocs(grammarQuizzesCollection(uid, topicId, noteId));
  return snapshot.docs
    .map((d) => quizFromFirestore(d.data()))
    .sort((a, b) => b.updatedAt - a.updatedAt);
};

export const createQuiz = async (quiz: GrammarNoteQuiz): Promise<void> => {
  await setDoc(grammarQuizDoc(quiz.ownerUID, quiz.topicId, quiz.noteId, quiz.id), toFirestore(quiz));
  await updateDoc(grammarNoteDoc(quiz.ownerUID, quiz.topicId, quiz.noteId), {
    hasQuiz: true,
    updatedAt: millisToTs(Date.now()),
  }).catch(() => {});
};

export const deleteQuiz = async (
  uid: string,
  topicId: string,
  noteId: string,
  id: string,
): Promise<void> => {
  await deleteDoc(grammarQuizDoc(uid, topicId, noteId, id));
  const remaining = await getDocs(grammarQuizzesCollection(uid, topicId, noteId));
  if (remaining.empty) {
    await updateDoc(grammarNoteDoc(uid, topicId, noteId), {
      hasQuiz: false,
      updatedAt: millisToTs(Date.now()),
    }).catch(() => {});
  }
};

/* --- AI generation (worker task `grammar_quiz_generation`) --- */

interface QuizDTOQuestion {
  type?: string;
  questionText?: string;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
}

interface QuizDTO {
  questions?: QuizDTOQuestion[];
}

const dtoToQuestion = (dto: QuizDTOQuestion, index: number): GrammarQuizQuestion => ({
  id: crypto.randomUUID(),
  type: QUESTION_TYPES.includes(dto.type as GrammarQuizQuestionType)
    ? (dto.type as GrammarQuizQuestionType)
    : 'shortAnswer',
  questionText: String(dto.questionText ?? ''),
  options: Array.isArray(dto.options) ? dto.options.map((o) => String(o)) : [],
  correctAnswer: String(dto.correctAnswer ?? ''),
  explanation: dto.explanation ? String(dto.explanation) : undefined,
  order: index,
});

/** Ask the AI worker for questions; response is validated + normalized. */
export const generateQuizQuestions = async (
  note: GrammarNote,
  opts: QuizPromptOptions,
  signal?: AbortSignal,
): Promise<GrammarQuizQuestion[]> => {
  const dto = await generateJSON<QuizDTO>(
    { prompt: buildQuizPrompt(note, opts), task: 'grammar_quiz_generation' },
    signal,
  );
  const questions = (dto.questions ?? []).map(dtoToQuestion);
  return validateQuizQuestions(questions);
};
