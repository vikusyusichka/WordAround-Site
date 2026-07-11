/* Uploads a flashcard image to Firebase Storage and returns its download URL
   (web equivalent of iOS LocalImageStorageService — iOS keeps a local file, web
   stores a cloud URL in card.imageURL). Images are downscaled client-side to
   keep uploads small. */
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { storage } from '@/lib/firebase';

const MAX_DIMENSION = 1024;
const JPEG_QUALITY = 0.82;

/** Downscale to fit within MAX_DIMENSION and re-encode as JPEG. Falls back to
    the original file if anything goes wrong (e.g. in a non-canvas environment). */
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

/** Rejects if the upload doesn't finish in time — otherwise a Storage CORS
    misconfiguration would hang the whole set-save forever. */
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('createSet.imageTimeout')), ms),
    ),
  ]);

export const uploadCardImage = async (
  uid: string,
  setId: string,
  cardId: string,
  file: File,
): Promise<string> => {
  const blob = await downscale(file);
  const storageRef = ref(storage, `users/${uid}/setImages/${setId}/${cardId}.jpg`);
  await withTimeout(uploadBytes(storageRef, blob, { contentType: 'image/jpeg' }), UPLOAD_TIMEOUT_MS);
  return getDownloadURL(storageRef);
};
