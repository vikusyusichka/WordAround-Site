import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { PlaceholderPage } from '@/components/shell/PlaceholderPage';

export const Route = createFileRoute('/_authed/folders')({
  component: FoldersPage,
});

/* Placeholder — real folders CRUD lands in Phase 3. */
function FoldersPage() {
  const { t } = useTranslation();
  return (
    <PlaceholderPage
      title={t('home.title.folders')}
      subtitle={t('home.subtitle.folders')}
      icon="folder.fill"
    />
  );
}
