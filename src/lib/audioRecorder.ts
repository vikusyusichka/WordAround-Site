/* Minimal MediaRecorder wrapper for Shadowing / Pronunciation: record the
   learner's voice, then hand back a blob URL they can play against the model
   audio. Web equivalent of the iOS AVAudioRecorder round-trip.

   Browsers disagree on container support (Chromium → webm/opus, Safari → mp4),
   so we pick the first supported mime type instead of hard-coding one. */

export type AudioRecorderErrorCode = 'unsupported' | 'permission' | 'failed';

export interface AudioRecorderError extends Error {
  code: AudioRecorderErrorCode;
}

const makeError = (code: AudioRecorderErrorCode, message: string): AudioRecorderError =>
  Object.assign(new Error(message), { code }) as AudioRecorderError;

const CANDIDATE_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
];

export const isAudioRecordingSupported = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.MediaRecorder !== 'undefined' &&
  typeof navigator !== 'undefined' &&
  !!navigator.mediaDevices?.getUserMedia;

export const pickMimeType = (
  isSupported: (type: string) => boolean = (t) => window.MediaRecorder.isTypeSupported(t),
): string | undefined => CANDIDATE_MIME_TYPES.find(isSupported);

export interface AudioRecording {
  blob: Blob;
  url: string;
  mimeType: string;
  durationMs: number;
}

export interface AudioRecorder {
  /** Resolves with the recording once `stop()` is called. */
  stop: () => Promise<AudioRecording>;
  /** Abort without producing a recording; releases the mic. */
  cancel: () => void;
}

/** Starts recording immediately. Rejects with an AudioRecorderError if the mic
    is unavailable or permission is denied. */
export const startAudioRecording = async (): Promise<AudioRecorder> => {
  if (!isAudioRecordingSupported()) {
    throw makeError('unsupported', 'Audio recording is not supported in this browser.');
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    const name = e instanceof Error ? e.name : '';
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      throw makeError('permission', 'Microphone access is required to record.');
    }
    throw makeError('failed', 'Could not start recording.');
  }

  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: BlobPart[] = [];
  const startedAt = Date.now();
  let settled = false;

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  recorder.start();

  const releaseStream = () => stream.getTracks().forEach((t) => t.stop());

  return {
    stop: () =>
      new Promise<AudioRecording>((resolve, reject) => {
        if (settled) {
          reject(makeError('failed', 'Recorder already stopped.'));
          return;
        }
        settled = true;
        recorder.onstop = () => {
          releaseStream();
          const type = recorder.mimeType || mimeType || 'audio/webm';
          const blob = new Blob(chunks, { type });
          resolve({
            blob,
            url: URL.createObjectURL(blob),
            mimeType: type,
            durationMs: Date.now() - startedAt,
          });
        };
        recorder.onerror = () => {
          releaseStream();
          reject(makeError('failed', 'Recording failed.'));
        };
        try {
          recorder.stop();
        } catch {
          releaseStream();
          reject(makeError('failed', 'Recording failed.'));
        }
      }),
    cancel: () => {
      settled = true;
      try {
        if (recorder.state !== 'inactive') recorder.stop();
      } catch {
        /* already stopped — nothing to unwind */
      }
      releaseStream();
    },
  };
};
