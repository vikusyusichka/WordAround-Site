import { createRootRoute, Outlet } from '@tanstack/react-router';
import { Suspense, lazy } from 'react';

import { NotFoundScreen } from '@/components/shell/NotFoundScreen';
import { useAppliedTheme } from '@/hooks/useAppliedTheme';

/* Router devtools are dev-only — code-split so nothing ships to prod. */
const TanStackRouterDevtools =
  import.meta.env.PROD
    ? () => null
    : lazy(() =>
        import('@tanstack/router-devtools').then((mod) => ({
          default: mod.TanStackRouterDevtools,
        })),
      );

export const Route = createRootRoute({
  component: RootComponent,
  /* Without this TanStack renders a bare unstyled "Not Found" outside the app
     shell, with nothing to click. */
  notFoundComponent: NotFoundScreen,
});

function RootComponent() {
  useAppliedTheme();

  return (
    <>
      <Outlet />
      <Suspense fallback={null}>
        <TanStackRouterDevtools position="bottom-right" />
      </Suspense>
    </>
  );
}
