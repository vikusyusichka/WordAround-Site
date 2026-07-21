/* AI Conversation state machine — web port of AIConversationViewModel. Owns
   messages, mic/text input, TTS replies, hints, a countdown timer, and the
   end→feedback flow. STT via the Web Speech recognizer with a text-input
   fallback; TTS via speech.ts. */
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  createSpeechRecognizer,
  isSpeechRecognitionSupported,
  type SpeechRecognizer,
} from '@/lib/speechRecognition';
import {
  CONVERSATION_HISTORY_LIMIT,
  fallbackReply,
  localHint,
  requestConversationHint,
  requestConversationReply,
} from '@/lib/speakingConversation';
import { generateSpeakingFeedback } from '@/lib/speakingFeedback';
import {
  CONVERSATION_LENGTH_MINUTES,
  firstMessageFor,
  speakingLocaleFor,
  type ConversationLength,
  type SpeakingContext,
  type SpeakingFeedback,
  type SpeakingMessage,
  type SpeakingState,
} from '@/lib/speakingTypes';
import { speakListening, stopListeningSpeech } from '@/lib/speech';

export interface ConversationSetup {
  languageId: string;
  level: string;
  length: ConversationLength;
  context: SpeakingContext;
}

const COOLDOWN_MS = 2000;
const HINT_AUTO_HIDE_MS = 9000;

export const useSpeakingConversation = (setup: ConversationSetup) => {
  const [messages, setMessages] = useState<SpeakingMessage[]>([]);
  const [state, setState] = useState<SpeakingState>('idle');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const [isRequestingHint, setIsRequestingHint] = useState(false);
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
  const messagesRef = useRef<SpeakingMessage[]>([]);
  messagesRef.current = messages;
  const stateRef = useRef<SpeakingState>('idle');
  stateRef.current = state;
  const lastSubmittedRef = useRef('');
  const lastSendAtRef = useRef(0);
  const seededRef = useRef(false);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const speak = useCallback(
    (text: string) => {
      setState('speaking');
      speakListening(text, {
        locale,
        rate: 1,
        voiceType: 'default',
        onEnd: () => setState((s) => (s === 'speaking' ? 'idle' : s)),
      });
    },
    [locale],
  );

  const appendAI = useCallback(
    (text: string, withSpeech: boolean) => {
      setMessages((prev) => [...prev, { role: 'ai', text }]);
      if (withSpeech) speak(text);
    },
    [speak],
  );

  /* Seed the opening AI message once. */
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    const first = firstMessageFor(setup.context, setup.languageId);
    if (first) appendAI(first, true);
  }, [setup.context, setup.languageId, appendAI]);

  /* Countdown timer → auto-end. */
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

  const requestReply = useCallback(
    async (userText: string) => {
      const history = messagesRef.current.slice(-CONVERSATION_HISTORY_LIMIT);
      try {
        const reply = await requestConversationReply({
          languageId: setup.languageId,
          level: setup.level,
          context: setup.context,
          recentMessages: history,
          latestUserMessage: userText,
        });
        const finalReply = reply.length > 0 ? reply : fallbackReply(setup.languageId);
        appendAI(finalReply, true);
      } catch {
        setErrorBanner('AI limit reached. Using fallback.');
        appendAI(fallbackReply(setup.languageId), true);
      }
    },
    [setup, appendAI],
  );

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (trimmed.length === 0) return;
      if (trimmed === lastSubmittedRef.current) return;
      if (Date.now() - lastSendAtRef.current < COOLDOWN_MS) return;
      lastSubmittedRef.current = trimmed;
      lastSendAtRef.current = Date.now();
      setHint(null);
      setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
      setState('processing');
      void requestReply(trimmed);
    },
    [requestReply],
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
        if (t.trim().length > 0) sendMessage(t);
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
  }, [locale, sendMessage]);

  const stopListening = useCallback(() => {
    recognizerRef.current?.stop();
    setState('processing');
  }, []);

  const toggleMic = useCallback(() => {
    if (state === 'listening') stopListening();
    else if (state === 'idle' || state === 'error') startListening();
  }, [state, startListening, stopListening]);

  const requestHint = useCallback(async () => {
    if (state === 'processing' || state === 'listening' || isRequestingHint) return;
    setIsRequestingHint(true);
    const history = messagesRef.current;
    const lastUser = [...history].reverse().find((m) => m.role === 'user')?.text;
    let hintText: string;
    try {
      const ai = await requestConversationHint({
        languageId: setup.languageId,
        level: setup.level,
        context: setup.context,
        recentMessages: history.slice(-CONVERSATION_HISTORY_LIMIT),
        lastUserMessage: lastUser,
      });
      hintText = ai.length > 0 ? ai : localHint(setup.languageId, setup.context);
    } catch {
      hintText = localHint(setup.languageId, setup.context);
    }
    setIsRequestingHint(false);
    setHint(hintText);
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => setHint(null), HINT_AUTO_HIDE_MS);
  }, [state, isRequestingHint, setup]);

  const endConversation = useCallback(() => {
    recognizerRef.current?.cancel();
    stopListeningSpeech();
    setState('idle');
    setPartialTranscript('');
    setHint(null);
    setFinished(true);
    setIsGeneratingFeedback(true);
    void generateSpeakingFeedback({
      languageId: setup.languageId,
      level: setup.level,
      context: setup.context,
      messages: messagesRef.current,
    }).then((result) => {
      setFeedback(result.feedback);
      setFeedbackReason(result.fallbackReason);
      setIsGeneratingFeedback(false);
    });
  }, [setup]);

  /* Auto-end when the timer hits 0. */
  useEffect(() => {
    if (remainingSeconds === 0 && !finished) endConversation();
  }, [remainingSeconds, finished, endConversation]);

  useEffect(() => {
    return () => {
      recognizerRef.current?.cancel();
      stopListeningSpeech();
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    };
  }, []);

  return {
    messages,
    state,
    partialTranscript,
    hint,
    isRequestingHint,
    errorBanner,
    remainingSeconds,
    finished,
    feedback,
    isGeneratingFeedback,
    feedbackReason,
    speechSupported,
    sendMessage,
    toggleMic,
    requestHint,
    endConversation,
    clearError: () => setErrorBanner(null),
  };
};
