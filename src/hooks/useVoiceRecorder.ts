/* Record-and-play-yourself-back, shared by Shadowing and the Pronunciation
   Trainer. This is the part of the iOS "compare yourself to the model" loop that
   works without Azure scoring. */
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  isAudioRecordingSupported,
  startAudioRecording,
  type AudioRecorder,
  type AudioRecorderError,
  type AudioRecording,
} from '@/lib/audioRecorder';

export const useVoiceRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<AudioRecording | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<AudioRecorder | null>(null);
  const urlRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const supported = isAudioRecordingSupported();

  const revoke = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    revoke();
    setRecording(null);
    try {
      recorderRef.current = await startAudioRecording();
      setIsRecording(true);
    } catch (e) {
      const err = e as AudioRecorderError;
      setError(
        err.code === 'permission'
          ? 'Microphone access is required to record yourself.'
          : err.code === 'unsupported'
            ? 'Recording is not supported in this browser.'
            : 'Could not start recording.',
      );
    }
  }, [revoke]);

  const stop = useCallback(async () => {
    const rec = recorderRef.current;
    if (!rec) return;
    recorderRef.current = null;
    setIsRecording(false);
    try {
      const result = await rec.stop();
      urlRef.current = result.url;
      setRecording(result);
    } catch {
      setError('Recording failed.');
    }
  }, []);

  const toggle = useCallback(() => {
    if (isRecording) void stop();
    else void start();
  }, [isRecording, start, stop]);

  const play = useCallback(() => {
    if (!recording) return;
    audioRef.current?.pause();
    const audio = new Audio(recording.url);
    audioRef.current = audio;
    void audio.play().catch(() => setError('Could not play the recording.'));
  }, [recording]);

  /* Drop the take when moving to another phrase/item. */
  const reset = useCallback(() => {
    recorderRef.current?.cancel();
    recorderRef.current = null;
    audioRef.current?.pause();
    audioRef.current = null;
    revoke();
    setRecording(null);
    setIsRecording(false);
    setError(null);
  }, [revoke]);

  useEffect(() => {
    return () => {
      recorderRef.current?.cancel();
      audioRef.current?.pause();
      revoke();
    };
  }, [revoke]);

  return {
    supported,
    isRecording,
    recording,
    error,
    hasRecording: recording !== null,
    start,
    stop,
    toggle,
    play,
    reset,
    clearError: () => setError(null),
  };
};
