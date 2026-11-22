/* /exams/custom/$testId — a test's own page, and the link its author shares.
   Everyone sees what the test is and can start it. The author also gets
   Edit / Share / Delete and the results of everyone who has taken it. */
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { percentColor, SECTION_ICONS } from '@/components/customTests/display';
import { TestStatus } from '@/components/customTests/TestStatus';
import { CARD, PRIMARY_BUTTON, SECONDARY_BUTTON, SECTION_TITLE } from '@/components/exams/ui';
import { Icon } from '@/components/primitives/Icon';
import { BackLink } from '@/components/shell/BackLink';
import { ConfirmDialog } from '@/components/shell/ConfirmDialog';
import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { useCustomTest, useDeleteTest, useMyAttempts, useTestAttempts } from '@/hooks/useCustomTests';
import { useUid } from '@/hooks/useFolders';
import type { CustomTestAttempt } from '@/lib/customTests/customTestStorage';
import { questionCount } from '@/lib/customTests/model';
import { findLanguage } from '@/lib/essayTypes';

export const Route = createFileRoute('/_authed/exams/custom/$testId/')({
  component: TestPage,
});

function TestPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { testId } = Route.useParams();
  const uid = useUid();
  const test = useCustomTest(testId);
  const isOwner = !!test.data && test.data.ownerId === uid;
  const everyone = useTestAttempts(testId, isOwner);
  const mine = useMyAttempts();
  const deleteTest = useDeleteTest();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState<'ok' | 'failed' | null>(null);

  if (!test.data) return <TestStatus query={test} />;
  const data = test.data;
  const myAttempts = (mine.data ?? []).filter((a) => a.testId === testId);

  const share = async () => {
    const url = `${window.location.origin}/exams/custom/${testId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied('ok');
    } catch {
      setCopied('failed');
    }
  };

  const facts = [
    findLanguage(data.languageId).title,
    t('exams.custom.summary', { sections: data.sections.length, questions: questionCount(data) }),
    data.timeLimitMinutes === null
      ? t('exams.custom.noTimer')
      : t('exams.custom.timeLimit', { m: data.timeLimitMinutes }),
  ];

  return (
    <ContentContainer>
      <BackLink
        label={t('exams.tabs.custom')}
        onClick={() => void navigate({ to: '/exams', search: { tab: 'custom' } })}
        className="mb-4"
      />
      <PageHeader
        title={data.title}
        subtitle={data.ownerName ? t('exams.custom.byAuthor', { name: data.ownerName }) : undefined}
      />

      <div className="flex flex-col gap-6">
        <section className={`${CARD} flex flex-col gap-4`}>
          {data.description && (
            <p className="text-[15px] font-medium leading-relaxed whitespace-pre-line text-(--color-text-secondary)">
              {data.description}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {facts.map((fact) => (
              <span
                key={fact}
                className="rounded-full bg-(--color-primary-blue)/10 px-3 py-1 text-[13px] font-bold text-(--color-primary-blue)"
              >
                {fact}
              </span>
            ))}
          </div>
          <ol className="flex flex-col gap-2">
            {data.sections.map((section, i) => (
              <li key={section.id} className="flex items-center gap-3 text-[15px] font-semibold text-(--color-primary-blue-dark)">
                <Icon name={SECTION_ICONS[section.kind]} className="size-5 text-(--color-primary-blue)" />
                <span className="min-w-0 flex-1 truncate">
                  {i + 1}. {section.title || t(`exams.custom.kind.${section.kind}`)}
                </span>
                <span className="text-[13px] font-medium text-(--color-muted-text)">
                  {t('exams.items', { count: section.questions.length })}
                </span>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className={PRIMARY_BUTTON}
              onClick={() => void navigate({ to: '/exams/custom/$testId/take', params: { testId } })}
            >
              <Icon name="play.fill" className="size-5" />
              {t('exams.custom.start')}
            </button>
            {isOwner && (
              <>
                <button
                  type="button"
                  className={SECONDARY_BUTTON}
                  onClick={() => void navigate({ to: '/exams/custom/$testId/edit', params: { testId } })}
                >
                  <Icon name="square.and.pencil" className="size-5 text-(--color-primary-blue)" />
                  {t('exams.custom.edit')}
                </button>
                <button type="button" className={SECONDARY_BUTTON} onClick={() => void share()}>
                  <Icon name="link" className="size-5 text-(--color-primary-blue)" />
                  {t('exams.custom.share')}
                </button>
                <button type="button" className={SECONDARY_BUTTON} onClick={() => setConfirmDelete(true)}>
                  <Icon name="trash.fill" className="size-5 text-(--color-cs-red)" />
                  {t('common.delete')}
                </button>
              </>
            )}
          </div>
          {copied && (
            <p role="status" className="text-[14px] font-semibold text-(--color-primary-blue-dark)">
              {copied === 'ok'
                ? t('exams.custom.copied')
                : t('exams.custom.copyFailed', { url: `${window.location.origin}/exams/custom/${testId}` })}
            </p>
          )}
          {isOwner ? (
            <p className="text-[13px] font-medium text-(--color-muted-text)">{t('exams.custom.shareHint')}</p>
          ) : (
            <p className="text-[13px] font-medium text-(--color-muted-text)">{t('exams.custom.authorSees')}</p>
          )}
        </section>

        {isOwner && (
          <AttemptList
            title={t('exams.custom.everyone')}
            empty={t('exams.custom.everyoneEmpty')}
            attempts={everyone.data}
            failed={everyone.isError}
            showNames
            testId={testId}
          />
        )}
        <AttemptList
          title={t('exams.custom.myAttempts')}
          empty={t('exams.custom.historyEmpty')}
          attempts={mine.data ? myAttempts : undefined}
          failed={mine.isError}
          testId={testId}
        />
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title={t('exams.custom.deleteTitle', { title: data.title })}
          body={t('exams.custom.deleteBody')}
          isBusy={deleteTest.isPending}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() =>
            deleteTest.mutate(data, {
              onSuccess: () => void navigate({ to: '/exams', search: { tab: 'custom' } }),
              onError: () => setConfirmDelete(false),
            })
          }
        />
      )}
    </ContentContainer>
  );
}

const AttemptList = ({
  title,
  empty,
  attempts,
  failed,
  showNames = false,
  testId,
}: {
  title: string;
  empty: string;
  attempts: CustomTestAttempt[] | undefined;
  failed: boolean;
  showNames?: boolean;
  testId: string;
}) => {
  const { t, i18n } = useTranslation();
  return (
    <section className={`${CARD} flex flex-col gap-3`}>
      <h2 className={SECTION_TITLE}>{title}</h2>
      {failed ? (
        <p className="text-[14px] font-semibold text-(--color-cs-red)">{t('exams.custom.unavailable')}</p>
      ) : !attempts ? (
        <p className="text-[14px] font-medium text-(--color-muted-text)">{t('exams.custom.loading')}</p>
      ) : attempts.length === 0 ? (
        <p className="text-[14px] font-medium text-(--color-muted-text)">{empty}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-(--color-surface-border)">
          {attempts.map((attempt) => (
            <li key={attempt.id}>
              <Link
                to="/exams/custom/$testId/results/$attemptId"
                params={{ testId, attemptId: attempt.id }}
                className="flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-(--color-hover-wash)"
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  {showNames && (
                    <span className="truncate text-[15px] font-semibold text-(--color-primary-blue-dark)">
                      {attempt.userName || t('exams.custom.anonymous')}
                    </span>
                  )}
                  <span className="text-[13px] font-medium text-(--color-muted-text)">
                    {new Date(attempt.createdAt).toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
                <span className="text-[14px] font-semibold text-(--color-text-secondary)">
                  {attempt.correct} / {attempt.total}
                </span>
                <span className="w-12 text-right text-[16px] font-bold" style={{ color: percentColor(attempt.percent) }}>
                  {attempt.percent}%
                </span>
                <Icon name="chevron.right" className="size-4 text-(--color-muted-text)" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
