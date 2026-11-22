/* Own tests — what is kept in Firebase.

   customTests/{testId}                     the test. Its id is random, so the
                                            link is the key: any signed-in
                                            person who has the link can open
                                            it; only the author can list,
                                            edit or delete it.
   customTests/{testId}/attempts/{id}       every finished attempt, so the
                                            author (e.g. a teacher) sees who
                                            took the test and how it went.
   users/{uid}/customTestAttempts/{id}      the same attempt in the taker's
                                            own history (one list across all
                                            tests, no collection-group index).

   Listening audio files go to Storage at users/{uid}/testAudio/{testId}/….

   All three Firestore paths are in firestore.rules; until those rules are
   published, reads and writes fail and the screens say so. */
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { db, storage } from '@/lib/firebase';
import { millisToTs, tsToMillis } from '@/lib/firestore';

import type {
  CustomQuestion,
  CustomSection,
  CustomTest,
  ListeningAudio,
  ReviewItem,
  SectionResult,
  TestResult,
} from './model';

const testsCollection = () => collection(db, 'customTests');
const testDoc = (testId: string) => doc(db, 'customTests', testId);
const testAttemptsCollection = (testId: string) => collection(db, 'customTests', testId, 'attempts');
const userAttemptsCollection = (uid: string) => collection(db, 'users', uid, 'customTestAttempts');

/* ── Reading defensively: these documents are written by other people's
      browsers, so nothing is trusted to have the right shape. ─────────── */

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' ? (v as Record<string, unknown>) : {};

const QUESTION_TYPES: CustomQuestion['type'][] = ['multipleChoice', 'trueFalse', 'fillGap', 'shortAnswer'];

const questionFrom = (raw: unknown, index: number): CustomQuestion => {
  const q = obj(raw);
  const type = QUESTION_TYPES.includes(q.type as CustomQuestion['type'])
    ? (q.type as CustomQuestion['type'])
    : 'shortAnswer';
  return {
    id: str(q.id) || `q${index}`,
    type,
    questionText: str(q.questionText),
    options: arr(q.options).filter((o): o is string => typeof o === 'string'),
    correctAnswer: str(q.correctAnswer),
    ...(typeof q.explanation === 'string' && q.explanation ? { explanation: q.explanation } : {}),
    order: typeof q.order === 'number' ? q.order : index,
  };
};

const audioFrom = (raw: unknown): ListeningAudio => {
  const a = obj(raw);
  return a.source === 'file'
    ? { source: 'file', url: str(a.url), path: str(a.path), name: str(a.name) }
    : { source: 'tts', text: str(a.text) };
};

const sectionFrom = (raw: unknown, index: number): CustomSection | null => {
  const s = obj(raw);
  const base = {
    id: str(s.id) || `s${index}`,
    title: str(s.title),
    questions: arr(s.questions).map(questionFrom),
  };
  if (s.kind === 'reading') return { ...base, kind: 'reading', text: str(s.text) };
  if (s.kind === 'listening') {
    return {
      ...base,
      kind: 'listening',
      audio: audioFrom(s.audio),
      maxPlays: typeof s.maxPlays === 'number' && s.maxPlays > 0 ? s.maxPlays : null,
    };
  }
  return null; // a kind this version does not know yet
};

export const testFromFirestore = (data: Record<string, unknown>, id: string): CustomTest => ({
  id,
  ownerId: str(data.ownerId),
  ownerName: str(data.ownerName),
  title: str(data.title),
  description: str(data.description),
  languageId: str(data.languageId) || 'english',
  timeLimitMinutes:
    typeof data.timeLimitMinutes === 'number' && data.timeLimitMinutes > 0 ? data.timeLimitMinutes : null,
  sections: arr(data.sections)
    .map(sectionFrom)
    .filter((s): s is CustomSection => s !== null),
  createdAt: tsToMillis(data.createdAt),
  updatedAt: tsToMillis(data.updatedAt),
});

/** Firestore rejects `undefined` anywhere in a document. */
const stripUndefined = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const fetchMyTests = async (uid: string): Promise<CustomTest[]> => {
  const snapshot = await getDocs(query(testsCollection(), where('ownerId', '==', uid)));
  return snapshot.docs
    .map((d) => testFromFirestore(d.data(), d.id))
    .sort((a, b) => b.updatedAt - a.updatedAt);
};

/** null when there is no such test (deleted, or a mistyped link). */
export const fetchTest = async (testId: string): Promise<CustomTest | null> => {
  const snapshot = await getDoc(testDoc(testId));
  return snapshot.exists() ? testFromFirestore(snapshot.data(), snapshot.id) : null;
};

export const saveTest = async (test: CustomTest): Promise<void> => {
  const { id, createdAt, updatedAt, ...rest } = test;
  await setDoc(testDoc(id), {
    ...stripUndefined(rest),
    createdAt: millisToTs(createdAt),
    updatedAt: millisToTs(updatedAt),
  });
};

/** The test document, then (best effort) its audio files. Attempts stay, so
    the people who took it keep their history. */
export const deleteTest = async (test: CustomTest): Promise<void> => {
  await deleteDoc(testDoc(test.id));
  await Promise.all(
    test.sections.map(async (section) => {
      if (section.kind !== 'listening' || section.audio.source !== 'file' || !section.audio.path) return;
      try {
        await deleteObject(ref(storage, section.audio.path));
      } catch {
        /* already gone, or never uploaded — nothing to do */
      }
    }),
  );
};

/* ── Audio ──────────────────────────────────────────────────────────────── */

export const AUDIO_MAX_BYTES = 20 * 1024 * 1024;
const UPLOAD_TIMEOUT_MS = 120_000;

export class AudioUploadError extends Error {
  code: 'notAudio' | 'tooLarge' | 'failed';
  constructor(code: AudioUploadError['code']) {
    super(code);
    this.code = code;
  }
}

export const uploadTestAudio = async (
  uid: string,
  testId: string,
  sectionId: string,
  file: File,
): Promise<Extract<ListeningAudio, { source: 'file' }>> => {
  if (!file.type.startsWith('audio/')) throw new AudioUploadError('notAudio');
  if (file.size > AUDIO_MAX_BYTES) throw new AudioUploadError('tooLarge');
  const extension = (file.name.split('.').pop() ?? 'mp3').toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp3';
  const path = `users/${uid}/testAudio/${testId}/${sectionId}-${Date.now()}.${extension}`;
  const storageRef = ref(storage, path);
  try {
    await Promise.race([
      uploadBytes(storageRef, file, { contentType: file.type }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), UPLOAD_TIMEOUT_MS)),
    ]);
    return { source: 'file', url: await getDownloadURL(storageRef), path, name: file.name };
  } catch {
    throw new AudioUploadError('failed');
  }
};

/* ── Attempts ───────────────────────────────────────────────────────────── */

export interface CustomTestAttempt extends TestResult {
  id: string;
  testId: string;
  testTitle: string;
  userId: string;
  userName: string;
  createdAt: number;
  durationSeconds: number;
  /** True when the timer ran out before the learner finished. */
  timedOut: boolean;
}

const reviewItemFrom = (raw: unknown): ReviewItem => {
  const r = obj(raw);
  return {
    questionText: str(r.questionText),
    type: QUESTION_TYPES.includes(r.type as ReviewItem['type']) ? (r.type as ReviewItem['type']) : 'shortAnswer',
    given: str(r.given),
    correctAnswer: str(r.correctAnswer),
    isCorrect: r.isCorrect === true,
    ...(typeof r.explanation === 'string' && r.explanation ? { explanation: r.explanation } : {}),
  };
};

const sectionResultFrom = (raw: unknown): SectionResult => {
  const s = obj(raw);
  return {
    sectionId: str(s.sectionId),
    kind: s.kind === 'listening' ? 'listening' : 'reading',
    title: str(s.title),
    correct: num(s.correct),
    total: num(s.total),
    items: arr(s.items).map(reviewItemFrom),
  };
};

export const attemptFromFirestore = (data: Record<string, unknown>, id: string): CustomTestAttempt => ({
  id,
  testId: str(data.testId),
  testTitle: str(data.testTitle),
  userId: str(data.userId),
  userName: str(data.userName),
  createdAt: tsToMillis(data.createdAt),
  durationSeconds: num(data.durationSeconds),
  timedOut: data.timedOut === true,
  correct: num(data.correct),
  total: num(data.total),
  percent: num(data.percent),
  sections: arr(data.sections).map(sectionResultFrom),
});

/** One write for both copies, so the taker's history and the author's list
    never disagree. */
export const saveAttempt = async (attempt: CustomTestAttempt): Promise<void> => {
  const { id, createdAt, ...rest } = attempt;
  const data = { ...stripUndefined(rest), createdAt: millisToTs(createdAt) };
  const batch = writeBatch(db);
  batch.set(doc(testAttemptsCollection(attempt.testId), id), data);
  batch.set(doc(userAttemptsCollection(attempt.userId), id), data);
  await batch.commit();
};

export const fetchMyAttempts = async (uid: string): Promise<CustomTestAttempt[]> => {
  const snapshot = await getDocs(userAttemptsCollection(uid));
  return snapshot.docs
    .map((d) => attemptFromFirestore(d.data(), d.id))
    .sort((a, b) => b.createdAt - a.createdAt);
};

/** Every attempt at a test — readable by its author only. */
export const fetchTestAttempts = async (testId: string): Promise<CustomTestAttempt[]> => {
  const snapshot = await getDocs(testAttemptsCollection(testId));
  return snapshot.docs
    .map((d) => attemptFromFirestore(d.data(), d.id))
    .sort((a, b) => b.createdAt - a.createdAt);
};

/** The taker's own copy first; the author reads it from the test instead. */
export const fetchAttempt = async (
  uid: string,
  testId: string,
  attemptId: string,
): Promise<CustomTestAttempt | null> => {
  const own = await getDoc(doc(userAttemptsCollection(uid), attemptId));
  if (own.exists()) return attemptFromFirestore(own.data(), own.id);
  const shared = await getDoc(doc(testAttemptsCollection(testId), attemptId));
  return shared.exists() ? attemptFromFirestore(shared.data(), shared.id) : null;
};
