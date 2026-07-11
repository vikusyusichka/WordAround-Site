/* Lightweight splash shown while the router waits for Firebase to resolve the
   initial auth state — prevents a flash of the wrong screen on reload. */
import { BlobBackground } from '@/components/primitives/BlobBackground';

export const Splash = () => {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#F5F5FB]">
      <BlobBackground
        className="pointer-events-none absolute h-72 w-72 opacity-50"
        color="var(--color-blob-blue)"
      />
      <span
        className="relative h-9 w-9 animate-spin rounded-full border-[3px] border-(--color-auth-blue)/30 border-t-(--color-auth-blue)"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
};
