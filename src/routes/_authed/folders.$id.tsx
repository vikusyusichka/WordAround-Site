import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { PencilSimple, Trash } from '@phosphor-icons/react';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { ConfirmDialog } from '@/components/shell/ConfirmDialog';
import { ThemedScreen } from '@/components/create/ThemedScreen';
import { FolderForm } from '@/components/folders/FolderForm';
import { SetItem } from '@/components/home/SetItem';
import { Icon } from '@/components/primitives/Icon';
import { useDeleteFolder, useFoldersQuery, useUpdateFolder } from '@/hooks/useFolders';
import { useFolderSetsQuery } from '@/hooks/useSets';
import { mapSetToPreview } from '@/lib/setPreview';
import { colorIdForHex, themeForHex } from '@/lib/setColors';

export const Route = createFileRoute('/_authed/folders/$id')({
  /* ?edit=true opens straight into the form — that is how the pencil on a
     folder card gets here without duplicating the form on the list screen. */
  validateSearch: (search: Record<string, unknown>): { edit?: boolean } => ({
    edit: search.edit === true || search.edit === 'true' ? true : undefined,
  }),
  component: FolderDetailPage,
});

function FolderDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = Route.useParams();
  const { data: folders, isLoading } = useFoldersQuery();
  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();
  const { edit } = Route.useSearch();
  const [isEditing, setIsEditing] = useState(edit === true);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  /* Drop the flag once the form is open, so a later reload lands on the
     folder itself rather than reopening the editor. */
  const closeEditor = () => {
    setIsEditing(false);
    void navigate({ to: '/folders/$id', params: { id }, search: {}, replace: true });
  };

  const folder = folders?.find((f) => f.id === id);

  if (isLoading) {
    return (
      <ContentContainer>
        <p className="text-[15px] font-medium text-(--color-text-secondary)">{t('folders.loading')}</p>
      </ContentContainer>
    );
  }

  if (!folder) {
    return (
      <ContentContainer>
        <PageHeader title={t('folders.notFoundTitle')} subtitle={t('folders.notFoundBody')} />
        <button
          type="button"
          onClick={() => void navigate({ to: '/folders' })}
          className="h-11 rounded-2xl border border-(--color-auth-field-border) bg-white px-5 text-[15px] font-semibold text-(--color-primary-blue) focus-visible:outline-none"
        >
          {t('folders.backToFolders')}
        </button>
      </ContentContainer>
    );
  }

  const theme = themeForHex(folder.colorHex);

  const handleDelete = () => {
    deleteFolder.mutate(folder.id, {
      onSuccess: () => void navigate({ to: '/folders' }),
      onError: () => setIsConfirmingDelete(false),
    });
  };

  if (isEditing) {
    return (
      <ContentContainer>
        <PageHeader title={t('folders.editTitle')} />
        <FolderForm
          initialTitle={folder.title}
          initialDescription={folder.description}
          initialColor={colorIdForHex(folder.colorHex)}
          submitLabel={t('folders.save')}
          isSaving={updateFolder.isPending}
          errorKey={updateFolder.isError ? 'folders.saveError' : null}
          onSubmit={(values) =>
            updateFolder.mutate(
              { ...folder, title: values.title, description: values.description, colorHex: values.colorHex },
              { onSuccess: closeEditor },
            )
          }
          onCancel={closeEditor}
        />
      </ContentContainer>
    );
  }

  return (
    <ContentContainer fluid>
      <ThemedScreen background={theme.screenBackground} />

      {/* Themed header */}
      <div
        className="mb-8 flex items-center gap-5 rounded-3xl border p-6 shadow-[0_6px_16px_rgba(0,0,0,0.04)]"
        style={{ background: theme.previewBackground, borderColor: theme.softBorderColor }}
      >
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl" style={{ background: theme.accent }}>
          <Icon name="folder.fill" className="size-8 text-white" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="truncate text-[26px] font-bold" style={{ color: theme.titleColor }}>{folder.title}</h1>
          {folder.description && (
            <p className="truncate text-[15px] font-medium text-(--color-cs-text-muted)">
              {folder.description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            aria-label={t('folders.edit')}
            className="grid size-11 place-items-center rounded-full bg-white/90 text-(--color-primary-blue-dark) shadow-[0_2px_6px_rgba(0,0,0,0.08)] transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:outline-none"
          >
            <PencilSimple size={18} weight="bold" />
          </button>
          <button
            type="button"
            onClick={() => setIsConfirmingDelete(true)}
            aria-label={t('folders.delete')}
            className="grid size-11 place-items-center rounded-full bg-white/90 text-(--color-cs-red) shadow-[0_2px_6px_rgba(0,0,0,0.08)] transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:outline-none"
          >
            <Trash size={18} weight="bold" />
          </button>
        </div>
      </div>

      {/* Sets in this folder */}
      <FolderSets folderId={folder.id} />

      {isConfirmingDelete && (
        <ConfirmDialog
          title={t('folders.deleteConfirmTitle')}
          body={t('folders.deleteConfirm', { title: folder.title })}
          isBusy={deleteFolder.isPending}
          onConfirm={handleDelete}
          onCancel={() => setIsConfirmingDelete(false)}
        />
      )}
    </ContentContainer>
  );
}

function FolderSets({ folderId }: { folderId: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: sets, isLoading } = useFolderSetsQuery(folderId);

  if (isLoading) {
    return (
      <p className="text-[15px] font-medium text-(--color-text-secondary)">{t('sets.loading')}</p>
    );
  }

  if (!sets || sets.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-3xl border border-white/80 bg-white/70 px-6 py-14 text-center shadow-[0_6px_16px_rgba(0,0,0,0.04)]">
        <span className="text-[16px] font-medium text-(--color-text-secondary)">
          {t('folders.noSetsInFolder')}
        </span>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {sets.map((set) => (
        <button
          key={set.id}
          type="button"
          onClick={() => void navigate({ to: '/sets/$id', params: { id: set.id } })}
          className="block text-left transition-transform hover:-translate-y-0.5 active:scale-[0.99]"
        >
          <SetItem
            item={mapSetToPreview(set, t('sets.cardCount', { count: set.cards.length }))}
            trailingText={t('home.review')}
          />
        </button>
      ))}
    </div>
  );
}
