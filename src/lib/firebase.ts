/* Firebase Web SDK v11 (modular) — Auth + Firestore + Storage.
   Same Firebase project as the iOS app, so users and data are shared. */
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

import { env } from './env';

export const firebaseApp = initializeApp(env.firebase);

export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);

export const googleProvider = new GoogleAuthProvider();
/* Ask Google for the user's basic profile — same scope iOS requests. */
googleProvider.addScope('email');
googleProvider.addScope('profile');
