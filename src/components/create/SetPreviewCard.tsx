/* Live preview of the set being created — reflects the chosen title, icon and
   color. Mirrors the iOS CreateSetPreviewCardView idea, web-styled. */
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import { resolveIcon } from '@/lib/iconSuggester';
import { themeForColor, type SetColorId } from '@/lib/setColors';

interface SetPreviewCardProps {
  title: string;
  iconName: string;
  colorId: SetColorId;
  cardCount: number;
}

export const SetPreviewCard = ({ title, iconName, colorId, cardCount }: SetPreviewCardProps) => {
  const { t } = useTranslation();
  const theme = themeForColor(colorId);
  const shownIcon = resolveIcon(iconName, title);

  return (
    <div
      className="flex items-center gap-4 rounded-3xl border border-white/80 p-5 shadow-[0_6px_16px_rgba(0,0,0,0.04)]"
      style={{ background: theme.bg }}
    >
      <span className="grid size-14 shrink-0 place-items-center rounded-2xl" style={{ background: theme.accent }}>
        <Icon name={shownIcon} className="size-7 text-white" />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-[18px] font-bold text-(--color-cs-dark-text)">
          {title.trim() || t('createSet.previewPlaceholder')}
        </span>
        <span className="text-[14px] font-medium text-(--color-cs-text-muted)">
          {t('sets.cardCount', { count: cardCount })}
        </span>
      </div>
    </div>
  );
};
