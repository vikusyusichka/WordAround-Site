/* One row in a topic's notes list — port of GrammarNoteCardView: a horizontal
   card with a note-type icon circle, title, preview, a meta row (type pill +
   Quiz pill + relative updated time), a chevron and a note-type-tinted blob in
   the top-right corner. (The web note model has no pin/favorite/tags.) */
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

const relativeUpdated = (millis: number, locale: string): string => {
  const diff = millis - Date.now();
  const rtf = new Intl.RelativeTimeFormat(locale, { style: 'short' });
  const mins = Math.round(diff / 60000);
  if (Math.abs(mins) < 60) return rtf.format(mins, 'minute');
  const hrs = Math.round(mins / 60);
  if (Math.abs(hrs) < 24) return rtf.format(hrs, 'hour');
  return rtf.format(Math.round(hrs / 24), 'day');
};

export const GrammarNoteRow = ({ note, onOpen, onDelete }: GrammarNoteRowProps) => {
  const { t, i18n } = useTranslation();
  const meta = NOTE_TYPE_META[note.noteType];
  const pill = 'flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold';

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onOpen}
        aria-label={note.title}
        className="relative block w-full overflow-hidden rounded-[22px] border border-white/[0.76] bg-white/[0.92] p-4 text-left shadow-[0_8px_14px_rgba(0,0,0,0.055)] transition-transform hover:-translate-y-px focus-visible:outline-none"
      >
        {/* Corner blob. */}
        <span
          className="pointer-events-none absolute -top-[45px] right-[-38px] size-[98px] rounded-full"
          style={{ background: `${meta.color}1A` }}
          aria-hidden
        />

        <div className="relative flex items-center gap-3">
          <span
            className="grid size-11 shrink-0 place-items-center rounded-full"
            style={{ background: `${meta.color}24` }}
          >
            <Icon name={meta.icon} className="size-[18px]" style={{ color: meta.color }} />
          </span>

          <div className="flex min-w-0 flex-col gap-2">
            <span className="truncate text-[16px] font-bold text-(--color-primary-blue-dark)">
              {note.title}
            </span>
            {note.previewText && (
              <span className="line-clamp-2 text-[14px] font-semibold text-(--color-text-secondary)">
                {note.previewText}
              </span>
            )}
            <span className="flex flex-wrap items-center gap-1.5">
              <span className={pill} style={{ background: `${meta.color}1C`, color: meta.color }}>
                <Icon name={meta.icon} className="size-[9px]" />
                {t(`writing.grammar.noteType.${note.noteType}`)}
              </span>
              {note.hasQuiz && (
                <span className={pill} style={{ background: `${meta.color}1C`, color: meta.color }}>
                  <Icon name="questionmark.circle.fill" className="size-[9px]" />
                  {t('writing.grammar.quiz.badge')}
                </span>
              )}
              <span className="ml-auto shrink-0 text-[10px] font-bold text-(--color-muted-text)">
                {relativeUpdated(note.updatedAt, i18n.language)}
              </span>
            </span>
          </div>

          <Icon
            name="chevron.right"
            className="ml-auto size-[14px] shrink-0 text-(--color-muted-text)"
          />
        </div>
      </button>

      <button
        type="button"
        onClick={onDelete}
        aria-label={t('writing.grammar.editor.delete')}
        className="absolute top-3 right-3 grid size-8 place-items-center rounded-full bg-white/90 text-(--color-cs-red) opacity-0 shadow-[0_2px_6px_rgba(0,0,0,0.08)] transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
      >
        <Trash size={16} weight="bold" />
      </button>
    </div>
  );
};
