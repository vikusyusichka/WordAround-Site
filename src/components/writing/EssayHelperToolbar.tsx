/* Helper-toolbar row — port of iOS EssayHelperToolbarView: equal pale-blue
   tiles (icon, title, "N left"). The Hint tile is passed in as children so
   it sits first, as on iOS; Translate + Synonym live here; Sets comes last via trailing. A tile goes grey
   at 0 (Native) or when its budget is spent. */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import {
  SYNONYM_LIMIT,
  TRANSLATION_LIMIT,
  type EssayDifficulty,
} from '@/lib/essayTypes';

interface EssayToolTileProps {
  icon: string;
  title: string;
  subtitle: string;
  enabled: boolean;
  busy?: boolean;
  onClick: () => void;
}

export const EssayToolTile = ({
  icon,
  title,
  subtitle,
  enabled,
  busy = false,
  onClick,
}: EssayToolTileProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={!enabled || busy}
    className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[15px] border px-1.5 py-2.5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-(--color-home-brand) md:gap-1.5 md:rounded-[18px] md:py-[13px] ${
      enabled
        ? 'border-(--color-primary-blue)/12 bg-(--color-primary-blue)/8 text-(--color-primary-blue) hover:bg-(--color-primary-blue)/12'
        : 'border-(--color-primary-blue)/4 bg-(--color-primary-blue)/4 text-(--color-text-secondary)/55 opacity-60'
    }`}
  >
    <Icon name={icon} className={`size-[15px] md:size-[18px] ${busy ? 'animate-pulse' : ''}`} />
    <span className="flex w-full flex-col gap-0.5">
      <span className="truncate text-[11px] font-bold md:text-[13px]">{title}</span>
      <span className="text-[9px] font-bold leading-tight md:text-[11px]">{subtitle}</span>
    </span>
  </button>
);

interface EssayHelperToolbarProps {
  difficulty: EssayDifficulty;
  usedTranslations: number;
  usedSynonyms: number;
  onTranslate: () => void;
  onSynonym: () => void;
  /** Tiles placed before Translate / Synonym (the Hint tile). */
  children?: ReactNode;
  /** Tiles placed after them (the Sets tile). */
  trailing?: ReactNode;
}

export const EssayHelperToolbar = ({
  difficulty,
  usedTranslations,
  usedSynonyms,
  onTranslate,
  onSynonym,
  children,
  trailing,
}: EssayHelperToolbarProps) => {
  const { t } = useTranslation();
  const tiles = [
    {
      key: 'translate',
      title: t('writing.essays.helper.translate'),
      icon: 'character.book.closed.fill',
      limit: TRANSLATION_LIMIT[difficulty],
      used: usedTranslations,
      onClick: onTranslate,
    },
    {
      key: 'synonym',
      title: t('writing.essays.helper.synonym'),
      icon: 'textformat.abc.dottedunderline',
      limit: SYNONYM_LIMIT[difficulty],
      used: usedSynonyms,
      onClick: onSynonym,
    },
  ];

  return (
    <div className="flex gap-[7px] md:gap-2.5">
      {children}
      {tiles.map((tile) => {
        const remaining = Math.max(tile.limit - tile.used, 0);
        return (
          <EssayToolTile
            key={tile.key}
            icon={tile.icon}
            title={tile.title}
            subtitle={
              tile.limit === 0
                ? t('writing.essays.helper.notAvailable')
                : t('writing.essays.helper.remaining', { remaining })
            }
            enabled={tile.limit > 0 && remaining > 0}
            onClick={tile.onClick}
          />
        );
      })}
      {trailing}
    </div>
  );
};
