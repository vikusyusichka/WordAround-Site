/* Folder card — web-native, themed by the folder's color. Click opens the
   folder; a delete button appears on hover/focus. Mirrors the iOS FolderCardView
   design language (colored soft card, folder glyph, set count). */
import { useTranslation } from 'react-i18next';
import { Trash } from '@phosphor-icons/react';

import { Icon } from '@/components/primitives/Icon';
import { themeForHex } from '@/lib/setColors';
import type { Folder } from '@/lib/models';

interface FolderCardProps {
  folder: Folder;
  setCount: number;
  onOpen: () => void;
  onDelete: () => void;
}

export const FolderCard = ({ folder, setCount, onOpen, onDelete }: FolderCardProps) => {
  const { t } = useTranslation();
  const theme = themeForHex(folder.colorHex);

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-4 rounded-3xl border border-white/80 p-5 text-left shadow-[0_6px_16px_rgba(0,0,0,0.04)] transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:outline-none"
        style={{ background: theme.bg }}
      >
        <span
          className="grid size-14 shrink-0 place-items-center rounded-2xl"
          style={{ background: theme.accent }}
        >
          <Icon name="folder.fill" className="size-7 text-white" />
        </span>
        <span className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-[18px] font-bold text-(--color-cs-dark-text)">
            {folder.title}
          </span>
          <span className="truncate text-[14px] font-medium text-(--color-cs-text-muted)">
            {folder.description || t('folders.setCount', { count: setCount })}
          </span>
        </span>
      </button>

      <button
        type="button"
        onClick={onDelete}
        aria-label={t('folders.delete')}
        className="absolute top-3 right-3 grid size-8 place-items-center rounded-full bg-white/90 text-(--color-cs-red) opacity-0 shadow-[0_2px_6px_rgba(0,0,0,0.08)] transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:outline-none"
      >
        <Trash size={16} weight="bold" />
      </button>
    </div>
  );
};
