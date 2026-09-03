/* Tag chips + an add field (iOS keeps note tags in the create sheet; on web
   they live in the editor, where the note is actually written). Enter or comma
   commits a tag, Backspace on an empty field removes the last one. */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from '@phosphor-icons/react';

interface TagsInputProps {
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
}

export const TagsInput = ({ tags, onAdd, onRemove }: TagsInputProps) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');

  const commit = () => {
    const value = draft.trim().replace(/^#/, '');
    if (value.length > 0) onAdd(value);
    setDraft('');
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-(--color-auth-field-border) bg-white px-3 py-2.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 rounded-full bg-(--color-goal-bg) px-2.5 py-1 text-[12px] font-bold text-(--color-primary-blue-dark)"
        >
          #{tag}
          <button
            type="button"
            onClick={() => onRemove(tag)}
            aria-label={t('writing.grammar.editor.removeTag', { tag })}
            className="grid size-4 place-items-center rounded-full text-(--color-muted-text) hover:text-(--color-cs-red) focus-visible:outline-none"
          >
            <X size={11} weight="bold" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            commit();
          } else if (e.key === 'Backspace' && draft.length === 0 && tags.length > 0) {
            onRemove(tags[tags.length - 1]);
          }
        }}
        onBlur={commit}
        placeholder={t('writing.grammar.editor.tagsPlaceholder')}
        aria-label={t('writing.grammar.editor.tags')}
        className="min-w-[140px] flex-1 bg-transparent text-[14px] font-medium text-(--color-primary-blue-dark) outline-none"
      />
    </div>
  );
};
