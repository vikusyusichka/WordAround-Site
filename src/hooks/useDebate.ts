/* Debate state machine — web port of DebateModeViewModel. Generates a topic,
   the AI opponent opens (TTS), then the learner and opponent alternate across a
   fixed round sequence; the last round's reply ends the debate and triggers
   `debate_feedback` (7 metrics). STT with a text-input fallback. */
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  createSpeechRecognizer,
  isSpeechRecognitionSupported,
  type SpeechRecognizer,
} from '@/lib/speechRecognition';
import {
  advanceSession,
  currentRound,
  debateHints,
  DEBATE_HISTORY_LIMIT,
  fallbackOpening,
  fallbackReply,
  makeDebateSession,
  requestDebateOpening,
  requestDebateReply,
  type DebateSession,
  type DebateSide,
} from '@/lib/speakingDebate';
import { generateSpeakingFeedback } from '@/lib/speakingFeedback';
import { generateConversationTopic } from '@/lib/speakingTopics';
import {
  CONVERSATION_LENGTH_MINUTES,
  speakingLocaleFor,
  type ConversationLength,
  type SpeakingContext,
  type SpeakingFeedback,
  type SpeakingMessage,
  type SpeakingState,
} from '@/lib/speakingTypes';
import { speakListening, stopListeningSpeech } from '@/lib/speech';

export interface DebateSetup {
  languageId: string;
  level: string;
  length: ConversationLength;
  side: DebateSide;
}

const COOLDOWN_MS = 2000;
const HINT_AUTO_HIDE_MS = 6000;

export const useDebate = (setup: DebateSetup) => {
  const [messages, setMessages] = useState<SpeakingMessage[]>([]);
  const [state, setState] = useState<SpeakingState>('idle');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [session, setSession] = useState<DebateSession | null>(null);
  const [isGeneratingTopic, setIsGeneratingTopic] = useState(true);
  const [hint, setHint] = useState<string | null>(null);
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
  const sessionRef = useRef<DebateSession | null>(null);
  sessionRef.current = session;
  const lastSubmittedRef = useRef('');
  const lastSendAtRef = useRef(0);
  const seededRef = useRef(false);
  const finishedRef = useRef(false);
  const hintIndexRef = useRef(0);
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
    (text: string) => {
      setMessages((prev) => [...prev, { role: 'ai', text }]);
      speak(text);
    },
    [speak],
  );

  /* Generate topic → AI opening. Ref guard only (StrictMode), no cancel. */
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    setState('processing');
    void (async () => {
      const { topic } = await generateConversationTopic({
        languageId: setup.languageId,
        level: setup.level,
        length: setup.length,
        forceRefresh: true,
      });
      const next = makeDebateSession(topic, setup.side, setup.length);
      setSession(next);
      sessionRef.current = next;
      setIsGeneratingTopic(false);
      try {
        const opening = await requestDebateOpening({
          languageId: setup.languageId,
          level: setup.level,
          topic,
          learnerSide: next.learnerSide,
          aiSide: next.aiSide,
        });
        appendAI(opening.length > 0 ? opening : fallbackOpening(setup.languageId, topic.title));
      } catch {
        setErrorBanner('AI limit reached. Using fallback.');
        appendAI(fallbackOpening(setup.languageId, topic.title));
      }
    })();
  }, [setup.languageId, setup.level, setup.length, setup.side, appendAI]);

  const endDebate = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    recognizerRef.current?.cancel();
    stopListeningSpeech();
    setState('idle');
    setPartialTranscript('');
    setHint(null);
    setFinished(true);
    setIsGeneratingFeedback(true);
    const context: SpeakingContext | null = sessionRef.current
      ? { kind: 'topic', topic: sessionRef.current.topic }
      : null;
    void generateSpeakingFeedback({
      languageId: setup.languageId,
      level: setup.level,
      context,
      messages: messagesRef.current,
      includeDebateMetrics: true,
    }).then((result) => {
      setFeedback(result.feedback);
      setFeedbackReason(result.fallbackReason);
      setIsGeneratingFeedback(false);
    });
  }, [setup.languageId, setup.level]);

  const advanceRound = useCallback(() => {
    const current = sessionRef.current;
    if (!current) return;
    const { session: next, didAdvance } = advanceSession(current);
    setSession(next);
    sessionRef.current = next;
    if (!didAdvance) endDebate();
  }, [endDebate]);

  const requestReply = useCallback(
    async (userText: string) => {
      const current = sessionRef.current;
      const round = current ? currentRound(current) : null;
      if (!current || !round) {
        setState('idle');
        return;
      }
      const history = messagesRef.current.slice(-DEBATE_HISTORY_LIMIT);
      try {
        const reply = await requestDebateReply({
          languageId: setup.languageId,
          level: setup.level,
          topic: current.topic,
          learnerSide: current.learnerSide,
          aiSide: current.aiSide,
          round,
          recentMessages: history,
          latestUserMessage: userText,
        });
        appendAI(reply.length > 0 ? reply : fallbackReply(setup.languageId));
      } catch {
        setErrorBanner('AI limit reached. Using fallback.');
        appendAI(fallbackReply(setup.languageId));
      }
      advanceRound();
    },
    [setup.languageId, setup.level, appendAI, advanceRound],
  );

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (trimmed.length === 0) return;
      if (trimmed === lastSubmittedRef.current) return;
      if (Date.now() - lastSendAtRef.current < COOLDOWN_MS) return;
      if (isGeneratingTopic || finishedRef.current) return;
      lastSubmittedRef.current = trimmed;
      lastSendAtRef.current = Date.now();
      setHint(null);
      setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
      setState('processing');
      void requestReply(trimmed);
    },
    [isGeneratingTopic, requestReply],
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
            ? 'Microphone access is required to speak. You can also type your argument.'
            : 'Voice input is unavailable here. Type your argument instead.',
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
    if (isGeneratingTopic) return;
    if (state === 'listening') stopListening();
    else if (state === 'idle' || state === 'error') startListening();
  }, [isGeneratingTopic, state, startListening, stopListening]);

  const requestHint = useCallback(() => {
    if (state === 'processing' || state === 'listening') return;
    const hints = debateHints(setup.languageId);
    if (hints.length === 0) return;
    const next = hints[hintIndexRef.current % hints.length];
    hintIndexRef.current += 1;
    setHint(next);
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => setHint(null), HINT_AUTO_HIDE_MS);
  }, [state, setup.languageId]);

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
    if (remainingSeconds === 0 && !finishedRef.current) endDebate();
  }, [remainingSeconds, endDebate]);

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
    session,
    isGeneratingTopic,
    hint,
    errorBanner,
    remainingSeconds,
    finished,
    feedback,
    isGeneratingFeedback,
    feedbackReason,
    speechSupported,
    rounds: session?.rounds ?? [],
    currentRoundIndex: session?.currentRoundIndex ?? 0,
    learnerSide: session?.learnerSide ?? null,
    sendMessage,
    toggleMic,
    requestHint,
    endDebate,
    clearError: () => setErrorBanner(null),
  };
};
