/* Exam prep — who may do what. Premium unlocks everything; without it a
   learner can try each task of an exam once, so they see what they would be
   paying for, and the mock exam stays locked. While the paywall switch is
   off (no way to pay yet) everything is open to everyone. */
import type { ExamAttempt } from './examStorage';

export interface AccessContext {
  paywall: boolean;
  premium: boolean;
}

export const canStartMock = ({ paywall, premium }: AccessContext): boolean => !paywall || premium;

export const hasTriedTask = (attempts: ExamAttempt[], variantId: string, sectionId: string, taskId: string): boolean =>
  attempts.some(
    (a) => a.mode === 'task' && a.variantId === variantId && a.sectionId === sectionId && a.taskId === taskId,
  );

export const canPractiseTask = (
  context: AccessContext,
  attempts: ExamAttempt[],
  variantId: string,
  sectionId: string,
  taskId: string,
): boolean => !context.paywall || context.premium || !hasTriedTask(attempts, variantId, sectionId, taskId);
