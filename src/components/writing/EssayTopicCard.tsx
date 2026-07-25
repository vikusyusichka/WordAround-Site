/* Generated essay task card — port of EssayTopicCardView: plain white card,
   header with a gradient level badge + title + "N min", a "Task" label + task
   text, a word-range pill, and light-purple tip chips. (The web regenerates a
   topic from the mode picker, so the in-card refresh button is omitted.) */
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import type { GeneratedEssayTask } from '@/lib/essayTypes';

interface EssayTopicCardProps {
  task: GeneratedEssayTask;
}

export const EssayTopicCard = ({ task }: EssayTopicCardProps) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4 rounded-[22px] bg-white/95 p-5 shadow-[0_8px_14px_rgba(0,0,0,0.055)] md:p-6">
      {/* Header — gradient level badge + title + estimated minutes. */}
      <div className="flex items-start gap-3">
        <span className="shrink-0 rounded-full bg-linear-to-br from-[#855CFF] to-[#5C94FF] px-2.5 py-[7px] text-[12px] font-bold text-white">
          {task.detectedLevel}
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-[20px] font-bold leading-tight text-(--color-primary-blue-dark) md:text-[24px]">
            {task.title}
          </span>
          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-(--color-text-secondary) md:text-[14px]">
            <Icon name="clock.fill" className="size-[13px]" />
            {t('writing.essays.task.time', { count: task.estimatedTimeMinutes })}
          </span>
        </div>
      </div>

      {/* Task */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-bold text-(--color-primary-blue)">
          {t('writing.essays.task.taskLabel')}
        </span>
        <p className="text-[15px] font-medium leading-relaxed text-(--color-text-secondary) md:text-[16px]">
          {task.task}
        </p>
      </div>

      {/* Word range pill */}
      <span className="flex w-fit items-center gap-1.5 rounded-full bg-(--color-primary-blue)/8 px-3 py-2 text-[13px] font-semibold text-(--color-primary-blue) md:text-[14px]">
        <Icon name="text.word.spacing" className="size-[13px]" />
        {t('writing.essays.task.wordRange', { min: task.wordLimitMin, max: task.wordLimitMax })}
      </span>

      {/* Tip chips */}
      {task.quickTips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {task.quickTips.map((tip, i) => (
            <span
              key={i}
              className="rounded-full bg-[#EDEBFF] px-3 py-[7px] text-[12px] font-semibold text-(--color-primary-blue-dark) md:text-[13px]"
            >
              {tip}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
