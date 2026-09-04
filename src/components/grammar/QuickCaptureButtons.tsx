/* "Quick note" and "Quick mistake" — the two capture buttons in the header of
   both the notes home and a topic screen.

   Each carries its note type's own colour and icon (NOTE_TYPE_META), so the
   button looks like the card it produces: blue for a standard note, the
   mistake rose for a correction. Tinted rather than filled — the filled
   gradient belongs to "New note", which is the primary action on both
   screens, and three solid buttons in a row would have no primary at all.

   The label is a darkened mix of the same hue rather than the hue itself:
   #4F7CFF and #F4729A are pill colours, and at button-label size on a light
   fill neither clears 4.5:1. The icon keeps the full colour.

   The tone travels as CSS variables because a hover colour cannot be an
   inline style. */
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import { NOTE_TYPE_META } from '@/lib/grammarMeta';

interface QuickCaptureButtonsProps {
  onQuickNote: () => void;
  onQuickMistake: () => void;
}

export const QuickCaptureButtons = ({
  onQuickNote,
  onQuickMistake,
}: QuickCaptureButtonsProps) => {
  const { t } = useTranslation();

  return (
    <>
      <QuickCaptureButton
        color={NOTE_TYPE_META.standard.color}
        icon={NOTE_TYPE_META.standard.icon}
        label={t('writing.grammar.quickNote.button')}
        onClick={onQuickNote}
      />
      <QuickCaptureButton
        color={NOTE_TYPE_META.mistake.color}
        icon={NOTE_TYPE_META.mistake.icon}
        label={t('writing.grammar.quickMistake.button')}
        onClick={onQuickMistake}
      />
    </>
  );
};

interface QuickCaptureButtonProps {
  color: string;
  icon: string;
  label: string;
  onClick: () => void;
}

const QuickCaptureButton = ({ color, icon, label, onClick }: QuickCaptureButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    style={
      {
        '--tone': color,
        '--tone-text': `color-mix(in srgb, ${color} 58%, #0B1020)`,
        '--tone-bg': `${color}1A`,
        '--tone-hover': `${color}2E`,
        '--tone-border': `${color}3D`,
      } as React.CSSProperties
    }
    className="flex h-11 items-center gap-2 rounded-2xl border border-(--tone-border) bg-(--tone-bg) px-4 text-[14px] font-semibold text-(--tone-text) shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-colors hover:bg-(--tone-hover) focus-visible:ring-2 focus-visible:ring-(--tone) focus-visible:outline-none md:text-[15px]"
  >
    <Icon name={icon} className="size-[17px] text-(--tone)" />
    {label}
  </button>
);
