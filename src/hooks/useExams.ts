/* Exam prep data hooks (TanStack Query), same pattern as useSets. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useUid } from '@/hooks/useFolders';
import { env } from '@/lib/env';
import type { AccessContext } from '@/lib/exams/access';
import {
  fetchAttempts,
  fetchEntitlement,
  fetchGoal,
  isEntitlementActive,
  saveAttempt,
  saveGoal,
  type ExamAttempt,
  type ExamGoal,
} from '@/lib/exams/examStorage';

export const attemptsKey = (uid: string | null, examId: string) => ['examAttempts', uid, examId] as const;
const goalKey = (uid: string | null, examId: string) => ['examGoal', uid, examId] as const;
const entitlementKey = (uid: string | null) => ['entitlement', uid] as const;

export const useExamAttempts = (examId: string) => {
  const uid = useUid();
  return useQuery({
    queryKey: attemptsKey(uid, examId),
    queryFn: () => fetchAttempts(uid as string, examId),
    enabled: !!uid,
    retry: 1,
  });
};

export const useSaveAttempt = () => {
  const uid = useUid();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attempt: ExamAttempt) => saveAttempt(uid as string, attempt),
    onSuccess: (_data, attempt) => {
      queryClient.setQueryData<ExamAttempt[]>(attemptsKey(uid, attempt.examId), (old) => [attempt, ...(old ?? [])]);
    },
  });
};

export const useExamGoal = (examId: string) => {
  const uid = useUid();
  return useQuery({
    queryKey: goalKey(uid, examId),
    queryFn: () => fetchGoal(uid as string, examId),
    enabled: !!uid,
    retry: 1,
  });
};

export const useSaveGoal = () => {
  const uid = useUid();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (goal: ExamGoal) => saveGoal(uid as string, goal),
    onSuccess: (_data, goal) => queryClient.setQueryData(goalKey(uid, goal.examId), goal),
  });
};

/** Premium status. Treated as "not premium" while loading or if it cannot be read. */
export const useEntitlement = () => {
  const uid = useUid();
  const query = useQuery({
    queryKey: entitlementKey(uid),
    queryFn: () => fetchEntitlement(uid as string),
    enabled: !!uid && env.examsPaywall,
    retry: 1,
    staleTime: 60_000,
  });
  return { premium: isEntitlementActive(query.data ?? null), isLoading: query.isLoading && env.examsPaywall };
};

export const useExamAccess = (): AccessContext & { isLoading: boolean } => {
  const { premium, isLoading } = useEntitlement();
  return { paywall: env.examsPaywall, premium, isLoading };
};
