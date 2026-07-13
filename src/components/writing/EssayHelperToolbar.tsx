/* Helper-toolbar row: Translate + Synonym buttons, each showing the number
   of uses left for the current CEFR difficulty. Disabled at 0 (Native) or
   when the budget is spent. Clicking opens the corresponding modal.
   Web port of EssayHelperToolbarView (Hint + Sets buttons handled elsewhere). */
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import {
  SYNONYM_LIMIT,
  TRANSLATION_LIMIT,
  type EssayDifficulty,
} from '@/lib/essayTypes';

interface EssayHelperToolbarProps {
  difficulty: EssayDifficulty;
  usedTranslations: number;
  usedSynonyms: number;
  onTranslate: () => void;
  onSynonym: () => void;
}

interface ToolButtonProps {
  labelKey: string;
  iconName: string;
  limit: number;
  used: number;
  onClick: () => void;
}

const ToolButton = ({ labelKey, iconName, limit, used, onClick }: ToolButtonProps) => {
  const { t } = useTranslation();
  const remaining = Math.max(limit - used, 0);
  const disabled = limit === 0 || remaining === 0;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex flex-1 flex-col items-center gap-1.5 rounded-2xl border border-(--color-primary-blue)/12 bg-(--color-primary-blue)/8 px-3 py-3 text-center transition-transform hover:-translate-y-0.5 disabled:opacity-55 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-(--color-home-brand)"
    >
      <Icon name={iconName} className="size-[20px] text-(--color-primary-blue)" />
      <span className="text-[14px] font-bold text-(--color-primary-blue) md:text-[15px]">
        {t(labelKey)}
      </span>
      <span className="text-[12px] font-semibold text-(--color-text-secondary) md:text-[13px]">
        {limit === 0
          ? t('writing.essays.helper.notAvailable')
          : t('writing.essays.helper.remaining', { remaining })}
      </span>
    </button>
  );
};

export const EssayHelperToolbar = ({
  difficulty,
  usedTranslations,
  usedSynonyms,
  onTranslate,
  onSynonym,
}: EssayHelperToolbarProps) => (
  <div className="flex gap-3">
    <ToolButton
      labelKey="writing.essays.helper.translate"
      iconName="character.book.closed.fill"
      limit={TRANSLATION_LIMIT[difficulty]}
      used={usedTranslations}
      onClick={onTranslate}
    />
    <ToolButton
      labelKey="writing.essays.helper.synonym"
      iconName="textformat.abc.dottedunderline"
      limit={SYNONYM_LIMIT[difficulty]}
      used={usedSynonyms}
      onClick={onSynonym}
    />
  </div>
);
