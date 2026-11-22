/* The end of a test: the score, each section's share, and every question with
   what was given and what was right. Also how the author sees a learner's
   attempt. */
import { useTranslation } from 'react-i18next';

import { CARD, SECTION_TITLE } from '@/components/exams/ui';
import { Icon } from '@/components/primitives/Icon';
import type { CustomTestAttempt } from '@/lib/customTests/customTestStorage';

import { answerLabel, formatDuration, percentColor, SECTION_ICONS } from './display';

export const AttemptReview = ({ attempt, showName }: { attempt: CustomTestAttempt; showName: boolean }) => {
  const { t, i18n } = useTranslation();

  return (
    <div className="flex flex-col gap-6">
      <section className={`${CARD} flex flex-col items-center gap-2 text-center`}>
        {showName && attempt.userName && (
          <span className="text-[15px] font-semibold text-(--color-text-secondary)">{attempt.userName}</span>
        )}
        <span className="text-[44px] leading-none font-extrabold" style={{ color: percentColor(attempt.percent) }}>
          {attempt.percent}%
        </span>
        <span className="text-[17px] font-bold text-(--color-primary-blue-dark)">
          {t('exams.custom.result.correctOf', { correct: attempt.correct, total: attempt.total })}
        </span>
        <span className="text-[14px] font-medium text-(--color-muted-text)">
          {new Date(attempt.createdAt).toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' })} ·{' '}
          {t('exams.custom.result.time', { time: formatDuration(attempt.durationSeconds) })}
        </span>
        {attempt.timedOut && (
          <span className="text-[14px] font-semibold text-(--color-orange-accent)">{t('exams.custom.result.timedOut')}</span>
        )}
      </section>

      {attempt.sections.map((section, index) => (
        <section key={section.sectionId || index} className={`${CARD} flex flex-col gap-3`}>
          <header className="flex items-center gap-3">
            <Icon name={SECTION_ICONS[section.kind]} className="size-5 text-(--color-primary-blue)" />
            <h2 className={`${SECTION_TITLE} min-w-0 flex-1`}>
              {section.title || t(`exams.custom.kind.${section.kind}`)}
            </h2>
            <span className="text-[15px] font-bold" style={{ color: percentColor(section.total ? (section.correct / section.total) * 100 : 0) }}>
              {section.correct} / {section.total}
            </span>
          </header>
          <ol className="flex flex-col gap-2">
            {section.items.map((item, i) => (
              <li
                key={i}
                className={`flex gap-3 rounded-2xl border px-4 py-3 ${
                  item.isCorrect
                    ? 'border-(--color-accent-green)/40 bg-(--color-accent-green)/8'
                    : 'border-(--color-cs-red)/35 bg-(--color-cs-red)/6'
                }`}
              >
                <Icon
                  name={item.isCorrect ? 'checkmark.circle.fill' : 'xmark.circle.fill'}
                  className={`mt-0.5 size-5 shrink-0 ${item.isCorrect ? 'text-(--color-accent-green)' : 'text-(--color-cs-red)'}`}
                />
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-[15px] font-semibold break-words whitespace-pre-line text-(--color-primary-blue-dark)">
                    {i + 1}. {item.questionText}
                  </span>
                  <span className="text-[14px] font-medium break-words text-(--color-text-secondary)">
                    {t('exams.custom.result.yourAnswer')}{' '}
                    <b className="text-(--color-primary-blue-dark)">
                      {item.given ? answerLabel(item, t, item.given) : t('exams.custom.result.noAnswer')}
                    </b>
                  </span>
                  {!item.isCorrect && (
                    <span className="text-[14px] font-medium break-words text-(--color-text-secondary)">
                      {t('exams.custom.result.rightAnswer')}{' '}
                      <b className="text-(--color-accent-green-text)">{answerLabel(item, t)}</b>
                    </span>
                  )}
                  {item.explanation && (
                    <span className="text-[13px] font-medium break-words text-(--color-muted-text)">{item.explanation}</span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
};
