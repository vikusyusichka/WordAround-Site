/* Collapsible CEFR difficulty picker — same pattern as EssayLanguageSelector. */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import { ESSAY_DIFFICULTIES, type EssayDifficulty } from '@/lib/essayTypes';

interface EssayDifficultySelectorProps {
  value: EssayDifficulty;
  onChange: (difficulty: EssayDifficulty) => void;
  disabled?: boolean;
}

const DIFFICULTY_HINT: Record<EssayDifficulty, string> = {
  A1: 'Beginner',
  A2: 'Elementary',
  B1: 'Intermediate',
  B2: 'Upper intermediate',
  C1: 'Advanced',
  Native: 'Native fluency',
};

export const EssayDifficultySelector = ({
  value,
  onChange,
  disabled,
}: EssayDifficultySelectorProps) => {
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
            {value}
          </span>
          <div className="flex flex-col">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-(--color-text-secondary) md:text-[13px]">
              {t('writing.essays.difficulty')}
            </span>
            <span className="text-[15px] font-bold text-(--color-primary-blue-dark) md:text-[17px]">
              {DIFFICULTY_HINT[value]}
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
          aria-label={t('writing.essays.difficulty')}
          className="flex flex-col gap-1.5 rounded-2xl border border-white bg-white/98 p-2 shadow-[0_4px_10px_rgba(0,0,0,0.045)]"
        >
          {ESSAY_DIFFICULTIES.map((level) => {
            const active = level === value;
            return (
              <button
                key={level}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(level);
                  setOpen(false);
                }}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-(--color-goal-bg) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-home-brand) ${
                  active ? 'bg-(--color-goal-bg)' : ''
                }`}
              >
                <span className="grid size-8 place-items-center rounded-full bg-(--color-goal-bg) text-[11px] font-bold text-(--color-primary-blue-dark)">
                  {level}
                </span>
                <span className="text-[14px] font-semibold text-(--color-primary-blue-dark)">
                  {DIFFICULTY_HINT[level]}
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
