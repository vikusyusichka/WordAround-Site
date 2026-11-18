/* One exam — /exams/$examId?variant=…. Shows the format the mock exam will
   follow: sections, timings, tasks and how the result is scored. The variant
   (IELTS Academic / General, a DELE level) lives in the URL so a reload or a
   shared link lands on the same one. From here: the full mock exam, single
   task practice, the learner's goal and their history. */
import { createFileRoute, notFound, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ExamGoalCard, ExamHistoryCard } from '@/components/exams/ExamProgress';
import { PracticeModeCard } from '@/components/practice/PracticeModeCard';
import { OptionPillGroup } from '@/components/practice/OptionPill';
import { Icon } from '@/components/primitives/Icon';
import { BackLink } from '@/components/shell/BackLink';
import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { useExamAccess } from '@/hooks/useExams';
import { tint } from '@/lib/colorMix';
import { canStartMock } from '@/lib/exams/access';
import {
  examAccent,
  SKILL_ICONS,
  SKILL_LABEL_KEYS,
  sectionPlays,
  splitMinutes,
  variantMinutes,
} from '@/lib/exams/display';
import { findExam } from '@/lib/exams/registry';
import { objectiveItemCount } from '@/lib/exams/scoring';
import type { ExamVariant, SectionSpec, TaskSpec } from '@/lib/exams/types';

export const Route = createFileRoute('/_authed/exams/$examId/')({
  validateSearch: (search: Record<string, unknown>): { variant?: string } => ({
    variant: typeof search.variant === 'string' ? search.variant : undefined,
  }),
  beforeLoad: ({ params }) => {
    if (!findExam(params.examId)) throw notFound();
  },
  component: ExamPage,
});

function ExamPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { examId } = Route.useParams();
  const search = Route.useSearch();
  const exam = findExam(examId)!;
  const variant = exam.variants.find((v) => v.id === search.variant) ?? exam.variants[0];
  const { accent, blob } = examAccent(exam.id);
  const access = useExamAccess();

  const duration = (total: number) => {
    const { hours, minutes } = splitMinutes(total);
    if (hours === 0) return t('exams.duration.minutes', { m: minutes });
    return minutes === 0
      ? t('exams.duration.hoursOnly', { h: hours })
      : t('exams.duration.hours', { h: hours, m: minutes });
  };

  return (
    <ContentContainer fluid>
      <BackLink
        label={t('exams.back')}
        onClick={() => void navigate({ to: '/exams' })}
        className="mb-4"
      />
      <PageHeader title={exam.name} subtitle={exam.fullName} />

      <div className="flex flex-col gap-8">
        {exam.variants.length > 1 && (
          <OptionPillGroup
            options={exam.variants.map((v) => ({ id: v.id, label: v.title }))}
            value={variant.id}
            accent={accent}
            onChange={(id) =>
              void navigate({ to: '/exams/$examId', params: { examId }, search: { variant: id }, replace: true })
            }
          />
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryTile icon="clock.fill" accent={accent} label={t('exams.totalTime')} value={duration(variantMinutes(variant))} />
          <SummaryTile
            icon="list.bullet"
            accent={accent}
            label={t('exams.sectionsCount')}
            value={String(variant.sections.length)}
          />
          <SummaryTile icon="trophy.fill" accent={accent} label={t('exams.scoring')} value={scoringLabel(variant, t)} />
        </div>

        <section className="grid gap-(--spacing-mode-grid-gap) sm:grid-cols-2">
          <PracticeModeCard
            title={t('exams.mock.title')}
            subtitle={canStartMock(access) ? t('exams.mock.subtitle') : t('exams.premium.mockLocked')}
            iconSystemName={canStartMock(access) ? 'checkmark.seal.fill' : 'lock.fill'}
            accentColor={accent}
            blobColor={blob}
            onClick={() =>
              void navigate({
                to: canStartMock(access) ? '/exams/$examId/mock' : '/premium',
                params: { examId },
                search: { variant: variant.id },
              })
            }
          />
          <PracticeModeCard
            title={t('exams.practice.title')}
            subtitle={t('exams.practice.subtitle')}
            iconSystemName="target"
            accentColor={accent}
            blobColor={blob}
            onClick={() =>
              void navigate({ to: '/exams/$examId/practice', params: { examId }, search: { variant: variant.id } })
            }
          />
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <ExamGoalCard exam={exam} variant={variant} />
          <ExamHistoryCard exam={exam} variant={variant} />
        </div>

        <section className="flex flex-col gap-4">
          <h2 className="text-[21px] font-bold text-(--color-primary-blue-dark) lg:text-[26px]">
            {t('exams.format')}
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {variant.sections.map((section) => (
              <SectionCard key={section.id} section={section} accent={accent} duration={duration} />
            ))}
          </div>
        </section>

        <p className="text-[13px] font-medium leading-relaxed text-(--color-muted-text)">
          {t('exams.disclaimer', { owner: exam.owner })}{' '}
          <a
            href={exam.officialUrl}
            target="_blank"
            rel="noreferrer"
            className="font-bold text-(--color-primary-blue) underline-offset-2 hover:underline"
          >
            {t('exams.officialSite')}
          </a>
        </p>
      </div>
    </ContentContainer>
  );
}

type T = ReturnType<typeof useTranslation>['t'];

const scoringLabel = (variant: ExamVariant, t: T): string => {
  const { overall } = variant;
  if (overall.kind === 'bandMean') return t('exams.scoreBand', { max: overall.max });
  return t('exams.scorePass', {
    total: overall.passTotal,
    max: overall.max,
    group: overall.groups[0]?.passMin ?? 0,
  });
};

const SummaryTile = ({ icon, accent, label, value }: { icon: string; accent: string; label: string; value: string }) => (
  <div className="flex items-center gap-3 rounded-(--radius-mode-card) border border-(--color-surface-border) bg-(--color-surface-card) p-4 shadow-[0_4px_10px_var(--shadow-color-fc)]">
    <div className="grid size-10 shrink-0 place-items-center rounded-full" style={{ background: tint(accent, 12.2) }}>
      <Icon name={icon} className="size-5" style={{ color: accent }} />
    </div>
    <div className="flex min-w-0 flex-col">
      <span className="text-[13px] font-semibold text-(--color-muted-text)">{label}</span>
      <span className="text-[15px] font-bold text-(--color-primary-blue-dark)">{value}</span>
    </div>
  </div>
);

const SectionCard = ({
  section,
  accent,
  duration,
}: {
  section: SectionSpec;
  accent: string;
  duration: (minutes: number) => string;
}) => {
  const { t } = useTranslation();
  /* DELE names its sections in Spanish, so the skill underneath helps; for
     IELTS it would just repeat the title. */
  const skillLabel = t(SKILL_LABEL_KEYS[section.skill]);
  const items = objectiveItemCount(section);
  const plays = sectionPlays(section);
  const facts = [
    duration(section.minutes),
    section.prepMinutes ? t('exams.prep', { m: section.prepMinutes }) : null,
    t('exams.tasks', { count: section.tasks.length }),
    items > 0 ? t('exams.items', { count: items }) : t('exams.rubricMarked'),
    plays === 1 ? t('exams.playsOnce') : plays === 2 ? t('exams.playsTwice') : null,
  ].filter((fact): fact is string => fact !== null);

  return (
    <article className="flex flex-col gap-4 rounded-(--radius-mode-card) border border-(--color-surface-border) bg-(--color-surface-card) p-5 shadow-[0_4px_10px_var(--shadow-color-fc)]">
      <header className="flex items-center gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-full" style={{ background: tint(accent, 12.2) }}>
          <Icon name={SKILL_ICONS[section.skill]} className="size-5" style={{ color: accent }} />
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="text-[17px] font-bold text-(--color-primary-blue-dark)">{section.title}</h3>
          {skillLabel !== section.title && (
            <span className="text-[13px] font-semibold text-(--color-muted-text)">{skillLabel}</span>
          )}
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {facts.map((fact) => (
          <span
            key={fact}
            className="rounded-full px-3 py-1 text-[12px] font-bold"
            style={{ background: tint(accent, 10), color: accent }}
          >
            {fact}
          </span>
        ))}
      </div>

      <ol className="flex flex-col gap-3">
        {section.tasks.map((task) => (
          <li key={task.id} className="flex flex-col gap-0.5 border-t border-(--color-surface-border) pt-3">
            <span className="text-[14px] font-bold text-(--color-primary-blue-dark)">{task.title}</span>
            <span className="text-[13px] font-medium leading-snug text-(--color-text-secondary)">
              {task.description}
            </span>
            <TaskMeta task={task} />
          </li>
        ))}
      </ol>
    </article>
  );
};

const TaskMeta = ({ task }: { task: TaskSpec }) => {
  const { t } = useTranslation();
  const text =
    task.kind === 'objective'
      ? t('exams.items', { count: task.items })
      : task.kind === 'writing'
        ? task.words.max
          ? t('exams.wordsRange', { min: task.words.min, max: task.words.max })
          : t('exams.wordsMin', { min: task.words.min })
        : t('exams.speakFor', { m: Math.round(task.speakSeconds / 60) });
  return <span className="text-[12px] font-semibold text-(--color-muted-text)">{text}</span>;
};
