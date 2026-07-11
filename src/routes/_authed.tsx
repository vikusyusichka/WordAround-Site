import { useEffect } from 'react';
import { createFileRoute, Outlet, redirect, useNavigate } from '@tanstack/react-router';

import { AppShell } from '@/components/shell/AppShell';
import { useSessionStore, waitForAuthReady } from '@/stores/sessionStore';

/* Pathless layout route for the whole signed-in area. Runs the auth-gate once,
   then renders the web app shell around every child page. */
export const Route = createFileRoute('/_authed')({
  beforeLoad: async () => {
    await waitForAuthReady();
    const state = useSessionStore.getState().state;
    if (state.kind === 'loggedOut') throw redirect({ to: '/auth' });
    if (state.kind === 'emailVerificationRequired') throw redirect({ to: '/verify-email' });
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const navigate = useNavigate();
  const sessionState = useSessionStore((s) => s.state);

  /* React to sign-out / session loss that happens while already inside. */
  useEffect(() => {
    if (sessionState.kind === 'loggedOut') {
      void navigate({ to: '/auth' });
    } else if (sessionState.kind === 'emailVerificationRequired') {
      void navigate({ to: '/verify-email' });
    }
  }, [sessionState, navigate]);

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
