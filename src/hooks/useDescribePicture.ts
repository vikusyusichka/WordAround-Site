/* Describe Picture state machine — web port of DescribePictureViewModel. A
   monologue over a random Unsplash photo: load an image, collect spoken/typed
   description chunks, countdown timer, End → `speaking_feedback`. Reuses the
   Free Speaking transcript accumulator. */
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  createSpeechRecognizer,
  isSpeechRecognitionSupported,
  type SpeechRecognizer,
} from '@/lib/speechRecognition';
import {
  fetchRandomImage,
  PICTURE_CONTEXT,
  type DescribePictureError,
  type DescribePictureImage,
} from '@/lib/describePicture';
import { generateSpeakingFeedback } from '@/lib/speakingFeedback';
import {
  appendTranscriptChunk,
  emptyTranscript,
  type FreeSpeakingTranscript,
} from '@/lib/speakingFreeSpeaking';
import {
  CONVERSATION_LENGTH_MINUTES,
  speakingLocaleFor,
  type ConversationLength,
  type SpeakingFeedback,
  type SpeakingState,
} from '@/lib/speakingTypes';
import { stopListeningSpeech } from '@/lib/speech';

export interface DescribePictureSetup {
  languageId: string;
  level: string;
  length: ConversationLength;
}

export const useDescribePicture = (setup: DescribePictureSetup) => {
  const [image, setImage] = useState<DescribePictureImage | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(true);
  const [imageError, setImageError] = useState<string | null>(null);

  const [transcript, setTranscript] = useState<FreeSpeakingTranscript>(emptyTranscript);
  const [state, setState] = useState<SpeakingState>('idle');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(
    CONVERSATION_LENGTH_MINUTES[setup.length] * 60,
  );
  const [finished, setFinished] = useState(false);

  const [feedback, setFeedback] = useState<SpeakingFeedback | null>(null);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [feedbackReason, setFeedbackReason] = useState<string | null>(null);

  const locale = speakingLocaleFor(setup.languageId);
  const speechSupported = isSpeechRecognitionSupported();

  const recognizerRef = useRef<SpeechRecognizer | null>(null);
  const transcriptRef = useRef<FreeSpeakingTranscript>(transcript);
  transcriptRef.current = transcript;
  const seededRef = useRef(false);
  const loadingRef = useRef(false);

  const loadImage = useCallback(() => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setIsLoadingImage(true);
    setImageError(null);
    void fetchRandomImage()
      .then((img) => {
        setImage(img);
        setIsLoadingImage(false);
      })
      .catch((e: DescribePictureError) => {
        setIsLoadingImage(false);
        setImageError(e.message);
      })
      .finally(() => {
        loadingRef.current = false;
      });
  }, []);

  /* Load the first image once. Ref guard only — see the 7B StrictMode note:
     cancelling in cleanup would discard the sole in-flight request. */
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    loadImage();
  }, [loadImage]);

  const addChunk = useCallback((text: string) => {
    setTranscript((prev) => appendTranscriptChunk(prev, text));
  }, []);

  const sendText = useCallback(
    (text: string) => {
      if (text.trim().length === 0) return;
      addChunk(text);
    },
    [addChunk],
  );

  const startListening = useCallback(() => {
    stopListeningSpeech();
    setPartialTranscript('');
    const recognizer = createSpeechRecognizer({
      locale,
      onPartial: (t) => setPartialTranscript(t),
      onFinal: (t) => {
        setPartialTranscript('');
        setState('idle');
        addChunk(t);
      },
      onError: (kind) => {
        setPartialTranscript('');
        setState('idle');
        setErrorBanner(
          kind === 'permission'
            ? 'Microphone access is required to speak. You can also type your description.'
            : 'Voice input is unavailable here. Type your description instead.',
        );
      },
    });
    recognizerRef.current = recognizer;
    recognizer.start();
    setState('listening');
  }, [locale, addChunk]);

  const stopListening = useCallback(() => {
    recognizerRef.current?.stop();
    setState('idle');
  }, []);

  const toggleMic = useCallback(() => {
    if (state === 'listening') stopListening();
    else if (state === 'idle' || state === 'error') startListening();
  }, [state, startListening, stopListening]);

  /* New photo → fresh transcript (iOS refreshImage → resetTranscript). */
  const newImage = useCallback(() => {
    recognizerRef.current?.cancel();
    setTranscript(emptyTranscript());
    setPartialTranscript('');
    setState('idle');
    loadImage();
  }, [loadImage]);

  const endSession = useCallback(() => {
    recognizerRef.current?.cancel();
    stopListeningSpeech();
    setState('idle');
    setPartialTranscript('');
    setFinished(true);
    setIsGeneratingFeedback(true);
    void generateSpeakingFeedback({
      languageId: setup.languageId,
      level: setup.level,
      context: PICTURE_CONTEXT,
      messages: transcriptRef.current.messages,
    }).then((result) => {
      setFeedback(result.feedback);
      setFeedbackReason(result.fallbackReason);
      setIsGeneratingFeedback(false);
    });
  }, [setup.languageId, setup.level]);

  useEffect(() => {
    if (finished) return;
    const id = setInterval(() => {
      setRemainingSeconds((v) => {
        if (v <= 1) {
          clearInterval(id);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [finished]);

  useEffect(() => {
    if (remainingSeconds === 0 && !finished) endSession();
  }, [remainingSeconds, finished, endSession]);

  useEffect(() => {
    return () => {
      recognizerRef.current?.cancel();
      stopListeningSpeech();
    };
  }, []);

  return {
    image,
    isLoadingImage,
    imageError,
    transcript,
    state,
    partialTranscript,
    errorBanner,
    remainingSeconds,
    finished,
    feedback,
    isGeneratingFeedback,
    feedbackReason,
    speechSupported,
    sendText,
    toggleMic,
    newImage,
    endSession,
    retryImage: loadImage,
    clearError: () => setErrorBanner(null),
  };
};
