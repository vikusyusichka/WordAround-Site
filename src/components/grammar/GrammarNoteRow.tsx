/* One row in a topic's notes list: note-type chip + title + preview + delete. */
import { useTranslation } from 'react-i18next';
import { Trash } from '@phosphor-icons/react';

import { Icon } from '@/components/primitives/Icon';
import { NOTE_TYPE_META } from '@/lib/grammarMeta';
import type { GrammarNote } from '@/lib/models';

interface GrammarNoteRowProps {
  note: GrammarNote;
  onOpen: () => void;
  onDelete: () => void;
}

export const GrammarNoteRow = ({ note, onOpen, onDelete }: GrammarNoteRowProps) => {
  const { t } = useTranslation();
  const meta = NOTE_TYPE_META[note.noteType];
  return (
    <div className="group relative flex items-start gap-3 rounded-2xl border border-white bg-white/95 p-4 shadow-[0_4px_10px_rgba(0,0,0,0.045)] transition-transform hover:-translate-y-px">
      <button type="button" onClick={onOpen} className="flex flex-1 items-start gap-3 text-left focus-visible:outline-none">
        <span
          className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl"
          style={{ background: `${meta.color}1F` }}
        >
          <Icon name={meta.icon} className="size-[18px]" style={{ color: meta.color }} />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5 pr-6">
          <span className="truncate text-[16px] font-bold text-(--color-primary-blue-dark)">
            {note.title}
          </span>
          {note.previewText && (
            <span className="line-clamp-2 text-[14px] font-medium text-(--color-text-secondary)">
              {note.previewText}
            </span>
          )}
          <span
            className="mt-1 w-fit rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide"
            style={{ background: `${meta.color}1F`, color: meta.color }}
          >
            {t(`writing.grammar.noteType.${note.noteType}`)}
          </span>
        </div>
      </button>

      <button
        type="button"
        onClick={onDelete}
        aria-label={t('writing.grammar.editor.delete')}
        className="absolute right-3 top-3 grid size-8 place-items-center rounded-full text-(--color-cs-text-muted) opacity-0 transition-opacity hover:bg-black/[0.04] hover:text-(--color-cs-red) focus-visible:opacity-100 group-hover:opacity-100"
      >
        <Trash size={16} weight="bold" />
      </button>
    </div>
  );
};
