import { createFileRoute, Outlet } from '@tanstack/react-router';

import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout';

/* Layout for every /auth screen. The gate deliberately is NOT here — it lives
   on the individual screens (src/lib/authGuards.ts) so that /auth/action, the
   landing page for the emailed links, stays reachable in every session state. */
export const Route = createFileRoute('/auth')({
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <AuthSplitLayout>
      <Outlet />
    </AuthSplitLayout>
  );
}
