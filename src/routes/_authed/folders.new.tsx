import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { FolderForm } from '@/components/folders/FolderForm';
import { useCreateFolder } from '@/hooks/useFolders';

export const Route = createFileRoute('/_authed/folders/new')({
  component: NewFolderPage,
});

function NewFolderPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const createFolder = useCreateFolder();

  return (
    <ContentContainer>
      <PageHeader title={t('folders.newTitle')} subtitle={t('folders.newSubtitle')} />
      <FolderForm
        submitLabel={t('folders.create')}
        isSaving={createFolder.isPending}
        errorKey={createFolder.isError ? 'folders.saveError' : null}
        onSubmit={(values) =>
          createFolder.mutate(values, {
            onSuccess: () => void navigate({ to: '/folders' }),
          })
        }
        onCancel={() => void navigate({ to: '/folders' })}
      />
    </ContentContainer>
  );
}
