/* Shared color picker — 6 set/folder colors as swatches. Reused by the folder
   form (3A) and the set wizard (3B). Keyboard + focus accessible.
   Geometry from CreateFolderView.swift: 30px circles, 18px apart, and the
   selected one gets a 4px accent ring sitting *outside* the circle
   (SwiftUI: .stroke(lineWidth: 4).padding(-6)). */
import { useTranslation } from 'react-i18next';

import { SET_COLOR_IDS, type SetColorId } from '@/lib/setColors';

interface ColorPickerProps {
  value: SetColorId;
  onChange: (id: SetColorId) => void;
  /** Ring color for the selected swatch — the active theme's accent. */
  accent?: string;
}

export const ColorPicker = ({ value, onChange, accent }: ColorPickerProps) => {
  const { t } = useTranslation();
  const ring = accent ?? 'var(--color-primary-blue-dark)';

  return (
    <div className="flex flex-wrap gap-[18px] py-1.5" role="radiogroup" aria-label={t('folders.color')}>
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
            className="size-[30px] rounded-full transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:ring-offset-2 focus-visible:outline-none"
            style={{
              background: `var(--color-cs-${id})`,
              // iOS strokes a 4pt ring on a circle inset by -6, i.e. the ring
              // floats clear of the swatch. An outline reproduces that without
              // affecting layout (and leaves box-shadow free for focus rings).
              outline: selected ? `4px solid ${ring}` : undefined,
              outlineOffset: 4,
            }}
          />
        );
      })}
    </div>
  );
};
