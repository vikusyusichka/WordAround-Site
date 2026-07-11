/* Thin wrapper over firebase/auth mirroring the iOS AuthServiceProtocol
   (WordAround/Features/Auth/Services/AuthService.swift). Every function is a
   direct SDK call — error mapping and UI state live in the auth store. */
import {
  createUserWithEmailAndPassword,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  type UserCredential,
} from 'firebase/auth';

import { auth, googleProvider } from './firebase';

export const signIn = (email: string, password: string): Promise<UserCredential> =>
  signInWithEmailAndPassword(auth, email.trim(), password);

/* iOS sends the verification email immediately after account creation. */
export const signUp = async (email: string, password: string): Promise<UserCredential> => {
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await sendEmailVerification(credential.user);
  return credential;
};

export const signInWithGoogle = (): Promise<UserCredential> =>
  signInWithPopup(auth, googleProvider);

export const sendPasswordReset = (email: string): Promise<void> =>
  sendPasswordResetEmail(auth, email.trim());

/* Synthetic error matching the FirebaseError shape ({ code }) so authErrors
   can map it — iOS shows "No active account found" for this case. */
const noCurrentUserError = () =>
  Object.assign(new Error('No signed-in user'), { code: 'auth/no-current-user' });

export const resendVerification = async (): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw noCurrentUserError();
  await sendEmailVerification(user);
};

export const reloadUser = async (): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw noCurrentUserError();
  await reload(user);
};
