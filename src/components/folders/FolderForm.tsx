/* Create/edit folder form. Local state + validation; the parent supplies the
   submit handler (create or update mutation) and any save error. */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ColorPicker } from '@/components/create/ColorPicker';
import {
  FOLDER_DESC_MAX,
  FOLDER_TITLE_MAX,
  validateFolder,
} from '@/lib/folderValidation';
import { SET_COLOR_HEX, type SetColorId } from '@/lib/setColors';

interface FolderFormProps {
  initialTitle?: string;
  initialDescription?: string;
  initialColor?: SetColorId;
  submitLabel: string;
  isSaving?: boolean;
  /** i18n key of a save error from the caller (e.g. network). */
  errorKey?: string | null;
  onSubmit: (values: { title: string; description: string; colorHex: string }) => void;
  onCancel: () => void;
}

export const FolderForm = ({
  initialTitle = '',
  initialDescription = '',
  initialColor = 'blue',
  submitLabel,
  isSaving = false,
  errorKey,
  onSubmit,
  onCancel,
}: FolderFormProps) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [color, setColor] = useState<SetColorId>(initialColor);
  const [validationKey, setValidationKey] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateFolder({ title, description });
    if (error) {
      setValidationKey(error);
      return;
    }
    setValidationKey(null);
    onSubmit({ title: title.trim(), description: description.trim(), colorHex: SET_COLOR_HEX[color] });
  };

  const shownError = validationKey ?? errorKey ?? null;

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-6">
      <label className="flex flex-col gap-2">
        <span className="flex items-center justify-between text-[14px] font-semibold text-(--color-cs-dark-text)">
          {t('folders.name')}
          <span className="text-[12px] font-medium text-(--color-cs-text-muted)">
            {title.trim().length}/{FOLDER_TITLE_MAX}
          </span>
        </span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('folders.namePlaceholder')}
          autoFocus
          className="h-12 rounded-2xl border border-(--color-auth-field-border) bg-white px-4 text-[15px] font-medium text-(--color-cs-dark-text) outline-none focus-visible:border-(--color-home-brand)"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="flex items-center justify-between text-[14px] font-semibold text-(--color-cs-dark-text)">
          {t('folders.description')}
          <span className="text-[12px] font-medium text-(--color-cs-text-muted)">
            {description.trim().length}/{FOLDER_DESC_MAX}
          </span>
        </span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('folders.descriptionPlaceholder')}
          rows={3}
          className="resize-none rounded-2xl border border-(--color-auth-field-border) bg-white px-4 py-3 text-[15px] font-medium text-(--color-cs-dark-text) outline-none focus-visible:border-(--color-home-brand)"
        />
      </label>

      <div className="flex flex-col gap-2.5">
        <span className="text-[14px] font-semibold text-(--color-cs-dark-text)">
          {t('folders.color')}
        </span>
        <ColorPicker value={color} onChange={setColor} />
      </div>

      {shownError && (
        <p role="alert" className="text-[14px] font-medium text-(--color-cs-red)">
          {t(shownError)}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSaving}
          className="h-12 rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) px-6 text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98] disabled:opacity-70 focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          {isSaving ? t('folders.saving') : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-12 rounded-2xl border border-(--color-auth-field-border) bg-white px-6 text-[15px] font-semibold text-(--color-cs-text-muted) transition-colors hover:bg-black/[0.03] focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:outline-none"
        >
          {t('folders.cancel')}
        </button>
      </div>
    </form>
  );
};
