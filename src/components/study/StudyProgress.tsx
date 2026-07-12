/* Round progress bar + answered/total counter. */
interface StudyProgressProps {
  answered: number;
  total: number;
  progress: number;
  accent: string;
}

export const StudyProgress = ({ answered, total, progress, accent }: StudyProgressProps) => (
  <div className="mx-auto flex w-full max-w-2xl items-center gap-3">
    <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/[0.06]">
      <div
        className="h-full rounded-full transition-[width] duration-300"
        style={{ width: `${Math.round(progress * 100)}%`, background: accent }}
      />
    </div>
    <span className="shrink-0 text-[13px] font-semibold text-(--color-cs-text-muted)">
      {answered} / {total}
    </span>
  </div>
);
