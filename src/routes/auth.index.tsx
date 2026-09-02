import { createFileRoute, redirect } from '@tanstack/react-router';

/* /auth has no screen of its own any more — signing in and signing up are two
   separate routes. Everything that used to link to /auth lands here. */
export const Route = createFileRoute('/auth/')({
  beforeLoad: () => {
    throw redirect({ to: '/auth/sign-in' });
  },
});
