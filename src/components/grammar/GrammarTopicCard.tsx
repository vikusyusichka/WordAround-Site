/* Topic row on the grammar-notes home — port of GrammarNoteTopicCardView:
   a horizontal card themed by the topic colour, with a soft-accent icon circle,
   title (+ pin / Mistakes badge), description, a "N notes" meta pill, a chevron,
   and a soft-accent blob bleeding out of the top-right corner. */
import { useTranslation } from 'react-i18next';
import { Trash } from '@phosphor-icons/react';

import { Icon } from '@/components/primitives/Icon';
import { themeForHex } from '@/lib/setColors';
import type { GrammarNoteTopic } from '@/lib/models';

interface GrammarTopicCardProps {
  topic: GrammarNoteTopic;
  onOpen: () => void;
  onDelete: () => void;
}

export const GrammarTopicCard = ({ topic, onOpen, onDelete }: GrammarTopicCardProps) => {
  const { t } = useTranslation();
  const theme = themeForHex(topic.colorHex);

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onOpen}
        aria-label={topic.title}
        className="relative block w-full overflow-hidden rounded-[24px] border p-4 pl-[18px] text-left transition-transform hover:-translate-y-0.5 focus-visible:outline-none"
        style={{
          background: topic.isMistakesTopic ? theme.previewBackground : theme.sectionBackground,
          borderColor: topic.isMistakesTopic ? theme.borderColor : theme.softBorderColor,
          boxShadow: `0 10px 18px ${theme.shadowColor}`,
        }}
      >
        {/* Corner blob. */}
        <span
          className="pointer-events-none absolute -top-[50px] right-[-46px] size-[112px] rounded-full"
          style={{ background: theme.softAccent, opacity: topic.isMistakesTopic ? 1 : 0.55 }}
          aria-hidden
        />

        <div className="relative flex items-center gap-3.5">
          <span
            className="grid size-[50px] shrink-0 place-items-center rounded-full"
            style={{ background: theme.softAccent }}
          >
            <Icon name={topic.icon} className="size-5" style={{ color: theme.accent }} />
          </span>

          <div className="flex min-w-0 flex-col gap-[7px]">
            <span className="flex items-center gap-[7px]">
              <span
                className="truncate text-[16px] font-bold"
                style={{ color: theme.titleColor }}
              >
                {topic.title}
              </span>
              {topic.isPinned && (
                <Icon name="pin.fill" className="size-[11px] shrink-0" style={{ color: theme.accent }} />
              )}
              {topic.isMistakesTopic && (
                <span
                  className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold"
                  style={{
                    background: theme.softAccent,
                    borderColor: theme.softBorderColor,
                    color: theme.accent,
                  }}
                >
                  {t('writing.grammar.mistakesBadge')}
                </span>
              )}
            </span>

            {topic.description && (
              <span
                className="line-clamp-2 text-[12px] font-semibold"
                style={{ color: theme.mutedTextColor }}
              >
                {topic.description}
              </span>
            )}

            <span className="flex flex-wrap gap-2">
              <span
                className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold"
                style={{
                  background: theme.fieldBackground,
                  borderColor: theme.softBorderColor,
                  color: theme.mutedTextColor,
                }}
              >
                <Icon name="doc.text.fill" className="size-[10px]" />
                {t('writing.grammar.notesCount', { count: topic.notesCount })}
              </span>
            </span>
          </div>

          <Icon
            name="chevron.right"
            className="ml-auto size-[14px] shrink-0"
            style={{ color: theme.mutedTextColor, opacity: 0.78 }}
          />
        </div>
      </button>

      <button
        type="button"
        onClick={onDelete}
        aria-label={t('writing.grammar.form.cancel')}
        className="absolute top-3 right-3 grid size-8 place-items-center rounded-full bg-white/90 text-(--color-cs-red) opacity-0 shadow-[0_2px_6px_rgba(0,0,0,0.08)] transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
      >
        <Trash size={16} weight="bold" />
      </button>
    </div>
  );
};
