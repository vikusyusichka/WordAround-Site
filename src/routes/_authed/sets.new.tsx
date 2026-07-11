import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { CardEditor } from '@/components/create/CardEditor';
import { ColorPicker } from '@/components/create/ColorPicker';
import { FolderPicker } from '@/components/create/FolderPicker';
import { IconPicker } from '@/components/create/IconPicker';
import { PrivacyToggle } from '@/components/create/PrivacyToggle';
import { SetPreviewCard } from '@/components/create/SetPreviewCard';
import { useCreateSet } from '@/hooks/useSets';
import {
  DESC_MAX,
  TITLE_MAX,
  emptyDraft,
  validateCreateSet,
  type CreateSetDraft,
} from '@/lib/createSetValidation';

export const Route = createFileRoute('/_authed/sets/new')({
  component: NewSetPage,
});

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="flex flex-col gap-3 rounded-3xl border border-white/80 bg-white/70 p-5 shadow-[0_6px_16px_rgba(0,0,0,0.04)] lg:p-6">
    <h2 className="text-[16px] font-bold text-(--color-cs-dark-text)">{title}</h2>
    {children}
  </section>
);

function NewSetPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const createSet = useCreateSet();
  const [draft, setDraft] = useState<CreateSetDraft>(emptyDraft);
  const [validationKey, setValidationKey] = useState<string | null>(null);

  const patch = (p: Partial<CreateSetDraft>) => setDraft((d) => ({ ...d, ...p }));

  const validCardCount = draft.cards.filter(
    (c) => c.word.trim() && c.translation.trim(),
  ).length;

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
    'rounded-2xl border border-(--color-auth-field-border) bg-white px-4 text-[15px] font-medium text-(--color-cs-dark-text) outline-none focus-visible:border-(--color-home-brand)';

  const mutationErrorKey =
    createSet.error instanceof Error && createSet.error.message.startsWith('createSet.')
      ? createSet.error.message
      : 'createSet.saveError';
  const shownError = validationKey ?? (createSet.isError ? mutationErrorKey : null);

  return (
    <ContentContainer>
      <PageHeader title={t('createSet.title')} subtitle={t('createSet.subtitle')} />

      <div className="flex flex-col gap-5">
        <Section title={t('createSet.infoSection')}>
          <label className="flex flex-col gap-1.5">
            <span className="flex items-center justify-between text-[14px] font-semibold text-(--color-cs-dark-text)">
              {t('createSet.setTitle')}
              <span className="text-[12px] font-medium text-(--color-cs-text-muted)">
                {draft.title.trim().length}/{TITLE_MAX}
              </span>
            </span>
            <input
              value={draft.title}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder={t('createSet.setTitlePlaceholder')}
              className={`h-12 ${field}`}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="flex items-center justify-between text-[14px] font-semibold text-(--color-cs-dark-text)">
              {t('createSet.setDescription')}
              <span className="text-[12px] font-medium text-(--color-cs-text-muted)">
                {draft.description.trim().length}/{DESC_MAX}
              </span>
            </span>
            <textarea
              value={draft.description}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder={t('createSet.setDescriptionPlaceholder')}
              rows={2}
              className={`resize-none py-3 ${field}`}
            />
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-[14px] font-semibold text-(--color-cs-dark-text)">
              {t('createSet.privacy')}
            </span>
            <PrivacyToggle value={draft.privacy} onChange={(privacy) => patch({ privacy })} />
          </div>
        </Section>

        <Section title={t('createSet.cardsSection')}>
          <CardEditor cards={draft.cards} onChange={(cards) => patch({ cards })} />
        </Section>

        <Section title={t('createSet.customizeSection')}>
          <div className="flex flex-col gap-2">
            <span className="text-[14px] font-semibold text-(--color-cs-dark-text)">
              {t('createSet.color')}
            </span>
            <ColorPicker value={draft.colorId} onChange={(colorId) => patch({ colorId })} />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[14px] font-semibold text-(--color-cs-dark-text)">
              {t('createSet.icon')}
            </span>
            <IconPicker value={draft.iconName} onChange={(iconName) => patch({ iconName })} />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[14px] font-semibold text-(--color-cs-dark-text)">
              {t('createSet.folder')}
            </span>
            <FolderPicker
              value={draft.folderID}
              onChange={(folderID, folderName) => patch({ folderID, folderName })}
            />
          </div>
        </Section>

        <Section title={t('createSet.previewSection')}>
          <SetPreviewCard
            title={draft.title}
            iconName={draft.iconName}
            colorId={draft.colorId}
            cardCount={validCardCount}
          />
        </Section>

        {shownError && (
          <p role="alert" className="text-[14px] font-medium text-(--color-cs-red)">
            {t(shownError)}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={createSet.isPending}
            className="h-12 rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) px-6 text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98] disabled:opacity-70 focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            {createSet.isPending ? t('createSet.saving') : t('createSet.save')}
          </button>
          <button
            type="button"
            onClick={() => void navigate({ to: '/sets' })}
            className="h-12 rounded-2xl border border-(--color-auth-field-border) bg-white px-6 text-[15px] font-semibold text-(--color-cs-text-muted) transition-colors hover:bg-black/[0.03] focus-visible:outline-none"
          >
            {t('createSet.cancel')}
          </button>
        </div>
      </div>
    </ContentContainer>
  );
}
