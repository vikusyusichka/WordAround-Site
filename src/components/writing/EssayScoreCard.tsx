/* Displays a computed EssayScore: header (title + quality + total/CEFR),
   plus 6 horizontal progress bars for the sub-scores. Bars are colored by
   threshold. Blob decoration mirrors EssayTopicCard's look. */
import { useTranslation } from 'react-i18next';

import { StatBlobShape } from '@/components/home/blobs';
import type { EssayQualityLabel, EssayScore } from '@/lib/essayTypes';

interface EssayScoreCardProps {
  score: EssayScore;
}

const QUALITY_KEY: Record<EssayQualityLabel, string> = {
  Excellent: 'writing.essays.score.quality.excellent',
  'Very good': 'writing.essays.score.quality.veryGood',
  Good: 'writing.essays.score.quality.good',
  'Needs work': 'writing.essays.score.quality.needsWork',
};

const barColor = (value: number): string => {
  if (value >= 80) return '#29BA66';         // green
  if (value >= 60) return '#F7A310';         // orange
  if (value >= 40) return '#FFB84D';         // light orange
  return '#FF5759';                          // red
};

interface RowProps {
  labelKey: string;
  value: number;
}

const ScoreRow = ({ labelKey, value }: RowProps) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-semibold text-(--color-primary-blue-dark) md:text-[14px]">
          {t(labelKey)}
        </span>
        <span
          className="text-[13px] font-bold md:text-[14px]"
          style={{ color: barColor(value) }}
        >
          {value}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-(--color-goal-progress-bg)">
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${Math.max(0, Math.min(value, 100))}%`, background: barColor(value) }}
        />
      </div>
    </div>
  );
};

export const EssayScoreCard = ({ score }: EssayScoreCardProps) => {
  const { t } = useTranslation();
  return (
    <div className="relative w-full overflow-hidden rounded-[26px] border border-white/95 bg-(--color-fc-card-bg) p-5 shadow-[0_6px_14px_rgba(0,0,0,0.055)] md:rounded-[32px] md:p-7">
      <StatBlobShape
        color="var(--color-fc-soft-blue)"
        opacity={0.7}
        className="pointer-events-none absolute -top-4 -right-4 h-[80px] w-[100px] md:h-[100px] md:w-[130px]"
      />

      <div className="relative flex flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold uppercase tracking-wide text-(--color-fc-muted) md:text-[14px]">
              {t('writing.essays.score.title')}
            </span>
            <span
              className="w-fit rounded-full bg-white/90 px-3 py-1 text-[13px] font-bold shadow-[0_2px_6px_rgba(0,0,0,0.04)] md:text-[14px]"
              style={{ color: barColor(score.total) }}
            >
              {t(QUALITY_KEY[score.qualityLabel])}
            </span>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="text-[36px] font-extrabold leading-none text-(--color-fc-title) md:text-[48px]">
              {score.total}
              <span className="text-[16px] font-semibold text-(--color-fc-muted) md:text-[20px]">
                /100
              </span>
            </span>
            <span className="rounded-full bg-(--color-primary-blue) px-3 py-1 text-[12px] font-bold text-white md:text-[13px]">
              {score.cefrLevel}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <ScoreRow labelKey="writing.essays.score.category.grammar" value={score.grammar} />
          <ScoreRow labelKey="writing.essays.score.category.vocabulary" value={score.vocabulary} />
          <ScoreRow labelKey="writing.essays.score.category.length" value={score.length} />
          <ScoreRow labelKey="writing.essays.score.category.complexity" value={score.complexity} />
          <ScoreRow labelKey="writing.essays.score.category.relevance" value={score.relevance} />
          <ScoreRow labelKey="writing.essays.score.category.independence" value={score.independence} />
        </div>
      </div>
    </div>
  );
};
