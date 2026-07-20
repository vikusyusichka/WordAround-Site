/* Listening result — web port of ListeningResultView +
   ListeningStatisticsCardView. Shared by all listening modes. */
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import type { ListeningResult } from '@/lib/listeningTypes';

interface ListeningResultViewProps {
  result: ListeningResult;
  subtitle: string;
  chips: string[];
  accentColor: string;
  onPracticeAgain?: () => void;
  onBack: () => void;
}

const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}m ${seconds % 60}s`;

export const ListeningResultView = ({
  result,
  subtitle,
  chips,
  accentColor,
  onPracticeAgain,
  onBack,
}: ListeningResultViewProps) => {
  const { t } = useTranslation();

  const stats = [
    { label: t('listening.result.correct'), value: `${result.correctAnswers} / ${result.totalQuestions}` },
    { label: t('listening.result.time'), value: formatTime(result.listeningTimeSeconds) },
    { label: t('listening.result.speed'), value: result.speedLabel },
    { label: t('listening.result.mistakes'), value: String(result.mistakes.length) },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col items-center gap-2">
        <span
          className="grid size-14 place-items-center rounded-full"
          style={{ background: `${accentColor}1F` }}
        >
          <Icon name="headphones" className="size-[26px]" style={{ color: accentColor }} />
        </span>
        <h2 className="text-[22px] font-extrabold text-(--color-primary-blue-dark)">
          {t('listening.result.title')}
        </h2>
        <p className="text-[14px] font-medium text-(--color-text-secondary)">{subtitle}</p>
        <div className="flex flex-wrap justify-center gap-1.5">
          {chips.map((chip) => (
            <span
              key={chip}
              className="rounded-full bg-(--color-goal-bg) px-2.5 py-1 text-[12px] font-bold text-(--color-text-secondary)"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>

      {result.hasQuestions ? (
        <>
          {/* Score */}
          <div className="flex flex-col items-center gap-1 rounded-3xl border border-white bg-white/95 p-6 shadow-[0_4px_10px_rgba(0,0,0,0.045)]">
            <span className="text-[44px] font-extrabold text-(--color-primary-blue-dark)">
              {result.comprehensionPercent}%
            </span>
            <span className="text-[13px] font-semibold text-(--color-text-secondary)">
              {t('listening.result.comprehension')}
            </span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center gap-0.5 rounded-2xl border border-white bg-white/95 px-2 py-3 shadow-[0_4px_10px_rgba(0,0,0,0.045)]"
              >
                <span className="text-[17px] font-extrabold text-(--color-primary-blue-dark)">
                  {stat.value}
                </span>
                <span className="text-[12px] font-semibold text-(--color-text-secondary)">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>

          {/* Mistakes */}
          {result.mistakes.length > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className="text-[13px] font-bold uppercase tracking-wide text-(--color-cs-red)">
                {t('listening.result.mistakesTitle')}
              </h3>
              {result.mistakes.map((mistake, i) => (
                <div key={i} className="rounded-2xl border border-(--color-cs-red)/25 bg-white px-4 py-3">
                  <p className="text-[14px] font-semibold text-(--color-primary-blue-dark)">
                    {mistake.prompt}
                  </p>
                  {mistake.selectedAnswer && (
                    <p className="mt-1 text-[13px] font-medium text-(--color-cs-red)">
                      ✕ {mistake.selectedAnswer}
                    </p>
                  )}
                  <p className="text-[13px] font-medium text-[#15803D]">✓ {mistake.correctAnswer}</p>
                  {mistake.explanation && (
                    <p className="mt-1 text-[12px] font-medium text-(--color-text-secondary)">
                      {mistake.explanation}
                    </p>
                  )}
                </div>
              ))}
            </section>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center gap-1 rounded-3xl border border-white bg-white/95 p-6 shadow-[0_4px_10px_rgba(0,0,0,0.045)]">
          <span className="text-[18px] font-bold text-(--color-primary-blue-dark)">
            {t('listening.result.watchOnlyTitle')}
          </span>
          <span className="text-[14px] font-medium text-(--color-text-secondary)">
            {t('listening.result.watchOnlyBody', { time: formatTime(result.listeningTimeSeconds) })}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-2 md:flex-row">
        {onPracticeAgain && (
          <button
            type="button"
            onClick={onPracticeAgain}
            className="h-12 flex-1 rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98]"
          >
            {t('listening.result.practiceAgain')}
          </button>
        )}
        <button
          type="button"
          onClick={onBack}
          className="h-12 flex-1 rounded-2xl border border-(--color-auth-field-border) bg-white text-[15px] font-semibold text-(--color-cs-text-muted) transition-colors hover:bg-black/[0.03]"
        >
          {t('listening.result.back')}
        </button>
      </div>
    </div>
  );
};
