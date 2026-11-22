/* /exams/custom/$testId/edit — the constructor on an existing test. Only its
   author gets the editor; anyone else is sent to the test page. */
import { createFileRoute, Navigate, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { TestEditor } from '@/components/customTests/TestEditor';
import { TestStatus } from '@/components/customTests/TestStatus';
import { BackLink } from '@/components/shell/BackLink';
import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { useCustomTest, useSaveTest } from '@/hooks/useCustomTests';
import { useUid } from '@/hooks/useFolders';

export const Route = createFileRoute('/_authed/exams/custom/$testId/edit')({
  component: EditTestPage,
});

function EditTestPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { testId } = Route.useParams();
  const uid = useUid();
  const test = useCustomTest(testId);
  const saveTest = useSaveTest();
  const back = () => void navigate({ to: '/exams/custom/$testId', params: { testId } });

  if (!test.data) return <TestStatus query={test} />;
  if (test.data.ownerId !== uid) return <Navigate to="/exams/custom/$testId" params={{ testId }} />;

  return (
    <ContentContainer>
      <BackLink label={test.data.title} onClick={back} className="mb-4" />
      <PageHeader title={t('exams.custom.editTitle')} />
      <TestEditor
        initial={test.data}
        isSaving={saveTest.isPending}
        saveFailed={saveTest.isError}
        onCancel={back}
        onSave={(updated) => saveTest.mutate({ ...updated, updatedAt: Date.now() }, { onSuccess: back })}
      />
    </ContentContainer>
  );
}
