/* Hard-mode countdown bar — thin gradient capsule that drains left→right,
   plus a seconds-remaining label. Web port of WriteWordsCountdownTimerView. */
import { useTranslation } from 'react-i18next';

interface WriteWordsTimerBarProps {
  /** 0..1 remaining fraction. */
  progress: number;
  secondsRemaining: number;
}

export const WriteWordsTimerBar = ({ progress, secondsRemaining }: WriteWordsTimerBarProps) => {
  const { t } = useTranslation();
  const clamped = Math.max(0, Math.min(progress, 1));
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/72">
        <div
          className="h-full rounded-full bg-linear-to-r from-(--color-primary-blue) to-[#7363FF] transition-[width] duration-75 ease-linear"
          style={{ width: `${clamped * 100}%` }}
        />
      </div>
      <span className="w-9 text-right text-[13px] font-bold tabular-nums text-(--color-primary-blue-dark) md:text-[14px]">
        {t('writing.writeWords.seconds', { count: secondsRemaining })}
      </span>
    </div>
  );
};
