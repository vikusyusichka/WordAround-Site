/* Keeps the root element's theme in step with three things at once: the
   reader's preference, the OS setting (when the preference is "System"), and
   which screen they are on (the signed-out screens stay light).

   Mounted once, in the root route. Doing it per-route would mean every new
   screen has to remember, and the one that forgets shows the wrong theme for a
   frame on the way in. */
import { useEffect } from 'react';
import { useRouterState } from '@tanstack/react-router';

import { applyTheme, watchSystemTheme } from '@/lib/appearance';
import { allowsDarkTheme } from '@/lib/navigation';
import { usePreferences } from '@/stores/preferencesStore';

export const useAppliedTheme = (): void => {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const theme = usePreferences((s) => s.theme);
  const allowsDark = allowsDarkTheme(pathname);

  useEffect(() => {
    const apply = () => applyTheme(theme, allowsDark ? undefined : 'light');
    apply();

    /* Only "System" cares about the OS, but subscribing unconditionally keeps
       this branch-free and costs one listener.

       The focus handler is not redundant. The media query's `change` event is
       the primary path, but it is not universally dependable — the preview
       browser used to verify this app updates `matches` without ever firing
       `change`. Re-reading when the tab comes back means that in any such
       environment the theme corrects itself the moment someone looks at it,
       instead of staying wrong until reload. */
    const stopWatching = watchSystemTheme(apply);
    window.addEventListener('focus', apply);
    document.addEventListener('visibilitychange', apply);
    return () => {
      stopWatching();
      window.removeEventListener('focus', apply);
      document.removeEventListener('visibilitychange', apply);
    };
  }, [theme, allowsDark]);
};
