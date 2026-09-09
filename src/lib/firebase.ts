/* Firebase Web SDK v11 (modular) — Auth + Firestore + Storage.
   Same Firebase project as the iOS app, so users and data are shared. */
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

import { env } from './env';

export const firebaseApp = initializeApp(env.firebase);

export const auth = getAuth(firebaseApp);

/* Firestore with its own IndexedDB cache, so the app works without a network:
   sets, folders and notes open from the cache, and writes made offline queue up
   and go out when the connection returns. The service worker cannot do this —
   it caches the site's files, not its data.

   This is why `db` is created with initializeFirestore rather than
   getFirestore: the cache has to be configured BEFORE anything touches
   Firestore, and this module is the one place that happens.

   The multi-tab manager matters because this app is a website: two tabs on the
   same account are ordinary, and without it the second tab gets no cache at
   all. Where persistence is unavailable — a private window, or storage the
   browser refuses — we fall back to the plain in-memory client rather than
   failing to start. */
export const db = (() => {
  try {
    return initializeFirestore(firebaseApp, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    return getFirestore(firebaseApp);
  }
})();
export const storage = getStorage(firebaseApp);

export const googleProvider = new GoogleAuthProvider();
/* Ask Google for the user's basic profile — same scope iOS requests. */
googleProvider.addScope('email');
googleProvider.addScope('profile');
