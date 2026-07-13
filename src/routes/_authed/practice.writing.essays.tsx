/* Essays route — /practice/writing/essays. Standalone page. Sibling of
   `practice.writing.index.tsx` under `practice.writing.*` — file-based flat
   routing resolves both correctly because they have exact-static segments
   (no `$` params inline). */
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { EssaysScreen } from '@/components/writing/EssaysScreen';

export const Route = createFileRoute('/_authed/practice/writing/essays')({
  component: EssaysPage,
});

function EssaysPage() {
  const { t } = useTranslation();
  return (
    <ContentContainer fluid>
      <PageHeader
        title={t('writing.essays.title')}
        subtitle={t('writing.essays.subtitle')}
      />
      <EssaysScreen />
    </ContentContainer>
  );
}
