/* Generated essay task card — port of EssayTopicCardView: white card, header
   with a purple→blue gradient level badge + title + "N min" and a round
   refresh button, a "Task" label + task text, a word-range pill, and
   light-purple tip chips. */
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import type { GeneratedEssayTask } from '@/lib/essayTypes';

interface EssayTopicCardProps {
  task: GeneratedEssayTask;
  /** Asks for another task (iOS onRefresh). Hidden when omitted. */
  onRefresh?: () => void;
  isRefreshing?: boolean;
  errorMessage?: string | null;
}

export const EssayTopicCard = ({
  task,
  onRefresh,
  isRefreshing = false,
  errorMessage,
}: EssayTopicCardProps) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3.5 rounded-3xl bg-(--color-surface)/94 p-[18px] shadow-[0_10px_18px_rgba(0,0,0,0.055)] md:gap-[18px] md:p-[22px]">
      {/* Header — level badge + title + estimated minutes + refresh. */}
      <div className="flex items-start gap-3">
        <span className="shrink-0 rounded-full bg-[linear-gradient(135deg,#8563ff,#5c94ff)] px-2.5 py-[7px] text-[11px] font-bold leading-none text-white md:text-[13px]">
          {task.detectedLevel}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
          <span className="text-[19px] font-bold leading-tight text-(--color-primary-blue-dark) md:text-[22px]">
            {task.title}
          </span>
          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-(--color-text-secondary) md:text-[13px]">
            <Icon name="clock" className="size-[13px]" />
            {t('writing.essays.task.time', { count: task.estimatedTimeMinutes })}
          </span>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label={t('writing.essays.suggested.regenerate')}
            title={t('writing.essays.suggested.regenerate')}
            className="grid size-[34px] shrink-0 place-items-center rounded-full bg-(--color-primary-blue)/8 text-(--color-primary-blue) transition-colors hover:bg-(--color-primary-blue)/14 disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-home-brand) md:size-[38px]"
          >
            <Icon
              name="arrow.triangle.2.circlepath"
              className={`size-[14px] md:size-[16px] ${isRefreshing ? 'animate-spin' : ''}`}
            />
          </button>
        )}
      </div>

      {errorMessage && (
        <p
          role="alert"
          className="w-fit rounded-[14px] bg-(--color-primary-blue)/6 px-3 py-2 text-[12px] font-semibold text-(--color-text-secondary) md:text-[13px]"
        >
          {errorMessage}
        </p>
      )}

      {/* Task */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[12px] font-bold text-(--color-primary-blue) md:text-[14px]">
          {t('writing.essays.task.taskLabel')}
        </span>
        <p className="text-[14px] font-medium leading-relaxed text-(--color-text-secondary) md:text-[16px]">
          {task.task}
        </p>
      </div>

      {/* Word range pill */}
      <span className="flex w-fit items-center gap-2 rounded-full bg-(--color-primary-blue)/8 px-3 py-2 text-[12px] font-semibold text-(--color-primary-blue) md:text-[13px]">
        <Icon name="text.word.spacing" className="size-[13px]" />
        {t('writing.essays.task.wordRange', { min: task.wordLimitMin, max: task.wordLimitMax })}
      </span>

      {/* Tip chips */}
      {task.quickTips.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-2 md:grid-cols-[repeat(auto-fill,minmax(140px,1fr))]">
          {task.quickTips.map((tip, i) => (
            <span
              key={i}
              title={tip}
              className="truncate rounded-full bg-(--color-soft-lavender) px-[11px] py-[7px] text-[11px] font-semibold text-(--color-primary-blue-dark) md:text-[13px]"
            >
              {tip}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

/* Placeholder shown while the first suggested task is being generated, so
   the page keeps the card's shape instead of jumping (iOS shows a topic card
   from the first frame). */
export const EssayTopicCardSkeleton = () => (
  <div
    aria-busy="true"
    className="flex flex-col gap-3.5 rounded-3xl bg-(--color-surface)/94 p-[18px] shadow-[0_10px_18px_rgba(0,0,0,0.055)] md:gap-[18px] md:p-[22px]"
  >
    <div className="flex items-start gap-3">
      <span className="h-[25px] w-10 shrink-0 animate-pulse rounded-full bg-(--color-soft-lavender)" />
      <div className="flex flex-1 flex-col gap-2">
        <span className="h-5 w-3/5 animate-pulse rounded-full bg-(--color-primary-blue)/8" />
        <span className="h-3 w-16 animate-pulse rounded-full bg-(--color-primary-blue)/8" />
      </div>
      <span className="size-[34px] shrink-0 animate-pulse rounded-full bg-(--color-primary-blue)/8 md:size-[38px]" />
    </div>
    <span className="h-3 w-full animate-pulse rounded-full bg-(--color-primary-blue)/6" />
    <span className="h-3 w-4/5 animate-pulse rounded-full bg-(--color-primary-blue)/6" />
    <span className="h-8 w-32 animate-pulse rounded-full bg-(--color-primary-blue)/8" />
  </div>
);
