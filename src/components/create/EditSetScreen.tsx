/* Editing an existing set: the same fields the wizard offers, minus the cards
   — those have their own editor on the set screen, and two ways to edit one
   thing is one too many.

   The screen repaints as the colour changes, so the choice is visible before
   it is saved. */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { Icon } from '@/components/primitives/Icon';
import { CreateSection } from './CreateSection';
import { SetInfoFields } from './SetInfoFields';
import { SetPreviewCard } from './SetPreviewCard';
import { ThemedScreen } from './ThemedScreen';
import { useUpdateSet } from '@/hooks/useSets';
import { DEFAULT_SET_ICON } from '@/lib/iconSuggester';
import { colorIdForHex, themeForColor } from '@/lib/setColors';
import { validateSetInfo, type SetInfoValues } from '@/lib/createSetValidation';
import type { FlashcardSet } from '@/lib/models';

interface EditSetScreenProps {
  set: FlashcardSet;
  onClose: () => void;
}

const valuesFrom = (set: FlashcardSet): SetInfoValues => ({
  title: set.title,
  description: set.description,
  privacy: set.privacy === 'Public' ? 'Public' : 'Private',
  folderID: set.folderID ?? null,
  folderName: set.folderName ?? null,
  colorId: colorIdForHex(set.colorHex),
  /* Emoji and custom-image icons are an iOS-only case the picker can't show;
     falling back beats rendering nothing. */
  iconName: set.icon.type === 'systemName' ? set.icon.value : DEFAULT_SET_ICON,
});

export const EditSetScreen = ({ set, onClose }: EditSetScreenProps) => {
  const { t } = useTranslation();
  const updateSet = useUpdateSet();
  const [values, setValues] = useState<SetInfoValues>(() => valuesFrom(set));
  const [validationKey, setValidationKey] = useState<string | null>(null);

  const theme = themeForColor(values.colorId);
  const patch = (p: Partial<SetInfoValues>) => setValues((v) => ({ ...v, ...p }));

  const handleSave = () => {
    const errorKey = validateSetInfo(values);
    if (errorKey) {
      setValidationKey(errorKey);
      return;
    }
    setValidationKey(null);
    updateSet.mutate({ setId: set.id, values }, { onSuccess: onClose });
  };

  const mutationErrorKey =
    updateSet.error instanceof Error && updateSet.error.message.startsWith('createSet.')
      ? updateSet.error.message
      : 'sets.saveError';
  const shownError = validationKey ?? (updateSet.isError ? mutationErrorKey : null);

  return (
    <ContentContainer>
      <ThemedScreen background={theme.screenBackground} />
      <PageHeader title={t('sets.editTitle')} subtitle={t('sets.editSubtitle')} />

      <div className="flex flex-col gap-3.5 lg:gap-[18px]">
        <SetInfoFields values={values} onChange={patch} theme={theme} />

        <CreateSection title={t('createSet.previewSection')} theme={theme}>
          <SetPreviewCard
            title={values.title}
            iconName={values.iconName}
            colorId={values.colorId}
            cardCount={set.cards.length}
          />
        </CreateSection>

        {shownError && (
          <p role="alert" className="text-[14px] font-medium text-(--color-cs-red)">
            {t(shownError)}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={updateSet.isPending}
            className="flex h-14 flex-1 items-center justify-between rounded-[24px] px-6 text-[18px] font-semibold text-white transition-transform hover:brightness-105 active:scale-[0.99] disabled:opacity-70 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none md:h-[66px] md:rounded-[28px] md:text-[21px]"
            style={{ background: theme.accent, boxShadow: `0 8px 12px ${theme.shadowColor}` }}
          >
            <span>{updateSet.isPending ? t('sets.saving') : t('sets.save')}</span>
            {!updateSet.isPending && <Icon name="checkmark" className="size-[19px]" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-14 rounded-[24px] bg-white px-6 text-[15px] font-semibold transition-colors hover:bg-black/[0.03] focus-visible:outline-none md:h-[66px]"
            style={{ color: theme.mutedTextColor }}
          >
            {t('sets.cancel')}
          </button>
        </div>
      </div>
    </ContentContainer>
  );
};
