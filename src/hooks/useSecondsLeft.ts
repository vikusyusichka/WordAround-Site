/* Seconds left until a deadline timestamp, for the exam clocks. */
import { useEffect, useState } from 'react';

/** Seconds left until `deadline` (negative once it has passed), refreshed twice a second. */
export const useSecondsLeft = (deadline: number | null): number | null => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (deadline === null) return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [deadline]);
  return deadline === null ? null : Math.ceil((deadline - now) / 1000);
};
