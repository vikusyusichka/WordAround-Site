/* The user profile document + avatar image — web port of
   Core/Services/Firebase/UserProfileService.swift.

   Both the Firestore path (`users/{uid}`) and the Storage path
   (`users/{uid}/profile/avatar.jpg`) are the ones iOS uses, so an avatar set on
   either side shows up on the other. */
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { db, storage } from '@/lib/firebase';

export interface ProfilePayload {
  displayName?: string;
  email?: string | null;
  photoURL?: string | null;
  avatarColor?: string;
}

export const userDoc = (uid: string) => doc(db, 'users', uid);

export const avatarPath = (uid: string): string => `users/${uid}/profile/avatar.jpg`;

/** Merge-write, so the fields iOS owns and the web never sets stay untouched. */
export const saveProfile = async (uid: string, payload: ProfilePayload): Promise<void> => {
  const data: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (payload.displayName !== undefined) data.displayName = payload.displayName;
  if (payload.email !== undefined && payload.email !== null) data.email = payload.email;
  if (payload.photoURL !== undefined && payload.photoURL !== null) {
    data.photoURL = payload.photoURL;
  }
  if (payload.avatarColor !== undefined) data.avatarColor = payload.avatarColor;

  await setDoc(userDoc(uid), data, { merge: true });
};

/* An avatar is drawn at 72px and 112px, so 512 is already generous — and a
   small file is the difference between an upload that finishes on a phone and
   one that doesn't. Same approach as setImageService.downscale. */
const MAX_DIMENSION = 512;
const JPEG_QUALITY = 0.85;

const downscale = async (file: File): Promise<Blob> => {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    );
    return blob ?? file;
  } catch {
    return file;
  }
};

const UPLOAD_TIMEOUT_MS = 30_000;

/** Without this, a Storage rule that denies the write can leave the request
    hanging instead of failing, and the Save button spins forever. */
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('profile.edit.photoTimeout')), ms),
    ),
  ]);

/** Uploads the picked file and returns its download URL. Throws on failure —
    the caller saves the name and colour anyway and shows the error. */
export const uploadAvatar = async (uid: string, file: File): Promise<string> => {
  const blob = await downscale(file);
  const storageRef = ref(storage, avatarPath(uid));
  await withTimeout(uploadBytes(storageRef, blob, { contentType: 'image/jpeg' }), UPLOAD_TIMEOUT_MS);
  return getDownloadURL(storageRef);
};

/** Best-effort: "there was no avatar" is the normal case, not an error. */
export const deleteAvatar = async (uid: string): Promise<void> => {
  try {
    await deleteObject(ref(storage, avatarPath(uid)));
  } catch {
    /* object-not-found / permission — nothing to clean up either way */
  }
};
