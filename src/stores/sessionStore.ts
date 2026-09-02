/* Web equivalent of the iOS SessionStore (WordAround/App/SessionStore.swift).
   Exposes the same four-state auth machine and reacts to Firebase's
   onAuthStateChanged. Consumed by the router's auth-gate and any UI that
   needs to know the current user. */
import { create } from 'zustand';
import {
  getRedirectResult,
  onAuthStateChanged,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';

import { auth } from '@/lib/firebase';
import { authErrorKey } from '@/lib/authErrors';

export type AuthFlowState =
  | { kind: 'loading' }
  | { kind: 'loggedOut' }
  | { kind: 'emailVerificationRequired'; email: string }
  | { kind: 'authenticated'; email: string; user: User };

interface SessionStoreState {
  state: AuthFlowState;
  currentEmail: string;
  /** displayName when the account has one, else null. */
  currentName: string | null;
  /** Whether the account can be signed into with the email + password fields. */
  hasPassword: boolean;
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
  currentName: null,
  hasPassword: false,
  refreshAuthState: async () => {
    const next = await deriveState(auth.currentUser);
    const user = auth.currentUser;
    set({
      state: next,
      currentEmail:
        next.kind === 'authenticated' || next.kind === 'emailVerificationRequired'
          ? next.email
          : 'Unknown account',
      currentName: user?.displayName?.trim() || null,
      hasPassword: (user?.providerData ?? []).some((p) => p.providerId === PROVIDER_PASSWORD),
    });
  },
  signOut: async () => {
    await fbSignOut(auth);
    await get().refreshAuthState();
  },
}));

/* A Google sign-in that fell back to a full-page redirect finishes here, on
   the way back. It has to settle before the gate reads the session, or the
   returning user is bounced to /auth for a frame. Its failure (the account
   already exists with a different provider, say) is held for the auth screen
   to show, since nothing is mounted yet at this point. */
let redirectErrorKey: string | null = null;

/** Reads and clears the error left behind by a redirect sign-in, if any. */
export const takeRedirectErrorKey = (): string | null => {
  const key = redirectErrorKey;
  redirectErrorKey = null;
  return key;
};

const redirectSettled = getRedirectResult(auth)
  .then(() => undefined)
  .catch((error: unknown) => {
    redirectErrorKey = authErrorKey(error);
  });

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
  void redirectSettled
    .then(() => useSessionStore.getState().refreshAuthState())
    .then(() => {
      resolveAuthReady?.();
      resolveAuthReady = null;
    });
});
