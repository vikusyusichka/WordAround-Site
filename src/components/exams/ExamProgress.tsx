/* The learner's side of an exam page: their target and exam date, and how
   their mock exams and practised tasks have gone so far. */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import { useExamAttempts, useExamGoal, useSaveGoal } from '@/hooks/useExams';
import { daysUntil, formatSectionScore, mockScore } from '@/lib/exams/display';
import type { ExamAttempt } from '@/lib/exams/examStorage';
import { sectionMax } from '@/lib/exams/marking';
import type { ExamSpec, ExamVariant } from '@/lib/exams/types';

import { CARD, FIELD, SECONDARY_BUTTON, SECTION_TITLE } from './ui';

const targetOptions = (variant: ExamVariant): number[] =>
  variant.overall.kind === 'bandMean'
    ? Array.from({ length: 11 }, (_, i) => 4 + i * 0.5)
    : [];

export const ExamGoalCard = ({ exam, variant }: { exam: ExamSpec; variant: ExamVariant }) => {
  const { t } = useTranslation();
  const goal = useExamGoal(exam.id);
  const saveGoal = useSaveGoal();
  const [target, setTarget] = useState<string>('');
  const [date, setDate] = useState<string>('');

  useEffect(() => {
    if (!goal.data) return;
    setTarget(goal.data.targetScore === null ? '' : String(goal.data.targetScore));
    setDate(goal.data.examDate ?? '');
  }, [goal.data]);

  const options = targetOptions(variant);
  const days = goal.data?.examDate ? daysUntil(goal.data.examDate) : null;
  const dirty =
    (goal.data?.examDate ?? '') !== date || String(goal.data?.targetScore ?? '') !== target;

  return (
    <section className={`${CARD} flex flex-col gap-4`}>
      <div className="flex items-center gap-3">
        <Icon name="flag.fill" className="size-5 text-(--color-primary-blue)" />
        <h2 className={SECTION_TITLE}>{t('exams.goal.title')}</h2>
      </div>
      {days !== null && (
        <p className="text-[15px] font-bold text-(--color-primary-blue-dark)">
          {days > 0
            ? t('exams.goal.daysLeft', { count: days })
            : days === 0
              ? t('exams.goal.today')
              : t('exams.goal.passed')}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {options.length > 0 && (
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-(--color-muted-text)">{t('exams.goal.target')}</span>
            <select value={target} onChange={(e) => setTarget(e.target.value)} className={FIELD}>
              <option value="">—</option>
              {options.map((o) => (
                <option key={o} value={String(o)}>
                  {o.toFixed(1)}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-(--color-muted-text)">{t('exams.goal.date')}</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={FIELD} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={SECONDARY_BUTTON}
          disabled={!dirty || saveGoal.isPending}
          onClick={() =>
            saveGoal.mutate({
              examId: exam.id,
              variantId: variant.id,
              targetScore: target === '' ? null : Number(target),
              examDate: date === '' ? null : date,
            })
          }
        >
          {t('exams.goal.save')}
        </button>
        {(saveGoal.isError || goal.isError) && (
          <span className="text-[13px] font-semibold text-(--color-profile-danger)">{t('exams.history.unavailable')}</span>
        )}
      </div>
    </section>
  );
};

const Sparkline = ({ values, max, target }: { values: number[]; max: number; target: number | null }) => {
  const W = 320;
  const H = 90;
  if (values.length === 0) return null;
  const x = (i: number) => (values.length === 1 ? W / 2 : 8 + (i * (W - 16)) / (values.length - 1));
  const y = (v: number) => H - 8 - (Math.max(v, 0) / max) * (H - 16);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-[90px] w-full" role="img" aria-hidden>
      {target !== null && (
        <line x1={0} x2={W} y1={y(target)} y2={y(target)} stroke="var(--color-green-accent)" strokeDasharray="4 4" />
      )}
      <polyline
        points={values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
        fill="none"
        stroke="var(--color-primary-blue)"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      {values.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={3.5} fill="var(--color-primary-blue)" />
      ))}
    </svg>
  );
};

export const ExamHistoryCard = ({ exam, variant }: { exam: ExamSpec; variant: ExamVariant }) => {
  const { t, i18n } = useTranslation();
  const attempts = useExamAttempts(exam.id);
  const goal = useExamGoal(exam.id);
  const mine = (attempts.data ?? []).filter((a) => a.variantId === variant.id);
  const mocks = mine.filter((a) => a.mode === 'mock' && a.result).reverse();
  const values = mocks.map(mockScore).filter((v): v is number => v !== null);
  const max = variant.overall.max;
  const dateFormat = new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short' });

  const scoreLabel = (attempt: ExamAttempt): string => {
    if (attempt.mode === 'mock' && attempt.result) {
      return attempt.result.kind === 'band'
        ? attempt.result.overall.toFixed(1)
        : `${attempt.result.total} / ${max} · ${attempt.result.passed ? t('exams.mock.passed') : t('exams.mock.notPassed')}`;
    }
    const section = variant.sections.find((s) => s.id === attempt.sectionId);
    const score = attempt.sectionId ? attempt.sectionScores[attempt.sectionId] : undefined;
    return section && score !== undefined ? `${formatSectionScore(section, score)} / ${sectionMax(section)}` : '—';
  };

  return (
    <section className={`${CARD} flex flex-col gap-4`}>
      <div className="flex items-center gap-3">
        <Icon name="chart.line.uptrend.xyaxis" className="size-5 text-(--color-primary-blue)" />
        <h2 className={SECTION_TITLE}>{t('exams.history.title')}</h2>
      </div>
      {attempts.isError ? (
        <p className="text-[14px] font-medium text-(--color-muted-text)">{t('exams.history.unavailable')}</p>
      ) : mine.length === 0 ? (
        <p className="text-[14px] font-medium text-(--color-muted-text)">{t('exams.history.empty')}</p>
      ) : (
        <>
          {values.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-[13px] font-semibold text-(--color-muted-text)">{t('exams.history.mockTrend')}</span>
              <Sparkline values={values} max={max} target={goal.data?.targetScore ?? null} />
            </div>
          )}
          <ul className="flex flex-col">
            {mine.slice(0, 8).map((attempt) => (
              <li
                key={attempt.id}
                className="flex items-center gap-3 border-t border-(--color-surface-border) py-2.5 first:border-t-0"
              >
                <span className="w-14 shrink-0 text-[13px] font-semibold text-(--color-muted-text)">
                  {dateFormat.format(attempt.createdAt)}
                </span>
                <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-(--color-primary-blue-dark)">
                  {attempt.mode === 'mock'
                    ? t('exams.mock.title')
                    : `${variant.sections.find((s) => s.id === attempt.sectionId)?.title ?? ''} · ${attempt.taskTitle ?? ''}`}
                </span>
                <span className="shrink-0 text-[14px] font-bold tabular-nums text-(--color-primary-blue)">
                  {scoreLabel(attempt)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
};
