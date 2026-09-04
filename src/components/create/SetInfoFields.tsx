/* Everything about a set except its cards: title, description, privacy, and
   the customize block (colour, icon, folder).

   Shared by the create wizard and the edit screen so both stay one design —
   the fields, order and copy below are the create screen's, moved here
   unchanged. */
import { useTranslation } from 'react-i18next';

import { ColorPicker } from './ColorPicker';
import { CreateSection } from './CreateSection';
import { FolderPicker } from './FolderPicker';
import { IconPicker } from './IconPicker';
import { PrivacyToggle } from './PrivacyToggle';
import { DESC_MAX, TITLE_MAX, type SetInfoValues } from '@/lib/createSetValidation';
import type { SetTheme } from '@/lib/setColors';

interface SetInfoFieldsProps {
  values: SetInfoValues;
  onChange: (patch: Partial<SetInfoValues>) => void;
  theme: SetTheme;
  /** Rendered between the two sections — the cards block on the create screen. */
  children?: React.ReactNode;
}

export const SetInfoFields = ({ values, onChange, theme, children }: SetInfoFieldsProps) => {
  const { t } = useTranslation();

  const field =
    'w-full rounded-2xl border bg-white px-4 text-[15px] font-semibold outline-none transition-colors';
  const fieldStyle = { borderColor: theme.softBorderColor, color: theme.titleColor };
  const labelStyle = { color: theme.titleColor };
  const counterStyle = { color: theme.mutedTextColor };

  return (
    <>
      <CreateSection title={t('createSet.infoSection')} theme={theme}>
        <label className="flex flex-col gap-1.5">
          <span
            className="flex items-center justify-between text-[14px] font-bold"
            style={labelStyle}
          >
            {t('createSet.setTitle')}
            <span className="text-[12px] font-medium" style={counterStyle}>
              {values.title.trim().length}/{TITLE_MAX}
            </span>
          </span>
          <input
            value={values.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder={t('createSet.setTitlePlaceholder')}
            maxLength={TITLE_MAX}
            className={`h-12 ${field}`}
            style={fieldStyle}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span
            className="flex items-center justify-between text-[14px] font-bold"
            style={labelStyle}
          >
            {t('createSet.setDescription')}
            <span className="text-[12px] font-medium" style={counterStyle}>
              {values.description.trim().length}/{DESC_MAX}
            </span>
          </span>
          <textarea
            value={values.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder={t('createSet.setDescriptionPlaceholder')}
            rows={2}
            maxLength={DESC_MAX}
            className={`resize-none py-3 ${field}`}
            style={fieldStyle}
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-[14px] font-bold" style={labelStyle}>
            {t('createSet.privacy')}
          </span>
          <PrivacyToggle
            value={values.privacy}
            onChange={(privacy) => onChange({ privacy })}
            theme={theme}
          />
        </div>
      </CreateSection>

      {children}

      <CreateSection title={t('createSet.customizeSection')} theme={theme}>
        <div className="flex flex-col gap-2">
          <span className="text-[14px] font-bold" style={labelStyle}>
            {t('createSet.color')}
          </span>
          <ColorPicker
            value={values.colorId}
            onChange={(colorId) => onChange({ colorId })}
            accent={theme.accent}
          />
        </div>

        <IconPicker
          value={values.iconName}
          onChange={(iconName) => onChange({ iconName })}
          theme={theme}
          label={t('createSet.iconPicker.title')}
        />

        <div className="flex flex-col gap-2">
          <span className="text-[14px] font-bold" style={labelStyle}>
            {t('createSet.folder')}
          </span>
          <FolderPicker
            value={values.folderID}
            onChange={(folderID, folderName) => onChange({ folderID, folderName })}
            theme={theme}
          />
        </div>
      </CreateSection>
    </>
  );
};
