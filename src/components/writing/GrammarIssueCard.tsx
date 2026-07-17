/* Single grammar issue card. Shows category badge, the incorrect fragment,
   the suggested correction (if any), the LanguageTool message, and (4D5) a
   "Save to Grammar Notes" button when the parent wires onSave. */
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import type { MistakeSaveState } from '@/hooks/useSaveMistake';
import type { GrammarIssue, GrammarIssueCategory } from '@/lib/essayTypes';

const CATEGORY_COLOR: Record<GrammarIssueCategory, { bg: string; text: string }> = {
  grammar:    { bg: 'var(--color-cs-soft-red)', text: 'var(--color-cs-dark-red)' },
  vocabulary: { bg: '#FFF3D6', text: 'var(--color-orange-title)' },
  style:      { bg: 'var(--color-goal-bg)', text: 'var(--color-primary-blue-dark)' },
};

interface GrammarIssueCardProps {
  issue: GrammarIssue;
  saveState?: MistakeSaveState;
  onSave?: () => void;
}

export const GrammarIssueCard = ({ issue, saveState = 'idle', onSave }: GrammarIssueCardProps) => {
  const { t } = useTranslation();
  const color = CATEGORY_COLOR[issue.category];
  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border border-white bg-white/95 p-4 shadow-[0_4px_10px_rgba(0,0,0,0.045)] md:p-5">
      <span
        className="w-fit rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide md:text-[12px]"
        style={{ background: color.bg, color: color.text }}
      >
        {t(`writing.essays.grammar.category.${issue.category}`)}
      </span>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline gap-2">
          <span className="shrink-0 text-[12px] font-semibold uppercase tracking-wide text-(--color-fc-muted) md:text-[13px]">
            {t('writing.essays.grammar.original')}
          </span>
          <span className="text-[14px] font-semibold text-(--color-cs-red) line-through md:text-[15px]">
            {issue.incorrectText}
          </span>
        </div>

        {issue.suggestedCorrection && (
          <div className="flex items-baseline gap-2">
            <span className="shrink-0 text-[12px] font-semibold uppercase tracking-wide text-(--color-fc-muted) md:text-[13px]">
              {t('writing.essays.grammar.suggestion')}
            </span>
            <span className="text-[14px] font-bold text-(--color-home-stat2-sub) md:text-[15px]">
              {issue.suggestedCorrection}
            </span>
          </div>
        )}

        <div className="flex items-baseline gap-2">
          <span className="shrink-0 text-[12px] font-semibold uppercase tracking-wide text-(--color-fc-muted) md:text-[13px]">
            {t('writing.essays.grammar.reason')}
          </span>
          <span className="text-[13px] font-medium leading-snug text-(--color-fc-text) md:text-[14px]">
            {issue.message}
          </span>
        </div>
      </div>

      {onSave && (
        <button
          type="button"
          onClick={onSave}
          disabled={saveState !== 'idle' && saveState !== 'failed'}
          className={`flex h-10 w-fit items-center gap-2 rounded-2xl border px-3.5 text-[13px] font-semibold transition-colors md:text-[14px] ${
            saveState === 'saved' || saveState === 'duplicate'
              ? 'border-[#22C55E]/40 bg-[#22C55E]/8 text-[#15803D]'
              : 'border-(--color-primary-blue)/35 bg-white text-(--color-primary-blue) hover:bg-(--color-primary-blue)/5'
          } disabled:cursor-default`}
        >
          <Icon
            name={
              saveState === 'saved' || saveState === 'duplicate'
                ? 'checkmark.circle.fill'
                : 'exclamationmark.bubble.fill'
            }
            className="size-[15px]"
          />
          {t(`writing.essays.grammar.save.${saveState}`)}
        </button>
      )}
    </div>
  );
};
