/* /exams/custom/new — the constructor, starting from an empty test. */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { TestEditor } from '@/components/customTests/TestEditor';
import { BackLink } from '@/components/shell/BackLink';
import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { useSaveTest } from '@/hooks/useCustomTests';
import { useUid } from '@/hooks/useFolders';
import type { CustomTest } from '@/lib/customTests/model';
import { useSessionStore } from '@/stores/sessionStore';

export const Route = createFileRoute('/_authed/exams/custom/new')({
  component: NewTestPage,
});

function NewTestPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const uid = useUid();
  const name = useSessionStore((s) => s.currentName);
  const saveTest = useSaveTest();
  const [initial] = useState<CustomTest>(() => {
    const now = Date.now();
    return {
      id: crypto.randomUUID(),
      ownerId: uid ?? '',
      ownerName: name ?? '',
      title: '',
      description: '',
      languageId: 'english',
      timeLimitMinutes: null,
      sections: [],
      createdAt: now,
      updatedAt: now,
    };
  });

  const back = () => void navigate({ to: '/exams', search: { tab: 'custom' } });

  return (
    <ContentContainer>
      <BackLink label={t('exams.tabs.custom')} onClick={back} className="mb-4" />
      <PageHeader title={t('exams.custom.newTitle')} subtitle={t('exams.custom.newSubtitle')} />
      <TestEditor
        initial={initial}
        isSaving={saveTest.isPending}
        saveFailed={saveTest.isError}
        onCancel={back}
        onSave={(test) =>
          saveTest.mutate(
            { ...test, ownerId: uid ?? test.ownerId, ownerName: name ?? '', updatedAt: Date.now() },
            { onSuccess: () => void navigate({ to: '/exams/custom/$testId', params: { testId: test.id } }) },
          )
        }
      />
    </ContentContainer>
  );
}
