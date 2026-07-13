/* "Get hint" button — shows remaining count for the current CEFR difficulty.
   Disabled when the limit is 0 (Native) or fully spent, or while a request
   is in flight. */
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import { HINTS_LIMIT, type EssayDifficulty } from '@/lib/essayTypes';

interface EssayHintButtonProps {
  difficulty: EssayDifficulty;
  hintsUsedCount: number;
  isRequestingHint: boolean;
  onRequest: () => void;
}

export const EssayHintButton = ({
  difficulty,
  hintsUsedCount,
  isRequestingHint,
  onRequest,
}: EssayHintButtonProps) => {
  const { t } = useTranslation();
  const limit = HINTS_LIMIT[difficulty];
  const remaining = Math.max(limit - hintsUsedCount, 0);
  const noLimit = limit === 0;
  const noneLeft = !noLimit && remaining === 0;
  const disabled = noLimit || noneLeft || isRequestingHint;

  let subtitle: string;
  if (noLimit) subtitle = t('writing.essays.hint.notAvailable');
  else if (noneLeft) subtitle = t('writing.essays.hint.noneLeft');
  else subtitle = t('writing.essays.hint.remaining', { remaining, limit });

  return (
    <button
      type="button"
      onClick={onRequest}
      disabled={disabled}
      className="flex h-11 items-center gap-2 rounded-2xl border border-(--color-auth-field-border) bg-white px-4 text-[14px] font-semibold text-(--color-primary-blue-dark) shadow-[0_4px_10px_rgba(0,0,0,0.045)] transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0 focus-visible:outline-none md:h-12 md:px-5 md:text-[15px]"
    >
      <Icon name="sparkles" className="size-[16px] text-(--color-primary-blue)" />
      <span>
        {isRequestingHint ? t('writing.essays.hint.generating') : t('writing.essays.hint.button')}
      </span>
      <span className="text-[12px] font-medium text-(--color-text-secondary) md:text-[13px]">
        {subtitle}
      </span>
    </button>
  );
};
