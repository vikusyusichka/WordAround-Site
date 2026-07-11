import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { PlaceholderPage } from '@/components/shell/PlaceholderPage';

export const Route = createFileRoute('/_authed/sets')({
  component: SetsPage,
});

/* Placeholder — the full sets list/detail lands in Phase 3. */
function SetsPage() {
  const { t } = useTranslation();
  return (
    <PlaceholderPage
      title={t('home.title.sets')}
      subtitle={t('home.subtitle.sets')}
      icon="square.stack.3d.up"
    />
  );
}
