/* Media import validation — web port of ListeningAudioImporter /
   ListeningVideoImporter. Validated files go into IndexedDB as Blobs
   (saveListeningMedia); sessions reference them by mediaKey. */
import { saveListeningMedia } from '@/lib/listeningStore';

export const AUDIO_EXTENSIONS = ['mp3', 'm4a', 'wav', 'aac'];
export const AUDIO_MAX_BYTES = 50 * 1024 * 1024;

export const VIDEO_EXTENSIONS = ['mp4', 'mov', 'm4v'];
/** iOS keeps the upload under the worker's 100 MB body limit. */
export const VIDEO_MAX_BYTES = 80 * 1024 * 1024;

export class ListeningImportError extends Error {
  code: 'unsupportedFormat' | 'fileTooLarge' | 'unreadable';
  constructor(code: ListeningImportError['code'], message: string) {
    super(message);
    this.code = code;
  }
}

export interface ImportedListeningMedia {
  mediaKey: string;
  originalName: string;
  durationSeconds: number;
  fileSizeBytes: number;
}

const extensionOf = (name: string): string => name.split('.').pop()?.toLowerCase() ?? '';

const readMediaDuration = (file: File, kind: 'audio' | 'video'): Promise<number> =>
  new Promise((resolve) => {
    const el = document.createElement(kind);
    const url = URL.createObjectURL(file);
    const cleanup = (value: number) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    el.preload = 'metadata';
    el.onloadedmetadata = () => cleanup(Number.isFinite(el.duration) ? el.duration : 0);
    el.onerror = () => cleanup(0);
    el.src = url;
  });

const importMedia = async (
  file: File,
  kind: 'audio' | 'video',
  extensions: string[],
  maxBytes: number,
  formatMessage: string,
): Promise<ImportedListeningMedia> => {
  if (!extensions.includes(extensionOf(file.name))) {
    throw new ListeningImportError('unsupportedFormat', formatMessage);
  }
  if (file.size > maxBytes) {
    throw new ListeningImportError(
      'fileTooLarge',
      `That file is too big. Please choose one under ${Math.round(maxBytes / (1024 * 1024))} MB.`,
    );
  }
  const durationSeconds = await readMediaDuration(file, kind);
  const mediaKey = crypto.randomUUID();
  try {
    await saveListeningMedia(mediaKey, file);
  } catch {
    throw new ListeningImportError('unreadable', 'Could not store this file.');
  }
  return {
    mediaKey,
    originalName: file.name,
    durationSeconds,
    fileSizeBytes: file.size,
  };
};

export const importListeningAudio = (file: File): Promise<ImportedListeningMedia> =>
  importMedia(
    file, 'audio', AUDIO_EXTENSIONS, AUDIO_MAX_BYTES,
    "That file type isn't supported. Use MP3, M4A, WAV or AAC.",
  );

export const importListeningVideo = (file: File): Promise<ImportedListeningMedia> =>
  importMedia(
    file, 'video', VIDEO_EXTENSIONS, VIDEO_MAX_BYTES,
    "That file type isn't supported. Use MP4, MOV or M4V.",
  );

export const formatFileSize = (bytes: number): string => {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

export const formatDuration = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};
