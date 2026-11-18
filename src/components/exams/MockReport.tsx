/* The result of a full mock exam: the overall verdict on the exam's own
   scale, every section's score, and — folded away — each writing/speaking
   answer's feedback and each reading/listening task's marked answers. */
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import { formatSectionScore, SKILL_ICONS } from '@/lib/exams/display';
import { sectionMax } from '@/lib/exams/marking';
import { taskKey, type MockState } from '@/lib/exams/mockSession';
import type { ExamResult } from '@/lib/exams/scoring';
import type { ExamSpec, ExamVariant } from '@/lib/exams/types';

import { ObjectiveTaskView } from './ObjectiveTaskView';
import { RubricFeedbackView } from './RubricFeedbackView';
import { BODY_TEXT, CARD, SECTION_TITLE } from './ui';

export const OverallVerdict = ({ result, variant }: { result: ExamResult; variant: ExamVariant }) => {
  const { t } = useTranslation();
  if (result.kind === 'band') {
    return (
      <section className={`${CARD} flex flex-col gap-1`}>
        <span className="text-[13px] font-bold uppercase tracking-wide text-(--color-muted-text)">{t('exams.mock.overall')}</span>
        <span className="text-[48px] leading-tight font-extrabold tabular-nums text-(--color-primary-blue)">
          {result.overall.toFixed(1)}
        </span>
        <span className="text-[13px] font-medium text-(--color-muted-text)">{t('exams.result.estimateNote')}</span>
      </section>
    );
  }
  const overall = variant.overall.kind === 'groups' ? variant.overall : null;
  return (
    <section className={`${CARD} flex flex-col gap-3`}>
      <span className="text-[13px] font-bold uppercase tracking-wide text-(--color-muted-text)">{t('exams.mock.overall')}</span>
      <span
        className="text-[36px] leading-tight font-extrabold"
        style={{ color: result.passed ? 'var(--color-green-accent)' : 'var(--color-profile-danger)' }}
      >
        {result.passed ? t('exams.mock.passed') : t('exams.mock.notPassed')}
      </span>
      <span className="text-[17px] font-bold tabular-nums text-(--color-primary-blue-dark)">
        {result.total} / {overall?.max ?? 100}
      </span>
      <ul className="flex flex-col gap-1.5">
        {result.groups.map((group) => (
          <li key={group.id} className="flex items-center gap-2 text-[14px] font-semibold text-(--color-text-secondary)">
            <Icon
              name={group.passed ? 'checkmark' : 'xmark'}
              className="size-4"
              style={{ color: group.passed ? 'var(--color-green-accent)' : 'var(--color-profile-danger)' }}
            />
            {overall?.groups.find((g) => g.id === group.id)?.title}: {group.score} / {group.max}
          </li>
        ))}
      </ul>
      <span className="text-[13px] font-medium text-(--color-muted-text)">{t('exams.result.estimateNote')}</span>
    </section>
  );
};

export const MockReport = ({ exam, variant, state }: { exam: ExamSpec; variant: ExamVariant; state: MockState }) => {
  const { t } = useTranslation();
  if (!state.result) return null;
  return (
    <div className="flex flex-col gap-5">
      <OverallVerdict result={state.result} variant={variant} />

      <div className="grid gap-3 sm:grid-cols-2">
        {variant.sections.map((section) => (
          <div key={section.id} className={`${CARD} flex items-center gap-3`}>
            <Icon name={SKILL_ICONS[section.skill]} className="size-5 text-(--color-primary-blue)" />
            <span className="flex-1 text-[15px] font-bold text-(--color-primary-blue-dark)">{section.title}</span>
            <span className="text-[17px] font-extrabold tabular-nums text-(--color-primary-blue)">
              {formatSectionScore(section, state.sectionScores[section.id] ?? 0)} / {sectionMax(section)}
            </span>
          </div>
        ))}
      </div>

      {variant.sections.map((section) => (
        <section key={section.id} className="flex flex-col gap-3">
          <h2 className="text-[21px] font-bold text-(--color-primary-blue-dark)">{section.title}</h2>
          {section.tasks.map((task) => {
            const key = taskKey(section.id, task.id);
            const generated = state.generated[section.id]?.[task.id];
            const feedback = state.feedback[key];
            return (
              <details key={key} className={CARD}>
                <summary className={`${SECTION_TITLE} cursor-pointer`}>
                  {task.title}
                  {generated && <span className="font-semibold text-(--color-muted-text)"> · {generated.title}</span>}
                </summary>
                <div className="mt-4 flex flex-col gap-4">
                  {generated?.kind === 'objective' && (
                    <ObjectiveTaskView
                      generated={generated}
                      languageId={exam.languageId}
                      answers={state.objectiveAnswers[key] ?? {}}
                      onAnswer={() => undefined}
                      review
                    />
                  )}
                  {task.kind !== 'objective' && (
                    <>
                      <p className={`${BODY_TEXT} whitespace-pre-line rounded-2xl bg-(--color-hover-wash) p-4`}>
                        {state.essays[key] || state.spoken[key]?.transcript || t('exams.mock.noAnswer')}
                      </p>
                      {feedback && (
                        <RubricFeedbackView
                          feedback={feedback}
                          criterionMax={
                            section.scoring.kind === 'rubricBand' || section.scoring.kind === 'rubricScaled'
                              ? section.scoring.criterionMax
                              : 0
                          }
                        />
                      )}
                    </>
                  )}
                </div>
              </details>
            );
          })}
        </section>
      ))}
    </div>
  );
};
