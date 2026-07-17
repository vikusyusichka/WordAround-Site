/* Composition wrapper — the "feedback" block below the editor that renders
   after Check succeeds. Score card on top, grammar issues below. */
import { useTranslation } from 'react-i18next';

import { EssayScoreCard } from './EssayScoreCard';
import { GrammarIssueCard } from './GrammarIssueCard';
import type { MistakeSaveState } from '@/hooks/useSaveMistake';
import type { EssayScore, GrammarIssue } from '@/lib/essayTypes';

interface EssayFeedbackSectionProps {
  score: EssayScore;
  issues: GrammarIssue[];
  saveStateFor?: (issue: GrammarIssue) => MistakeSaveState;
  onSaveIssue?: (issue: GrammarIssue) => void;
}

export const EssayFeedbackSection = ({
  score,
  issues,
  saveStateFor,
  onSaveIssue,
}: EssayFeedbackSectionProps) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      <EssayScoreCard score={score} />

      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-[18px] font-bold text-(--color-primary-blue-dark) md:text-[20px]">
            {t('writing.essays.grammar.sectionTitle')}
          </h3>
          {issues.length > 0 && (
            <span className="text-[13px] font-semibold text-(--color-text-secondary) md:text-[14px]">
              {t('writing.essays.grammar.count', { count: issues.length })}
            </span>
          )}
        </div>

        {issues.length === 0 ? (
          <div className="rounded-2xl border border-white bg-white/95 p-4 text-center shadow-[0_4px_10px_rgba(0,0,0,0.045)] md:p-5">
            <span className="text-[14px] font-medium text-(--color-home-stat2-sub) md:text-[15px]">
              {t('writing.essays.grammar.empty')}
            </span>
          </div>
        ) : (
          issues.map((i) => (
            <GrammarIssueCard
              key={i.id}
              issue={i}
              saveState={saveStateFor?.(i)}
              onSave={onSaveIssue ? () => onSaveIssue(i) : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
};
