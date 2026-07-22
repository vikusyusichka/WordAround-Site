/* Registers the service worker that makes WordAround installable and lets the
   shell open offline. Deliberately quiet: a failed registration must never
   affect the app, and we never block startup on it. */

export const registerServiceWorker = (): void => {
  if (!('serviceWorker' in navigator)) return;
  /* The dev server serves modules Vite rewrites on the fly; a SW caching those
     just creates confusing stale-module bugs. Production only. */
  if (import.meta.env.DEV) return;

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => {
      /* Unsupported, blocked by policy, or offline on first load — ignore. */
    });
  });
};

/* Escape hatch: unregisters the worker and drops its caches. Not wired to UI —
   it exists so a bad cache can be cleared from the console without a rebuild. */
export const unregisterServiceWorker = async (): Promise<void> => {
  if (!('serviceWorker' in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((r) => r.unregister()));
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('wa-')).map((k) => caches.delete(k)));
  }
};
