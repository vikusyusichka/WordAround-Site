/* Practise one exam task — /exams/$examId/practice/$sectionId/$taskId?variant=…

   generate → answer (against the task's share of the section clock; practice
   lets you run over, it just shows it) → mark → feedback. Reading and
   listening are marked here; writing and speaking go to the AI examiner. The
   score shown is what this performance would earn over the whole section,
   on the exam's own scale. Each finished task is saved to the history. */
import { createFileRoute, notFound, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ExamTimer } from '@/components/exams/ExamTimer';
import { ObjectiveTaskView } from '@/components/exams/ObjectiveTaskView';
import { PremiumPrompt } from '@/components/exams/PremiumPrompt';
import { RubricFeedbackView, ScoreHeadline } from '@/components/exams/RubricFeedbackView';
import { SpeakingTaskView, type SpokenAnswer } from '@/components/exams/SpeakingTaskView';
import { BODY_TEXT, CARD, PRIMARY_BUTTON } from '@/components/exams/ui';
import { WritingTaskView } from '@/components/exams/WritingTaskView';
import { BackLink } from '@/components/shell/BackLink';
import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { useExamAccess, useExamAttempts, useSaveAttempt } from '@/hooks/useExams';
import { useGeneratedTask } from '@/hooks/useGeneratedTask';
import { useSecondsLeft } from '@/hooks/useSecondsLeft';
import { recordPractice } from '@/lib/dailyPracticeStats';
import { canPractiseTask } from '@/lib/exams/access';
import { formatSectionScore, practiceSeconds } from '@/lib/exams/display';
import type { GeneratedTask, TaskRef } from '@/lib/exams/generation';
import {
  estimateSectionFromObjective,
  estimateSectionFromRubric,
  markObjective,
  sectionMax,
  type ObjectiveAnswers,
} from '@/lib/exams/marking';
import { findTaskRef } from '@/lib/exams/registry';
import { countWords, criterionMaxOf, scoreRubricTask, type RubricFeedback } from '@/lib/exams/rubricScoring';
import { languageByCode } from '@/lib/languages';

export const Route = createFileRoute('/_authed/exams/$examId/practice/$sectionId/$taskId')({
  validateSearch: (search: Record<string, unknown>): { variant?: string } => ({
    variant: typeof search.variant === 'string' ? search.variant : undefined,
  }),
  beforeLoad: ({ params, search }) => {
    if (!findTaskRef(params.examId, search.variant, params.sectionId, params.taskId)) throw notFound();
  },
  component: TaskPracticePage,
});

type Result =
  | { kind: 'objective'; estimate: number; correct: number; total: number }
  | { kind: 'rubric'; estimate: number; feedback: RubricFeedback };

function TaskPracticePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = Route.useParams();
  const { variant: variantId } = Route.useSearch();
  const ref = findTaskRef(params.examId, variantId, params.sectionId, params.taskId)!;
  const { exam, variant, section, task } = ref;

  const access = useExamAccess();
  const attempts = useExamAttempts(exam.id);
  const gateKnown = !access.paywall || access.premium || (!access.isLoading && !attempts.isLoading);
  const allowed =
    !access.paywall || access.premium || canPractiseTask(access, attempts.data ?? [], variant.id, section.id, task.id);
  /* Decided once per task: finishing it must not lock the screen you are on. */
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  useEffect(() => {
    if (unlocked === null && gateKnown) setUnlocked(allowed);
  }, [unlocked, gateKnown, allowed]);

  const { state, regenerate } = useGeneratedTask(unlocked ? ref : undefined);
  const back = () => void navigate({ to: '/exams/$examId/practice', params: { examId: exam.id }, search: { variant: variant.id } });

  return (
    <ContentContainer fluid>
      <BackLink label={t('exams.practice.back')} onClick={back} className="mb-4" />
      <PageHeader title={`${exam.name} · ${section.title}`} subtitle={task.title} />

      {unlocked === false ? (
        <PremiumPrompt reason={t('exams.premium.taskUsed')} />
      ) : unlocked === null || state.status === 'generating' ? (
        <StatusCard text={t('exams.task.generating')} />
      ) : state.status === 'error' ? (
        <StatusCard text={t('exams.task.generateFailed')} detail={state.message} onRetry={regenerate} />
      ) : (
        <TaskSession
          key={state.task.title}
          taskRef={ref}
          generated={state.task}
          onAnother={() => {
            if (!allowed) setUnlocked(false);
            else regenerate();
          }}
        />
      )}
    </ContentContainer>
  );
}

const StatusCard = ({ text, detail, onRetry }: { text: string; detail?: string; onRetry?: () => void }) => {
  const { t } = useTranslation();
  return (
    <section className={`${CARD} flex flex-col items-start gap-3`} aria-live="polite">
      <p className="text-[16px] font-bold text-(--color-primary-blue-dark)">{text}</p>
      {detail && <p className="text-[13px] font-medium text-(--color-muted-text)">{detail}</p>}
      {onRetry && (
        <button type="button" className={PRIMARY_BUTTON} onClick={onRetry}>
          {t('exams.retry')}
        </button>
      )}
    </section>
  );
};

function TaskSession({
  taskRef,
  generated,
  onAnother,
}: {
  taskRef: TaskRef;
  generated: GeneratedTask;
  onAnother: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { exam, variant, section, task } = taskRef;
  const saveAttempt = useSaveAttempt();
  const [startedAt] = useState(() => Date.now());
  const limit = practiceSeconds(section, task);
  const secondsLeft = useSecondsLeft(limit === null ? null : startedAt + limit * 1000);

  const [essay, setEssay] = useState('');
  const [answers, setAnswers] = useState<ObjectiveAnswers>({});
  const [spoken, setSpoken] = useState<SpokenAnswer | null>(null);
  const [marking, setMarking] = useState(false);
  const [markError, setMarkError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  const finish = (next: Result) => {
    setResult(next);
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const durationSeconds = Math.round((Date.now() - startedAt) / 1000);
    recordPractice({
      skill: section.skill,
      value: section.skill === 'writing' ? countWords(essay) : durationSeconds,
      sourceModeID: 'exam',
    });
    saveAttempt.mutate(
      {
        id: crypto.randomUUID(),
        examId: exam.id,
        variantId: variant.id,
        mode: 'task',
        createdAt: Date.now(),
        durationSeconds,
        sectionScores: { [section.id]: next.estimate },
        sectionId: section.id,
        taskId: task.id,
        taskTitle: generated.title,
      },
      { onError: () => setSaveFailed(true) },
    );
  };

  const submit = async () => {
    if (generated.kind === 'objective') {
      const { correct, total } = markObjective(generated.questions, answers);
      finish({ kind: 'objective', correct, total, estimate: estimateSectionFromObjective(section, correct, total) });
      return;
    }
    if (task.kind === 'objective') return;
    setMarking(true);
    setMarkError(null);
    try {
      const feedback = await scoreRubricTask({
        ref: { ...taskRef, task },
        generated,
        response: generated.kind === 'writing' ? essay : (spoken?.transcript ?? ''),
        spokenSeconds: spoken?.seconds,
        feedbackLanguage: languageByCode(i18n.language)?.englishName ?? 'English',
      });
      finish({
        kind: 'rubric',
        feedback,
        estimate: estimateSectionFromRubric(section, feedback.criteria.map((c) => c.score)),
      });
    } catch (e) {
      setMarkError(e instanceof Error ? e.message : String(e));
    } finally {
      setMarking(false);
    }
  };

  const canSubmit =
    !marking &&
    (generated.kind === 'objective' ||
      (generated.kind === 'writing' && countWords(essay) > 0) ||
      (generated.kind === 'speaking' && spoken !== null));

  return (
    <div ref={topRef} className="flex scroll-mt-6 flex-col gap-5">
      {result && (
        <>
          <ScoreHeadline
            label={t('exams.result.estimate', { section: section.title })}
            score={formatSectionScore(section, result.estimate)}
            max={sectionMax(section)}
            note={
              result.kind === 'objective'
                ? t('exams.result.correctOf', { correct: result.correct, total: result.total })
                : t('exams.result.estimateNote')
            }
          />
          {saveFailed && <p className="text-[13px] font-semibold text-(--color-muted-text)">{t('exams.result.notSaved')}</p>}
          {result.kind === 'rubric' && (
            <RubricFeedbackView feedback={result.feedback} criterionMax={criterionMaxOf(taskRef)} />
          )}
        </>
      )}

      {!result && limit !== null && secondsLeft !== null && (
        <div className="sticky top-2 z-10 flex justify-end">
          <ExamTimer secondsLeft={secondsLeft} totalSeconds={limit} />
        </div>
      )}

      {generated.kind === 'writing' && task.kind === 'writing' && (
        <WritingTaskView spec={task} generated={generated} value={essay} onChange={setEssay} readOnly={!!result || marking} />
      )}
      {generated.kind === 'objective' && task.kind === 'objective' && (
        <ObjectiveTaskView
          generated={generated}
          languageId={exam.languageId}
          maxPlays={task.plays}
          answers={answers}
          onAnswer={(id, value) => setAnswers((prev) => ({ ...prev, [id]: value }))}
          review={!!result}
        />
      )}
      {generated.kind === 'speaking' && task.kind === 'speaking' && !result && (
        <SpeakingTaskView
          spec={task}
          generated={generated}
          languageId={exam.languageId}
          level={variant.level ?? 'B2'}
          answer={spoken}
          onAnswer={setSpoken}
        />
      )}
      {generated.kind === 'speaking' && result && spoken && (
        <section className={`${CARD} flex flex-col gap-2`}>
          <span className="text-[13px] font-bold text-(--color-muted-text)">{t('exams.speaking.yourAnswer')}</span>
          <p className={BODY_TEXT}>{spoken.transcript}</p>
        </section>
      )}

      {markError && <p className="text-[14px] font-semibold text-(--color-profile-danger)">{t('exams.task.markFailed')} {markError}</p>}
      {marking && <p className="text-[15px] font-semibold text-(--color-muted-text)" aria-live="polite">{t('exams.task.marking')}</p>}

      <div className="flex flex-wrap gap-3 pb-6">
        {!result ? (
          <button type="button" className={PRIMARY_BUTTON} disabled={!canSubmit} onClick={() => void submit()}>
            {markError ? t('exams.retry') : t('exams.task.submit')}
          </button>
        ) : (
          <button type="button" className={PRIMARY_BUTTON} onClick={onAnother}>
            {t('exams.task.another')}
          </button>
        )}
      </div>
    </div>
  );
}

