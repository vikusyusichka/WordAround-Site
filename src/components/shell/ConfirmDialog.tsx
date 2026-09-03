/* Confirmation for a destructive action. Replaces window.confirm, which
   ignores the app's typography and reads like a browser error next to these
   screens. Escape and a click outside both cancel — a confirm dialog should
   be easy to back out of and deliberate to accept. */
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface ConfirmDialogProps {
  title: string;
  body?: string;
  /** Defaults to the shared "Delete" label. */
  confirmLabel?: string;
  isBusy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog = ({
  title,
  body,
  confirmLabel,
  isBusy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  const { t } = useTranslation();
  const cancelRef = useRef<HTMLButtonElement>(null);

  /* Focus lands on Cancel, not Confirm: an Enter pressed out of habit must
     not delete anything. */
  useEffect(() => {
    cancelRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(20, 24, 40, 0.28)' }}
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-[420px] flex-col gap-4 rounded-[26px] bg-white p-6 shadow-[0_24px_60px_rgba(20,24,40,0.18)]"
      >
        <h2 className="text-[19px] font-bold text-(--color-primary-blue-dark)">{title}</h2>
        {body && (
          <p className="text-[15px] leading-[1.45] font-medium text-(--color-text-secondary)">
            {body}
          </p>
        )}

        <div className="mt-1 flex justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="h-11 rounded-2xl border border-(--color-auth-field-border) bg-white px-5 text-[15px] font-semibold text-(--color-text-secondary) transition-colors hover:bg-black/[0.03] focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:outline-none"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isBusy}
            className="h-11 rounded-2xl bg-(--color-cs-red) px-5 text-[15px] font-semibold text-white transition-transform hover:brightness-105 active:scale-[0.98] disabled:opacity-70 focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            {confirmLabel ?? t('common.delete')}
          </button>
        </div>
      </div>
    </div>
  );
};
