/* Pick a task to practise — /exams/$examId/practice?variant=…. Every task of
   the chosen variant, grouped by section, each opening a fresh AI-generated
   task. Without Premium (once the paywall is on) a task already tried once
   shows a lock. */
import { createFileRoute, notFound, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { CARD } from '@/components/exams/ui';
import { Icon } from '@/components/primitives/Icon';
import { BackLink } from '@/components/shell/BackLink';
import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { useExamAccess, useExamAttempts } from '@/hooks/useExams';
import { tint } from '@/lib/colorMix';
import { canPractiseTask } from '@/lib/exams/access';
import { examAccent, SKILL_ICONS } from '@/lib/exams/display';
import { findExam } from '@/lib/exams/registry';
import type { TaskSpec } from '@/lib/exams/types';

export const Route = createFileRoute('/_authed/exams/$examId/practice/')({
  validateSearch: (search: Record<string, unknown>): { variant?: string } => ({
    variant: typeof search.variant === 'string' ? search.variant : undefined,
  }),
  beforeLoad: ({ params }) => {
    if (!findExam(params.examId)) throw notFound();
  },
  component: PracticePicker,
});

function PracticePicker() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { examId } = Route.useParams();
  const search = Route.useSearch();
  const exam = findExam(examId)!;
  const variant = exam.variants.find((v) => v.id === search.variant) ?? exam.variants[0];
  const { accent } = examAccent(exam.id);
  const access = useExamAccess();
  const attempts = useExamAttempts(exam.id);

  const meta = (task: TaskSpec) =>
    task.kind === 'objective'
      ? t('exams.items', { count: task.items })
      : task.kind === 'writing'
        ? task.words.max
          ? t('exams.wordsRange', { min: task.words.min, max: task.words.max })
          : t('exams.wordsMin', { min: task.words.min })
        : t('exams.speakFor', { m: Math.round(task.speakSeconds / 60) });

  return (
    <ContentContainer fluid>
      <BackLink
        label={exam.name}
        onClick={() => void navigate({ to: '/exams/$examId', params: { examId }, search: { variant: variant.id } })}
        className="mb-4"
      />
      <PageHeader title={t('exams.practice.title')} subtitle={`${exam.name} ${variant.title}`} />

      <div className="grid gap-4 lg:grid-cols-2">
        {variant.sections.map((section) => (
          <section key={section.id} className={`${CARD} flex flex-col gap-3`}>
            <header className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-full" style={{ background: tint(accent, 12.2) }}>
                <Icon name={SKILL_ICONS[section.skill]} className="size-5" style={{ color: accent }} />
              </div>
              <h2 className="text-[17px] font-bold text-(--color-primary-blue-dark)">{section.title}</h2>
            </header>
            <ul className="flex flex-col gap-2">
              {section.tasks.map((task) => {
                const open = canPractiseTask(access, attempts.data ?? [], variant.id, section.id, task.id);
                return (
                  <li key={task.id}>
                    <button
                      type="button"
                      onClick={() =>
                        void navigate({
                          to: '/exams/$examId/practice/$sectionId/$taskId',
                          params: { examId, sectionId: section.id, taskId: task.id },
                          search: { variant: variant.id },
                        })
                      }
                      className="flex w-full items-center gap-3 rounded-2xl border border-(--color-surface-border) px-4 py-3 text-left transition-colors hover:bg-(--color-hover-wash) focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:outline-none"
                    >
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-[15px] font-bold text-(--color-primary-blue-dark)">{task.title}</span>
                        <span className="line-clamp-2 text-[13px] font-medium text-(--color-text-secondary)">{task.description}</span>
                        <span className="text-[12px] font-semibold text-(--color-muted-text)">{meta(task)}</span>
                      </span>
                      <Icon
                        name={open ? 'chevron.right' : 'lock.fill'}
                        className="size-4 shrink-0"
                        style={{ color: open ? accent : 'var(--color-muted-text)' }}
                        aria-label={open ? undefined : t('exams.premium.locked')}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </ContentContainer>
  );
}
