import { describe, expect, it } from 'vitest';

import { authErrorKey, DEFAULT_ERROR_KEY } from './authErrors';

const codeError = (code: string) => Object.assign(new Error(code), { code });

describe('authErrorKey', () => {
  it.each([
    ['auth/invalid-email', 'errors.invalidEmail'],
    ['auth/wrong-password', 'errors.wrongPassword'],
    ['auth/user-not-found', 'errors.userNotFound'],
    ['auth/invalid-credential', 'errors.invalidCredential'],
    ['auth/email-already-in-use', 'errors.emailInUse'],
    ['auth/weak-password', 'errors.weakPassword'],
    ['auth/network-request-failed', 'errors.network'],
    ['auth/too-many-requests', 'errors.tooManyRequests'],
    ['auth/account-exists-with-different-credential', 'errors.differentCredential'],
    ['auth/no-current-user', 'errors.noActiveAccount'],
  ])('maps %s → %s', (code, expected) => {
    expect(authErrorKey(codeError(code))).toBe(expected);
  });

  it.each(['auth/popup-closed-by-user', 'auth/cancelled-popup-request'])(
    'returns null (no message) for %s',
    (code) => {
      expect(authErrorKey(codeError(code))).toBeNull();
    },
  );

  it('falls back to the default copy for unknown codes', () => {
    expect(authErrorKey(codeError('auth/something-new'))).toBe(DEFAULT_ERROR_KEY);
  });

  it('falls back to the default copy for non-Firebase errors', () => {
    expect(authErrorKey(new Error('boom'))).toBe(DEFAULT_ERROR_KEY);
    expect(authErrorKey(undefined)).toBe(DEFAULT_ERROR_KEY);
  });
});
