import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { DownloadSimple } from '@phosphor-icons/react';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { Icon } from '@/components/primitives/Icon';
import { CardEditor } from '@/components/create/CardEditor';
import { ColorPicker } from '@/components/create/ColorPicker';
import { CreateSection } from '@/components/create/CreateSection';
import { FolderPicker } from '@/components/create/FolderPicker';
import { IconPicker } from '@/components/create/IconPicker';
import { ImportCardsScreen } from '@/components/create/ImportCardsScreen';
import { PrivacyToggle } from '@/components/create/PrivacyToggle';
import { SetPreviewCard } from '@/components/create/SetPreviewCard';
import { ThemedScreen } from '@/components/create/ThemedScreen';
import { useCreateSet } from '@/hooks/useSets';
import { themeForColor } from '@/lib/setColors';
import type { ParsedCard } from '@/lib/importCards';
import {
  DESC_MAX,
  TITLE_MAX,
  emptyCard,
  emptyDraft,
  validateCreateSet,
  type CreateSetDraft,
} from '@/lib/createSetValidation';

export const Route = createFileRoute('/_authed/sets/new')({
  component: NewSetPage,
});

function NewSetPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const createSet = useCreateSet();
  const [draft, setDraft] = useState<CreateSetDraft>(emptyDraft);
  const [validationKey, setValidationKey] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const theme = themeForColor(draft.colorId);
  const patch = (p: Partial<CreateSetDraft>) => setDraft((d) => ({ ...d, ...p }));

  const validCardCount = draft.cards.filter(
    (c) => c.word.trim() && c.translation.trim(),
  ).length;

  /* Imported cards are appended, so anything already typed in the editor
     survives the round trip; only the untouched blank rows are dropped. */
  const handleImport = (imported: ParsedCard[]) => {
    const kept = draft.cards.filter((c) => c.word.trim() || c.translation.trim());
    const added = imported.map((c) => ({
      ...emptyCard(),
      word: c.term,
      translation: c.definition,
    }));
    patch({ cards: [...kept, ...added] });
    setIsImporting(false);
  };

  const handleSave = () => {
    const { errorKey } = validateCreateSet(draft);
    if (errorKey) {
      setValidationKey(errorKey);
      return;
    }
    setValidationKey(null);
    createSet.mutate(draft, {
      onSuccess: (set) => void navigate({ to: '/sets/$id', params: { id: set.id } }),
    });
  };

  const field =
    'w-full rounded-2xl border bg-white px-4 text-[15px] font-semibold outline-none transition-colors';
  const fieldStyle = { borderColor: theme.softBorderColor, color: theme.titleColor };
  const labelStyle = { color: theme.titleColor };
  const counterStyle = { color: theme.mutedTextColor };

  const mutationErrorKey =
    createSet.error instanceof Error && createSet.error.message.startsWith('createSet.')
      ? createSet.error.message
      : 'createSet.saveError';
  const shownError = validationKey ?? (createSet.isError ? mutationErrorKey : null);

  if (isImporting) {
    return (
      <ImportCardsScreen
        theme={theme}
        onCancel={() => setIsImporting(false)}
        onImport={handleImport}
      />
    );
  }

  return (
    <ContentContainer>
      <ThemedScreen background={theme.screenBackground} />
      <PageHeader title={t('createSet.title')} subtitle={t('createSet.subtitle')} />

      <div className="flex flex-col gap-3.5 lg:gap-[18px]">
        <CreateSection title={t('createSet.infoSection')} theme={theme}>
          <label className="flex flex-col gap-1.5">
            <span className="flex items-center justify-between text-[14px] font-bold" style={labelStyle}>
              {t('createSet.setTitle')}
              <span className="text-[12px] font-medium" style={counterStyle}>
                {draft.title.trim().length}/{TITLE_MAX}
              </span>
            </span>
            <input
              value={draft.title}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder={t('createSet.setTitlePlaceholder')}
              maxLength={TITLE_MAX}
              className={`h-12 ${field}`}
              style={fieldStyle}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="flex items-center justify-between text-[14px] font-bold" style={labelStyle}>
              {t('createSet.setDescription')}
              <span className="text-[12px] font-medium" style={counterStyle}>
                {draft.description.trim().length}/{DESC_MAX}
              </span>
            </span>
            <textarea
              value={draft.description}
              onChange={(e) => patch({ description: e.target.value })}
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
            <PrivacyToggle value={draft.privacy} onChange={(privacy) => patch({ privacy })} />
          </div>
        </CreateSection>

        <CreateSection title={t('createSet.cardsSection')} theme={theme}>
          <button
            type="button"
            onClick={() => setIsImporting(true)}
            className="flex h-11 items-center gap-2 self-start rounded-2xl bg-white px-4 text-[15px] font-semibold transition-colors hover:bg-black/[0.03] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            style={{ color: theme.accent, boxShadow: `0 4px 10px ${theme.shadowColor}` }}
          >
            <DownloadSimple size={18} weight="bold" />
            {t('createSet.import.button')}
          </button>

          <CardEditor cards={draft.cards} onChange={(cards) => patch({ cards })} />
        </CreateSection>

        <CreateSection title={t('createSet.customizeSection')} theme={theme}>
          <div className="flex flex-col gap-2">
            <span className="text-[14px] font-bold" style={labelStyle}>
              {t('createSet.color')}
            </span>
            <ColorPicker
              value={draft.colorId}
              onChange={(colorId) => patch({ colorId })}
              accent={theme.accent}
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[14px] font-bold" style={labelStyle}>
              {t('createSet.icon')}
            </span>
            <IconPicker value={draft.iconName} onChange={(iconName) => patch({ iconName })} />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[14px] font-bold" style={labelStyle}>
              {t('createSet.folder')}
            </span>
            <FolderPicker
              value={draft.folderID}
              onChange={(folderID, folderName) => patch({ folderID, folderName })}
            />
          </div>
        </CreateSection>

        <CreateSection title={t('createSet.previewSection')} theme={theme}>
          <SetPreviewCard
            title={draft.title}
            iconName={draft.iconName}
            colorId={draft.colorId}
            cardCount={validCardCount}
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
            disabled={createSet.isPending}
            className="flex h-14 flex-1 items-center justify-between rounded-[24px] px-6 text-[18px] font-semibold text-white transition-transform hover:brightness-105 active:scale-[0.99] disabled:opacity-70 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none md:h-[66px] md:rounded-[28px] md:text-[21px]"
            style={{ background: theme.accent, boxShadow: `0 8px 12px ${theme.shadowColor}` }}
          >
            <span>{createSet.isPending ? t('createSet.saving') : t('createSet.save')}</span>
            {!createSet.isPending && <Icon name="arrow.right" className="size-[19px]" />}
          </button>
          <button
            type="button"
            onClick={() => void navigate({ to: '/sets' })}
            className="h-14 rounded-[24px] bg-white px-6 text-[15px] font-semibold transition-colors hover:bg-black/[0.03] focus-visible:outline-none md:h-[66px]"
            style={{ color: theme.mutedTextColor }}
          >
            {t('createSet.cancel')}
          </button>
        </div>
      </div>
    </ContentContainer>
  );
}
