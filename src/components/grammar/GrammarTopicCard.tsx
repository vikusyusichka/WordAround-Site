/* Topic tile on the grammar-notes home: colored icon circle + title +
   description + note count. Visual sibling of FolderCard. */
import { useTranslation } from 'react-i18next';
import { Trash } from '@phosphor-icons/react';

import { Icon } from '@/components/primitives/Icon';
import type { GrammarNoteTopic } from '@/lib/models';

interface GrammarTopicCardProps {
  topic: GrammarNoteTopic;
  onOpen: () => void;
  onDelete: () => void;
}

export const GrammarTopicCard = ({ topic, onOpen, onDelete }: GrammarTopicCardProps) => {
  const { t } = useTranslation();
  return (
    <div className="group relative flex flex-col gap-3 rounded-3xl border border-white/80 bg-white/95 p-5 shadow-[0_6px_16px_rgba(0,0,0,0.04)] transition-transform hover:-translate-y-0.5">
      <button
        type="button"
        onClick={onOpen}
        className="flex flex-col gap-3 text-left focus-visible:outline-none"
      >
        <div
          className="grid size-12 place-items-center rounded-2xl"
          style={{ background: `${topic.colorHex}1F` }}
        >
          <Icon name={topic.icon} className="size-6" style={{ color: topic.colorHex }} />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[17px] font-bold text-(--color-primary-blue-dark)">
            {topic.title}
          </span>
          {topic.description && (
            <span className="line-clamp-2 text-[14px] font-medium text-(--color-text-secondary)">
              {topic.description}
            </span>
          )}
        </div>
        <span className="text-[13px] font-semibold text-(--color-text-secondary)">
          {t('writing.grammar.notesCount', { count: topic.notesCount })}
        </span>
      </button>

      <button
        type="button"
        onClick={onDelete}
        aria-label={t('writing.grammar.form.cancel')}
        className="absolute right-4 top-4 grid size-8 place-items-center rounded-full text-(--color-cs-text-muted) opacity-0 transition-opacity hover:bg-black/[0.04] hover:text-(--color-cs-red) focus-visible:opacity-100 group-hover:opacity-100"
      >
        <Trash size={16} weight="bold" />
      </button>
    </div>
  );
};
