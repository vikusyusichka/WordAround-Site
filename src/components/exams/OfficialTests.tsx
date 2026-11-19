/* Official practice tests for one exam variant — found on the exam owner's
   own site by the weekly catalog update (no AI), opened there in a new tab.
   Full tests first, then short sample tasks grouped by skill. */
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import { tint } from '@/lib/colorMix';
import { SKILL_ICONS, SKILL_LABEL_KEYS } from '@/lib/exams/display';
import {
  catalogCheckedAt,
  officialTestsFor,
  primaryLink,
  sourcesForExam,
  type OfficialLink,
  type OfficialTest,
} from '@/lib/exams/officialTests';
import type { ExamSkill, ExamSpec, ExamVariant } from '@/lib/exams/types';

import { CARD, SECTION_TITLE } from './ui';

const SKILLS: ExamSkill[] = ['listening', 'reading', 'writing', 'speaking'];

const linkLabelKey = (kind: OfficialLink['kind']): string => `exams.official.link.${kind}`;

export const OfficialTests = ({ exam, variant, accent }: { exam: ExamSpec; variant: ExamVariant; accent: string }) => {
  const { t, i18n } = useTranslation();
  const tests = officialTestsFor(exam.id, variant.id);
  const sources = sourcesForExam(exam.id);
  const full = tests.filter((test) => test.kind === 'full');
  const samples = tests.filter((test) => test.kind === 'sample');
  const checked = new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(`${catalogCheckedAt()}T12:00:00`),
  );

  return (
    <section className="flex flex-col gap-4" aria-labelledby="official-tests">
      <div className="flex flex-col gap-1">
        <h2 id="official-tests" className="text-[21px] font-bold text-(--color-primary-blue-dark) lg:text-[26px]">
          {t('exams.official.title')}
        </h2>
        <p className="text-[14px] font-medium text-(--color-muted-text)">
          {t('exams.official.subtitle', { owner: [...new Set(sources.map((s) => s.owner))].join(', ') || exam.owner })}
        </p>
      </div>

      {tests.length === 0 ? (
        <div className={`${CARD} flex flex-col items-start gap-3`}>
          <p className="text-[15px] font-semibold text-(--color-primary-blue-dark)">{t(`exams.official.empty.${exam.id}`, { defaultValue: t('exams.official.empty.default') })}</p>
          {sources.map((source) => (
            <a
              key={source.id}
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="text-[14px] font-bold text-(--color-primary-blue) underline-offset-2 hover:underline"
            >
              {t('exams.official.openSource', { owner: source.owner })}
            </a>
          ))}
        </div>
      ) : (
        <>
          {full.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className={SECTION_TITLE}>{t('exams.official.fullTests')}</h3>
              <div className="grid gap-3 lg:grid-cols-2">
                {full.map((test) => (
                  <TestCard key={test.id} test={test} accent={accent} />
                ))}
              </div>
            </div>
          )}
          {samples.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className={SECTION_TITLE}>{t('exams.official.sampleTasks')}</h3>
              {SKILLS.map((skill) => {
                const group = samples.filter((test) => test.skill === skill);
                if (group.length === 0) return null;
                return (
                  <details key={skill} className={CARD}>
                    <summary className="flex cursor-pointer items-center gap-3 text-[16px] font-bold text-(--color-primary-blue-dark)">
                      <Icon name={SKILL_ICONS[skill]} className="size-5" style={{ color: accent }} />
                      {t(SKILL_LABEL_KEYS[skill])}
                      <span className="text-[13px] font-semibold text-(--color-muted-text)">
                        {t('exams.official.count', { count: group.length })}
                      </span>
                    </summary>
                    <ul className="mt-3 flex flex-col">
                      {group.map((test) => (
                        <li key={test.id} className="border-t border-(--color-surface-border) py-3 first:border-t-0">
                          <TestRow test={test} accent={accent} />
                        </li>
                      ))}
                    </ul>
                  </details>
                );
              })}
            </div>
          )}
        </>
      )}

      <p className="text-[12px] font-medium text-(--color-muted-text)">
        {t('exams.official.checked', { date: checked })}
      </p>
    </section>
  );
};

const LinkButtons = ({ test, accent }: { test: OfficialTest; accent: string }) => {
  const { t } = useTranslation();
  const main = primaryLink(test);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {main && (
        <a
          href={main.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-bold text-white"
          style={{ background: accent }}
        >
          {t(linkLabelKey(main.kind))}
          <Icon name="arrow.right" className="size-3.5" />
        </a>
      )}
      {test.links
        .filter((link) => link !== main)
        .map((link) => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center rounded-full border border-(--color-surface-border) px-3.5 text-[13px] font-bold text-(--color-primary-blue-dark) hover:bg-(--color-hover-wash)"
          >
            {t(linkLabelKey(link.kind))}
          </a>
        ))}
    </div>
  );
};

const Chips = ({ test, accent }: { test: OfficialTest; accent: string }) => {
  const { t } = useTranslation();
  const chips = [
    test.skill ? t(SKILL_LABEL_KEYS[test.skill]) : null,
    test.year ? String(test.year) : null,
    t('exams.official.source', { owner: test.owner }),
  ].filter((chip): chip is string => chip !== null);
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <span
          key={chip}
          className="rounded-full px-2.5 py-0.5 text-[12px] font-bold"
          style={{ background: tint(accent, 10), color: accent }}
        >
          {chip}
        </span>
      ))}
    </div>
  );
};

const TestCard = ({ test, accent }: { test: OfficialTest; accent: string }) => (
  <article className={`${CARD} flex flex-col gap-3`}>
    <div className="flex items-start gap-3">
      {test.skill && (
        <div className="grid size-10 shrink-0 place-items-center rounded-full" style={{ background: tint(accent, 12.2) }}>
          <Icon name={SKILL_ICONS[test.skill]} className="size-5" style={{ color: accent }} />
        </div>
      )}
      <div className="flex min-w-0 flex-col gap-1.5">
        <h4 className="text-[16px] font-bold text-(--color-primary-blue-dark)">{test.title}</h4>
        <Chips test={test} accent={accent} />
      </div>
    </div>
    {test.description && <p className="text-[14px] font-medium leading-snug text-(--color-text-secondary)">{test.description}</p>}
    <LinkButtons test={test} accent={accent} />
  </article>
);

const TestRow = ({ test, accent }: { test: OfficialTest; accent: string }) => (
  <div className="flex flex-col gap-2">
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[15px] font-bold text-(--color-primary-blue-dark)">{test.title}</span>
      {test.year && <span className="text-[12px] font-bold text-(--color-muted-text)">{test.year}</span>}
    </div>
    {test.description && (
      <p className="line-clamp-2 text-[13px] font-medium leading-snug text-(--color-text-secondary)">{test.description}</p>
    )}
    <LinkButtons test={test} accent={accent} />
  </div>
);
