/* Suggested / My topic segmented control. Port of
   EssayPracticeView.topicModePicker: a full-width translucent tray with two
   equal rounded-rectangle buttons — the active one solid blue, the other
   white with blue text. */
import { useTranslation } from 'react-i18next';

import type { EssayTopicMode } from '@/lib/essayTypes';

interface EssayTopicModePickerProps {
  value: EssayTopicMode;
  onChange: (mode: EssayTopicMode) => void;
}

const modes: EssayTopicMode[] = ['suggested', 'custom'];

export const EssayTopicModePicker = ({ value, onChange }: EssayTopicModePickerProps) => {
  const { t } = useTranslation();
  return (
    <div
      role="tablist"
      aria-label="Essay topic mode"
      className="flex w-full gap-2 rounded-[20px] bg-(--color-surface)/55 p-1.5 shadow-[0_6px_10px_rgba(0,0,0,0.03)]"
    >
      {modes.map((mode) => {
        const active = value === mode;
        return (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(mode)}
            className={`flex-1 rounded-2xl py-2.5 text-[13px] font-bold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-(--color-home-brand) md:py-3 md:text-[14px] ${
              active
                ? 'bg-(--color-primary-blue-solid) text-white'
                : 'bg-(--color-surface)/78 text-(--color-primary-blue) hover:bg-(--color-surface)'
            }`}
          >
            {t(`writing.essays.mode.${mode}`)}
          </button>
        );
      })}
    </div>
  );
};
