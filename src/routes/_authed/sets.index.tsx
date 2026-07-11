import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Plus, Trash } from '@phosphor-icons/react';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { SetItem } from '@/components/home/SetItem';
import { useDeleteSet, useSetsQuery } from '@/hooks/useSets';
import { mapSetToPreview } from '@/lib/setPreview';

export const Route = createFileRoute('/_authed/sets/')({
  component: SetsPage,
});

function SetsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: sets, isLoading, isError } = useSetsQuery();
  const deleteSet = useDeleteSet();

  const handleDelete = (id: string, title: string) => {
    if (window.confirm(t('sets.deleteConfirm', { title }))) deleteSet.mutate(id);
  };

  return (
    <ContentContainer fluid>
      <PageHeader
        title={t('home.title.sets')}
        subtitle={t('home.subtitle.sets')}
        actions={
          <button
            type="button"
            onClick={() => void navigate({ to: '/sets/new' })}
            className="flex h-11 items-center gap-2 rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) px-4 text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <Plus size={18} weight="bold" />
            {t('sets.create')}
          </button>
        }
      />

      {isLoading ? (
        <p className="text-[15px] font-medium text-(--color-text-secondary)">{t('sets.loading')}</p>
      ) : isError ? (
        <p role="alert" className="text-[15px] font-medium text-(--color-cs-red)">
          {t('sets.loadError')}
        </p>
      ) : !sets || sets.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-white/80 bg-white/70 px-6 py-16 text-center shadow-[0_6px_16px_rgba(0,0,0,0.04)]">
          <span className="text-[20px] font-bold text-(--color-primary-blue-dark)">
            {t('sets.emptyTitle')}
          </span>
          <span className="max-w-sm text-[15px] font-medium text-(--color-text-secondary)">
            {t('sets.emptyBody')}
          </span>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {sets.map((set) => {
            const preview = mapSetToPreview(set, t('sets.cardCount', { count: set.cards.length }));
            return (
              <div key={set.id} className="group relative">
                <button
                  type="button"
                  onClick={() => void navigate({ to: '/sets/$id', params: { id: set.id } })}
                  className="block w-full text-left transition-transform hover:-translate-y-0.5 active:scale-[0.99]"
                >
                  <SetItem item={preview} trailingText={t('home.review')} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(set.id, set.title)}
                  aria-label={t('sets.delete')}
                  className="absolute top-3 right-3 grid size-8 place-items-center rounded-full bg-white/90 text-(--color-cs-red) opacity-0 shadow-[0_2px_6px_rgba(0,0,0,0.08)] transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
                >
                  <Trash size={16} weight="bold" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </ContentContainer>
  );
}
