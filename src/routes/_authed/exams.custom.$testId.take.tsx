/* /exams/custom/$testId/take — taking a test. One section per screen:
   reading puts the text beside the questions on wide screens (the text stays
   in view while you scroll the questions); listening puts the player above
   them. Answers can be changed until Finish; nothing is marked before that.
   With a timer, the test finishes itself when time runs out. */
import { createFileRoute, useBlocker, useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AnswerField } from '@/components/customTests/AnswerField';
import { SECTION_ICONS } from '@/components/customTests/display';
import { ListeningPlayer } from '@/components/customTests/ListeningPlayer';
import { TestStatus } from '@/components/customTests/TestStatus';
import { CARD, PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/exams/ui';
import { Icon } from '@/components/primitives/Icon';
import { ConfirmDialog } from '@/components/shell/ConfirmDialog';
import { ContentContainer } from '@/components/shell/ContentContainer';
import { useCustomTest, useSaveAttempt } from '@/hooks/useCustomTests';
import { useUid } from '@/hooks/useFolders';
import type { CustomTestAttempt } from '@/lib/customTests/customTestStorage';
import { formatClock, markTest, secondsLeft, type CustomTest } from '@/lib/customTests/model';
import { stopListeningSpeech } from '@/lib/speech';
import { useSessionStore } from '@/stores/sessionStore';

export const Route = createFileRoute('/_authed/exams/custom/$testId/take')({
  component: TakePage,
});

function TakePage() {
  const { testId } = Route.useParams();
  const test = useCustomTest(testId);
  if (!test.data) return <TestStatus query={test} />;
  return <TakeTest test={test.data} />;
}

const TakeTest = ({ test }: { test: CustomTest }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const uid = useUid();
  const email = useSessionStore((s) => s.currentEmail);
  const name = useSessionStore((s) => s.currentName);
  const saveAttempt = useSaveAttempt();

  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [finished, setFinished] = useState(false);
  const finishing = useRef(false);

  const section = test.sections[index];
  const left = secondsLeft(test.timeLimitMinutes, startedAt, now);
  const unanswered = test.sections
    .flatMap((s) => s.questions)
    .filter((q) => !(answers[q.id] ?? '').trim()).length;

  /* Leaving mid-test loses the answers, so ask first. */
  useBlocker({
    shouldBlockFn: () => !finished && !window.confirm(t('exams.custom.take.leaveConfirm')),
    enableBeforeUnload: () => !finished,
  });

  const finish = useCallback(
    (timedOut: boolean) => {
      if (finishing.current || !uid) return;
      finishing.current = true;
      stopListeningSpeech();
      const result = markTest(test, answers);
      const attempt: CustomTestAttempt = {
        ...result,
        id: crypto.randomUUID(),
        testId: test.id,
        testTitle: test.title,
        userId: uid,
        userName: name || email,
        createdAt: Date.now(),
        durationSeconds: Math.round((Date.now() - startedAt) / 1000),
        timedOut,
      };
      setFinished(true);
      saveAttempt.mutate(attempt, {
        onSuccess: () =>
          void navigate({
            to: '/exams/custom/$testId/results/$attemptId',
            params: { testId: test.id, attemptId: attempt.id },
            replace: true,
          }),
        onError: () => {
          finishing.current = false;
          setFinished(false);
        },
      });
    },
    [answers, email, name, navigate, saveAttempt, startedAt, test, uid],
  );

  useEffect(() => {
    if (test.timeLimitMinutes === null) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [test.timeLimitMinutes]);

  useEffect(() => {
    if (left === 0) finish(true);
  }, [left, finish]);

  /* A new section starts at its top. */
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [index]);

  if (!section) return null;
  const isLast = index === test.sections.length - 1;
  const lowTime = left !== null && left <= 60;

  const questions = (
    <div className="flex flex-col gap-3">
      {section.questions.map((question, i) => (
        <AnswerField
          key={question.id}
          question={question}
          number={i + 1}
          value={answers[question.id] ?? ''}
          onChange={(value) => setAnswers((prev) => ({ ...prev, [question.id]: value }))}
        />
      ))}
    </div>
  );

  return (
    <ContentContainer fluid>
      {/* Header: test title, progress through sections, the clock. */}
      <div className="sticky top-0 z-10 -mx-4 mb-5 flex flex-wrap items-center gap-3 border-b border-(--color-surface-border) bg-(--color-app-bg)/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[17px] font-bold text-(--color-primary-blue-dark)">{test.title}</span>
          <span className="text-[13px] font-semibold text-(--color-muted-text)">
            {t('exams.custom.take.sectionOf', { n: index + 1, total: test.sections.length })}
          </span>
        </div>
        {left !== null && (
          <span
            role="timer"
            aria-label={t('exams.custom.take.timeLeft')}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[16px] font-bold tabular-nums ${
              lowTime ? 'bg-(--color-cs-red)/12 text-(--color-cs-red)' : 'bg-(--color-primary-blue)/10 text-(--color-primary-blue-dark)'
            }`}
          >
            <Icon name="clock.fill" className="size-4" />
            {formatClock(left)}
          </span>
        )}
      </div>

      <div className="mb-4 flex items-center gap-3">
        <Icon name={SECTION_ICONS[section.kind]} className="size-6 text-(--color-primary-blue)" />
        <h1 className="text-[22px] font-bold text-(--color-primary-blue-dark) lg:text-[26px]">
          {section.title || t(`exams.custom.kind.${section.kind}`)}
        </h1>
      </div>

      {section.kind === 'reading' ? (
        <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
          <article
            className={`${CARD} text-[16px] leading-relaxed font-medium whitespace-pre-line text-(--color-primary-blue-dark) lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto`}
          >
            {section.text}
          </article>
          {questions}
        </div>
      ) : (
        <div className="flex max-w-[860px] flex-col gap-5">
          <ListeningPlayer key={section.id} audio={section.audio} languageId={test.languageId} maxPlays={section.maxPlays} />
          {questions}
        </div>
      )}

      {saveAttempt.isError && (
        <p role="alert" className="mt-5 text-[14px] font-semibold text-(--color-cs-red)">
          {t('exams.custom.take.saveFailed')}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        {index > 0 && (
          <button type="button" className={SECONDARY_BUTTON} onClick={() => setIndex(index - 1)}>
            <Icon name="arrow.left" className="size-4" />
            {t('exams.custom.take.previous')}
          </button>
        )}
        {isLast ? (
          <button
            type="button"
            className={PRIMARY_BUTTON}
            disabled={saveAttempt.isPending}
            onClick={() => (unanswered > 0 ? setConfirmFinish(true) : finish(false))}
          >
            {saveAttempt.isPending ? t('exams.custom.take.saving') : t('exams.custom.take.finish')}
          </button>
        ) : (
          <button type="button" className={PRIMARY_BUTTON} onClick={() => setIndex(index + 1)}>
            {t('exams.custom.take.next')}
            <Icon name="arrow.right" className="size-4" />
          </button>
        )}
      </div>

      {confirmFinish && (
        <ConfirmDialog
          title={t('exams.custom.take.unansweredTitle', { count: unanswered })}
          body={t('exams.custom.take.unansweredBody')}
          confirmLabel={t('exams.custom.take.finish')}
          onCancel={() => setConfirmFinish(false)}
          onConfirm={() => {
            setConfirmFinish(false);
            finish(false);
          }}
        />
      )}
    </ContentContainer>
  );
};
