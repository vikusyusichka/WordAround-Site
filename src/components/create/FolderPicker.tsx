/* Optional folder assignment for a set (reuses useFoldersQuery); "No folder"
   clears the assignment.

   This is a custom listbox rather than a native <select> on purpose: a native
   dropdown's popup is drawn by the operating system, so its highlight is the
   system blue and nothing in the app's theme can reach it. */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CaretDown, Check } from '@phosphor-icons/react';

import { useFoldersQuery } from '@/hooks/useFolders';
import type { SetTheme } from '@/lib/setColors';

interface FolderPickerProps {
  value: string | null;
  onChange: (folderID: string | null, folderName: string | null) => void;
  theme: SetTheme;
}

export const FolderPicker = ({ value, onChange, theme }: FolderPickerProps) => {
  const { t } = useTranslation();
  const { data: folders } = useFoldersQuery();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const options: { id: string | null; title: string }[] = [
    { id: null, title: t('createSet.noFolder') },
    ...(folders ?? []).map((folder) => ({ id: folder.id, title: folder.title })),
  ];
  const selected = options.find((o) => o.id === value) ?? options[0];

  /* Close on a click anywhere else, or on Escape — what a native select does. */
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const pick = (id: string | null) => {
    const folder = folders?.find((f) => f.id === id) ?? null;
    onChange(id, folder?.title ?? null);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div ref={rootRef} className="relative w-full max-w-xs">
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={t('createSet.folder')}
        onClick={() => setIsOpen((open) => !open)}
        className="flex h-12 w-full items-center justify-between gap-3 rounded-2xl border px-4 text-[15px] font-medium transition-colors outline-none focus-visible:outline-2"
        style={{
          background: theme.fieldBackground,
          borderColor: isOpen ? theme.accent : theme.softBorderColor,
          color: theme.textColor,
          outlineColor: theme.accent,
        }}
      >
        <span className="truncate">{selected.title}</span>
        <CaretDown
          size={16}
          weight="bold"
          className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          style={{ color: theme.mutedTextColor }}
        />
      </button>

      {isOpen && (
        <ul
          role="listbox"
          aria-label={t('createSet.folder')}
          className="absolute top-[calc(100%+6px)] right-0 left-0 z-20 flex max-h-64 flex-col gap-1 overflow-y-auto rounded-2xl border p-1.5"
          style={{
            background: theme.fieldBackground,
            borderColor: theme.softBorderColor,
            boxShadow: `0 12px 24px ${theme.shadowColor}`,
          }}
        >
          {options.map((option) => {
            const isSelected = option.id === selected.id;
            return (
              <li key={option.id ?? 'none'} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => pick(option.id)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] transition-colors focus-visible:outline-none ${
                    isSelected ? 'font-semibold' : 'font-medium hover:bg-black/[0.03]'
                  }`}
                  style={
                    isSelected
                      ? { background: theme.softAccent, color: theme.accent }
                      : { color: theme.textColor }
                  }
                >
                  <span className="truncate">{option.title}</span>
                  {isSelected && <Check size={16} weight="bold" className="shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
