/* "I did an official test — here is what I got." Correct answers for reading
   and listening, the score itself for writing and speaking; the exam's own
   rules turn that into section scores and, when everything is filled in, the
   overall result, which goes into the progress history. */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useSaveAttempt } from '@/hooks/useExams';
import { formatSectionScore, sectionMax } from '@/lib/exams/display';
import { computeEntry, entryFieldFor, isValidEntry, parseEntry } from '@/lib/exams/scoreEntry';
import type { ExamSpec, ExamVariant } from '@/lib/exams/types';

import { CARD, FIELD, PRIMARY_BUTTON, SECTION_TITLE } from './ui';

export const ScoreEntryCard = ({ exam, variant }: { exam: ExamSpec; variant: ExamVariant }) => {
  const { t } = useTranslation();
  const saveAttempt = useSaveAttempt();
  const [raw, setRaw] = useState<Record<string, string>>({});
  const [label, setLabel] = useState('');
  const [saved, setSaved] = useState(false);

  const values = Object.fromEntries(variant.sections.map((s) => [s.id, parseEntry(raw[s.id] ?? '')]));
  const entry = computeEntry(variant, values);
  const anyScore = Object.keys(entry.sectionScores).length > 0;
  const invalid = variant.sections.some((s) => {
    const value = values[s.id];
    return value !== undefined && !isValidEntry(entryFieldFor(s), value);
  });

  const save = () => {
    saveAttempt.mutate(
      {
        id: crypto.randomUUID(),
        examId: exam.id,
        variantId: variant.id,
        mode: 'official',
        createdAt: Date.now(),
        durationSeconds: 0,
        sectionScores: entry.sectionScores,
        ...(entry.result ? { result: entry.result } : {}),
        ...(label.trim() ? { label: label.trim() } : {}),
      },
      {
        onSuccess: () => {
          setRaw({});
          setLabel('');
          setSaved(true);
        },
      },
    );
  };

  return (
    <section className={`${CARD} flex flex-col gap-4`}>
      <div className="flex flex-col gap-1">
        <h2 className={SECTION_TITLE}>{t('exams.entry.title')}</h2>
        <p className="text-[14px] font-medium text-(--color-muted-text)">{t('exams.entry.subtitle')}</p>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-(--color-muted-text)">{t('exams.entry.label')}</span>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={t('exams.entry.labelPlaceholder')}
          className={FIELD}
          maxLength={80}
        />
      </label>

      <div className="flex flex-col gap-3">
        {variant.sections.map((section) => {
          const field = entryFieldFor(section);
          const value = values[section.id];
          const bad = value !== undefined && !isValidEntry(field, value);
          const score = entry.sectionScores[section.id];
          return (
            <div key={section.id} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1">
              <label htmlFor={`entry-${section.id}`} className="flex flex-col">
                <span className="text-[15px] font-bold text-(--color-primary-blue-dark)">{section.title}</span>
                <span className="text-[12px] font-semibold" style={{ color: bad ? 'var(--color-profile-danger)' : 'var(--color-muted-text)' }}>
                  {field.input === 'correct'
                    ? t('exams.entry.correctHint', { max: field.max })
                    : t('exams.entry.scoreHint', { max: field.max })}
                </span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  id={`entry-${section.id}`}
                  inputMode="decimal"
                  value={raw[section.id] ?? ''}
                  onChange={(e) => {
                    setSaved(false);
                    setRaw((prev) => ({ ...prev, [section.id]: e.target.value }));
                  }}
                  aria-invalid={bad}
                  className={`${FIELD} w-[84px] text-center`}
                />
                <span className="w-[68px] text-[14px] font-bold tabular-nums text-(--color-primary-blue)">
                  {score !== undefined && field.input === 'correct' ? `= ${formatSectionScore(section, score)}` : ''}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {entry.result && (
        <div className="rounded-2xl bg-(--color-hover-wash) px-4 py-3 text-[15px] font-bold text-(--color-primary-blue-dark)">
          {entry.result.kind === 'band'
            ? t('exams.entry.overallBand', { score: entry.result.overall.toFixed(1) })
            : t('exams.entry.overallGroups', {
                total: entry.result.total,
                max: variant.overall.max,
                verdict: entry.result.passed ? t('exams.result.passed') : t('exams.result.notPassed'),
              })}
        </div>
      )}
      {!entry.result && anyScore && (
        <p className="text-[13px] font-medium text-(--color-muted-text)">
          {t('exams.entry.partial', {
            sections: variant.sections
              .filter((s) => entry.sectionScores[s.id] !== undefined)
              .map((s) => `${s.title} ${formatSectionScore(s, entry.sectionScores[s.id])}/${sectionMax(s)}`)
              .join(' · '),
          })}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={PRIMARY_BUTTON} disabled={!anyScore || invalid || saveAttempt.isPending} onClick={save}>
          {t('exams.entry.save')}
        </button>
        {saved && <span className="text-[14px] font-semibold text-(--color-green-accent)">{t('exams.entry.saved')}</span>}
        {saveAttempt.isError && (
          <span className="text-[14px] font-semibold text-(--color-profile-danger)">{t('exams.history.unavailable')}</span>
        )}
      </div>
    </section>
  );
};
