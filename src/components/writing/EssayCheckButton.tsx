/* "Check my essay" — full-width primary button that fires grammar check +
   local scoring in one flow. Disabled unless word count is in range. */
import { useTranslation } from 'react-i18next';

interface EssayCheckButtonProps {
  validationValid: boolean;
  isChecking: boolean;
  onCheck: () => void;
  errorMessage: string | null;
}

export const EssayCheckButton = ({
  validationValid,
  isChecking,
  onCheck,
  errorMessage,
}: EssayCheckButtonProps) => {
  const { t } = useTranslation();
  const disabled = !validationValid || isChecking;

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onCheck}
        disabled={disabled}
        className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) px-6 text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98] disabled:opacity-60 focus-visible:outline-none md:text-[16px]"
      >
        {isChecking ? t('writing.essays.check.checking') : t('writing.essays.check.button')}
      </button>
      {!validationValid && !isChecking && (
        <span className="text-center text-[12px] font-medium text-(--color-text-secondary) md:text-[13px]">
          {t('writing.essays.check.disabled')}
        </span>
      )}
      {errorMessage && (
        <span
          role="alert"
          className="text-center text-[13px] font-semibold text-(--color-cs-red)"
        >
          {errorMessage}
        </span>
      )}
    </div>
  );
};
