/* Web equivalent of the iOS AuthViewModel + VerifyEmailViewModel: UI-facing
   auth actions with loading / error / info state. Form field state lives in
   react-hook-form, not here. Error and info messages are stored as i18next
   keys and translated at render time. */
import { create } from 'zustand';

import * as authService from '@/lib/authService';
import { authErrorKey } from '@/lib/authErrors';
import { useSessionStore } from '@/stores/sessionStore';

interface AuthStoreState {
  isLoading: boolean;
  /** i18next key of the current error, or null. */
  errorMessage: string | null;
  /** i18next key of the current info message, or null. */
  infoMessage: string | null;
  clearMessages: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  checkVerification: () => Promise<void>;
}

const refreshSession = () => useSessionStore.getState().refreshAuthState();

export const useAuthStore = create<AuthStoreState>((set) => {
  /* Shared run-wrapper: toggles loading, maps thrown Firebase errors to copy
     keys, and clears stale messages before each action — same lifecycle the
     iOS view models implement per-action. */
  const run = async (action: () => Promise<void>, successInfoKey?: string) => {
    set({ isLoading: true, errorMessage: null, infoMessage: null });
    try {
      await action();
      set({ isLoading: false, infoMessage: successInfoKey ?? null });
    } catch (error) {
      set({ isLoading: false, errorMessage: authErrorKey(error) });
    }
  };

  return {
    isLoading: false,
    errorMessage: null,
    infoMessage: null,

    clearMessages: () => set({ errorMessage: null, infoMessage: null }),

    signIn: (email, password) =>
      run(async () => {
        await authService.signIn(email, password);
        await refreshSession();
      }),

    signUp: (email, password) =>
      run(async () => {
        await authService.signUp(email, password);
        await refreshSession();
      }, 'auth.accountCreatedInfo'),

    signInWithGoogle: () =>
      run(async () => {
        await authService.signInWithGoogle();
        await refreshSession();
      }),

    resetPassword: (email) =>
      run(async () => {
        await authService.sendPasswordReset(email);
      }, 'auth.resetEmailSent'),

    resendVerification: () =>
      run(async () => {
        await authService.resendVerification();
      }, 'verify.resentInfo'),

    checkVerification: () =>
      run(async () => {
        await authService.reloadUser();
        await refreshSession();
        const state = useSessionStore.getState().state;
        if (state.kind === 'emailVerificationRequired') {
          /* iOS shows this as an error, not info. */
          set({ errorMessage: 'verify.notVerifiedYet' });
        }
      }),
  };
});
