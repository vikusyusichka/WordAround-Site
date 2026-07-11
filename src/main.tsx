import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { QueryClientProvider } from '@tanstack/react-query';

import { routeTree } from './routeTree.gen';
import { queryClient } from '@/lib/queryClient';
import { Splash } from '@/components/primitives/Splash';
import '@/lib/i18n';
import '@/lib/firebase';
import '@/styles/index.css';

/* Kick off Firebase initialization eagerly — the SessionStore module already
   subscribes to onAuthStateChanged on import, so by the time the router
   evaluates its beforeLoad the auth state is either resolved or in flight. */

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  /* The auth-gated routes await waitForAuthReady() in beforeLoad; show the
     splash (not a blank page) while Firebase resolves the initial state. */
  defaultPendingComponent: Splash,
  defaultPendingMs: 150,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found in index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
