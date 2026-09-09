/* Account deletion — web port of Core/Services/Firebase/
   AccountDeletionService.swift, step for step.

   ⚠️ Like iOS, this deletes the `users/{uid}` DOCUMENT and the avatar, then the
   auth user. The subcollections underneath (`folders`, `flashcardSets`,
   `grammarNoteTopics`, `readingItems`, …) are left in place — Firestore does not
   cascade, and a client cannot delete a subcollection it can no longer read.
   Doing it properly needs a Cloud Function. Matching iOS is the deliberate
   choice here; do not "improve" it silently. */
import { deleteUser } from 'firebase/auth';
import { deleteDoc } from 'firebase/firestore';

import { auth } from '@/lib/firebase';
import { deleteAvatar, userDoc } from '@/lib/userProfileService';

export type DeletionFailure = 'not-signed-in' | 'requires-recent-login' | 'failed';

export class AccountDeletionError extends Error {
  readonly reason: DeletionFailure;

  constructor(reason: DeletionFailure, message?: string) {
    super(message ?? reason);
    this.name = 'AccountDeletionError';
    this.reason = reason;
  }
}

const isRequiresRecentLogin = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { code?: unknown }).code === 'auth/requires-recent-login';

export const deleteCurrentUserAccount = async (): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw new AccountDeletionError('not-signed-in');

  /* Both swallowed, exactly like the iOS `try?`: a profile document that was
     never written, or an avatar that never existed, must not stop the
     deletion the learner asked for. */
  try {
    await deleteDoc(userDoc(user.uid));
  } catch {
    /* ignored */
  }
  await deleteAvatar(user.uid);

  try {
    await deleteUser(user);
  } catch (error) {
    if (isRequiresRecentLogin(error)) {
      throw new AccountDeletionError('requires-recent-login');
    }
    throw new AccountDeletionError(
      'failed',
      error instanceof Error ? error.message : undefined,
    );
  }
};
