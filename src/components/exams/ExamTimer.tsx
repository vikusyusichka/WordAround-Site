/* The exam clock. A countdown to a fixed deadline (a timestamp, not a
   ticking counter), so a slow tab, a sleep or a reload cannot give the
   candidate extra time. Past the deadline it counts the overtime in red —
   practice mode lets you finish, the mock exam submits instead. */
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import { formatClock } from '@/lib/exams/display';

interface ExamTimerProps {
  secondsLeft: number;
  totalSeconds: number;
  label?: string;
}

export const ExamTimer = ({ secondsLeft, totalSeconds, label }: ExamTimerProps) => {
  const { t } = useTranslation();
  const over = secondsLeft < 0;
  const low = !over && secondsLeft <= 60;
  const fraction = totalSeconds > 0 ? Math.max(0, Math.min(secondsLeft / totalSeconds, 1)) : 0;
  const tone = over || low ? 'var(--color-profile-danger)' : 'var(--color-primary-blue)';
  return (
    <div
      role="timer"
      aria-label={label ?? t('exams.timer.label')}
      className="flex min-w-[150px] items-center gap-3 rounded-full border border-(--color-surface-border) bg-(--color-surface-card) px-4 py-2 shadow-[0_2px_6px_var(--shadow-color-fc)]"
    >
      <Icon name="clock.fill" className="size-4 shrink-0" style={{ color: tone }} />
      <div className="flex flex-1 flex-col gap-1">
        <span className="text-[15px] font-bold tabular-nums" style={{ color: tone }}>
          {over ? t('exams.timer.over', { time: formatClock(secondsLeft) }) : formatClock(secondsLeft)}
        </span>
        <div className="h-1 overflow-hidden rounded-full bg-(--color-surface-border)">
          <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${fraction * 100}%`, background: tone }} />
        </div>
      </div>
    </div>
  );
};
