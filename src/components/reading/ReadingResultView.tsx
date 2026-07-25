/* Session result — port of ReadingResultView: a centred header (icon circle +
   "Practice Complete" + text title), one white summary card holding the
   comprehension % and the 4-metric statistics, teal-accent mistake cards, and
   Read-again / Back actions in the reading accent. */
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import { formatReadingTime, type ReadingResult } from '@/lib/readingScoring';

// Reading My-Texts mode accent (teal).
const ACCENT = '#21A8BD';
const ACCENT_DARK = '#0F6A78';

interface ReadingResultViewProps {
  result: ReadingResult;
  title: string;
  onReadAgain: () => void;
  onBack: () => void;
}

export const ReadingResultView = ({ result, title, onReadAgain, onBack }: ReadingResultViewProps) => {
  const { t } = useTranslation();
  const percent = Math.round(result.comprehensionPercent);

  const stats = [
    { label: t('reading.result.correct'), value: `${result.correctCount}/${result.totalQuestions}` },
    { label: t('reading.result.time'), value: formatReadingTime(result.readingTimeSeconds) },
    { label: t('reading.result.wpm'), value: String(result.wpm) },
    { label: t('reading.result.mistakes'), value: String(result.mistakes.length) },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col items-center gap-3 text-center">
        <span
          className="grid size-16 place-items-center rounded-full"
          style={{ background: `color-mix(in srgb, ${ACCENT} 14%, transparent)` }}
        >
          <Icon name="doc.text.fill" className="size-7" style={{ color: ACCENT }} />
        </span>
        <span className="text-[29px] font-bold md:text-[34px]" style={{ color: ACCENT_DARK }}>
          {t('reading.result.complete')}
        </span>
        <span className="text-[15px] font-medium text-(--color-muted-text)">{title}</span>
      </div>

      {/* Summary card — comprehension % + statistics. */}
      <div
        className="flex flex-col gap-[18px] rounded-[22px] bg-white/95 p-5 shadow-[0_4px_12px_rgba(0,0,0,0.05)]"
      >
        <div className="flex flex-col items-center gap-1">
          <span className="text-[44px] font-extrabold" style={{ color: ACCENT }}>
            {percent}%
          </span>
          <span className="text-[13px] font-semibold text-(--color-text-secondary)">
            {t('reading.result.comprehension')}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center gap-0.5 rounded-[18px] px-2 py-3"
              style={{ background: `color-mix(in srgb, ${ACCENT} 7%, transparent)` }}
            >
              <span className="text-[18px] font-extrabold" style={{ color: ACCENT_DARK }}>
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
          <h3 className="text-[22px] font-bold md:text-[34px]" style={{ color: ACCENT_DARK }}>
            {t('reading.result.mistakesTitle')}
          </h3>
          {result.mistakes.map((mistake, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-[18px] bg-white/95 p-3.5">
              <p className="whitespace-pre-line text-[15px] font-semibold" style={{ color: ACCENT_DARK }}>
                {mistake.prompt}
              </p>
              {mistake.selectedAnswer && (
                <p className="flex items-center gap-1.5 text-[14px] font-medium text-(--color-text-secondary)">
                  <Icon name="xmark.circle.fill" className="size-[15px] text-[#F26B66]" />
                  {mistake.selectedAnswer}
                </p>
              )}
              <p className="flex items-center gap-1.5 text-[14px] font-semibold" style={{ color: ACCENT }}>
                <Icon name="checkmark.circle.fill" className="size-[15px]" style={{ color: ACCENT }} />
                {mistake.correctAnswer}
              </p>
              {mistake.explanation && (
                <p className="text-[12px] font-medium text-(--color-muted-text)">{mistake.explanation}</p>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2.5">
        <button
          type="button"
          onClick={onReadAgain}
          className="flex h-[52px] items-center justify-center gap-2 rounded-[18px] text-[16px] font-bold text-white transition-transform hover:brightness-105 active:scale-[0.99]"
          style={{
            background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`,
            boxShadow: `0 8px 16px color-mix(in srgb, ${ACCENT} 30%, transparent)`,
          }}
        >
          <Icon name="arrow.clockwise" className="size-[15px]" />
          {t('reading.result.readAgain')}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="h-[52px] rounded-[18px] text-[15px] font-bold transition-colors hover:brightness-[0.98]"
          style={{ background: `color-mix(in srgb, ${ACCENT} 10%, transparent)`, color: ACCENT_DARK }}
        >
          {t('reading.result.back')}
        </button>
      </div>
    </div>
  );
};
