/* Shared color picker — 6 set/folder colors as swatches. Reused by the folder
   form (3A) and the set wizard (3B). Keyboard + focus accessible. */
import { useTranslation } from 'react-i18next';
import { Check } from '@phosphor-icons/react';

import { SET_COLOR_IDS, type SetColorId } from '@/lib/setColors';

interface ColorPickerProps {
  value: SetColorId;
  onChange: (id: SetColorId) => void;
}

export const ColorPicker = ({ value, onChange }: ColorPickerProps) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-3" role="radiogroup" aria-label={t('folders.color')}>
      {SET_COLOR_IDS.map((id) => {
        const selected = id === value;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={id}
            onClick={() => onChange(id)}
            className={[
              'grid size-9 place-items-center rounded-full transition-transform hover:scale-105 focus-visible:outline-none',
              selected
                ? 'ring-2 ring-(--color-primary-blue-dark) ring-offset-2'
                : 'focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:ring-offset-2',
            ].join(' ')}
            style={{ background: `var(--color-cs-${id})` }}
          >
            {selected && <Check size={16} weight="bold" className="text-white" />}
          </button>
        );
      })}
    </div>
  );
};
