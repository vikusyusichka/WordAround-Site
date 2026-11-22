/* Own tests data hooks (TanStack Query), same pattern as useExams. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useUid } from '@/hooks/useFolders';
import {
  deleteTest,
  fetchAttempt,
  fetchMyAttempts,
  fetchMyTests,
  fetchTest,
  fetchTestAttempts,
  saveAttempt,
  saveTest,
  type CustomTestAttempt,
} from '@/lib/customTests/customTestStorage';
import type { CustomTest } from '@/lib/customTests/model';

const myTestsKey = (uid: string | null) => ['customTests', 'mine', uid] as const;
const testKey = (testId: string) => ['customTests', 'test', testId] as const;
const myAttemptsKey = (uid: string | null) => ['customTests', 'myAttempts', uid] as const;
const testAttemptsKey = (testId: string) => ['customTests', 'attempts', testId] as const;

export const useMyTests = () => {
  const uid = useUid();
  return useQuery({
    queryKey: myTestsKey(uid),
    queryFn: () => fetchMyTests(uid as string),
    enabled: !!uid,
    retry: 1,
  });
};

export const useCustomTest = (testId: string) => {
  const uid = useUid();
  return useQuery({
    queryKey: testKey(testId),
    queryFn: () => fetchTest(testId),
    enabled: !!uid,
    retry: 1,
  });
};

export const useSaveTest = () => {
  const uid = useUid();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (test: CustomTest) => saveTest(test),
    onSuccess: (_data, test) => {
      queryClient.setQueryData(testKey(test.id), test);
      void queryClient.invalidateQueries({ queryKey: myTestsKey(uid) });
    },
  });
};

export const useDeleteTest = () => {
  const uid = useUid();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (test: CustomTest) => deleteTest(test),
    onSuccess: (_data, test) => {
      queryClient.setQueryData<CustomTest[]>(myTestsKey(uid), (old) => (old ?? []).filter((t) => t.id !== test.id));
      queryClient.removeQueries({ queryKey: testKey(test.id) });
    },
  });
};

export const useMyAttempts = () => {
  const uid = useUid();
  return useQuery({
    queryKey: myAttemptsKey(uid),
    queryFn: () => fetchMyAttempts(uid as string),
    enabled: !!uid,
    retry: 1,
  });
};

/** Everyone's attempts at a test — only its author may read them. */
export const useTestAttempts = (testId: string, enabled: boolean) =>
  useQuery({
    queryKey: testAttemptsKey(testId),
    queryFn: () => fetchTestAttempts(testId),
    enabled,
    retry: 1,
  });

export const useAttempt = (testId: string, attemptId: string) => {
  const uid = useUid();
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ['customTests', 'attempt', attemptId] as const,
    queryFn: () => fetchAttempt(uid as string, testId, attemptId),
    enabled: !!uid,
    retry: 1,
    /* Just finished: the result is already in the history cache. */
    initialData: () =>
      queryClient.getQueryData<CustomTestAttempt[]>(myAttemptsKey(uid))?.find((a) => a.id === attemptId),
  });
};

export const useSaveAttempt = () => {
  const uid = useUid();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attempt: CustomTestAttempt) => saveAttempt(attempt),
    onSuccess: (_data, attempt) => {
      queryClient.setQueryData<CustomTestAttempt[]>(myAttemptsKey(uid), (old) => [attempt, ...(old ?? [])]);
      void queryClient.invalidateQueries({ queryKey: testAttemptsKey(attempt.testId) });
    },
  });
};
