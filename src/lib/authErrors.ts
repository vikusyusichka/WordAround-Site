/* Maps Firebase Web SDK error codes (string `error.code`) to the same
   user-facing copy the iOS app shows for the equivalent NSError codes
   (WordAround/Features/Auth/ViewModels/AuthViewModel.swift). Returns an
   i18next key so all copy stays localizable; `null` means "show nothing"
   (user dismissed the Google popup — not an error). */
import { FirebaseError } from 'firebase/app';

const CODE_TO_KEY: Record<string, string> = {
  'auth/invalid-email': 'errors.invalidEmail',
  'auth/wrong-password': 'errors.wrongPassword',
  'auth/user-not-found': 'errors.userNotFound',
  'auth/invalid-credential': 'errors.invalidCredential',
  'auth/email-already-in-use': 'errors.emailInUse',
  'auth/weak-password': 'errors.weakPassword',
  'auth/network-request-failed': 'errors.network',
  'auth/too-many-requests': 'errors.tooManyRequests',
  'auth/account-exists-with-different-credential': 'errors.differentCredential',
  /* Email-link and action-code (verify / reset) failures. */
  'auth/expired-action-code': 'errors.actionExpired',
  'auth/invalid-action-code': 'errors.actionInvalid',
  'auth/user-disabled': 'errors.userDisabled',
  'auth/missing-email': 'errors.emailRequired',
  /* Linking a password onto an existing (usually Google) account. */
  'auth/provider-already-linked': 'errors.passwordAlreadySet',
  'auth/credential-already-in-use': 'errors.differentCredential',
  'auth/requires-recent-login': 'errors.requiresRecentLogin',
  /* Synthetic code thrown by authService when auth.currentUser is null —
     iOS shows "No active account found" in the verify flow. */
  'auth/no-current-user': 'errors.noActiveAccount',
  /* Synthetic: the email-link landing page has no address to complete with. */
  'auth/link-no-email': 'errors.linkNoEmail',
};

const SILENT_CODES = new Set([
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  /* We fall back to a full-page redirect for these, so the user never sees
     an error — the browser is already navigating to Google. */
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
]);

export const DEFAULT_ERROR_KEY = 'errors.default';

/** i18next key for the given auth failure, or null when nothing should be shown. */
export const authErrorKey = (error: unknown): string | null => {
  if (error instanceof FirebaseError || (typeof error === 'object' && error !== null && 'code' in error)) {
    const code = (error as { code: unknown }).code;
    if (typeof code === 'string') {
      if (SILENT_CODES.has(code)) return null;
      return CODE_TO_KEY[code] ?? DEFAULT_ERROR_KEY;
    }
  }
  return DEFAULT_ERROR_KEY;
};
