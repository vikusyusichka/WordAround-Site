/* Shared empty-state card for the topics home + a topic's notes list. An
   optional action mirrors the iOS empty state's create button (shown only for
   the unfiltered "nothing here yet" case). */
interface GrammarNotesEmptyStateProps {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const GrammarNotesEmptyState = ({
  title,
  body,
  actionLabel,
  onAction,
}: GrammarNotesEmptyStateProps) => (
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
  </div>
);
