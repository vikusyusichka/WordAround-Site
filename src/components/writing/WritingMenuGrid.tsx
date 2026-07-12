/* 2-column grid of the 3 Writing menu cards. Only writeFromSets is enabled in
   4A; Essays / GrammarNotes render with a "Coming soon" chip. */
import { useTranslation } from 'react-i18next';

import { WritingMenuCard } from './WritingMenuCard';
import { WRITING_MENU_ITEMS, type WritingMenuAction } from '@/lib/writingTypes';

interface WritingMenuGridProps {
  onSelect: (action: WritingMenuAction) => void;
}

export const WritingMenuGrid = ({ onSelect }: WritingMenuGridProps) => {
  const { t } = useTranslation();
  const comingSoon = t('writing.menu.comingSoon');

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {WRITING_MENU_ITEMS.map((item) => (
        <WritingMenuCard
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
