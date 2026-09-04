/* Shared empty-state card for the topics home + a topic's notes list. An
   optional action mirrors the iOS empty state's create button (shown only for
   the unfiltered "nothing here yet" case).

   The tip obeys "Show helper tips", which the settings screen describes as
   covering quick sheets *and* empty states — an empty screen is where someone
   new to the section most needs telling what to do next. */
import { useGrammarSettings } from '@/stores/grammarSettingsStore';

interface GrammarNotesEmptyStateProps {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Extra guidance, shown only while helper tips are switched on. */
  tip?: string;
}

export const GrammarNotesEmptyState = ({
  title,
  body,
  actionLabel,
  onAction,
  tip,
}: GrammarNotesEmptyStateProps) => {
  const showsHelperTips = useGrammarSettings((s) => s.showsHelperTips);

  return (
  <div className="flex flex-col items-center gap-3 rounded-3xl border border-white/80 bg-white/70 px-6 py-16 text-center shadow-[0_6px_16px_rgba(0,0,0,0.04)]">
    <span className="text-[20px] font-bold text-(--color-primary-blue-dark)">{title}</span>
    <span className="max-w-sm text-[15px] font-medium text-(--color-text-secondary)">{body}</span>
    {actionLabel && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="mt-2 h-11 rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) px-5 text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98] focus-visible:outline-none"
      >
        {actionLabel}
      </button>
    )}
    {tip && showsHelperTips && (
      <p className="mt-1 max-w-sm rounded-2xl bg-(--color-goal-bg) px-4 py-3 text-[12px] font-semibold text-(--color-text-secondary)">
        {tip}
      </p>
    )}
    </div>
  );
};
