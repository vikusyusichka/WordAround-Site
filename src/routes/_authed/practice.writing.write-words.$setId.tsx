/* WriteWords game route — /practice/writing/write-words/$setId. Standalone
   page (its own PageHeader); does NOT share chrome with the /practice/writing
   landing. */
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { WriteWordsScreen } from '@/components/writing/WriteWordsScreen';

export const Route = createFileRoute('/_authed/practice/writing/write-words/$setId')({
  component: WriteWordsPage,
});

function WriteWordsPage() {
  const { t } = useTranslation();
  const { setId } = Route.useParams();

  return (
    <ContentContainer fluid>
      <PageHeader
        title={t('writing.writeWords.title')}
        subtitle={t('writing.writeWords.subtitle')}
      />
      <WriteWordsScreen setId={setId} />
    </ContentContainer>
  );
}
