/* A writing task as it appears on the paper — prompt, material, chart —
   and the answer box with a live word count against the exam's limits. */
import { useTranslation } from 'react-i18next';

import type { GeneratedWritingTask } from '@/lib/exams/generation';
import { countWords } from '@/lib/exams/rubricScoring';
import type { WritingTaskSpec } from '@/lib/exams/types';

import { ChartView } from './ChartView';
import { BODY_TEXT, CARD, FIELD, SECTION_TITLE } from './ui';

interface WritingTaskViewProps {
  spec: WritingTaskSpec;
  generated: GeneratedWritingTask;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export const WritingTaskView = ({ spec, generated, value, onChange, readOnly }: WritingTaskViewProps) => {
  const { t } = useTranslation();
  const words = countWords(value);
  const tooShort = words < spec.words.min;
  const tooLong = spec.words.max !== undefined && words > spec.words.max;
  const limit = spec.words.max
    ? t('exams.wordsRange', { min: spec.words.min, max: spec.words.max })
    : t('exams.wordsMin', { min: spec.words.min });

  return (
    <div className="flex flex-col gap-4">
      <section className={`${CARD} flex flex-col gap-4`}>
        <h2 className={SECTION_TITLE}>{generated.title}</h2>
        <p className={`${BODY_TEXT} whitespace-pre-line`}>{generated.prompt}</p>
        {generated.context && (
          <div className="rounded-2xl bg-(--color-hover-wash) p-4">
            <p className={`${BODY_TEXT} whitespace-pre-line`}>{generated.context}</p>
          </div>
        )}
        {generated.points.length > 0 && (
          <ul className="flex list-disc flex-col gap-1.5 pl-5">
            {generated.points.map((point) => (
              <li key={point} className={BODY_TEXT}>
                {point}
              </li>
            ))}
          </ul>
        )}
        {generated.chart && <ChartView chart={generated.chart} />}
      </section>

      <label className="flex flex-col gap-2">
        <span className="sr-only">{t('exams.task.answer')}</span>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          placeholder={t('exams.task.writePlaceholder')}
          rows={14}
          spellCheck={false}
          className={`${FIELD} min-h-[320px] resize-y leading-relaxed`}
        />
        <span
          className="text-[13px] font-semibold"
          style={{
            color: words > 0 && (tooShort || tooLong) ? 'var(--color-profile-danger)' : 'var(--color-muted-text)',
          }}
        >
          {t('exams.task.wordCount', { count: words, limit })}
        </span>
      </label>
    </div>
  );
};
