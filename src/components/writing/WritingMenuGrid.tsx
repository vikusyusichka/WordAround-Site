/* Grid of the Writing menu cards (write-from-sets + essays). Notes moved out
   of Writing and now live under Library ▸ Notes in the sidebar. Disabled items
   would render with a "Coming soon" chip. */
import { useTranslation } from 'react-i18next';

import { PracticeModeCard } from '@/components/practice/PracticeModeCard';
import { WRITING_MENU_ITEMS, type WritingMenuAction } from '@/lib/writingTypes';

interface WritingMenuGridProps {
  onSelect: (action: WritingMenuAction) => void;
}

export const WritingMenuGrid = ({ onSelect }: WritingMenuGridProps) => {
  const { t } = useTranslation();
  const comingSoon = t('writing.menu.comingSoon');

  return (
    <div className="grid gap-(--spacing-mode-grid-gap) sm:grid-cols-2">
      {WRITING_MENU_ITEMS.map((item) => (
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
