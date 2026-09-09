/* One row in the set's card list — port of
   FlashcardSetDetailCardRowView.swift.

   Three things the web row was missing: the example sentence (written when the
   set is built, then never shown anywhere), a way to hear the card, and the
   mastered mark. The row is where iOS puts all three, and it is the only place
   on the web besides the full-screen card where the example can appear. */
import { useTranslation } from 'react-i18next';
import { Heart, PencilSimple, SpeakerHigh, Trash } from '@phosphor-icons/react';

import { Icon } from '@/components/primitives/Icon';
import { speakSequence } from '@/lib/speech';
import type { Flashcard } from '@/lib/models';
import type { SetTheme } from '@/lib/setColors';

interface CardListRowProps {
  card: Flashcard;
  index: number;
  theme: SetTheme;
  isMastered: boolean;
  onToggleMastered: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const CardListRow = ({
  card,
  index,
  theme,
  isMastered,
  onToggleMastered,
  onEdit,
  onDelete,
}: CardListRowProps) => {
  const { t } = useTranslation();

  const iconButton =
    'grid size-9 shrink-0 place-items-center rounded-full hover:bg-(--color-hover-wash) focus-visible:outline-none';

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3.5">
        <span
          className="w-5 shrink-0 text-center text-[13px] font-semibold"
          style={{ color: theme.mutedTextColor }}
        >
          {index + 1}
        </span>

        {/* iOS always shows a thumbnail — a tinted placeholder when there is no
            picture — so the rows line up instead of stepping in and out. */}
        {card.imageURL ? (
          <img
            src={card.imageURL}
            alt=""
            className="size-11 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="grid size-11 shrink-0 place-items-center rounded-xl"
            style={{
              background: `linear-gradient(135deg, ${theme.fieldBackground}, ${theme.softAccent})`,
            }}
          >
            <Icon
              name="hand.wave.fill"
              className="size-5"
              style={{ color: theme.accent, opacity: 0.55 }}
            />
          </span>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span
            className="truncate text-[16px] font-bold"
            style={{ color: theme.titleColor }}
          >
            {card.word}
          </span>
          <span
            className="truncate text-[15px] font-medium"
            style={{ color: theme.mutedTextColor }}
          >
            {card.translation}
          </span>
        </div>

        <div className="flex shrink-0 items-center">
          <button
            type="button"
            onClick={onToggleMastered}
            aria-label={t('study.mastered')}
            aria-pressed={isMastered}
            className={iconButton}
            style={{ color: isMastered ? theme.accent : theme.mutedTextColor }}
          >
            <Heart size={16} weight={isMastered ? 'fill' : 'bold'} />
          </button>
          <button
            type="button"
            /* Word first, then the translation — iOS speakWordAndTranslation. */
            onClick={() =>
              speakSequence([
                { text: card.word, lang: 'en-US' },
                { text: card.translation, lang: 'uk-UA' },
              ])
            }
            aria-label={t('study.speak')}
            className={iconButton}
            style={{ color: theme.mutedTextColor }}
          >
            <SpeakerHigh size={16} weight="bold" />
          </button>
          <button
            type="button"
            onClick={onEdit}
            aria-label={t('study.editCard')}
            className={iconButton}
            style={{ color: theme.mutedTextColor }}
          >
            <PencilSimple size={16} weight="bold" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={t('study.deleteCard')}
            className={`${iconButton} text-(--color-cs-red) hover:bg-(--color-cs-soft-red)`}
          >
            <Trash size={16} weight="bold" />
          </button>
        </div>
      </div>

      {/* One truncated line once there is room for it; up to two on a phone,
          where the sentence would otherwise be cut to almost nothing. */}
      {card.example.trim().length > 0 && (
        <p
          className="mx-4 mb-2.5 line-clamp-2 rounded-xl px-3.5 py-2 text-[13px] leading-[1.45] font-medium md:truncate"
          style={{ background: theme.softAccent, color: theme.accentText }}
        >
          {t('study.exampleFormat', { text: card.example })}
        </p>
      )}
    </div>
  );
};
