/* 2-column grid of the 4 Reading mode cards — web port of the ReadingView
   mode grid. Uses the shared PracticeModeCard: iOS's ReadingModeCardView has
   geometry identical to the other three modules' mode cards. */
import { useTranslation } from 'react-i18next';

import { PracticeModeCard } from '@/components/practice/PracticeModeCard';
import { READING_MENU_ITEMS, type ReadingModeId } from '@/lib/readingTypes';

interface ReadingMenuGridProps {
  onSelect: (mode: ReadingModeId) => void;
}

export const ReadingMenuGrid = ({ onSelect }: ReadingMenuGridProps) => {
  const { t } = useTranslation();
  const comingSoon = t('reading.menu.comingSoon');

  return (
    <div className="grid gap-(--spacing-mode-grid-gap) sm:grid-cols-2">
      {READING_MENU_ITEMS.map((item) => (
        <PracticeModeCard
          key={item.id}
          title={t(item.titleKey)}
          subtitle={t(item.subtitleKey)}
          iconSystemName={item.iconSystemName}
          accentColor={item.accentColor}
          blobColor={item.blobColor}
          disabled={!item.enabled}
          comingSoonLabel={item.enabled ? undefined : comingSoon}
          onClick={item.enabled ? () => onSelect(item.id) : undefined}
        />
      ))}
    </div>
  );
};
