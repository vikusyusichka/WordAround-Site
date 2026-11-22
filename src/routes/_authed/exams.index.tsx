/* Exams — /exams. Two tabs: the official tests (every exam in the registry
   as a card; its page links to the owner's practice tests) and "Own tests",
   the constructor's tests and their history. The tab lives in the URL
   (?tab=custom) so back/forward and shared links land on the right one. */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { CustomTestsTab } from '@/components/customTests/CustomTestsTab';
import { OptionPillGroup } from '@/components/practice/OptionPill';
import { PracticeModeCard } from '@/components/practice/PracticeModeCard';
import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { findLanguage } from '@/lib/essayTypes';
import { examAccent } from '@/lib/exams/display';
import { EXAMS } from '@/lib/exams/registry';

type ExamsTab = 'official' | 'custom';

export const Route = createFileRoute('/_authed/exams/')({
  validateSearch: (search: Record<string, unknown>): { tab?: ExamsTab } => ({
    tab: search.tab === 'custom' ? 'custom' : undefined,
  }),
  component: ExamsCatalog,
});

function ExamsCatalog() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const tab: ExamsTab = Route.useSearch().tab ?? 'official';

  return (
    <ContentContainer fluid>
      <PageHeader title={t('exams.title')} subtitle={t('exams.subtitle')} />

      <div className="mb-6">
        <OptionPillGroup<ExamsTab>
          options={[
            { id: 'official', label: t('exams.tabs.official') },
            { id: 'custom', label: t('exams.tabs.custom') },
          ]}
          value={tab}
          onChange={(id) =>
            void navigate({ to: '/exams', search: id === 'custom' ? { tab: 'custom' } : {}, replace: true })
          }
        />
      </div>

      {tab === 'custom' ? <CustomTestsTab /> : <OfficialCatalog />}
    </ContentContainer>
  );
}

function OfficialCatalog() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <>
      <section className="flex flex-col gap-4">
        <h2 className="text-[21px] font-bold text-(--color-primary-blue-dark) lg:text-[26px]">
          {t('exams.catalogTitle')}
        </h2>
        <div className="grid gap-(--spacing-mode-grid-gap) sm:grid-cols-2">
          {EXAMS.map((exam) => {
            const { accent, blob } = examAccent(exam.id);
            return (
              <PracticeModeCard
                key={exam.id}
                title={exam.name}
                subtitle={t('exams.cardSubtitle', {
                  language: findLanguage(exam.languageId).title,
                  variants: exam.variants.map((v) => v.title).join(', '),
                })}
                iconSystemName="graduationcap.fill"
                accentColor={accent}
                blobColor={blob}
                onClick={() => void navigate({ to: '/exams/$examId', params: { examId: exam.id } })}
              />
            );
          })}
        </div>
        <p className="text-[14px] font-medium text-(--color-muted-text)">{t('exams.moreSoon')}</p>
      </section>
    </>
  );
}
