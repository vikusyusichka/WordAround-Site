/* /exams/custom/$testId/results/$attemptId — one finished attempt: the
   learner's own result, or (for the test's author) a learner's. */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { AttemptReview } from '@/components/customTests/AttemptReview';
import { TestStatus } from '@/components/customTests/TestStatus';
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/exams/ui';
import { BackLink } from '@/components/shell/BackLink';
import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { useAttempt } from '@/hooks/useCustomTests';
import { useUid } from '@/hooks/useFolders';

export const Route = createFileRoute('/_authed/exams/custom/$testId/results/$attemptId')({
  component: ResultPage,
});

function ResultPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const uid = useUid();
  const { testId, attemptId } = Route.useParams();
  const attempt = useAttempt(testId, attemptId);

  if (!attempt.data) return <TestStatus query={attempt} />;
  const isMine = attempt.data.userId === uid;
  const toTest = () => void navigate({ to: '/exams/custom/$testId', params: { testId } });

  return (
    <ContentContainer>
      <BackLink label={attempt.data.testTitle} onClick={toTest} className="mb-4" />
      <PageHeader title={t('exams.custom.result.title')} subtitle={attempt.data.testTitle} />
      <AttemptReview attempt={attempt.data} showName={!isMine} />
      <div className="mt-6 flex flex-wrap gap-3">
        {isMine && (
          <button
            type="button"
            className={PRIMARY_BUTTON}
            onClick={() => void navigate({ to: '/exams/custom/$testId/take', params: { testId } })}
          >
            {t('exams.custom.result.again')}
          </button>
        )}
        <button
          type="button"
          className={SECONDARY_BUTTON}
          onClick={() => void navigate({ to: '/exams', search: { tab: 'custom' } })}
        >
          {t('exams.tabs.custom')}
        </button>
      </div>
    </ContentContainer>
  );
}
