/* Computed EssayScore card — port of EssayScoreCardView: plain white card,
   header (title + quality label in the score tint / total in the tint / CEFR
   pill), six blue progress bars, and a statistics grid. iOS colours the bars a
   single blue (not per-threshold) and tints only the header by quality. */
import { useTranslation } from 'react-i18next';

import type { EssayQualityLabel, EssayScore, GrammarIssue } from '@/lib/essayTypes';

interface EssayScoreCardProps {
  score: EssayScore;
  wordCount: number;
  issues: GrammarIssue[];
  usedHints: number;
  usedTranslations: number;
  usedSynonyms: number;
}

const QUALITY_KEY: Record<EssayQualityLabel, string> = {
  Excellent: 'writing.essays.score.quality.excellent',
  'Very good': 'writing.essays.score.quality.veryGood',
  Good: 'writing.essays.score.quality.good',
  'Needs work': 'writing.essays.score.quality.needsWork',
};

// scoreTint by quality (EssayScoreCardView.scoreTint).
const TINT: Record<EssayQualityLabel, string> = {
  Excellent: 'var(--color-primary-blue)',
  'Very good': '#4F8CD1',
  Good: '#B89145',
  'Needs work': '#BA5752',
};

const ScoreRow = ({ labelKey, value }: { labelKey: string; value: number }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-semibold text-(--color-text-secondary) md:text-[14px]">
          {t(labelKey)}
        </span>
        <span className="text-[13px] font-bold text-(--color-primary-blue-dark) md:text-[14px]">
          {value}
        </span>
      </div>
      <div className="h-[7px] w-full overflow-hidden rounded-full bg-(--color-primary-blue)/8">
        <div
          className="h-full rounded-full bg-(--color-primary-blue)/[0.78] transition-[width] duration-300"
          style={{ width: `${Math.max(0, Math.min(value, 100))}%` }}
        />
      </div>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: number }) => (
  <div className="flex h-[66px] flex-col items-center justify-center gap-0.5 rounded-2xl bg-(--color-primary-blue)/6">
    <span className="text-[17px] font-bold text-(--color-primary-blue-dark)">{value}</span>
    <span className="text-[11px] font-semibold text-(--color-text-secondary)">{label}</span>
  </div>
);

export const EssayScoreCard = ({
  score,
  wordCount,
  issues,
  usedHints,
  usedTranslations,
  usedSynonyms,
}: EssayScoreCardProps) => {
  const { t } = useTranslation();
  const tint = TINT[score.qualityLabel];
  const grammarIssues = issues.filter((i) => i.category === 'grammar').length;
  const vocabIssues = issues.filter((i) => i.category === 'vocabulary' || i.category === 'style').length;

  return (
    <div className="flex flex-col gap-5 rounded-[22px] bg-white/95 p-5 shadow-[0_9px_16px_rgba(0,0,0,0.05)] md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[16px] font-bold text-(--color-primary-blue-dark) md:text-[18px]">
            {t('writing.essays.score.title')}
          </span>
          <span className="text-[15px] font-bold md:text-[16px]" style={{ color: tint }}>
            {t(QUALITY_KEY[score.qualityLabel])}
          </span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[26px] font-black leading-none md:text-[30px]" style={{ color: tint }}>
            {score.total}/100
          </span>
          <span className="rounded-full bg-(--color-primary-blue)/8 px-2.5 py-1 text-[12px] font-bold text-(--color-primary-blue)">
            {score.cefrLevel}
          </span>
        </div>
      </div>

      {/* Score breakdown */}
      <div className="flex flex-col gap-2.5">
        <ScoreRow labelKey="writing.essays.score.category.grammar" value={score.grammar} />
        <ScoreRow labelKey="writing.essays.score.category.vocabulary" value={score.vocabulary} />
        <ScoreRow labelKey="writing.essays.score.category.length" value={score.length} />
        <ScoreRow labelKey="writing.essays.score.category.complexity" value={score.complexity} />
        <ScoreRow labelKey="writing.essays.score.category.relevance" value={score.relevance} />
        <ScoreRow labelKey="writing.essays.score.category.independence" value={score.independence} />
      </div>

      {/* Statistics grid */}
      <div className="grid grid-cols-3 gap-2.5 md:grid-cols-6">
        <Stat label={t('writing.essays.score.stat.words')} value={wordCount} />
        <Stat label={t('writing.essays.score.stat.grammar')} value={grammarIssues} />
        <Stat label={t('writing.essays.score.stat.vocabStyle')} value={vocabIssues} />
        <Stat label={t('writing.essays.score.stat.hints')} value={usedHints} />
        <Stat label={t('writing.essays.score.stat.translations')} value={usedTranslations} />
        <Stat label={t('writing.essays.score.stat.synonyms')} value={usedSynonyms} />
      </div>
    </div>
  );
};
