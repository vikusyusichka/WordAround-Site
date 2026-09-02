/* Thin wrapper over firebase/auth mirroring the iOS AuthServiceProtocol
   (WordAround/Features/Auth/Services/AuthService.swift), plus the web-only
   flows the iOS app has no equivalent for: email-link sign-in, in-app handling
   of the emailed action links, and attaching a password to an account that
   was created through Google. Error mapping and UI state live in the store. */
import {
  applyActionCode,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  isSignInWithEmailLink,
  linkWithCredential,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  signInWithEmailAndPassword,
  signInWithEmailLink,
  signInWithPopup,
  signInWithRedirect,
  updateProfile,
  verifyPasswordResetCode,
  type ActionCodeSettings,
  type UserCredential,
} from 'firebase/auth';

import { auth, googleProvider } from './firebase';

/* Where the emailed links come back to. Firebase only routes them here once
   the console's email templates point their Action URL at this same path;
   until then the default Firebase page handles the code and `continueUrl`
   brings the user back to the app. */
export const ACTION_PATH = '/auth/action';

const appUrl = (path: string): string => `${window.location.origin}${path}`;

/* `url` is the continue-URL: where the user lands once the code is applied. */
const verificationSettings = (): ActionCodeSettings => ({ url: appUrl('/home') });
const resetSettings = (): ActionCodeSettings => ({ url: appUrl('/auth/sign-in') });

/* Synthetic errors matching the FirebaseError shape ({ code }) so authErrors
   can map them — iOS shows "No active account found" for the first. */
const codedError = (code: string, message: string) =>
  Object.assign(new Error(message), { code });

const noCurrentUserError = () => codedError('auth/no-current-user', 'No signed-in user');

export const signIn = (email: string, password: string): Promise<UserCredential> =>
  signInWithEmailAndPassword(auth, email.trim(), password);

/* iOS sends the verification email immediately after account creation; the
   web screen also collects a display name, which iOS never asked for. */
export const signUp = async (
  name: string,
  email: string,
  password: string,
): Promise<UserCredential> => {
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(credential.user, { displayName: name.trim() });
  await sendEmailVerification(credential.user, verificationSettings());
  return credential;
};

/* Popups are blocked outright in Safari's stricter modes and inside in-app
   browsers (Instagram, Telegram, …), where the button would otherwise do
   nothing at all. Fall back to a full-page redirect, which always works;
   sessionStore picks the result up on the way back. */
const REDIRECT_FALLBACK_CODES = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
  'auth/web-storage-unsupported',
]);

const needsRedirectFallback = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  typeof (error as { code: unknown }).code === 'string' &&
  REDIRECT_FALLBACK_CODES.has((error as { code: string }).code);

/* Resolves with the credential for the popup path; the redirect path never
   resolves — the browser navigates away before it can. */
export const signInWithGoogle = async (): Promise<UserCredential | null> => {
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (error) {
    if (!needsRedirectFallback(error)) throw error;
    await signInWithRedirect(auth, googleProvider);
    return null;
  }
};

export const sendPasswordReset = (email: string): Promise<void> =>
  sendPasswordResetEmail(auth, email.trim(), resetSettings());

export const resendVerification = async (): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw noCurrentUserError();
  await sendEmailVerification(user, verificationSettings());
};

export const reloadUser = async (): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw noCurrentUserError();
  await reload(user);
};

/* --- Email-link ("magic link") sign-in ------------------------------------
   Firebase needs the address back when the link is opened, and the link is
   usually opened in the same browser that requested it — so we stash it. */

const EMAIL_FOR_SIGN_IN_KEY = 'wa.emailForSignIn';

export const sendMagicLink = async (email: string): Promise<void> => {
  const trimmed = email.trim();
  await sendSignInLinkToEmail(auth, trimmed, {
    url: appUrl(ACTION_PATH),
    handleCodeInApp: true,
  });
  window.localStorage.setItem(EMAIL_FOR_SIGN_IN_KEY, trimmed);
};

export const rememberedMagicLinkEmail = (): string =>
  window.localStorage.getItem(EMAIL_FOR_SIGN_IN_KEY) ?? '';

export const isMagicLink = (url: string): boolean => isSignInWithEmailLink(auth, url);

export const completeMagicLink = async (email: string, url: string): Promise<void> => {
  const trimmed = email.trim();
  if (!trimmed) throw codedError('auth/link-no-email', 'No email to complete the link with');
  await signInWithEmailLink(auth, trimmed, url);
  window.localStorage.removeItem(EMAIL_FOR_SIGN_IN_KEY);
};

/* --- Emailed action codes (verify / reset / recover) ---------------------- */

export const applyVerification = (oobCode: string): Promise<void> =>
  applyActionCode(auth, oobCode);

export const verifyResetCode = (oobCode: string): Promise<string> =>
  verifyPasswordResetCode(auth, oobCode);

export const completeReset = (oobCode: string, password: string): Promise<void> =>
  confirmPasswordReset(auth, oobCode, password);

/* --- Adding a password to an existing account -----------------------------
   Accounts created through Google have no password at all, so signing in with
   the email fields is impossible until one is linked on. */

export const linkPassword = async (password: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw noCurrentUserError();
  if (!user.email) throw codedError('auth/missing-email', 'Account has no email address');
  await linkWithCredential(user, EmailAuthProvider.credential(user.email, password));
  await reload(user);
};
