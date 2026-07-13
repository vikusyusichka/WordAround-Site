/* Horizontal pill row to pick the note's type. Active pill is tinted with the
   type's color. */
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import { NOTE_TYPES, NOTE_TYPE_META } from '@/lib/grammarMeta';
import type { GrammarNoteType } from '@/lib/models';

interface GrammarNoteTypePickerProps {
  value: GrammarNoteType;
  onChange: (type: GrammarNoteType) => void;
}

export const GrammarNoteTypePicker = ({ value, onChange }: GrammarNoteTypePickerProps) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('writing.grammar.noteType.standard')}>
      {NOTE_TYPES.map((type) => {
        const meta = NOTE_TYPE_META[type];
        const active = type === value;
        return (
          <button
            key={type}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(type)}
            className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors focus-visible:outline-none md:text-[14px]"
            style={
              active
                ? { background: `${meta.color}1F`, borderColor: meta.color, color: meta.color }
                : { background: 'white', borderColor: 'var(--color-auth-field-border)', color: 'var(--color-cs-text-muted)' }
            }
          >
            <Icon name={meta.icon} className="size-[15px]" />
            {t(`writing.grammar.noteType.${type}`)}
          </button>
        );
      })}
    </div>
  );
};
