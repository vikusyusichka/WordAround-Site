/* Listen from Text session — /practice/listening/from-text/session?sid=…
   Web port of ListenFromTextSessionViewModel: TTS playback with a simulated
   1-second progress timer (iOS parity — no true TTS position), optional
   static transcript, questions with Check Answers → Finish Practice, and
   persistence to the local IndexedDB store on every transition. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { ListeningResultView } from '@/components/listening/ListeningResultView';
import { Icon } from '@/components/primitives/Icon';
import { findLanguage } from '@/lib/essayTypes';
import { generateListeningQuestions } from '@/lib/listeningQuestionGenerator';
import { makeListeningResult } from '@/lib/listeningScoring';
import { getListeningSession, saveListeningSession } from '@/lib/listeningStore';
import {
  listeningLocaleFor,
  VOICE_SPEED_META,
  type ListeningPersistedSession,
  type ListeningQuestionType,
} from '@/lib/listeningTypes';
import {
  pauseListeningSpeech,
  resumeListeningSpeech,
  speakListening,
  stopListeningSpeech,
} from '@/lib/speech';

export const Route = createFileRoute('/_authed/practice/listening/from-text/session')({
  validateSearch: (search: Record<string, unknown>): { sid: string } => ({
    sid: String(search.sid ?? ''),
  }),
  component: ListenFromTextSession,
});

type PlaybackState = 'idle' | 'playing' | 'paused' | 'finished';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

function ListenFromTextSession() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { sid } = Route.useSearch();

  const [session, setSession] = useState<ListeningPersistedSession | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [playback, setPlayback] = useState<PlaybackState>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [playbackElapsed, setPlaybackElapsed] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [hasChecked, setHasChecked] = useState(false);
  const [checkError, setCheckError] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const sessionRef = useRef<ListeningPersistedSession | null>(null);
  const stateRef = useRef({ elapsedSeconds: 0, playbackElapsed: 0, selectedAnswers: {} as Record<string, number>, showResult: false });
  stateRef.current = { elapsedSeconds, playbackElapsed, selectedAnswers, showResult };

  const estimatedDuration = session?.durationSeconds ?? 8;
  const progress = Math.min(playbackElapsed / Math.max(estimatedDuration, 1), 1);

  /* Load the draft/persisted session + generate questions once. */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const loaded = await getListeningSession(sid);
      if (cancelled) return;
      if (!loaded) {
        setNotFound(true);
        return;
      }
      let next = loaded;
      if (loaded.addQuestions && loaded.questions.length === 0 && loaded.text) {
        let count = 5;
        let types: ListeningQuestionType[] = [];
        try {
          const raw = sessionStorage.getItem(`wa.listening.setup.${loaded.id}`);
          if (raw) {
            const parsed = JSON.parse(raw) as { questionCount?: number; questionTypes?: ListeningQuestionType[] };
            count = parsed.questionCount ?? 5;
            types = parsed.questionTypes ?? [];
          }
        } catch {
          /* defaults */
        }
        next = {
          ...loaded,
          questions: generateListeningQuestions({ text: loaded.text, types, count }),
        };
      }
      next = { ...next, status: 'inProgress' };
      setSession(next);
      sessionRef.current = next;
      setElapsedSeconds(next.elapsedSeconds);
      setPlaybackElapsed(next.playbackPosition);
      setSelectedAnswers(next.selectedAnswers);
      void saveListeningSession(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [sid]);

  const persist = useCallback(
    (patch: Partial<ListeningPersistedSession>) => {
      const base = sessionRef.current;
      if (!base) return;
      const s = stateRef.current;
      const merged: ListeningPersistedSession = {
        ...base,
        elapsedSeconds: s.elapsedSeconds,
        progress: Math.min(s.playbackElapsed / Math.max(base.durationSeconds, 1), 1),
        playbackPosition: s.playbackElapsed,
        selectedAnswers: s.selectedAnswers,
        ...patch,
      };
      sessionRef.current = merged;
      void saveListeningSession(merged);
    },
    [],
  );

  /* 1-second simulated progress timer while playing (iOS parity). */
  useEffect(() => {
    if (playback !== 'playing') return;
    const id = setInterval(() => {
      setElapsedSeconds((v) => v + 1);
      setPlaybackElapsed((v) => Math.min(v + 1, estimatedDuration));
    }, 1000);
    return () => clearInterval(id);
  }, [playback, estimatedDuration]);

  /* Stop speech + persist inProgress on unmount (iOS teardown). */
  useEffect(() => {
    return () => {
      stopListeningSpeech();
      if (!stateRef.current.showResult) persist({ status: 'inProgress' });
    };
  }, [persist]);

  const startSpeaking = (reset: boolean) => {
    if (!session?.text) return;
    if (reset) setPlaybackElapsed(0);
    speakListening(session.text, {
      locale: listeningLocaleFor(session.languageId),
      rate: VOICE_SPEED_META[session.voiceSpeed].ttsRate,
      voiceType: session.voiceType,
      onStart: () => setPlayback('playing'),
      onEnd: () => {
        setPlayback('finished');
        setPlaybackElapsed(estimatedDuration);
        persist({ status: 'inProgress', progress: 1, playbackPosition: estimatedDuration });
      },
    });
  };

  const togglePlayback = () => {
    if (playback === 'playing') {
      pauseListeningSpeech();
      setPlayback('paused');
    } else if (playback === 'paused') {
      resumeListeningSpeech();
      setPlayback('playing');
    } else {
      startSpeaking(playback === 'finished');
    }
  };

  const replay = () => {
    stopListeningSpeech();
    startSpeaking(true);
  };

  const checkAnswers = () => {
    if (Object.keys(selectedAnswers).length === 0) {
      setCheckError(true);
      return;
    }
    setCheckError(false);
    setHasChecked(true);
    persist({ status: 'inProgress' });
  };

  const finishPractice = () => {
    if (!session) return;
    stopListeningSpeech();
    const result = makeListeningResult({
      questions: session.questions,
      selectedAnswers,
      listeningTimeSeconds: stateRef.current.elapsedSeconds,
      speedLabel: VOICE_SPEED_META[session.voiceSpeed].label,
    });
    persist({ status: 'completed', result, progress: 1 });
    setShowResult(true);
  };

  const goBack = () => void navigate({ to: '/practice/listening' });

  if (notFound) {
    return (
      <ContentContainer fluid>
        <p role="alert" className="py-16 text-center text-[15px] font-medium text-(--color-cs-red)">
          {t('listening.notFound')}
        </p>
      </ContentContainer>
    );
  }
  if (!session) {
    return (
      <ContentContainer fluid>
        <p className="py-16 text-center text-[15px] font-medium text-(--color-text-secondary)">
          {t('reading.loading')}
        </p>
      </ContentContainer>
    );
  }

  const result = sessionRef.current?.result;
  const mmss = (v: number) => `${Math.floor(v / 60)}:${String(Math.floor(v) % 60).padStart(2, '0')}`;

  return (
    <ContentContainer fluid>
      <PageHeader
        title={session.title}
        subtitle={t('listening.fromText.title')}
        actions={
          !showResult ? (
            <span className="rounded-2xl bg-(--color-goal-bg) px-4 py-2 text-[14px] font-bold tabular-nums text-(--color-primary-blue-dark)">
              {mmss(elapsedSeconds)}
            </span>
          ) : undefined
        }
      />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
        <button
          type="button"
          onClick={goBack}
          className="w-fit text-[13px] font-semibold text-(--color-primary-blue) hover:underline focus-visible:outline-none"
        >
          ← {t('nav.listening')}
        </button>

        {showResult && result ? (
          <ListeningResultView
            result={result}
            subtitle={session.title}
            chips={[findLanguage(session.languageId).title, session.level, t('listening.fromText.title')]}
            accentColor="#3394D1"
            onPracticeAgain={() => {
              setShowResult(false);
              setHasChecked(false);
              setSelectedAnswers({});
              setElapsedSeconds(0);
              setPlaybackElapsed(0);
              setPlayback('idle');
            }}
            onBack={goBack}
          />
        ) : (
          <>
            {/* Player card */}
            <div className="flex flex-col gap-3 rounded-3xl border border-white bg-white/95 p-5 shadow-[0_4px_10px_rgba(0,0,0,0.045)]">
              <div className="h-[6px] w-full overflow-hidden rounded-full bg-(--color-goal-bg)">
                <div
                  className="h-full rounded-full bg-[#3394D1] transition-[width]"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[12px] font-semibold tabular-nums text-(--color-text-secondary)">
                <span>{mmss(playbackElapsed)}</span>
                <span>{mmss(estimatedDuration)}</span>
              </div>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={replay}
                  aria-label={t('listening.session.replay')}
                  className="grid size-11 place-items-center rounded-full border border-(--color-auth-field-border) bg-white"
                >
                  <Icon name="arrow.uturn.backward" className="size-[16px] text-(--color-text-secondary)" />
                </button>
                <button
                  type="button"
                  onClick={togglePlayback}
                  className="grid size-14 place-items-center rounded-full bg-[#3394D1] text-white shadow-[0_8px_14px_rgba(51,148,209,0.35)]"
                >
                  {playback === 'playing' ? (
                    <span className="text-[18px] font-bold">❚❚</span>
                  ) : (
                    <Icon name="play.fill" className="size-[20px]" />
                  )}
                </button>
                <span className="grid size-11 place-items-center rounded-full text-[12px] font-bold text-(--color-text-secondary)">
                  {VOICE_SPEED_META[session.voiceSpeed].label}
                </span>
              </div>
            </div>

            {/* Optional static transcript */}
            {session.showTextWhileListening && session.text && (
              <div className="rounded-3xl border border-white bg-white/95 p-5 shadow-[0_4px_10px_rgba(0,0,0,0.045)]">
                <h3 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-(--color-text-secondary)">
                  {t('listening.session.transcript')}
                </h3>
                <p className="whitespace-pre-line text-[15px] font-medium leading-relaxed text-(--color-primary-blue-dark)">
                  {session.text}
                </p>
              </div>
            )}

            {/* Questions */}
            {session.addQuestions && session.questions.length > 0 && (
              <section className="flex flex-col gap-3">
                <h3 className="text-[16px] font-bold text-(--color-primary-blue-dark)">
                  {t('listening.session.questionsTitle')}
                </h3>
                {session.questions.map((q, qi) => {
                  const selected = selectedAnswers[q.id];
                  return (
                    <div key={q.id} className="flex flex-col gap-2 rounded-2xl border border-(--color-auth-field-border) bg-white p-4">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-[#3394D1]">
                        {t(`listening.questionType.${q.type}`)} · {qi + 1}/{session.questions.length}
                      </span>
                      <p className="text-[15px] font-semibold text-(--color-primary-blue-dark)">
                        {q.prompt}
                      </p>
                      <div className="flex flex-col gap-1.5">
                        {q.options.map((option, oi) => {
                          const isSelected = selected === oi;
                          const isCorrect = hasChecked && oi === q.correctIndex;
                          const isWrong = hasChecked && isSelected && oi !== q.correctIndex;
                          return (
                            <button
                              key={oi}
                              type="button"
                              disabled={hasChecked}
                              onClick={() =>
                                setSelectedAnswers((prev) => ({ ...prev, [q.id]: oi }))
                              }
                              className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-[14px] font-medium transition-colors ${
                                isCorrect
                                  ? 'border-[#22C55E]/50 bg-[#22C55E]/8 text-[#15803D]'
                                  : isWrong
                                    ? 'border-(--color-cs-red)/50 bg-(--color-cs-red)/8 text-(--color-cs-red)'
                                    : isSelected
                                      ? 'border-[#3394D1]/50 bg-[#3394D1]/8 text-(--color-primary-blue-dark)'
                                      : 'border-(--color-auth-field-border) bg-white text-(--color-primary-blue-dark)'
                              } disabled:cursor-default`}
                            >
                              <span
                                className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                                  isSelected || isCorrect
                                    ? 'bg-[#3394D1] text-white'
                                    : 'bg-(--color-goal-bg) text-(--color-text-secondary)'
                                }`}
                              >
                                {OPTION_LETTERS[Math.min(oi, 5)]}
                              </span>
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </section>
            )}

            {checkError && (
              <p role="alert" className="text-[14px] font-semibold text-(--color-cs-red)">
                {t('listening.session.answerFirst')}
              </p>
            )}

            <button
              type="button"
              onClick={() =>
                session.addQuestions && session.questions.length > 0 && !hasChecked
                  ? checkAnswers()
                  : finishPractice()
              }
              className="h-12 w-full rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98]"
            >
              {session.addQuestions && session.questions.length > 0 && !hasChecked
                ? t('listening.session.checkAnswers')
                : t('listening.session.finish')}
            </button>
          </>
        )}
      </div>
    </ContentContainer>
  );
}
