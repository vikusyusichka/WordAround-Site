import { describe, expect, it } from 'vitest';

import { isValidEmail, signInSchema, signUpSchema } from './authValidation';

describe('isValidEmail', () => {
  it.each([
    'user@example.com',
    'first.last+tag@sub.domain.co',
    'UPPER@CASE.IO',
    '  padded@example.com  ',
  ])('accepts %s', (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each(['', 'foo', 'foo@bar', 'foo@bar.c', '@example.com', 'a b@example.com'])(
    'rejects %s',
    (email) => {
      expect(isValidEmail(email)).toBe(false);
    },
  );
});

describe('signInSchema', () => {
  const firstIssue = (values: { email: string; password: string }) => {
    const result = signInSchema.safeParse(values);
    return result.success ? null : result.error.issues[0].message;
  };

  it('requires email first', () => {
    expect(firstIssue({ email: '', password: '' })).toBe('errors.emailRequired');
  });

  it('rejects a malformed email', () => {
    expect(firstIssue({ email: 'not-an-email', password: 'secret' })).toBe(
      'errors.emailInvalid',
    );
  });

  it('requires a password once the email is valid', () => {
    expect(firstIssue({ email: 'user@example.com', password: '' })).toBe(
      'errors.passwordRequired',
    );
  });

  it('accepts valid credentials and trims the email', () => {
    const result = signInSchema.safeParse({
      email: '  user@example.com ',
      password: 'x',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe('user@example.com');
  });
});

describe('signUpSchema', () => {
  it('rejects passwords under 6 characters', () => {
    const result = signUpSchema.safeParse({
      email: 'user@example.com',
      password: '12345',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('errors.passwordTooShort');
    }
  });

  it('accepts a 6-character password', () => {
    expect(
      signUpSchema.safeParse({ email: 'user@example.com', password: '123456' }).success,
    ).toBe(true);
  });
});
