/* One auth-gate shared by every public auth screen. It lives here rather than
   on the /auth layout route so that /auth/action stays ungated — the emailed
   links land there while the user is signed out, half-signed-in or already
   signed in, and every one of those cases has to be allowed through. */
import { redirect } from '@tanstack/react-router';

import { useSessionStore, waitForAuthReady } from '@/stores/sessionStore';

/** Bounces an already-signed-in visitor away from the sign-in/sign-up screens. */
export const redirectIfSignedIn = async (): Promise<void> => {
  await waitForAuthReady();
  const state = useSessionStore.getState().state;
  if (state.kind === 'authenticated') throw redirect({ to: '/home' });
  if (state.kind === 'emailVerificationRequired') throw redirect({ to: '/verify-email' });
};
