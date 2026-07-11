import { createRootRoute, Outlet } from '@tanstack/react-router';
import { Suspense, lazy } from 'react';

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
});

function RootComponent() {
  return (
    <>
      <Outlet />
      <Suspense fallback={null}>
        <TanStackRouterDevtools position="bottom-right" />
      </Suspense>
    </>
  );
}
