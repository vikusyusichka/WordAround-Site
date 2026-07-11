import { createFileRoute, redirect } from '@tanstack/react-router';

import { useSessionStore, waitForAuthReady } from '@/stores/sessionStore';

/* Public root — waits for Firebase to resolve the initial auth state, then
   routes: first-time visitor → onboarding; logged out → auth; unverified
   email → verify; authenticated → /home. */
export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const hasSeenOnboarding = localStorage.getItem('wa.onboarded') === '1';
    if (!hasSeenOnboarding) {
      throw redirect({ to: '/onboarding' });
    }

    await waitForAuthReady();

    const state = useSessionStore.getState().state;
    switch (state.kind) {
      case 'authenticated':
        throw redirect({ to: '/home' });
      case 'emailVerificationRequired':
        throw redirect({ to: '/verify-email' });
      default:
        throw redirect({ to: '/auth' });
    }
  },
});
