/* Displays a GeneratedEssayTask: title, task text, CEFR badge, estimated time,
   word range, 3 quick tips. Blob decoration. Ports EssayTopicCardView. */
import { useTranslation } from 'react-i18next';

import { StatBlobShape } from '@/components/home/blobs';
import type { GeneratedEssayTask } from '@/lib/essayTypes';

interface EssayTopicCardProps {
  task: GeneratedEssayTask;
}

export const EssayTopicCard = ({ task }: EssayTopicCardProps) => {
  const { t } = useTranslation();
  return (
    <div className="relative w-full overflow-hidden rounded-[26px] border border-white/95 bg-(--color-fc-card-bg) p-5 shadow-[0_6px_14px_rgba(0,0,0,0.055)] md:rounded-[32px] md:p-7">
      <StatBlobShape
        color="var(--color-fc-soft-blue)"
        opacity={0.7}
        className="pointer-events-none absolute -top-4 -right-4 h-[80px] w-[100px] md:h-[100px] md:w-[130px]"
      />

      <div className="relative flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-(--color-primary-blue) px-3 py-1 text-[12px] font-bold text-white md:text-[13px]">
            {task.detectedLevel}
          </span>
          <span className="text-[13px] font-semibold text-(--color-fc-text) md:text-[14px]">
            {t('writing.essays.task.time', { count: task.estimatedTimeMinutes })}
          </span>
          <span
            aria-hidden
            className="text-[13px] font-semibold text-(--color-fc-muted) md:text-[14px]"
          >
            ·
          </span>
          <span className="text-[13px] font-semibold text-(--color-fc-text) md:text-[14px]">
            {t('writing.essays.task.wordRange', {
              min: task.wordLimitMin,
              max: task.wordLimitMax,
            })}
          </span>
        </div>

        <h3 className="text-[22px] font-extrabold leading-tight text-(--color-fc-title) md:text-[28px]">
          {task.title}
        </h3>

        <p className="text-[15px] font-medium leading-relaxed text-(--color-fc-text) md:text-[16px]">
          {task.task}
        </p>

        {task.quickTips.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-(--color-fc-muted) md:text-[13px]">
              {t('writing.essays.task.quickTips')}
            </span>
            <div className="flex flex-wrap gap-2">
              {task.quickTips.map((tip, i) => (
                <span
                  key={i}
                  className="rounded-full bg-white/90 px-3 py-1 text-[12px] font-semibold text-(--color-primary-blue-dark) shadow-[0_2px_6px_rgba(0,0,0,0.04)] md:text-[13px]"
                >
                  {tip}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
