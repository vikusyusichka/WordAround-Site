/* Single grammar issue card — port of GrammarIssueCardView: no category badge;
   "Original" and "Suggestion" are tinted feedback boxes (peach/gold + blue) each
   with an icon, then a stacked "Reason", then a full-width solid-blue Save
   button (4D5). */
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import type { MistakeSaveState } from '@/hooks/useSaveMistake';
import type { GrammarIssue } from '@/lib/essayTypes';

const GOLD = '#C78C42';
const PEACH = '#FFF2E0';

interface GrammarIssueCardProps {
  issue: GrammarIssue;
  saveState?: MistakeSaveState;
  onSave?: () => void;
}

const FeedbackRow = ({
  label,
  text,
  icon,
  tint,
  bg,
}: {
  label: string;
  text: string;
  icon: string;
  tint: string;
  bg: string;
}) => (
  <div className="flex items-start gap-2.5 rounded-2xl p-3" style={{ background: bg }}>
    <Icon name={icon} className="mt-0.5 size-[15px] shrink-0" style={{ color: tint }} />
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-[11px] font-bold" style={{ color: tint }}>
        {label}
      </span>
      <span className="text-[14px] font-semibold text-(--color-primary-blue-dark) md:text-[15px]">
        {text}
      </span>
    </div>
  </div>
);

const SAVE_ICON: Record<MistakeSaveState, string> = {
  idle: 'square.and.arrow.down.fill',
  saving: 'square.and.arrow.down.fill',
  saved: 'checkmark.circle.fill',
  duplicate: 'doc.on.doc.fill',
  failed: 'exclamationmark.triangle.fill',
};

export const GrammarIssueCard = ({ issue, saveState = 'idle', onSave }: GrammarIssueCardProps) => {
  const { t } = useTranslation();
  const done = saveState === 'saved' || saveState === 'duplicate';
  const buttonTint = saveState === 'failed' ? GOLD : 'var(--color-primary-blue)';

  return (
    <div className="flex flex-col gap-3 rounded-[20px] bg-white/95 p-4 shadow-[0_8px_14px_rgba(0,0,0,0.045)] md:p-[18px]">
      <FeedbackRow
        label={t('writing.essays.grammar.original')}
        text={issue.incorrectText}
        icon="exclamationmark.circle.fill"
        tint={GOLD}
        bg={PEACH}
      />

      {issue.suggestedCorrection && (
        <FeedbackRow
          label={t('writing.essays.grammar.suggestion')}
          text={issue.suggestedCorrection}
          icon="checkmark.circle.fill"
          tint="var(--color-primary-blue)"
          bg="color-mix(in srgb, var(--color-primary-blue) 8%, transparent)"
        />
      )}

      <div className="flex flex-col gap-1.5">
        <span className="text-[12px] font-bold text-(--color-primary-blue-dark)">
          {t('writing.essays.grammar.reason')}
        </span>
        <span className="text-[13px] font-medium leading-snug text-(--color-text-secondary) md:text-[14px]">
          {issue.message}
        </span>
      </div>

      {(onSave || saveState !== 'idle') && (
        <button
          type="button"
          onClick={onSave}
          disabled={saveState === 'saving' || done}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-[15px] text-[13px] font-black text-white transition-transform hover:brightness-105 active:scale-[0.99] disabled:opacity-90 md:h-11 md:text-[14px]"
          style={{ background: buttonTint }}
        >
          <Icon name={SAVE_ICON[saveState]} className="size-[15px]" />
          {t(`writing.essays.grammar.save.${saveState}`)}
        </button>
      )}
    </div>
  );
};
