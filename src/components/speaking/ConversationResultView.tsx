/* Speaking result — web port of ConversationResultView: overall score,
   metric cards (4 or 7 for debate), correction cards, transcript. Shared by
   AI Conversation, Free Speaking, Describe Picture and Debate. */
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
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

const MetricCard = ({ metric, accent }: { metric: SpeakingFeedbackMetric; accent: string }) => (
  <div className="flex flex-col gap-1 rounded-2xl border border-white bg-white/95 p-4 shadow-[0_4px_10px_rgba(0,0,0,0.045)]">
    <div className="flex items-center gap-2">
      <Icon name={metric.iconName} className="size-[15px]" style={{ color: accent }} />
      <span className="text-[13px] font-bold text-(--color-primary-blue-dark)">{metric.title}</span>
      <span className="ml-auto text-[15px] font-extrabold" style={{ color: accent }}>
        {metric.score}
      </span>
    </div>
    <span className="text-[11px] font-bold uppercase tracking-wide text-(--color-muted-text)">
      {metric.rating}
    </span>
    <span className="text-[12px] font-medium text-(--color-text-secondary)">{metric.explanation}</span>
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
  const metrics = [feedback.grammar, feedback.pronunciation, feedback.vocabulary, feedback.fluency, ...feedback.extraMetrics];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-2">
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

      {/* Overall score */}
      <div className="flex flex-col items-center gap-1 rounded-3xl border border-white bg-white/95 p-6 shadow-[0_4px_10px_rgba(0,0,0,0.045)]">
        <span className="text-[44px] font-extrabold text-(--color-primary-blue-dark)">
          {feedback.overallScore}
        </span>
        <span className="text-[13px] font-semibold text-(--color-text-secondary)">
          {t('speaking.result.overall')}
        </span>
        {feedback.summary && (
          <p className="mt-1 text-center text-[14px] font-medium text-(--color-primary-blue-dark)">
            {feedback.summary}
          </p>
        )}
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {metrics.map((metric) => (
          <MetricCard key={metric.title} metric={metric} accent={accentColor} />
        ))}
      </div>

      {/* Corrections */}
      {feedback.corrections.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-[13px] font-bold uppercase tracking-wide text-(--color-cs-red)">
            {t('speaking.result.corrections')}
          </h3>
          {feedback.corrections.map((c, i) => (
            <div key={i} className="rounded-2xl border border-(--color-cs-red)/25 bg-white px-4 py-3">
              <p className="text-[13px] font-medium text-(--color-cs-red) line-through">{c.originalText}</p>
              <p className="text-[14px] font-semibold text-[#15803D]">{c.correctedText}</p>
              {c.explanation && (
                <p className="mt-1 text-[12px] font-medium text-(--color-text-secondary)">{c.explanation}</p>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Transcript */}
      {feedback.transcript && (
        <details className="rounded-2xl border border-(--color-auth-field-border) bg-white px-4 py-3">
          <summary className="cursor-pointer text-[13px] font-bold text-(--color-primary-blue-dark)">
            {t('speaking.result.transcript')}
          </summary>
          <p className="mt-2 whitespace-pre-line text-[13px] font-medium text-(--color-text-secondary)">
            {feedback.transcript}
          </p>
        </details>
      )}

      <div className="flex flex-col gap-2 md:flex-row">
        {onPracticeAgain && (
          <button
            type="button"
            onClick={onPracticeAgain}
            className="h-12 flex-1 rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98]"
          >
            {t('speaking.result.practiceAgain')}
          </button>
        )}
        <button
          type="button"
          onClick={onBack}
          className="h-12 flex-1 rounded-2xl border border-(--color-auth-field-border) bg-white text-[15px] font-semibold text-(--color-cs-text-muted) transition-colors hover:bg-black/[0.03]"
        >
          {t('speaking.result.back')}
        </button>
      </div>
    </div>
  );
};
