/* "Hint" tile of the helper toolbar (iOS EssayHelperToolbarView's first
   button) — shows the remaining count for the current CEFR difficulty.
   Disabled when the limit is 0 (Native) or fully spent, or while a request
   is in flight. */
import { useTranslation } from 'react-i18next';

import { EssayToolTile } from './EssayHelperToolbar';
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

  let subtitle: string;
  if (noLimit) subtitle = t('writing.essays.hint.notAvailable');
  else if (noneLeft) subtitle = t('writing.essays.hint.noneLeft');
  else subtitle = t('writing.essays.hint.remaining', { remaining, limit });

  return (
    <EssayToolTile
      icon="lightbulb.fill"
      title={isRequestingHint ? t('writing.essays.hint.generating') : t('writing.essays.hint.button')}
      subtitle={subtitle}
      enabled={!noLimit && !noneLeft}
      busy={isRequestingHint}
      onClick={onRequest}
    />
  );
};
