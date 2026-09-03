import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Plus } from '@phosphor-icons/react';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { ConfirmDialog } from '@/components/shell/ConfirmDialog';
import { FolderCard } from '@/components/folders/FolderCard';
import { ViewToggle } from '@/components/shell/ViewToggle';
import { cardGridClass, useCardView } from '@/lib/cardView';
import { useDeleteFolder, useFoldersQuery } from '@/hooks/useFolders';
import { useSetsQuery } from '@/hooks/useSets';
import type { Folder } from '@/lib/models';

export const Route = createFileRoute('/_authed/folders/')({
  component: FoldersPage,
});

function FoldersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: folders, isLoading, isError } = useFoldersQuery();
  const { data: sets } = useSetsQuery();
  const deleteFolder = useDeleteFolder();

  const [view, chooseView] = useCardView('folders');
  const [pendingDelete, setPendingDelete] = useState<Folder | null>(null);

  /* One sets query for the whole list rather than one per folder. */
  const setsPerFolder = new Map<string, number>();
  for (const set of sets ?? []) {
    if (!set.folderID) continue;
    setsPerFolder.set(set.folderID, (setsPerFolder.get(set.folderID) ?? 0) + 1);
  }

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteFolder.mutate(pendingDelete.id, { onSettled: () => setPendingDelete(null) });
  };

  return (
    <ContentContainer fluid>
      <PageHeader
        title={t('home.title.folders')}
        subtitle={t('home.subtitle.folders')}
        actions={
          <>
            <ViewToggle value={view} onChange={chooseView} />

            <button
              type="button"
              onClick={() => void navigate({ to: '/folders/new' })}
              className="flex h-11 items-center gap-2 rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) px-4 text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <Plus size={18} weight="bold" />
              {t('folders.create')}
            </button>
          </>
        }
      />

      {isLoading ? (
        <p className="text-[15px] font-medium text-(--color-text-secondary)">
          {t('folders.loading')}
        </p>
      ) : isError ? (
        <p role="alert" className="text-[15px] font-medium text-(--color-cs-red)">
          {t('folders.loadError')}
        </p>
      ) : !folders || folders.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-white/80 bg-white/70 px-6 py-16 text-center shadow-[0_6px_16px_rgba(0,0,0,0.04)]">
          <span className="text-[20px] font-bold text-(--color-primary-blue-dark)">
            {t('folders.emptyTitle')}
          </span>
          <span className="max-w-sm text-[15px] font-medium text-(--color-text-secondary)">
            {t('folders.emptyBody')}
          </span>
        </div>
      ) : (
        <div className={cardGridClass(view)}>
          {folders.map((folder) => (
            <FolderCard
              key={folder.id}
              folder={folder}
              setCount={setsPerFolder.get(folder.id) ?? 0}
              variant={view}
              onOpen={() => void navigate({ to: '/folders/$id', params: { id: folder.id } })}
              onEdit={() =>
                void navigate({
                  to: '/folders/$id',
                  params: { id: folder.id },
                  search: { edit: true },
                })
              }
              onDelete={() => setPendingDelete(folder)}
            />
          ))}
        </div>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title={t('folders.deleteConfirmTitle')}
          body={t('folders.deleteConfirm', { title: pendingDelete.title })}
          isBusy={deleteFolder.isPending}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </ContentContainer>
  );
}
