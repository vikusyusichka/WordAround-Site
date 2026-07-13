/* "Add block" — a button that expands an inline grid of the available block
   types. Picking one appends a block and collapses. */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from '@phosphor-icons/react';

import { Icon } from '@/components/primitives/Icon';
import { BLOCK_TYPE_ICON, EDITOR_BLOCK_TYPES } from '@/lib/grammarMeta';
import type { GrammarBlockType } from '@/lib/models';

interface AddBlockMenuProps {
  onAdd: (type: GrammarBlockType) => void;
}

export const AddBlockMenu = ({ onAdd }: AddBlockMenuProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-dashed border-(--color-auth-field-border) bg-white/60 text-[14px] font-semibold text-(--color-primary-blue) transition-colors hover:bg-white focus-visible:outline-none"
      >
        <Plus size={16} weight="bold" />
        {t('writing.grammar.block.addBlock')}
      </button>

      {open && (
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white bg-white/95 p-2 shadow-[0_4px_10px_rgba(0,0,0,0.045)] sm:grid-cols-4">
          {EDITOR_BLOCK_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                onAdd(type);
                setOpen(false);
              }}
              className="flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-center transition-colors hover:bg-(--color-goal-bg) focus-visible:outline-none"
            >
              <Icon name={BLOCK_TYPE_ICON[type]} className="size-5 text-(--color-primary-blue)" />
              <span className="text-[12px] font-semibold text-(--color-primary-blue-dark)">
                {t(`writing.grammar.block.${type}`)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
