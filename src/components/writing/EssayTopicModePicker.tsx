/* Two pill buttons: Suggested / My topic. Web port of the mode chips at the
   top of EssayPracticeView.topicSection. */
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
      className="inline-flex gap-1.5 rounded-full bg-white p-1 shadow-[0_4px_10px_rgba(0,0,0,0.045)]"
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
            className={`rounded-full px-4 py-2 text-[14px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-(--color-home-brand) md:text-[15px] ${
              active
                ? 'bg-(--color-primary-blue) text-white shadow-[0_4px_10px_rgba(43,92,250,0.22)]'
                : 'text-(--color-cs-text-muted) hover:text-(--color-primary-blue-dark)'
            }`}
          >
            {t(`writing.essays.mode.${mode}`)}
          </button>
        );
      })}
    </div>
  );
};
