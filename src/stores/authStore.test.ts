import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authService: {
    signIn: vi.fn(),
    signUp: vi.fn(),
    signInWithGoogle: vi.fn(),
    sendPasswordReset: vi.fn(),
    resendVerification: vi.fn(),
    reloadUser: vi.fn(),
  },
  refreshAuthState: vi.fn(),
  sessionState: { kind: 'loggedOut' } as { kind: string },
}));

vi.mock('@/lib/authService', () => mocks.authService);
vi.mock('@/stores/sessionStore', () => ({
  useSessionStore: {
    getState: () => ({
      refreshAuthState: mocks.refreshAuthState,
      state: mocks.sessionState,
    }),
  },
}));

import { useAuthStore } from './authStore';

const codeError = (code: string) => Object.assign(new Error(code), { code });

describe('authStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.refreshAuthState.mockResolvedValue(undefined);
    mocks.sessionState.kind = 'loggedOut';
    useAuthStore.setState({ isLoading: false, errorMessage: null, infoMessage: null });
  });

  it('signIn success refreshes the session and clears loading', async () => {
    mocks.authService.signIn.mockResolvedValue({});

    const promise = useAuthStore.getState().signIn('a@b.co', 'secret');
    expect(useAuthStore.getState().isLoading).toBe(true);
    await promise;

    expect(mocks.authService.signIn).toHaveBeenCalledWith('a@b.co', 'secret');
    expect(mocks.refreshAuthState).toHaveBeenCalled();
    const state = useAuthStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.errorMessage).toBeNull();
  });

  it('signIn failure maps the Firebase code to a copy key', async () => {
    mocks.authService.signIn.mockRejectedValue(codeError('auth/wrong-password'));

    await useAuthStore.getState().signIn('a@b.co', 'bad');

    const state = useAuthStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.errorMessage).toBe('errors.wrongPassword');
    expect(mocks.refreshAuthState).not.toHaveBeenCalled();
  });

  it('signUp success sets the account-created info message', async () => {
    mocks.authService.signUp.mockResolvedValue({});

    await useAuthStore.getState().signUp('a@b.co', 'secret1');

    expect(useAuthStore.getState().infoMessage).toBe('auth.accountCreatedInfo');
    expect(mocks.refreshAuthState).toHaveBeenCalled();
  });

  it('Google popup dismissal shows no error', async () => {
    mocks.authService.signInWithGoogle.mockRejectedValue(
      codeError('auth/popup-closed-by-user'),
    );

    await useAuthStore.getState().signInWithGoogle();

    const state = useAuthStore.getState();
    expect(state.errorMessage).toBeNull();
    expect(state.infoMessage).toBeNull();
  });

  it('resetPassword success sets the reset-sent info message', async () => {
    mocks.authService.sendPasswordReset.mockResolvedValue(undefined);

    await useAuthStore.getState().resetPassword('a@b.co');

    expect(useAuthStore.getState().infoMessage).toBe('auth.resetEmailSent');
  });

  it('resendVerification success sets the resent info message', async () => {
    mocks.authService.resendVerification.mockResolvedValue(undefined);

    await useAuthStore.getState().resendVerification();

    expect(useAuthStore.getState().infoMessage).toBe('verify.resentInfo');
  });

  it('checkVerification reports "not verified yet" as an error while unverified', async () => {
    mocks.authService.reloadUser.mockResolvedValue(undefined);
    mocks.sessionState.kind = 'emailVerificationRequired';

    await useAuthStore.getState().checkVerification();

    expect(useAuthStore.getState().errorMessage).toBe('verify.notVerifiedYet');
  });

  it('checkVerification stays quiet once verified', async () => {
    mocks.authService.reloadUser.mockResolvedValue(undefined);
    mocks.sessionState.kind = 'authenticated';

    await useAuthStore.getState().checkVerification();

    const state = useAuthStore.getState();
    expect(state.errorMessage).toBeNull();
    expect(mocks.refreshAuthState).toHaveBeenCalled();
  });
});
