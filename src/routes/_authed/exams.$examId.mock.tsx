/* Full mock exam — /exams/$examId/mock?variant=…

   Every section in order, each on its own clock; when time runs out the
   section is handed in, as in the real exam. Progress is saved to this
   device after every change, so a reload or a closed tab resumes where it
   stopped (with the time that is really left). At the end writing and
   speaking go to the AI examiner, the exam's own rules turn everything into
   a result, and the attempt is added to the history. */
import { createFileRoute, notFound, useNavigate } from '@tanstack/react-router';
import { del, get, set } from 'idb-keyval';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ExamTimer } from '@/components/exams/ExamTimer';
import { MockReport } from '@/components/exams/MockReport';
import { ObjectiveTaskView } from '@/components/exams/ObjectiveTaskView';
import { PremiumPrompt } from '@/components/exams/PremiumPrompt';
import { SpeakingTaskView } from '@/components/exams/SpeakingTaskView';
import { BODY_TEXT, CARD, PRIMARY_BUTTON, SECONDARY_BUTTON, SECTION_TITLE } from '@/components/exams/ui';
import { WritingTaskView } from '@/components/exams/WritingTaskView';
import { BackLink } from '@/components/shell/BackLink';
import { ConfirmDialog } from '@/components/shell/ConfirmDialog';
import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { useExamAccess, useSaveAttempt } from '@/hooks/useExams';
import { useUid } from '@/hooks/useFolders';
import { useSecondsLeft } from '@/hooks/useSecondsLeft';
import { recordPractice } from '@/lib/dailyPracticeStats';
import { canStartMock } from '@/lib/exams/access';
import { splitMinutes, variantMinutes } from '@/lib/exams/display';
import { generateTask, type GeneratedTask } from '@/lib/exams/generation';
import {
  createMock,
  mockReducer,
  pendingRubricKeys,
  taskKey,
  type MockState,
} from '@/lib/exams/mockSession';
import { findExam } from '@/lib/exams/registry';
import { scoreRubricTask } from '@/lib/exams/rubricScoring';
import type { ExamSpec, ExamVariant, SectionSpec } from '@/lib/exams/types';
import { languageByCode } from '@/lib/languages';

export const Route = createFileRoute('/_authed/exams/$examId/mock')({
  validateSearch: (search: Record<string, unknown>): { variant?: string } => ({
    variant: typeof search.variant === 'string' ? search.variant : undefined,
  }),
  beforeLoad: ({ params }) => {
    if (!findExam(params.examId)) throw notFound();
  },
  component: MockExamPage,
});

const storageKey = (uid: string, examId: string, variantId: string) => `wa.exams.mock.${uid}.${examId}.${variantId}`;

function MockExamPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { examId } = Route.useParams();
  const search = Route.useSearch();
  const exam = findExam(examId)!;
  const variant = exam.variants.find((v) => v.id === search.variant) ?? exam.variants[0];
  const uid = useUid();
  const access = useExamAccess();
  const [saved, setSaved] = useState<MockState | null | undefined>(undefined);

  useEffect(() => {
    if (!uid) return;
    get<MockState>(storageKey(uid, exam.id, variant.id))
      .then((state) => setSaved(state && state.phase !== 'done' && state.phase !== 'intro' ? state : null))
      .catch(() => setSaved(null));
  }, [uid, exam.id, variant.id]);

  const back = () => void navigate({ to: '/exams/$examId', params: { examId }, search: { variant: variant.id } });

  return (
    <ContentContainer fluid>
      <BackLink label={exam.name} onClick={back} className="mb-4" />
      <PageHeader title={t('exams.mock.title')} subtitle={`${exam.name} ${variant.title}`} />
      {!canStartMock(access) && !access.isLoading ? (
        <PremiumPrompt reason={t('exams.premium.mockLocked')} />
      ) : saved === undefined || !uid ? (
        <p className="text-[15px] font-semibold text-(--color-muted-text)">{t('exams.loading')}</p>
      ) : (
        <MockRunner key={saved?.id ?? 'new'} exam={exam} variant={variant} uid={uid} initial={saved} />
      )}
    </ContentContainer>
  );
}

function MockRunner({
  exam,
  variant,
  uid,
  initial,
}: {
  exam: ExamSpec;
  variant: ExamVariant;
  uid: string;
  initial: MockState | null;
}) {
  const { t, i18n } = useTranslation();
  const [state, dispatch] = useReducer(
    mockReducer(variant),
    initial ?? createMock(crypto.randomUUID(), exam.id, variant.id),
  );
  const [genError, setGenError] = useState<string | null>(null);
  const [markErrors, setMarkErrors] = useState(0);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const inflight = useRef(new Set<string>());
  const markingRun = useRef(0);
  const savedAttempt = useRef(false);
  const saveAttempt = useSaveAttempt();
  const key = storageKey(uid, exam.id, variant.id);
  const section: SectionSpec | undefined = variant.sections[state.sectionIndex];

  /* Save after every change; forget it once the result is in. */
  useEffect(() => {
    if (state.phase === 'intro') return;
    if (state.phase === 'done') void del(key).catch(() => undefined);
    else void set(key, state).catch(() => undefined);
  }, [state, key]);

  const generateSection = useCallback(
    (target: SectionSpec) => {
      if (inflight.current.has(target.id)) return;
      inflight.current.add(target.id);
      setGenError(null);
      Promise.all(
        target.tasks.map(async (task) => [task.id, await generateTask({ exam, variant, section: target, task })] as const),
      )
        .then((entries) => {
          const tasks: Record<string, GeneratedTask> = Object.fromEntries(entries);
          dispatch({ type: 'generated', sectionId: target.id, tasks, now: Date.now() });
        })
        .catch((e: unknown) => setGenError(e instanceof Error ? e.message : String(e)))
        .finally(() => inflight.current.delete(target.id));
    },
    [exam, variant],
  );

  /* The current section, when it is not ready yet. */
  useEffect(() => {
    if (state.phase === 'generating' && section) generateSection(section);
  }, [state.phase, section, generateSection]);

  /* The next section, quietly, while this one runs — no waiting between them. */
  useEffect(() => {
    const next = variant.sections[state.sectionIndex + 1];
    if ((state.phase === 'running' || state.phase === 'prep') && next && !state.generated[next.id]) {
      generateSection(next);
    }
  }, [state.phase, state.sectionIndex, state.generated, variant, generateSection]);

  const secondsLeft = useSecondsLeft(state.phase === 'running' ? state.deadline : null);
  const prepLeft = useSecondsLeft(state.phase === 'prep' ? state.prepDeadline : null);
  useEffect(() => {
    if (state.phase === 'running' && secondsLeft !== null && secondsLeft <= 0) {
      dispatch({ type: 'finishSection', now: Date.now() });
    }
  }, [state.phase, secondsLeft]);
  useEffect(() => {
    if (state.phase === 'prep' && prepLeft !== null && prepLeft <= 0) dispatch({ type: 'endPrep', now: Date.now() });
  }, [state.phase, prepLeft]);

  /* Marking: every answered writing/speaking task to the examiner, in parallel. */
  const runMarking = useCallback(() => {
    const run = ++markingRun.current;
    const pending = pendingRubricKeys(variant, state);
    setMarkErrors(0);
    if (pending.length === 0) {
      dispatch({ type: 'complete', variant, now: Date.now() });
      return;
    }
    let failures = 0;
    void Promise.all(
      pending.map(async (k) => {
        const [sectionId, taskId] = k.split('/');
        const sec = variant.sections.find((s) => s.id === sectionId)!;
        const task = sec.tasks.find((tk) => tk.id === taskId)!;
        const generated = state.generated[sectionId]?.[taskId];
        if (task.kind === 'objective' || !generated || generated.kind === 'objective') return;
        try {
          const feedback = await scoreRubricTask({
            ref: { exam, variant, section: sec, task },
            generated,
            response: state.essays[k] ?? state.spoken[k]?.transcript ?? '',
            spokenSeconds: state.spoken[k]?.seconds,
            feedbackLanguage: languageByCode(i18n.language)?.englishName ?? 'English',
          });
          if (run === markingRun.current) dispatch({ type: 'scored', key: k, feedback });
        } catch {
          failures += 1;
        }
      }),
    ).then(() => {
      if (run !== markingRun.current) return;
      if (failures > 0) setMarkErrors(failures);
      else dispatch({ type: 'complete', variant, now: Date.now() });
    });
  }, [variant, state, exam, i18n.language]);

  const markingStarted = useRef(false);
  useEffect(() => {
    if (state.phase === 'marking' && !markingStarted.current) {
      markingStarted.current = true;
      runMarking();
    }
  }, [state.phase, runMarking]);

  /* Once done: into the history and the daily stats. */
  useEffect(() => {
    if (state.phase !== 'done' || !state.result || savedAttempt.current) return;
    savedAttempt.current = true;
    const durationSeconds = Math.round(((state.finishedAt ?? Date.now()) - state.startedAt) / 1000);
    saveAttempt.mutate({
      id: state.id,
      examId: exam.id,
      variantId: variant.id,
      mode: 'mock',
      createdAt: state.finishedAt ?? Date.now(),
      durationSeconds,
      sectionScores: state.sectionScores,
      result: state.result,
    });
    for (const sec of variant.sections) {
      if (sec.skill !== 'writing') recordPractice({ skill: sec.skill, value: sec.minutes * 60, sourceModeID: 'exam-mock' });
    }
  }, [state, exam.id, variant, saveAttempt]);

  if (state.phase === 'intro') return <MockIntro variant={variant} onStart={() => dispatch({ type: 'start', now: Date.now() })} />;

  if (state.phase === 'done') return <MockReport exam={exam} variant={variant} state={state} />;

  if (state.phase === 'marking') {
    return (
      <section className={`${CARD} flex flex-col items-start gap-3`} aria-live="polite">
        <p className="text-[16px] font-bold text-(--color-primary-blue-dark)">
          {markErrors > 0 ? t('exams.mock.markFailed', { count: markErrors }) : t('exams.mock.marking')}
        </p>
        {markErrors > 0 && (
          <button type="button" className={PRIMARY_BUTTON} onClick={runMarking}>
            {t('exams.retry')}
          </button>
        )}
      </section>
    );
  }

  if (!section) return null;
  const progress = t('exams.mock.sectionOf', { current: state.sectionIndex + 1, total: variant.sections.length });

  if (state.phase === 'generating') {
    return (
      <section className={`${CARD} flex flex-col items-start gap-3`} aria-live="polite">
        <span className="text-[13px] font-bold text-(--color-muted-text)">{progress}</span>
        <p className="text-[16px] font-bold text-(--color-primary-blue-dark)">
          {genError ? t('exams.task.generateFailed') : t('exams.mock.preparing', { section: section.title })}
        </p>
        {genError && (
          <>
            <p className="text-[13px] font-medium text-(--color-muted-text)">{genError}</p>
            <button type="button" className={PRIMARY_BUTTON} onClick={() => generateSection(section)}>
              {t('exams.retry')}
            </button>
          </>
        )}
      </section>
    );
  }

  const tasks = state.generated[section.id] ?? {};
  return (
    <div className="flex flex-col gap-5">
      <div className="sticky top-2 z-10 flex flex-wrap items-center justify-between gap-3 rounded-full">
        <span className="rounded-full bg-(--color-surface-card) px-4 py-2 text-[14px] font-bold text-(--color-primary-blue-dark) shadow-[0_2px_6px_var(--shadow-color-fc)]">
          {progress} · {section.title}
        </span>
        {state.phase === 'prep' && prepLeft !== null && section.prepMinutes && (
          <ExamTimer secondsLeft={prepLeft} totalSeconds={section.prepMinutes * 60} label={t('exams.speaking.prepTime')} />
        )}
        {state.phase === 'running' && secondsLeft !== null && (
          <ExamTimer secondsLeft={secondsLeft} totalSeconds={section.minutes * 60} />
        )}
      </div>

      {state.phase === 'prep' ? (
        <PrepView section={section} tasks={tasks} onDone={() => dispatch({ type: 'endPrep', now: Date.now() })} />
      ) : (
        <SectionTasks
          exam={exam}
          variant={variant}
          section={section}
          tasks={tasks}
          state={state}
          dispatch={dispatch}
        />
      )}

      {state.phase === 'running' && (
        <div className="flex pb-6">
          <button type="button" className={PRIMARY_BUTTON} onClick={() => setConfirmFinish(true)}>
            {state.sectionIndex + 1 < variant.sections.length ? t('exams.mock.finishSection') : t('exams.mock.finishExam')}
          </button>
        </div>
      )}

      {confirmFinish && (
        <ConfirmDialog
          title={t('exams.mock.confirmTitle')}
          body={t('exams.mock.confirmMessage')}
          confirmLabel={t('exams.mock.confirmYes')}
          onConfirm={() => {
            setConfirmFinish(false);
            dispatch({ type: 'finishSection', now: Date.now() });
          }}
          onCancel={() => setConfirmFinish(false)}
        />
      )}
    </div>
  );
}

const MockIntro = ({ variant, onStart }: { variant: ExamVariant; onStart: () => void }) => {
  const { t } = useTranslation();
  const { hours, minutes } = splitMinutes(variantMinutes(variant));
  return (
    <section className={`${CARD} flex flex-col items-start gap-4`}>
      <h2 className={SECTION_TITLE}>{t('exams.mock.introTitle')}</h2>
      <p className={BODY_TEXT}>{t('exams.mock.introBody', { hours, minutes })}</p>
      <ul className="flex list-disc flex-col gap-1.5 pl-5">
        {(['introRuleTimer', 'introRuleAudio', 'introRuleResume', 'introRuleMic'] as const).map((rule) => (
          <li key={rule} className={BODY_TEXT}>
            {t(`exams.mock.${rule}`)}
          </li>
        ))}
      </ul>
      <button type="button" className={PRIMARY_BUTTON} onClick={onStart}>
        {t('exams.mock.start')}
      </button>
    </section>
  );
};

/* Preparation before a speaking section (DELE): read the material, no recording yet. */
const PrepView = ({
  section,
  tasks,
  onDone,
}: {
  section: SectionSpec;
  tasks: Record<string, GeneratedTask>;
  onDone: () => void;
}) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      <p className={BODY_TEXT}>{t('exams.mock.prepIntro')}</p>
      {section.tasks.map((task) => {
        const generated = tasks[task.id];
        if (generated?.kind !== 'speaking') return null;
        return (
          <section key={task.id} className={`${CARD} flex flex-col gap-2`}>
            <h2 className={SECTION_TITLE}>
              {task.title} · {generated.title}
            </h2>
            <p className={`${BODY_TEXT} whitespace-pre-line`}>{generated.instructions}</p>
            {generated.material && <p className={`${BODY_TEXT} whitespace-pre-line`}>{generated.material}</p>}
            {generated.cueCard && (
              <p className={BODY_TEXT}>
                <strong>{generated.cueCard.topic}</strong> — {generated.cueCard.points.join(' · ')}
              </p>
            )}
          </section>
        );
      })}
      <div>
        <button type="button" className={SECONDARY_BUTTON} onClick={onDone}>
          {t('exams.mock.endPrep')}
        </button>
      </div>
    </div>
  );
};

/* The running section: a tab per task (you may move between them, as on the
   real paper), the current task below. */
const SectionTasks = ({
  exam,
  variant,
  section,
  tasks,
  state,
  dispatch,
}: {
  exam: ExamSpec;
  variant: ExamVariant;
  section: SectionSpec;
  tasks: Record<string, GeneratedTask>;
  state: MockState;
  dispatch: React.Dispatch<Parameters<ReturnType<typeof mockReducer>>[1]>;
}) => {
  const [current, setCurrent] = useState(section.tasks[0]?.id ?? '');
  const task = section.tasks.find((tk) => tk.id === current) ?? section.tasks[0];
  const generated = task ? tasks[task.id] : undefined;
  if (!task || !generated) return null;
  const k = taskKey(section.id, task.id);

  return (
    <div className="flex flex-col gap-4">
      {section.tasks.length > 1 && (
        <div role="tablist" className="flex flex-wrap gap-2">
          {section.tasks.map((tk) => (
            <button
              key={tk.id}
              type="button"
              role="tab"
              aria-selected={tk.id === task.id}
              onClick={() => setCurrent(tk.id)}
              className="h-10 rounded-full border px-4 text-[14px] font-bold transition-colors"
              style={
                tk.id === task.id
                  ? { background: 'var(--color-primary-blue-solid)', color: '#fff', borderColor: 'transparent' }
                  : { borderColor: 'var(--color-surface-border)', color: 'var(--color-primary-blue-dark)' }
              }
            >
              {tk.title}
            </button>
          ))}
        </div>
      )}

      {/* Keyed by task so each keeps its own player/recorder state. */}
      <div key={k}>
        {generated.kind === 'objective' && task.kind === 'objective' && (
          <ObjectiveTaskView
            generated={generated}
            languageId={exam.languageId}
            maxPlays={task.plays}
            answers={state.objectiveAnswers[k] ?? {}}
            onAnswer={(questionId, answer) => dispatch({ type: 'answerObjective', key: k, questionId, answer })}
            playsUsed={state.plays?.[k] ?? 0}
            onPlay={() => dispatch({ type: 'played', key: k })}
          />
        )}
        {generated.kind === 'writing' && task.kind === 'writing' && (
          <WritingTaskView
            spec={task}
            generated={generated}
            value={state.essays[k] ?? ''}
            onChange={(text) => dispatch({ type: 'writeEssay', key: k, text })}
          />
        )}
        {generated.kind === 'speaking' && task.kind === 'speaking' && (
          <SpeakingTaskView
            spec={task}
            generated={generated}
            languageId={exam.languageId}
            level={variant.level ?? 'B2'}
            answer={state.spoken[k] ?? null}
            onAnswer={(answer) => dispatch({ type: 'recordSpoken', key: k, answer })}
            singleTake
          />
        )}
      </div>
    </div>
  );
};
