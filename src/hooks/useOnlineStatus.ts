/* Whether the browser thinks it has a network.

   Firestore keeps working offline now (see lib/firebase.ts), which is the point
   — but silent success is indistinguishable from silent failure. Without a
   visible sign, a reader whose train went into a tunnel sees a set open
   normally and a new set that never appears for anyone else, and has no way to
   tell which state they are in.

   `navigator.onLine` is a coarse signal: it says the machine has an interface,
   not that the internet is reachable. That is fine for what this is used for —
   a hint, not a gate. Nothing is disabled on the strength of it. */
import { useEffect, useState } from 'react';

export const useOnlineStatus = (): boolean => {
  const [isOnline, setIsOnline] = useState(
    () => typeof navigator === 'undefined' || navigator.onLine,
  );

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    /* The events can fire between first render and this effect. */
    setIsOnline(navigator.onLine);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return isOnline;
};
