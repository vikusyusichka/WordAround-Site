/* One row in a topic's notes list — port of GrammarNoteCardView: a horizontal
   card with a note-type icon circle, title, preview, tags, a meta row (type
   pill + Quiz pill + relative updated time), pin/favorite/delete actions and a
   note-type-tinted blob in the top-right corner. Mistake notes get the warm
   tint when "highlight mistake notes" is on; "compact note cards" drops the
   preview and tightens the padding; reorder mode swaps the actions for
   up/down arrows.

   Web addition: a `tile` variant for the grid view, stacking the same content
   the way folder, set and topic tiles do, so the whole library switches
   between a full-width list and a grid of squares with one control. */
import { useTranslation } from 'react-i18next';
import { Trash } from '@phosphor-icons/react';

import { Icon } from '@/components/primitives/Icon';
import { NOTE_TYPE_META } from '@/lib/grammarMeta';
import type { GrammarNote, GrammarReviewItem } from '@/lib/models';
import { useGrammarSettings } from '@/stores/grammarSettingsStore';

interface GrammarNoteRowProps {
  note: GrammarNote;
  /** Passage around the search hit, when the list is filtered by a query. */
  snippet?: string;
  isReordering?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  onOpen: () => void;
  onDelete: () => void;
  onTogglePinned: () => void;
  onToggleFavorite: () => void;
  onMove?: (dir: 'up' | 'down') => void;
  /** `tile` stacks the same content for the grid view. */
  variant?: 'row' | 'tile';
  /** The note's spaced-review card, when it has one. Absent = not in review. */
  reviewItem?: GrammarReviewItem;
}

/** The spaced-review purple, shared with ReviewTodayCard. */
const REVIEW_TINT = '#7C5CFF';

/* Signed, so the same helper reads both ways: a past timestamp gives
   "17 hours ago", a future due date gives "in 3 days". */
const relativeUpdated = (millis: number, locale: string): string => {
  const diff = millis - Date.now();
  const rtf = new Intl.RelativeTimeFormat(locale, { style: 'short' });
  const mins = Math.round(diff / 60000);
  if (Math.abs(mins) < 60) return rtf.format(mins, 'minute');
  const hrs = Math.round(mins / 60);
  if (Math.abs(hrs) < 24) return rtf.format(hrs, 'hour');
  return rtf.format(Math.round(hrs / 24), 'day');
};

export const GrammarNoteRow = ({
  note,
  snippet,
  isReordering = false,
  isFirst = false,
  isLast = false,
  onOpen,
  onDelete,
  onTogglePinned,
  onToggleFavorite,
  onMove,
  variant = 'row',
  reviewItem,
}: GrammarNoteRowProps) => {
  const { t, i18n } = useTranslation();
  const compact = useGrammarSettings((s) => s.usesCompactCards);
  const highlightMistakes = useGrammarSettings((s) => s.showsMistakeHighlights);
  const meta = NOTE_TYPE_META[note.noteType];
  const isTile = variant === 'tile';
  /* A tile has room for the type and quiz pills and little else, so it shows
     the review pill only when it is asking for something — i.e. when due. */
  const isDue = reviewItem !== undefined && reviewItem.dueAt <= Date.now();
  const showsReviewPill = reviewItem !== undefined && (!isTile || isDue);
  const pill = 'flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold';
  const isMistake = note.isMistakeNote || note.noteType === 'mistake';
  const warmTint = isMistake && highlightMistakes;

  const iconButton =
    'grid size-8 place-items-center rounded-full bg-white/90 shadow-[0_2px_6px_rgba(0,0,0,0.08)] transition-colors focus-visible:outline-none';

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onOpen}
        aria-label={note.title}
        className={[
          'relative block w-full overflow-hidden rounded-[22px] border text-left shadow-[0_8px_14px_rgba(0,0,0,0.055)] transition-transform hover:-translate-y-px focus-visible:outline-none',
          compact ? 'p-3' : 'p-4',
          /* A fixed height keeps a row of tiles even however long the titles
             run; compact cards drop the preview, so they need less of it. */
          isTile ? (compact ? 'h-[148px]' : 'h-[206px]') : '',
        ].join(' ')}
        style={{
          background: warmTint ? `${meta.color}0F` : 'rgba(255,255,255,0.92)',
          borderColor: warmTint ? `${meta.color}33` : 'rgba(255,255,255,0.76)',
        }}
      >
        {/* Corner blob. */}
        <span
          className="pointer-events-none absolute -top-[45px] right-[-38px] size-[98px] rounded-full"
          style={{ background: `${meta.color}1A` }}
          aria-hidden
        />

        <div
          className={
            isTile
              ? 'relative flex h-full flex-col gap-3'
              : 'relative flex items-center gap-3'
          }
        >
          <span
            className={[
              'grid shrink-0 place-items-center rounded-full',
              compact ? 'size-9' : 'size-11',
            ].join(' ')}
            style={{ background: `${meta.color}24` }}
          >
            <Icon name={meta.icon} className="size-[18px]" style={{ color: meta.color }} />
          </span>

          <div className={`flex min-w-0 flex-col gap-2 ${isTile ? 'w-full flex-1' : ''}`}>
            <span className={`flex gap-1.5 ${isTile ? 'items-start' : 'items-center'}`}>
              <span
                className={`text-[16px] font-bold text-(--color-primary-blue-dark) ${
                  isTile ? 'line-clamp-2 leading-snug' : 'truncate'
                }`}
              >
                {note.title}
              </span>
              {note.isPinned && (
                <Icon name="pin.fill" className="size-[11px] shrink-0" style={{ color: meta.color }} />
              )}
              {note.isFavorite && (
                <Icon name="star.fill" className="size-[11px] shrink-0 text-[#F59E0B]" />
              )}
            </span>

            {!compact && (snippet || note.previewText) && (
              <span className="line-clamp-2 text-[14px] font-semibold text-(--color-text-secondary)">
                {snippet ?? note.previewText}
              </span>
            )}

            {/* Tags are the first thing a tile gives up: with a title that may
                wrap to two lines they push the meta row past the fixed
                height, and they stay one row away in the list view. */}
            {!compact && !isTile && note.tags.length > 0 && (
              <span className="flex flex-wrap gap-1.5">
                {note.tags.slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-black/[0.04] px-2 py-0.5 text-[10px] font-bold text-(--color-text-secondary)"
                  >
                    #{tag}
                  </span>
                ))}
              </span>
            )}

            <span
              className={`flex flex-wrap items-center gap-1.5 ${isTile ? 'mt-auto' : ''}`}
            >
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

              {/* Review state, in the queue's own purple rather than the note
                  type's colour — it says something about the schedule, not
                  about what kind of note this is. */}
              {showsReviewPill && (
                <span
                  className={pill}
                  style={{
                    background: isDue ? `${REVIEW_TINT}26` : `${REVIEW_TINT}14`,
                    color: REVIEW_TINT,
                  }}
                >
                  <Icon name="brain.head.profile" className="size-[9px]" />
                  {isDue
                    ? t('writing.grammar.review.dueBadge')
                    : relativeUpdated(reviewItem.dueAt, i18n.language)}
                </span>
              )}
              <span className="ml-auto shrink-0 text-[10px] font-bold text-(--color-muted-text)">
                {relativeUpdated(note.updatedAt, i18n.language)}
              </span>
            </span>
          </div>

          {!isTile && (
            <Icon
              name="chevron.right"
              className="ml-auto size-[14px] shrink-0 text-(--color-muted-text)"
            />
          )}
        </div>
      </button>

      {isReordering ? (
        <div className="absolute top-3 right-3 flex gap-1">
          <button
            type="button"
            onClick={() => onMove?.('up')}
            disabled={isFirst}
            aria-label={t('writing.grammar.reorder.up')}
            className={`${iconButton} text-(--color-primary-blue) disabled:opacity-30`}
          >
            <Icon name="arrow.up" className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => onMove?.('down')}
            disabled={isLast}
            aria-label={t('writing.grammar.reorder.down')}
            className={`${iconButton} text-(--color-primary-blue) disabled:opacity-30`}
          >
            <Icon name="arrow.down" className="size-4" />
          </button>
        </div>
      ) : (
        <div className="absolute top-3 right-3 flex gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
          <button
            type="button"
            onClick={onTogglePinned}
            aria-label={t(note.isPinned ? 'writing.grammar.unpin' : 'writing.grammar.pin')}
            aria-pressed={note.isPinned}
            className={`${iconButton} ${note.isPinned ? 'text-(--color-primary-blue)' : 'text-(--color-muted-text) hover:text-(--color-primary-blue)'}`}
          >
            <Icon name="pin.fill" className="size-4" />
          </button>
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-label={t(note.isFavorite ? 'writing.grammar.unfavorite' : 'writing.grammar.favorite')}
            aria-pressed={note.isFavorite}
            className={`${iconButton} ${note.isFavorite ? 'text-[#F59E0B]' : 'text-(--color-muted-text) hover:text-[#F59E0B]'}`}
          >
            <Icon name="star.fill" className="size-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={t('writing.grammar.editor.delete')}
            className={`${iconButton} text-(--color-cs-red)`}
          >
            <Trash size={16} weight="bold" />
          </button>
        </div>
      )}
    </div>
  );
};
