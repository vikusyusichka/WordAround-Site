/* Speed Reading — /practice/reading/speed. Setup (target / timer / length) →
   AI-generated passage → countdown 3-2-1 → chunked paced reading →
   comprehension questions → results. Web port of the SpeedReading submodule;
   finished sessions persist to readingItems (modeID `speed-reading`). */
import { useEffect, useReducer, useRef, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { SetupSection } from '@/components/practice/SetupSection';
import { OptionPillGroup } from '@/components/practice/OptionPill';
import { StartButton } from '@/components/practice/StartButton';
import { ReadingQuestionSection } from '@/components/reading/ReadingQuestionSection';
import { useReadingItemsQuery, useSaveReadingItem } from '@/hooks/useReadingItems';
import { useUid } from '@/hooks/useFolders';
import { Icon } from '@/components/primitives/Icon';
import { recordPractice } from '@/lib/dailyPracticeStats';
import { generateReadingQuestions } from '@/lib/readingQuestionService';
import { formatReadingTime } from '@/lib/readingScoring';
import {
  detectLevel,
  readingPreview,
  readingWordCount,
} from '@/lib/readingTextAnalyzer';
import { assistanceToToggles, DEFAULT_ASSISTANCE } from '@/lib/readingTypes';
import {
  chunkSeconds,
  generateSpeedReadingText,
  initialSpeedSessionState,
  LENGTH_META,
  SPEED_LENGTHS,
  SPEED_TARGETS,
  SPEED_TIMER_MODES,
  speedSessionReducer,
  TARGET_META,
  TIMER_META,
  type SpeedConfiguration,
  type SpeedGenerated,
} from '@/lib/speedReading';
import type { ReadingLibraryItem } from '@/lib/models';

export const Route = createFileRoute('/_authed/practice/reading/speed/')({
  component: SpeedReadingScreen,
});

const RATING_COLOR: Record<string, string> = {
  excellent: '#22C55E',
  balanced: 'var(--color-primary-blue)',
  fast: '#F59E0B',
  tooSlow: 'var(--color-cs-red)',
};

function SpeedReadingScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const uid = useUid();
  const saveItem = useSaveReadingItem();
  const { data: savedItems } = useReadingItemsQuery('speed-reading');

  const [config, setConfig] = useState<SpeedConfiguration>({
    target: 'balanced',
    timer: 'soft',
    length: 'five',
  });
  const [screen, setScreen] = useState<'setup' | 'session'>('setup');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generatedRef = useRef<SpeedGenerated | null>(null);
  const [session, dispatch] = useReducer(speedSessionReducer, config, initialSpeedSessionState);
  const persistedRef = useRef(false);

  /* Countdown ticks at 900ms; reading ticks at 1s (iOS cadence). */
  useEffect(() => {
    if (screen !== 'session') return;
    if (session.phase === 'countdown') {
      const id = setInterval(() => dispatch({ type: 'COUNTDOWN_TICK' }), 900);
      return () => clearInterval(id);
    }
    if (session.phase === 'reading') {
      const id = setInterval(() => dispatch({ type: 'TICK' }), 1000);
      return () => clearInterval(id);
    }
  }, [screen, session.phase]);

  /* Persist the finished session once. */
  useEffect(() => {
    if (session.phase !== 'results' || !session.result || persistedRef.current) return;
    persistedRef.current = true;
    /* Bank the reading time first: it counts even when the session can't be
       saved to the library (signed out, generation lost). */
    recordPractice({
      skill: 'reading',
      value: Math.max(1, session.elapsedSeconds),
      sourceModeID: 'speed-reading',
    });
    const generated = generatedRef.current;
    if (!generated || !uid) return;
    const now = Date.now();
    const wordCount = readingWordCount(generated.text);
    const item: ReadingLibraryItem = {
      id: crypto.randomUUID(),
      ownerUID: uid,
      modeID: 'speed-reading',
      title: `Speed ${t(`reading.speed.length.${config.length}`)} • ${t(`reading.speed.target.${config.target}`)}`,
      preview: readingPreview(generated.text, 120),
      fullText: JSON.stringify({ chunks: generated.chunks }),
      difficulty: 'B2',
      estimatedMinutes: LENGTH_META[config.length].minutes,
      createdAt: now,
      updatedAt: now,
      progress: 1,
      comprehensionScore: session.result.comprehensionPercent / 100,
      tags: [config.target, config.timer, config.length],
      sourceType: 'speedPractice',
      status: 'completed',
      selections: {
        target: config.target,
        timer: config.timer,
        length: config.length,
        detectedDifficulty: detectLevel(generated.text),
        history: JSON.stringify([session.result]),
      },
      toggles: assistanceToToggles(DEFAULT_ASSISTANCE),
      languageCode: 'english',
      wordCount,
      characterCount: generated.text.length,
      detectedDifficulty: detectLevel(generated.text),
      readingFocus: 'speedFluency',
      enabledQuestionTypes: ['comprehension', 'trueFalse', 'findEvidence'],
      readingTimeSeconds: session.result.readingTimeSeconds,
      lastReadCharacterIndex: 0,
    };
    saveItem.mutate(item);
  }, [session.phase, session.result, session.elapsedSeconds, uid, config, saveItem, t]);

  const startSession = async (reuseText = false) => {
    setError(null);
    setIsGenerating(true);
    try {
      const generated =
        reuseText && generatedRef.current
          ? generatedRef.current
          : await generateSpeedReadingText(config, 'English');
      generatedRef.current = generated;
      const questions = generateReadingQuestions({
        content: generated.text,
        title: 'Speed reading',
        preview: readingPreview(generated.text, 160),
        focus: 'speedFluency',
        enabledTypes: ['comprehension', 'trueFalse', 'findEvidence'],
        maxQuestions: LENGTH_META[config.length].questionTarget,
      });
      persistedRef.current = false;
      dispatch({ type: 'START', config, chunks: generated.chunks, questions });
      setScreen('session');
    } catch {
      setError(t('reading.speed.generateError'));
    } finally {
      setIsGenerating(false);
    }
  };

  const question = session.questions[session.currentQuestionIndex];
  const selectedAnswer = question ? session.answers[question.id] : undefined;
  const isLastQuestion = session.currentQuestionIndex >= session.questions.length - 1;
  const limit = chunkSeconds(session.config);

  return (
    <ContentContainer fluid className="max-w-(--size-setup-max)">
      <PageHeader
        title={t('reading.speed.title')}
        subtitle={t('reading.speed.subtitle')}
        actions={
          screen === 'session' && session.phase === 'reading' ? (
            <span className="rounded-2xl bg-(--color-goal-bg) px-4 py-2 text-[14px] font-bold tabular-nums text-(--color-primary-blue-dark)">
              {Math.floor(session.elapsedSeconds / 60)}:
              {String(session.elapsedSeconds % 60).padStart(2, '0')}
            </span>
          ) : undefined
        }
      />

      <div className="flex w-full max-w-(--size-setup-max) flex-col gap-5">
        <button
          type="button"
          onClick={() =>
            screen === 'session' ? setScreen('setup') : void navigate({ to: '/practice/reading' })
          }
          className="w-fit text-[13px] font-semibold text-(--color-primary-blue) hover:underline focus-visible:outline-none"
        >
          ← {screen === 'session' ? t('reading.speed.title') : t('nav.reading')}
        </button>

        {screen === 'setup' && (
          <>
            <SetupSection title={t('reading.speed.section.target')}>
              <OptionPillGroup
                options={SPEED_TARGETS.map((o) => ({ id: o, label: t(`reading.speed.target.${o}`) }))}
                value={config.target}
                onChange={(v) => setConfig((c) => ({ ...c, target: v }))}
                columns={3}
              />
            </SetupSection>

            <SetupSection title={t('reading.speed.section.timer')}>
              <OptionPillGroup
                options={SPEED_TIMER_MODES.map((o) => ({ id: o, label: t(`reading.speed.timer.${o}`) }))}
                value={config.timer}
                onChange={(v) => setConfig((c) => ({ ...c, timer: v }))}
                columns={3}
              />
            </SetupSection>

            <SetupSection
              title={t('reading.speed.section.length')}
              helper={t('reading.speed.summary', {
                wpm: TARGET_META[config.target].wpmTarget,
                minutes: LENGTH_META[config.length].minutes,
              })}
            >
              <OptionPillGroup
                options={SPEED_LENGTHS.map((o) => ({ id: o, label: t(`reading.speed.length.${o}`) }))}
                value={config.length}
                onChange={(v) => setConfig((c) => ({ ...c, length: v }))}
                columns={3}
              />
            </SetupSection>

            {error && (
              <p role="alert" className="text-[14px] font-semibold text-(--color-cs-red)">
                {error}
              </p>
            )}

            <StartButton
              label={isGenerating ? t('reading.speed.preparing') : t('reading.speed.start')}
              icon="bolt.fill"
              disabled={isGenerating}
              onClick={() => void startSession()}
            />

            {savedItems && savedItems.length > 0 && (
              <section className="flex flex-col gap-2">
                <h2 className="text-[16px] font-bold text-(--color-primary-blue-dark)">
                  {t('reading.speed.recentTitle')}
                </h2>
                {savedItems.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-2xl border border-white bg-white/95 px-4 py-3 shadow-[0_4px_10px_rgba(0,0,0,0.045)]"
                  >
                    <span className="text-[14px] font-semibold text-(--color-primary-blue-dark)">
                      {item.title}
                    </span>
                    <span className="text-[13px] font-medium text-(--color-text-secondary)">
                      {Math.round((item.comprehensionScore ?? 0) * 100)}% ·{' '}
                      {formatReadingTime(item.readingTimeSeconds ?? 0)}
                    </span>
                  </div>
                ))}
              </section>
            )}
          </>
        )}

        {screen === 'session' && session.phase === 'countdown' && (
          <div className="grid place-items-center py-24">
            <span className="text-[96px] font-extrabold text-[#F26B66]">
              {session.countdownValue}
            </span>
          </div>
        )}

        {screen === 'session' && session.phase === 'reading' && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-(--color-text-secondary)">
                {t('reading.speed.chunkOf', {
                  current: session.chunkIndex + 1,
                  total: session.chunks.length,
                })}
              </p>
              {limit > 0 && (
                <span
                  className={`text-[13px] font-bold tabular-nums ${
                    session.chunkElapsedSeconds > limit
                      ? 'text-(--color-cs-red)'
                      : 'text-(--color-text-secondary)'
                  }`}
                >
                  {session.chunkElapsedSeconds}s / {limit}s
                </span>
              )}
            </div>
            <div className="h-[5px] w-full overflow-hidden rounded-full bg-(--color-goal-bg)">
              <div
                className="h-full rounded-full bg-[#F26B66] transition-[width]"
                style={{
                  width: `${((session.chunkIndex + 1) / Math.max(session.chunks.length, 1)) * 100}%`,
                }}
              />
            </div>

            <div className="rounded-3xl border border-white bg-white/95 p-5 shadow-[0_4px_10px_rgba(0,0,0,0.045)] md:p-6">
              <p
                className="font-medium leading-relaxed text-(--color-primary-blue-dark)"
                style={{ fontSize: `${16 * session.fontScale}px` }}
              >
                {session.chunks[session.chunkIndex]}
              </p>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'PREVIOUS_CHUNK' })}
                  disabled={session.chunkIndex === 0}
                  aria-label={t('reading.speed.previous')}
                  className="grid size-11 place-items-center rounded-2xl border border-(--color-auth-field-border) bg-white disabled:opacity-40"
                >
                  <Icon name="arrow.left" className="size-[16px] text-(--color-text-secondary)" />
                </button>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'TOGGLE_PAUSE' })}
                  className="h-11 rounded-2xl border border-(--color-auth-field-border) bg-white px-4 text-[13px] font-semibold text-(--color-text-secondary)"
                >
                  {session.paused ? t('reading.speed.resume') : t('reading.speed.pause')}
                </button>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'FONT_DELTA', delta: -0.1 })}
                  className="h-11 rounded-2xl border border-(--color-auth-field-border) bg-white px-3 text-[13px] font-bold text-(--color-text-secondary)"
                >
                  A−
                </button>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'FONT_DELTA', delta: 0.1 })}
                  className="h-11 rounded-2xl border border-(--color-auth-field-border) bg-white px-3 text-[15px] font-bold text-(--color-text-secondary)"
                >
                  A+
                </button>
              </div>
              <button
                type="button"
                onClick={() => dispatch({ type: 'ADVANCE_CHUNK' })}
                className="h-11 flex-1 rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) px-5 text-[14px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98]"
              >
                {session.chunkIndex >= session.chunks.length - 1
                  ? t('reading.speed.finishReading')
                  : t('reading.speed.nextChunk')}
              </button>
            </div>
          </>
        )}

        {screen === 'session' && session.phase === 'questions' && question && (
          <>
            <ReadingQuestionSection
              question={question}
              index={session.currentQuestionIndex}
              total={session.questions.length}
              selectedAnswer={selectedAnswer}
              showHints={false}
              onSelect={(answer) => dispatch({ type: 'SELECT_ANSWER', answer })}
            />
            <button
              type="button"
              disabled={selectedAnswer === undefined}
              onClick={() =>
                dispatch({ type: isLastQuestion ? 'FINISH' : 'NEXT_QUESTION' })
              }
              className="h-12 w-full rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
            >
              {isLastQuestion ? t('reading.session.finish') : t('reading.session.next')}
            </button>
          </>
        )}

        {screen === 'session' && session.phase === 'results' && session.result && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-2 rounded-3xl border border-white bg-white/95 p-6 shadow-[0_4px_10px_rgba(0,0,0,0.045)]">
              <span
                className="rounded-full px-3 py-1 text-[13px] font-bold"
                style={{
                  color: RATING_COLOR[session.result.rating],
                  background: `color-mix(in srgb, ${RATING_COLOR[session.result.rating]} 12%, white)`,
                }}
              >
                {t(`reading.speed.rating.${session.result.rating}`)}
              </span>
              <div className="flex items-baseline gap-6">
                <div className="flex flex-col items-center">
                  <span className="text-[36px] font-extrabold text-(--color-primary-blue-dark)">
                    {session.result.wpm}
                  </span>
                  <span className="text-[12px] font-semibold text-(--color-text-secondary)">
                    {t('reading.speed.result.average')}
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[36px] font-extrabold text-(--color-muted-text)">
                    {session.result.targetWPM}
                  </span>
                  <span className="text-[12px] font-semibold text-(--color-text-secondary)">
                    {t('reading.speed.result.target')}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-3 text-[13px] font-semibold text-(--color-text-secondary)">
                <span>{formatReadingTime(session.result.readingTimeSeconds)}</span>
                <span>
                  {Math.round(session.result.comprehensionPercent)}%{' '}
                  {t('reading.result.comprehension')}
                </span>
                {TIMER_META[session.config.timer].penalisesViolations && (
                  <span>
                    {t('reading.speed.result.violations', {
                      count: session.result.timerViolations,
                    })}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 md:flex-row">
              <button
                type="button"
                onClick={() => void startSession(true)}
                className="h-12 flex-1 rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98]"
              >
                {t('reading.speed.tryAgain')}
              </button>
              <button
                type="button"
                onClick={() => setScreen('setup')}
                className="h-12 flex-1 rounded-2xl border border-(--color-auth-field-border) bg-white text-[15px] font-semibold text-(--color-cs-text-muted) transition-colors hover:bg-black/[0.03]"
              >
                {t('reading.speed.backToSetup')}
              </button>
            </div>
          </div>
        )}
      </div>
    </ContentContainer>
  );
}
