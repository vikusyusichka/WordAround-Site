/* Exams catalog — /exams. Every exam in the registry as a card; the exam
   page itself explains the format. Driven entirely by src/lib/exams, so a
   new spec appears here without touching this file. */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { PracticeModeCard } from '@/components/practice/PracticeModeCard';
import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { findLanguage } from '@/lib/essayTypes';
import { examAccent } from '@/lib/exams/display';
import { EXAMS } from '@/lib/exams/registry';

export const Route = createFileRoute('/_authed/exams/')({
  component: ExamsCatalog,
});

function ExamsCatalog() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <ContentContainer fluid>
      <PageHeader title={t('exams.title')} subtitle={t('exams.subtitle')} />

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
    </ContentContainer>
  );
}
