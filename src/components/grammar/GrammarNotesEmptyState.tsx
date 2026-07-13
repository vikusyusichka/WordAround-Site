/* Shared empty-state card for the topics home + a topic's notes list. */
interface GrammarNotesEmptyStateProps {
  title: string;
  body: string;
}

export const GrammarNotesEmptyState = ({ title, body }: GrammarNotesEmptyStateProps) => (
  <div className="flex flex-col items-center gap-3 rounded-3xl border border-white/80 bg-white/70 px-6 py-16 text-center shadow-[0_6px_16px_rgba(0,0,0,0.04)]">
    <span className="text-[20px] font-bold text-(--color-primary-blue-dark)">{title}</span>
    <span className="max-w-sm text-[15px] font-medium text-(--color-text-secondary)">{body}</span>
  </div>
);
