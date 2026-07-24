/* Create/edit folder form — port of CreateFolderView.swift. Local state +
   validation; the parent supplies the submit handler and any save error.

   Everything recolours live with the chosen swatch: the screen wash, the
   section card, the field borders, the labels, the button and the preview
   card underneath. That repaint is the defining trait of this screen on iOS. */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ColorPicker } from '@/components/create/ColorPicker';
import { ThemedScreen } from '@/components/create/ThemedScreen';
import { FolderCard } from '@/components/folders/FolderCard';
import { Icon } from '@/components/primitives/Icon';
import {
  FOLDER_DESC_MAX,
  FOLDER_TITLE_MAX,
  validateFolder,
} from '@/lib/folderValidation';
import { SET_COLOR_HEX, themeForColor, type SetColorId } from '@/lib/setColors';

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

  const theme = themeForColor(color);

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

  const label = 'text-[14px] font-bold';
  const field =
    'w-full rounded-2xl border bg-white px-4 text-[15px] font-semibold outline-none transition-colors';

  return (
    <>
      <ThemedScreen background={theme.screenBackground} />

      <form onSubmit={handleSubmit} className="flex max-w-[560px] flex-col gap-[22px]">
        {/* Section card — iOS: padding 18, radius 26, shadow r18 y10. */}
        <div
          className="flex flex-col gap-5 rounded-[26px] p-[18px] transition-colors"
          style={{
            background: theme.sectionBackground,
            boxShadow: `0 10px 18px ${theme.shadowColor}`,
          }}
        >
          <label className="flex flex-col gap-2">
            <span className={label} style={{ color: theme.titleColor }}>
              {t('folders.name')}
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('folders.namePlaceholder')}
              maxLength={FOLDER_TITLE_MAX}
              autoFocus
              className={`${field} h-[54px]`}
              style={{ borderColor: theme.softBorderColor, color: theme.titleColor }}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="flex items-baseline gap-1">
              <span className={label} style={{ color: theme.titleColor }}>
                {t('folders.description')}
              </span>
              <span className="text-[14px] font-medium" style={{ color: theme.mutedTextColor }}>
                {t('folders.optional')}
              </span>
            </span>
            <span className="relative block">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('folders.descriptionPlaceholder')}
                maxLength={FOLDER_DESC_MAX}
                className={`${field} h-[120px] resize-none py-3`}
                style={{ borderColor: theme.softBorderColor, color: theme.titleColor }}
              />
              <span
                className="pointer-events-none absolute right-3 bottom-2.5 text-[11px] font-semibold"
                style={{ color: theme.mutedTextColor }}
              >
                {description.length}/{FOLDER_DESC_MAX}
              </span>
            </span>
          </label>

          <div className="flex flex-col gap-2">
            <span className={label} style={{ color: theme.titleColor }}>
              {t('folders.color')}
            </span>
            <ColorPicker value={color} onChange={setColor} accent={theme.accent} />
          </div>

          {shownError && (
            <p role="alert" className="text-[13px] font-semibold text-(--color-cs-red)">
              {t(shownError)}
            </p>
          )}
        </div>

        {/* Live preview — the real card, so you see the folder before saving. */}
        <div className="flex flex-col gap-2.5">
          <span
            className="text-center text-[13px] font-semibold"
            style={{ color: theme.mutedTextColor }}
          >
            {t('folders.preview')}
          </span>
          <FolderCard
            folder={{
              id: 'preview',
              ownerUID: '',
              title: title.trim() || t('folders.previewPlaceholder'),
              description: '',
              colorHex: SET_COLOR_HEX[color],
              createdAt: 0,
              updatedAt: 0,
            }}
            setCount={0}
            onOpen={() => {}}
            onDelete={() => {}}
            interactive={false}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="flex h-14 flex-1 items-center justify-between rounded-full px-[22px] text-[16px] font-bold text-white transition-transform hover:brightness-105 active:scale-[0.99] disabled:opacity-70 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            style={{ background: theme.accent, boxShadow: `0 8px 16px ${theme.shadowColor}` }}
          >
            <span>{isSaving ? t('folders.saving') : submitLabel}</span>
            {!isSaving && <Icon name="arrow.right" className="size-[15px]" />}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="h-14 rounded-full bg-white px-6 text-[15px] font-semibold transition-colors hover:bg-black/[0.03] focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:outline-none"
            style={{ color: theme.mutedTextColor }}
          >
            {t('folders.cancel')}
          </button>
        </div>
      </form>
    </>
  );
};
