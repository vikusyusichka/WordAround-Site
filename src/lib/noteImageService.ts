/* Uploads a note image block's picture to Firebase Storage and returns its
   download URL. Same client-side downscale as the flashcard uploader (iOS keeps
   a local file; the web stores a cloud URL in block.imageURL).
   Path: users/{uid}/noteImages/{topicId}/{noteId}/{blockId}.jpg — it needs the
   matching rule in storage.rules to be published. */
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { storage } from '@/lib/firebase';

const MAX_DIMENSION = 1400;
const JPEG_QUALITY = 0.82;
const UPLOAD_TIMEOUT_MS = 30_000;

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

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('notes.imageTimeout')), ms),
    ),
  ]);

export const noteImagePath = (
  uid: string,
  topicId: string,
  noteId: string,
  blockId: string,
): string => `users/${uid}/noteImages/${topicId}/${noteId}/${blockId}.jpg`;

export const uploadNoteImage = async (
  uid: string,
  topicId: string,
  noteId: string,
  blockId: string,
  file: File,
): Promise<string> => {
  const blob = await downscale(file);
  const storageRef = ref(storage, noteImagePath(uid, topicId, noteId, blockId));
  await withTimeout(uploadBytes(storageRef, blob, { contentType: 'image/jpeg' }), UPLOAD_TIMEOUT_MS);
  return getDownloadURL(storageRef);
};

/** Best-effort cleanup when an image block is removed. */
export const deleteNoteImage = async (
  uid: string,
  topicId: string,
  noteId: string,
  blockId: string,
): Promise<void> => {
  try {
    await deleteObject(ref(storage, noteImagePath(uid, topicId, noteId, blockId)));
  } catch {
    /* already gone / never uploaded */
  }
};
