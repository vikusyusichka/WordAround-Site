/* Free Speaking state machine — web port of FreeSpeakingViewModel. A monologue:
   auto-generate a topic, collect spoken/typed transcript chunks (no AI replies),
   run a countdown timer, and on end generate `speaking_feedback`. STT via the
   Web Speech recognizer with a text-input fallback. */
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  createSpeechRecognizer,
  isSpeechRecognitionSupported,
  type SpeechRecognizer,
} from '@/lib/speechRecognition';
import { generateSpeakingFeedback } from '@/lib/speakingFeedback';
import {
  appendTranscriptChunk,
  emptyTranscript,
  type FreeSpeakingTranscript,
} from '@/lib/speakingFreeSpeaking';
import {
  generateConversationTopic,
  recentTopicTitles,
} from '@/lib/speakingTopics';
import {
  CONVERSATION_LENGTH_MINUTES,
  speakingLocaleFor,
  type ConversationLength,
  type GeneratedConversationTopic,
  type SpeakingContext,
  type SpeakingFeedback,
  type SpeakingState,
} from '@/lib/speakingTypes';
import { stopListeningSpeech } from '@/lib/speech';

export interface FreeSpeakingSetup {
  languageId: string;
  level: string;
  length: ConversationLength;
}

export const useFreeSpeaking = (setup: FreeSpeakingSetup) => {
  const [transcript, setTranscript] = useState<FreeSpeakingTranscript>(emptyTranscript);
  const [state, setState] = useState<SpeakingState>('idle');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(
    CONVERSATION_LENGTH_MINUTES[setup.length] * 60,
  );
  const [finished, setFinished] = useState(false);

  const [topic, setTopic] = useState<GeneratedConversationTopic | null>(null);
  const [isGeneratingTopic, setIsGeneratingTopic] = useState(true);
  const [usedFallbackTopic, setUsedFallbackTopic] = useState(false);

  const [feedback, setFeedback] = useState<SpeakingFeedback | null>(null);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [feedbackReason, setFeedbackReason] = useState<string | null>(null);

  const locale = speakingLocaleFor(setup.languageId);
  const speechSupported = isSpeechRecognitionSupported();

  const recognizerRef = useRef<SpeechRecognizer | null>(null);
  const transcriptRef = useRef<FreeSpeakingTranscript>(transcript);
  transcriptRef.current = transcript;
  const topicRef = useRef<GeneratedConversationTopic | null>(null);
  topicRef.current = topic;
  const seededRef = useRef(false);

  /* Auto-generate a topic once on mount. The seeded ref guards against React's
     StrictMode double-invoke; deliberately no cleanup-cancel — cancelling on the
     first (discarded) invocation would throw away the only in-flight request. */
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    void generateConversationTopic({
      languageId: setup.languageId,
      level: setup.level,
      length: setup.length,
      avoidTitles: recentTopicTitles(setup.languageId, setup.level),
      forceRefresh: true,
    }).then(({ topic: t, usedFallback }) => {
      setTopic(t);
      setUsedFallbackTopic(usedFallback);
      setIsGeneratingTopic(false);
    });
  }, [setup.languageId, setup.level, setup.length]);

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
            ? 'Microphone access is required to speak. You can also type your answer.'
            : 'Voice input is unavailable here. Type your answer instead.',
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

  const endSession = useCallback(() => {
    recognizerRef.current?.cancel();
    stopListeningSpeech();
    setState('idle');
    setPartialTranscript('');
    setFinished(true);
    setIsGeneratingFeedback(true);
    const context: SpeakingContext | null = topicRef.current
      ? { kind: 'topic', topic: topicRef.current }
      : null;
    void generateSpeakingFeedback({
      languageId: setup.languageId,
      level: setup.level,
      context,
      messages: transcriptRef.current.messages,
    }).then((result) => {
      setFeedback(result.feedback);
      setFeedbackReason(result.fallbackReason);
      setIsGeneratingFeedback(false);
    });
  }, [setup.languageId, setup.level]);

  /* Countdown timer → auto-end at 0. */
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
    transcript,
    state,
    partialTranscript,
    errorBanner,
    remainingSeconds,
    finished,
    topic,
    isGeneratingTopic,
    usedFallbackTopic,
    feedback,
    isGeneratingFeedback,
    feedbackReason,
    speechSupported,
    sendText,
    toggleMic,
    endSession,
    clearError: () => setErrorBanner(null),
  };
};
