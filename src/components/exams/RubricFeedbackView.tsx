/* The examiner's verdict on a writing or speaking answer: the score each
   rubric criterion earned with the reason, what went well, what to fix, the
   worst mistakes corrected, and the same answer written at a higher level. */
import { useTranslation } from 'react-i18next';

import type { RubricFeedback } from '@/lib/exams/rubricScoring';

import { BODY_TEXT, CARD, SECTION_TITLE } from './ui';

interface RubricFeedbackViewProps {
  feedback: RubricFeedback;
  criterionMax: number;
}

export const RubricFeedbackView = ({ feedback, criterionMax }: RubricFeedbackViewProps) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      <section className={`${CARD} flex flex-col gap-4`}>
        <h2 className={SECTION_TITLE}>{t('exams.feedback.criteria')}</h2>
        <p className={BODY_TEXT}>{feedback.summary}</p>
        <ul className="flex flex-col gap-4">
          {feedback.criteria.map((criterion) => (
            <li key={criterion.id} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[15px] font-bold text-(--color-primary-blue-dark)">{criterion.name}</span>
                <span className="text-[15px] font-bold tabular-nums text-(--color-primary-blue)">
                  {criterion.score} / {criterionMax}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-(--color-surface-border)">
                <div
                  className="h-full rounded-full bg-(--color-primary-blue)"
                  style={{ width: `${(criterion.score / criterionMax) * 100}%` }}
                />
              </div>
              {criterion.comment && <p className="text-[14px] font-medium text-(--color-text-secondary)">{criterion.comment}</p>}
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <ListCard title={t('exams.feedback.strengths')} items={feedback.strengths} color="var(--color-green-accent)" />
        <ListCard title={t('exams.feedback.improvements')} items={feedback.improvements} color="var(--color-orange-accent)" />
      </div>

      {feedback.corrections.length > 0 && (
        <section className={`${CARD} flex flex-col gap-3`}>
          <h2 className={SECTION_TITLE}>{t('exams.feedback.corrections')}</h2>
          <ul className="flex flex-col gap-3">
            {feedback.corrections.map((c, i) => (
              <li key={i} className="flex flex-col gap-1 border-t border-(--color-surface-border) pt-3 first:border-t-0 first:pt-0">
                <span className="text-[15px] font-medium text-(--color-profile-danger) line-through decoration-1">
                  {c.original}
                </span>
                <span className="text-[15px] font-bold text-(--color-green-accent)">{c.corrected}</span>
                {c.explanation && <span className="text-[13px] font-medium text-(--color-text-secondary)">{c.explanation}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {feedback.improvedVersion && (
        <details className={CARD}>
          <summary className={`${SECTION_TITLE} cursor-pointer`}>{t('exams.feedback.improvedVersion')}</summary>
          <p className={`${BODY_TEXT} mt-3 whitespace-pre-line`}>{feedback.improvedVersion}</p>
        </details>
      )}
    </div>
  );
};

const ListCard = ({ title, items, color }: { title: string; items: string[]; color: string }) =>
  items.length === 0 ? null : (
    <section className={`${CARD} flex flex-col gap-3`}>
      <h2 className={SECTION_TITLE}>{title}</h2>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2.5">
            <span className="mt-2 size-2 shrink-0 rounded-full" style={{ background: color }} />
            <span className={BODY_TEXT}>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );

/** The headline number: the score the answer implies for the whole section. */
export const ScoreHeadline = ({
  label,
  score,
  max,
  note,
}: {
  label: string;
  score: string;
  max: number;
  note?: string;
}) => (
  <section className={`${CARD} flex flex-wrap items-center gap-x-6 gap-y-2`}>
    <div className="flex flex-col">
      <span className="text-[13px] font-bold uppercase tracking-wide text-(--color-muted-text)">{label}</span>
      <span className="text-[40px] leading-tight font-extrabold tabular-nums text-(--color-primary-blue)">
        {score}
        <span className="text-[20px] font-bold text-(--color-muted-text)"> / {max}</span>
      </span>
    </div>
    {note && <p className="max-w-[46ch] text-[13px] font-medium text-(--color-muted-text)">{note}</p>}
  </section>
);
