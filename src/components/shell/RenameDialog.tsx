/* Renaming something, in the app's own typography — the counterpart to
   ConfirmDialog, replacing window.prompt.

   window.prompt is worse than it looks: it is unstyled, it blocks the whole
   page, some browsers let a reader suppress it outright (after which renaming
   silently stops working), and it cannot show what is being renamed. */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface RenameDialogProps {
  title: string;
  /** Pre-filled and selected, so typing replaces it as window.prompt did. */
  initialValue: string;
  label?: string;
  isBusy?: boolean;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

export const RenameDialog = ({
  title,
  initialValue,
  label,
  isBusy = false,
  onSubmit,
  onCancel,
}: RenameDialogProps) => {
  const { t } = useTranslation();
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.select();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  const trimmed = value.trim();
  const canSave = trimmed.length > 0 && !isBusy;

  const submit = () => {
    if (!canSave) return;
    onSubmit(trimmed);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(20, 24, 40, 0.28)' }}
      onClick={onCancel}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex w-full max-w-[420px] flex-col gap-4 rounded-[26px] bg-white p-6 shadow-[0_24px_60px_rgba(20,24,40,0.18)]"
      >
        <h2 className="text-[19px] font-bold text-(--color-primary-blue-dark)">{title}</h2>

        <label className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold text-(--color-text-secondary)">
            {label ?? t('common.rename')}
          </span>
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            maxLength={120}
            className="h-12 rounded-2xl border border-(--color-auth-field-border) bg-white px-4 text-[15px] font-semibold text-(--color-primary-blue-dark) outline-none focus-visible:border-(--color-home-brand)"
          />
        </label>

        <div className="mt-1 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            className="h-11 rounded-2xl border border-(--color-auth-field-border) bg-white px-5 text-[15px] font-semibold text-(--color-text-secondary) transition-colors hover:bg-black/[0.03] disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:outline-none"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={!canSave}
            className="h-11 rounded-2xl bg-(--color-primary-blue) px-5 text-[15px] font-semibold text-white transition-transform hover:brightness-105 active:scale-[0.98] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            {t('common.save')}
          </button>
        </div>
      </form>
    </div>
  );
};
