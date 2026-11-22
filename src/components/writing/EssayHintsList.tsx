/* The latest AI hint, shown inside the "Your essay" card — port of the
   shownHintItems block in iOS EssayInputSectionView: category in bold, a
   level capsule, then the hint text. iOS keeps only the newest hint on
   screen (each new one replaces the last); earlier ones still count towards
   the budget and are sent to the AI so it does not repeat itself. */
import { useTranslation } from 'react-i18next';

import type { EssayDifficulty, EssayGeneratedHint } from '@/lib/essayTypes';

interface EssayHintsListProps {
  hints: EssayGeneratedHint[];
  level?: EssayDifficulty;
}

export const EssayHintsList = ({ hints, level }: EssayHintsListProps) => {
  const { t } = useTranslation();
  const latest = hints[hints.length - 1];
  if (!latest) return null;

  return (
    <div className="flex flex-col gap-[5px] rounded-2xl bg-(--color-surface)/82 p-3 md:p-3.5">
      <div className="flex items-center gap-2">
        <span className="text-[14px] font-bold text-(--color-primary-blue-dark) md:text-[15px]">
          {t(`writing.essays.hint.category.${latest.category}`)}
        </span>
        {level && (
          <span className="rounded-full bg-(--color-primary-blue)/8 px-2 py-1 text-[11px] font-bold leading-none text-(--color-primary-blue) md:text-[12px]">
            {level}
          </span>
        )}
      </div>
      <p className="text-[12px] font-medium leading-relaxed text-(--color-text-secondary) md:text-[13px]">
        {latest.text}
      </p>
    </div>
  );
};
