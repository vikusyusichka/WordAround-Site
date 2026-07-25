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
          {/* Summary card — comprehension % + statistics (one card). */}
          <div className="flex flex-col gap-[18px] rounded-[22px] bg-white/95 p-5 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
            <div className="flex flex-col items-center gap-1">
              <span className="text-[44px] font-extrabold" style={{ color: accentColor }}>
                {result.comprehensionPercent}%
              </span>
              <span className="text-[13px] font-semibold text-(--color-text-secondary)">
                {t('listening.result.comprehension')}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="flex flex-col items-center gap-0.5 rounded-[18px] px-2 py-3"
                  style={{ background: `color-mix(in srgb, ${accentColor} 7%, transparent)` }}
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
          </div>

          {/* Mistakes */}
          {result.mistakes.length > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className="text-[22px] font-bold text-(--color-primary-blue-dark)">
                {t('listening.result.mistakesTitle')}
              </h3>
              {result.mistakes.map((mistake, i) => (
                <div key={i} className="flex flex-col gap-2 rounded-[18px] bg-white/95 p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                  <p className="text-[15px] font-semibold text-(--color-primary-blue-dark)">
                    {mistake.prompt}
                  </p>
                  {mistake.selectedAnswer && (
                    <p className="flex items-center gap-1.5 text-[14px] font-medium text-(--color-text-secondary)">
                      <Icon name="xmark.circle.fill" className="size-[15px] text-[#F26B66]" />
                      {mistake.selectedAnswer}
                    </p>
                  )}
                  <p className="flex items-center gap-1.5 text-[14px] font-semibold" style={{ color: accentColor }}>
                    <Icon name="checkmark.circle.fill" className="size-[15px]" style={{ color: accentColor }} />
                    {mistake.correctAnswer}
                  </p>
                  {mistake.explanation && (
                    <p className="text-[12px] font-medium text-(--color-muted-text)">
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

      <div className="flex flex-col gap-2.5">
        {onPracticeAgain && (
          <button
            type="button"
            onClick={onPracticeAgain}
            className="h-[52px] rounded-[18px] text-[16px] font-bold text-white transition-transform hover:brightness-105 active:scale-[0.99]"
            style={{
              background: `linear-gradient(135deg, ${accentColor}, color-mix(in srgb, ${accentColor} 70%, black))`,
              boxShadow: `0 8px 16px color-mix(in srgb, ${accentColor} 30%, transparent)`,
            }}
          >
            {t('listening.result.practiceAgain')}
          </button>
        )}
        <button
          type="button"
          onClick={onBack}
          className="h-[52px] rounded-[18px] text-[15px] font-bold transition-colors hover:brightness-[0.98]"
          style={{ background: `color-mix(in srgb, ${accentColor} 10%, transparent)`, color: accentColor }}
        >
          {t('listening.result.back')}
        </button>
      </div>
    </div>
  );
};
