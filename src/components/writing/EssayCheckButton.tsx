/* Action row under the editor — port of EssayInputSectionView.actionButtons:
   a pale "Reset" button and a solid "Check" button side by side, equal
   width. Check fires grammar check + local scoring; it is off unless the
   word count is in range. */
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';

interface EssayCheckButtonProps {
  validationValid: boolean;
  isChecking: boolean;
  /** LanguageTool has no rules for the chosen language (iOS
      supportsGrammarCheck == false) — the button stays off. */
  languageUnsupported?: boolean;
  languageName?: string;
  onCheck: () => void;
  errorMessage: string | null;
  /** Shows the Reset button beside Check when given. */
  onReset?: () => void;
  resetDisabled?: boolean;
}

export const EssayCheckButton = ({
  validationValid,
  isChecking,
  languageUnsupported = false,
  languageName,
  onCheck,
  errorMessage,
  onReset,
  resetDisabled = false,
}: EssayCheckButtonProps) => {
  const { t } = useTranslation();
  const disabled = !validationValid || isChecking || languageUnsupported;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2.5">
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            disabled={resetDisabled}
            className="flex-1 rounded-2xl bg-(--color-primary-blue)/8 py-[13px] text-[14px] font-bold text-(--color-primary-blue) transition-colors hover:bg-(--color-primary-blue)/12 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-(--color-home-brand) md:py-3.5 md:text-[15px]"
          >
            {t('writing.essays.editor.reset')}
          </button>
        )}
        <button
          type="button"
          onClick={onCheck}
          disabled={disabled}
          className={`flex flex-1 items-center justify-center gap-2 rounded-2xl py-[13px] text-[14px] font-bold text-white transition-[filter,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-(--color-home-brand) md:py-3.5 md:text-[15px] ${
            disabled && !isChecking
              ? 'bg-(--color-primary-blue-solid)/35'
              : 'bg-(--color-primary-blue-solid) hover:brightness-105 active:scale-[0.99]'
          }`}
        >
          <Icon
            name={isChecking ? 'arrow.triangle.2.circlepath' : 'checkmark.seal.fill'}
            className={`size-[14px] ${isChecking ? 'animate-spin' : ''}`}
          />
          {isChecking ? t('writing.essays.check.checking') : t('writing.essays.check.button')}
        </button>
      </div>
      {languageUnsupported && (
        <span className="text-center text-[12px] font-medium text-(--color-text-secondary) md:text-[13px]">
          {t('writing.essays.check.languageUnsupported', { language: languageName })}
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
