/* Exams → "Own tests": the tests you wrote, and every test you have taken
   (yours or one shared with you by link). */
import { Link, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { CARD, PRIMARY_BUTTON, SECTION_TITLE } from '@/components/exams/ui';
import { Icon } from '@/components/primitives/Icon';
import { useMyAttempts, useMyTests } from '@/hooks/useCustomTests';
import { questionCount } from '@/lib/customTests/model';

import { percentColor } from './display';

export const CustomTestsTab = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const tests = useMyTests();
  const attempts = useMyAttempts();
  const date = (ms: number) => new Date(ms).toLocaleDateString(i18n.language, { dateStyle: 'medium' });

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-[21px] font-bold text-(--color-primary-blue-dark) lg:text-[26px]">
              {t('exams.custom.mine')}
            </h2>
            <p className="text-[14px] font-medium text-(--color-muted-text)">{t('exams.custom.intro')}</p>
          </div>
          <button type="button" className={PRIMARY_BUTTON} onClick={() => void navigate({ to: '/exams/custom/new' })}>
            <Icon name="plus" className="size-5" />
            {t('exams.custom.create')}
          </button>
        </div>

        {tests.isPending ? (
          <p className="text-[15px] font-medium text-(--color-muted-text)">{t('exams.custom.loading')}</p>
        ) : tests.isError ? (
          <p role="alert" className="text-[15px] font-semibold text-(--color-cs-red)">
            {t('exams.custom.unavailable')}
          </p>
        ) : tests.data.length === 0 ? (
          <div className={`${CARD} flex flex-col items-center gap-2 py-10 text-center`}>
            <Icon name="square.and.pencil" className="size-9 text-(--color-primary-blue)" />
            <p className={SECTION_TITLE}>{t('exams.custom.emptyTitle')}</p>
            <p className="max-w-[440px] text-[14px] font-medium text-(--color-text-secondary)">
              {t('exams.custom.emptyBody')}
            </p>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {tests.data.map((test) => (
              <li key={test.id}>
                <Link
                  to="/exams/custom/$testId"
                  params={{ testId: test.id }}
                  className={`${CARD} flex h-full flex-col gap-2 transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:outline-none`}
                >
                  <span className="text-[17px] font-bold break-words text-(--color-primary-blue-dark)">{test.title}</span>
                  {test.description && (
                    <span className="line-clamp-2 text-[14px] font-medium text-(--color-text-secondary)">
                      {test.description}
                    </span>
                  )}
                  <span className="mt-auto pt-1 text-[13px] font-semibold text-(--color-muted-text)">
                    {t('exams.custom.summary', { sections: test.sections.length, questions: questionCount(test) })}
                    {test.timeLimitMinutes !== null && ` · ${t('exams.duration.minutes', { m: test.timeLimitMinutes })}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={`${CARD} flex flex-col gap-3`}>
        <div className="flex items-center gap-3">
          <Icon name="chart.line.uptrend.xyaxis" className="size-5 text-(--color-primary-blue)" />
          <h2 className={SECTION_TITLE}>{t('exams.custom.history')}</h2>
        </div>
        {attempts.isPending ? (
          <p className="text-[14px] font-medium text-(--color-muted-text)">{t('exams.custom.loading')}</p>
        ) : attempts.isError ? (
          <p className="text-[14px] font-semibold text-(--color-cs-red)">{t('exams.custom.unavailable')}</p>
        ) : attempts.data.length === 0 ? (
          <p className="text-[14px] font-medium text-(--color-muted-text)">{t('exams.custom.historyEmpty')}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-(--color-surface-border)">
            {attempts.data.map((attempt) => (
              <li key={attempt.id}>
                <Link
                  to="/exams/custom/$testId/results/$attemptId"
                  params={{ testId: attempt.testId, attemptId: attempt.id }}
                  className="flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-(--color-hover-wash)"
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15px] font-semibold text-(--color-primary-blue-dark)">
                      {attempt.testTitle}
                    </span>
                    <span className="text-[13px] font-medium text-(--color-muted-text)">{date(attempt.createdAt)}</span>
                  </div>
                  <span className="text-[16px] font-bold" style={{ color: percentColor(attempt.percent) }}>
                    {attempt.percent}%
                  </span>
                  <Icon name="chevron.right" className="size-4 text-(--color-muted-text)" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
