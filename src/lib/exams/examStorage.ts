/* Exam prep — what is kept in Firestore:

   users/{uid}/examAttempts/{id}   one finished practice task or mock exam
   users/{uid}/examGoals/{examId}  the learner's target score and exam date
   entitlements/{uid}              Premium status — written ONLY by the server
                                   (billing webhook); the client just reads it

   Attempts store scores, not the generated material: the texts are large,
   and the history only needs the numbers. These collections must be allowed
   in firestore.rules (see docs/EXAMS-SETUP.md) — until the rules are
   published, reads and writes fail and the screens say so instead of crashing. */
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { millisToTs, tsToMillis } from '@/lib/firestore';

import type { ExamResult } from './scoring';

export type AttemptMode = 'task' | 'mock';

export interface ExamAttempt {
  id: string;
  examId: string;
  variantId: string;
  mode: AttemptMode;
  createdAt: number;
  durationSeconds: number;
  /** Section scores on each section's own scale (a task attempt has one). */
  sectionScores: Record<string, number>;
  /** Mock only: the overall result. */
  result?: ExamResult;
  /** Task only. */
  sectionId?: string;
  taskId?: string;
  taskTitle?: string;
}

export interface ExamGoal {
  examId: string;
  variantId: string;
  targetScore: number | null;
  /** ISO date, YYYY-MM-DD. */
  examDate: string | null;
}

const attemptsCollection = (uid: string) => collection(db, 'users', uid, 'examAttempts');
const goalDoc = (uid: string, examId: string) => doc(db, 'users', uid, 'examGoals', examId);
const entitlementDoc = (uid: string) => doc(db, 'entitlements', uid);

const numberRecord = (value: unknown): Record<string, number> => {
  const out: Record<string, number> = {};
  if (value && typeof value === 'object') {
    for (const [key, v] of Object.entries(value)) if (typeof v === 'number') out[key] = v;
  }
  return out;
};

export const attemptFromFirestore = (data: Record<string, unknown>, id: string): ExamAttempt => ({
  id,
  examId: String(data.examId ?? ''),
  variantId: String(data.variantId ?? ''),
  mode: data.mode === 'mock' ? 'mock' : 'task',
  createdAt: tsToMillis(data.createdAt),
  durationSeconds: typeof data.durationSeconds === 'number' ? data.durationSeconds : 0,
  sectionScores: numberRecord(data.sectionScores),
  ...(data.result && typeof data.result === 'object' ? { result: data.result as ExamResult } : {}),
  ...(typeof data.sectionId === 'string' ? { sectionId: data.sectionId } : {}),
  ...(typeof data.taskId === 'string' ? { taskId: data.taskId } : {}),
  ...(typeof data.taskTitle === 'string' ? { taskTitle: data.taskTitle } : {}),
});

export const saveAttempt = async (uid: string, attempt: ExamAttempt): Promise<void> => {
  const { id, createdAt, ...rest } = attempt;
  /* Firestore rejects `undefined` fields. */
  const clean = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
  await setDoc(doc(attemptsCollection(uid), id), { ...clean, userId: uid, createdAt: millisToTs(createdAt) });
};

/* Filtered on the server, sorted here: `where` + `orderBy` on different
   fields would need a composite index created in the Firebase console. */
export const fetchAttempts = async (uid: string, examId: string): Promise<ExamAttempt[]> => {
  const snapshot = await getDocs(query(attemptsCollection(uid), where('examId', '==', examId)));
  return snapshot.docs
    .map((d) => attemptFromFirestore(d.data(), d.id))
    .sort((a, b) => b.createdAt - a.createdAt);
};

export const fetchGoal = async (uid: string, examId: string): Promise<ExamGoal | null> => {
  const snapshot = await getDoc(goalDoc(uid, examId));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return {
    examId,
    variantId: String(data.variantId ?? ''),
    targetScore: typeof data.targetScore === 'number' ? data.targetScore : null,
    examDate: typeof data.examDate === 'string' ? data.examDate : null,
  };
};

export const saveGoal = async (uid: string, goal: ExamGoal): Promise<void> => {
  await setDoc(goalDoc(uid, goal.examId), { ...goal, userId: uid, updatedAt: millisToTs(Date.now()) });
};

export interface Entitlement {
  premium: boolean;
  /** Epoch millis the paid period ends, if the server set one. */
  currentPeriodEnd: number | null;
}

export const isEntitlementActive = (entitlement: Entitlement | null, now = Date.now()): boolean =>
  !!entitlement?.premium && (entitlement.currentPeriodEnd === null || entitlement.currentPeriodEnd > now);

export const fetchEntitlement = async (uid: string): Promise<Entitlement | null> => {
  const snapshot = await getDoc(entitlementDoc(uid));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return {
    premium: data.premium === true,
    currentPeriodEnd: data.currentPeriodEnd ? tsToMillis(data.currentPeriodEnd) : null,
  };
};
