/* Create-topic form (title + description + color + icon), rendered inside a
   modal on the grammar home. Reuses the shared ColorPicker + IconPicker. */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ColorPicker } from '@/components/create/ColorPicker';
import { IconPicker } from '@/components/create/IconPicker';
import { SET_COLOR_HEX, colorIdForHex, type SetColorId } from '@/lib/setColors';

export interface TopicFormValues {
  title: string;
  description: string;
  colorHex: string;
  icon: string;
}

interface GrammarTopicFormProps {
  initial?: Partial<TopicFormValues>;
  isSaving?: boolean;
  onSubmit: (values: TopicFormValues) => void;
  onCancel: () => void;
}

export const GrammarTopicForm = ({
  initial,
  isSaving = false,
  onSubmit,
  onCancel,
}: GrammarTopicFormProps) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [color, setColor] = useState<SetColorId>(
    initial?.colorHex ? colorIdForHex(initial.colorHex) : 'blue',
  );
  const [icon, setIcon] = useState(initial?.icon ?? 'book.pages.fill');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length === 0) {
      setError(true);
      return;
    }
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      colorHex: SET_COLOR_HEX[color],
      icon,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <label className="flex flex-col gap-2">
        <span className="text-[14px] font-semibold text-(--color-cs-dark-text)">
          {t('writing.grammar.form.name')}
        </span>
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setError(false);
          }}
          placeholder={t('writing.grammar.form.namePlaceholder')}
          autoFocus
          className="h-12 rounded-2xl border border-(--color-auth-field-border) bg-white px-4 text-[15px] font-medium text-(--color-cs-dark-text) outline-none focus-visible:border-(--color-home-brand)"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-[14px] font-semibold text-(--color-cs-dark-text)">
          {t('writing.grammar.form.description')}
        </span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('writing.grammar.form.descriptionPlaceholder')}
          rows={2}
          className="resize-none rounded-2xl border border-(--color-auth-field-border) bg-white px-4 py-3 text-[15px] font-medium text-(--color-cs-dark-text) outline-none focus-visible:border-(--color-home-brand)"
        />
      </label>

      <div className="flex flex-col gap-2.5">
        <span className="text-[14px] font-semibold text-(--color-cs-dark-text)">
          {t('writing.grammar.form.color')}
        </span>
        <ColorPicker value={color} onChange={setColor} />
      </div>

      <div className="flex flex-col gap-2.5">
        <span className="text-[14px] font-semibold text-(--color-cs-dark-text)">
          {t('writing.grammar.form.icon')}
        </span>
        <IconPicker value={icon} onChange={setIcon} />
      </div>

      {error && (
        <p role="alert" className="text-[14px] font-medium text-(--color-cs-red)">
          {t('writing.grammar.form.namePlaceholder')}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSaving}
          className="h-12 flex-1 rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) px-6 text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98] disabled:opacity-70 focus-visible:outline-none"
        >
          {t('writing.grammar.form.save')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-12 rounded-2xl border border-(--color-auth-field-border) bg-white px-6 text-[15px] font-semibold text-(--color-cs-text-muted) transition-colors hover:bg-black/[0.03] focus-visible:outline-none"
        >
          {t('writing.grammar.form.cancel')}
        </button>
      </div>
    </form>
  );
};
