/* Speaking result — port of ConversationResultView + ConversationScoreCardView
   + ConversationMetricCardView. Overall score is a blue progress ring in a
   horizontal card; each metric card carries its OWN colour (grammar blue,
   pronunciation green, vocabulary orange, fluency purple, debate metrics pink/
   purple) with a decorative blob, icon circle, title and rating. Shared by AI
   Conversation, Free Speaking, Describe Picture and Debate. */
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import { StatBlobShape } from '@/components/home/blobs';
import type { SpeakingFeedback, SpeakingFeedbackMetric } from '@/lib/speakingTypes';

interface ConversationResultViewProps {
  feedback: SpeakingFeedback;
  subtitle: string;
  chips: string[];
  accentColor: string;
  fallbackReason: string | null;
  onPracticeAgain?: () => void;
  onBack: () => void;
}

const BLUE = '#2b5cfa';

/* Per-metric colours, ported from ConversationResultView.colours(for:). The
   first four are fixed slots; debate extras are matched by title. */
const SLOT_COLORS: { accent: string; blob: string }[] = [
  { accent: '#2b5cfa', blob: '#d6e0fa' }, // grammar
  { accent: '#29ba66', blob: '#d1e3d9' }, // pronunciation
  { accent: '#f7a310', blob: '#f2dba1' }, // vocabulary
  { accent: '#8a5ce0', blob: '#e6d6fa' }, // fluency
];

const EXTRA_COLORS: Record<string, { accent: string; blob: string }> = {
  'argument quality': { accent: '#ed6699', blob: '#ebd1de' },
  persuasiveness: { accent: '#d94785', blob: '#ebd1de' },
  structure: { accent: '#9e4da8', blob: '#ebd6f2' },
};

const colorForMetric = (metric: SpeakingFeedbackMetric, index: number) => {
  if (index < SLOT_COLORS.length) return SLOT_COLORS[index];
  return EXTRA_COLORS[metric.title.trim().toLowerCase()] ?? SLOT_COLORS[0];
};

const MetricCard = ({
  metric,
  colors,
}: {
  metric: SpeakingFeedbackMetric;
  colors: { accent: string; blob: string };
}) => (
  <div className="relative overflow-hidden rounded-[18px] border border-white/90 bg-white shadow-[0_4px_10px_rgba(0,0,0,0.05)]">
    <div className="pointer-events-none absolute -bottom-1.5 -right-1.5 h-12 w-[60px]">
      <StatBlobShape color={colors.blob} opacity={0.65} className="size-full" />
    </div>
    <div className="relative flex items-center gap-3 p-3.5">
      <span
        className="grid size-11 shrink-0 place-items-center rounded-full"
        style={{ background: `color-mix(in srgb, ${colors.accent} 12%, transparent)` }}
      >
        <Icon name={metric.iconName} className="size-5" style={{ color: colors.accent }} />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-[15px] font-bold text-(--color-primary-blue-dark)">{metric.title}</span>
        <span className="text-[13px] font-semibold" style={{ color: colors.accent }}>
          {metric.rating}
        </span>
      </div>
      <span className="ml-auto text-[15px] font-extrabold" style={{ color: colors.accent }}>
        {metric.score}
      </span>
    </div>
  </div>
);

export const ConversationResultView = ({
  feedback,
  subtitle,
  chips,
  accentColor,
  fallbackReason,
  onPracticeAgain,
  onBack,
}: ConversationResultViewProps) => {
  const { t } = useTranslation();
  const metrics = [
    feedback.grammar,
    feedback.pronunciation,
    feedback.vocabulary,
    feedback.fluency,
    ...feedback.extraMetrics,
  ];
  const ringCircumference = 2 * Math.PI * 34;
  const dash = (feedback.overallScore / 100) * ringCircumference;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="grid size-14 place-items-center rounded-full" style={{ background: `${accentColor}1F` }}>
          <Icon name="mic.fill" className="size-[26px]" style={{ color: accentColor }} />
        </span>
        <h2 className="text-[22px] font-extrabold text-(--color-primary-blue-dark)">
          {t('speaking.result.title')}
        </h2>
        <p className="text-[14px] font-medium text-(--color-text-secondary)">{subtitle}</p>
        <div className="flex flex-wrap justify-center gap-1.5">
          {chips.map((chip) => (
            <span key={chip} className="rounded-full bg-(--color-goal-bg) px-2.5 py-1 text-[12px] font-bold text-(--color-text-secondary)">
              {chip}
            </span>
          ))}
        </div>
      </div>

      {fallbackReason && (
        <p className="rounded-2xl bg-[#F59E0B]/10 px-4 py-2 text-center text-[13px] font-medium text-[#B45309]">
          {fallbackReason}
        </p>
      )}

      {/* Overall score — ring + summary (ConversationScoreCardView). */}
      <div className="flex items-center gap-5 rounded-[22px] bg-white/96 p-5 shadow-[0_9px_16px_rgba(0,0,0,0.05)]">
        <div className="relative grid size-[84px] shrink-0 place-items-center">
          <svg viewBox="0 0 80 80" className="size-full -rotate-90">
            <circle cx="40" cy="40" r="34" fill="none" stroke={`${BLUE}1A`} strokeWidth="8" />
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke={BLUE}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${ringCircumference}`}
            />
          </svg>
          <span className="absolute text-[20px] font-black text-(--color-primary-blue-dark)">
            {feedback.overallScore}%
          </span>
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <span className="text-[16px] font-bold text-(--color-primary-blue-dark)">
            {t('speaking.result.overall')}
          </span>
          {feedback.summary && (
            <p className="text-[13px] font-medium leading-relaxed text-(--color-text-secondary)">
              {feedback.summary}
            </p>
          )}
        </div>
      </div>

      {/* Metric cards — each in its own colour. */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {metrics.map((metric, i) => (
          <MetricCard key={metric.title} metric={metric} colors={colorForMetric(metric, i)} />
        ))}
      </div>

      {/* Corrections */}
      {feedback.corrections.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-[22px] font-bold text-(--color-primary-blue-dark)">
            {t('speaking.result.corrections')}
          </h3>
          {feedback.corrections.map((c, i) => (
            <div key={i} className="flex flex-col gap-1 rounded-[18px] bg-white/95 p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <p className="text-[13px] font-medium text-(--color-text-secondary) line-through">{c.originalText}</p>
              <p className="text-[14px] font-semibold" style={{ color: accentColor }}>{c.correctedText}</p>
              {c.explanation && (
                <p className="text-[12px] font-medium text-(--color-muted-text)">{c.explanation}</p>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Transcript */}
      {feedback.transcript && (
        <details className="rounded-2xl bg-white/95 px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <summary className="cursor-pointer text-[13px] font-bold text-(--color-primary-blue-dark)">
            {t('speaking.result.transcript')}
          </summary>
          <p className="mt-2 whitespace-pre-line text-[13px] font-medium text-(--color-text-secondary)">
            {feedback.transcript}
          </p>
        </details>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2.5">
        {onPracticeAgain && (
          <button
            type="button"
            onClick={onPracticeAgain}
            className="flex h-[52px] items-center justify-center rounded-[18px] text-[16px] font-bold text-white transition-transform hover:brightness-105 active:scale-[0.99]"
            style={{
              background: `linear-gradient(135deg, ${accentColor}, color-mix(in srgb, ${accentColor} 70%, black))`,
              boxShadow: `0 8px 16px color-mix(in srgb, ${accentColor} 30%, transparent)`,
            }}
          >
            {t('speaking.result.practiceAgain')}
          </button>
        )}
        <button
          type="button"
          onClick={onBack}
          className="h-[52px] rounded-[18px] text-[15px] font-bold transition-colors hover:brightness-[0.98]"
          style={{ background: `color-mix(in srgb, ${accentColor} 10%, transparent)`, color: accentColor }}
        >
          {t('speaking.result.back')}
        </button>
      </div>
    </div>
  );
};
