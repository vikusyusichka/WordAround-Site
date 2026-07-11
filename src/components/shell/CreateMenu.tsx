/* Desktop "Create" control — a gradient button that opens a rounded dropdown
   listing the 5 create actions (icon + label), keyboard-operable. Self-contained
   local state. Actions are stubs until Phase 3 (see CREATE_ITEMS). */
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Plus } from '@phosphor-icons/react';

import { Icon } from '@/components/primitives/Icon';
import { CREATE_ITEMS } from '@/lib/createMenu';

interface CreateMenuProps {
  /** Phase 3 wires real create flows; default just closes. */
  onSelect?: (id: string) => void;
}

export const CreateMenu = ({ onSelect }: CreateMenuProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  /* Close on outside click or Escape. */
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleSelect = (id: string) => {
    setOpen(false);
    onSelect?.(id);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        <Plus size={18} weight="bold" />
        {t('nav.create')}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className="absolute top-[calc(100%+8px)] left-0 z-40 w-full min-w-[200px] overflow-hidden rounded-2xl border border-(--color-auth-field-border) bg-white p-1.5 shadow-[0_16px_32px_rgba(0,0,0,0.12)]"
          >
            {CREATE_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                onClick={() => handleSelect(item.id)}
                className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-(--color-goal-bg) focus-visible:bg-(--color-goal-bg) focus-visible:outline-none"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-(--color-goal-bg)">
                  <Icon name={item.icon} className="size-[18px] text-(--color-home-brand)" />
                </span>
                <span className="text-[15px] font-medium text-(--color-primary-blue-dark)">
                  {t(item.labelKey)}
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
