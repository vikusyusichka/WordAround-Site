/* Collapsible language picker — same iOS-inspired pattern as the difficulty
   selector below. A rounded card button shows current value; clicking expands
   an inline options list beneath (NOT a native <select> — keeps visual DNA). */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import { ESSAY_LANGUAGES, type GrammarLanguage } from '@/lib/essayTypes';

interface EssayLanguageSelectorProps {
  value: GrammarLanguage;
  onChange: (language: GrammarLanguage) => void;
  disabled?: boolean;
}

export const EssayLanguageSelector = ({
  value,
  onChange,
  disabled,
}: EssayLanguageSelectorProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex w-full items-center justify-between rounded-2xl border border-white bg-white/95 px-4 py-3 text-left shadow-[0_4px_10px_rgba(0,0,0,0.045)] transition-transform hover:-translate-y-px disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-(--color-home-brand) md:px-5 md:py-3.5"
      >
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-full bg-(--color-goal-bg) text-[12px] font-bold text-(--color-primary-blue-dark) md:size-10 md:text-[13px]">
            {value.shortTitle}
          </span>
          <div className="flex flex-col">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-(--color-text-secondary) md:text-[13px]">
              {t('writing.essays.language')}
            </span>
            <span className="text-[15px] font-bold text-(--color-primary-blue-dark) md:text-[17px]">
              {value.title}
            </span>
          </div>
        </div>
        <Icon
          name={open ? 'chevron.down' : 'chevron.right'}
          className="size-[18px] text-(--color-primary-blue-dark)"
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={t('writing.essays.language')}
          className="flex flex-col gap-1.5 rounded-2xl border border-white bg-white/98 p-2 shadow-[0_4px_10px_rgba(0,0,0,0.045)]"
        >
          {ESSAY_LANGUAGES.map((lang) => {
            const active = lang.id === value.id;
            return (
              <button
                key={lang.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(lang);
                  setOpen(false);
                }}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-(--color-goal-bg) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-home-brand) ${
                  active ? 'bg-(--color-goal-bg)' : ''
                }`}
              >
                <span className="grid size-8 place-items-center rounded-full bg-(--color-goal-bg) text-[11px] font-bold text-(--color-primary-blue-dark)">
                  {lang.shortTitle}
                </span>
                <span className="text-[15px] font-semibold text-(--color-primary-blue-dark)">
                  {lang.title}
                </span>
                {active && (
                  <Icon
                    name="checkmark"
                    className="ml-auto size-[16px] text-(--color-primary-blue)"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
