/* Web equivalent of the iOS SessionStore (WordAround/App/SessionStore.swift).
   Exposes the same four-state auth machine and reacts to Firebase's
   onAuthStateChanged. Consumed by the router's auth-gate and any UI that
   needs to know the current user. */
import { create } from 'zustand';
import {
  onAuthStateChanged,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';

import { auth } from '@/lib/firebase';

export type AuthFlowState =
  | { kind: 'loading' }
  | { kind: 'loggedOut' }
  | { kind: 'emailVerificationRequired'; email: string }
  | { kind: 'authenticated'; email: string; user: User };

interface SessionStoreState {
  state: AuthFlowState;
  currentEmail: string;
  refreshAuthState: () => Promise<void>;
  signOut: () => Promise<void>;
}

const PROVIDER_GOOGLE = 'google.com';
const PROVIDER_PASSWORD = 'password';

const deriveState = async (user: User | null): Promise<AuthFlowState> => {
  if (!user) return { kind: 'loggedOut' };

  try {
    await user.reload();
  } catch {
    /* Match iOS: swallow reload errors; treat cached user as source of truth. */
  }

  const providers = user.providerData.map((p) => p.providerId);
  const email = user.email ?? 'Unknown account';

  if (providers.includes(PROVIDER_GOOGLE)) {
    return { kind: 'authenticated', email, user };
  }

  if (providers.includes(PROVIDER_PASSWORD)) {
    return user.emailVerified
      ? { kind: 'authenticated', email, user }
      : { kind: 'emailVerificationRequired', email };
  }

  return { kind: 'authenticated', email, user };
};

export const useSessionStore = create<SessionStoreState>((set, get) => ({
  state: { kind: 'loading' },
  currentEmail: 'Unknown account',
  refreshAuthState: async () => {
    const next = await deriveState(auth.currentUser);
    set({
      state: next,
      currentEmail:
        next.kind === 'authenticated' || next.kind === 'emailVerificationRequired'
          ? next.email
          : 'Unknown account',
    });
  },
  signOut: async () => {
    await fbSignOut(auth);
    await get().refreshAuthState();
  },
}));

/* Resolves once the first onAuthStateChanged has fired AND the store has
   derived a non-loading state — the router's beforeLoad awaits this so we
   never redirect based on the transient `loading` state. */
let resolveAuthReady: (() => void) | null = null;
const authReady = new Promise<void>((resolve) => {
  resolveAuthReady = resolve;
});

export const waitForAuthReady = (): Promise<void> => authReady;

/* Subscribe once at module load; Firebase deduplicates internally. */
onAuthStateChanged(auth, () => {
  void useSessionStore
    .getState()
    .refreshAuthState()
    .then(() => {
      resolveAuthReady?.();
      resolveAuthReady = null;
    });
});
