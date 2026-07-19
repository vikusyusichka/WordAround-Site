/* Word-translation card — web port of the ReadingReadingToolbarView
   translation section: selected word, target-language pills, and the
   translation result / spinner / error. */
import { useTranslation } from 'react-i18next';

import { ESSAY_LANGUAGES } from '@/lib/essayTypes';

interface ReadingTranslationCardProps {
  word: string;
  textLanguageId: string;
  targetLanguageId: string;
  translation: string | null;
  isTranslating: boolean;
  hasError: boolean;
  onSelectTarget: (languageId: string) => void;
  onClose: () => void;
}

export const ReadingTranslationCard = ({
  word,
  textLanguageId,
  targetLanguageId,
  translation,
  isTranslating,
  hasError,
  onSelectTarget,
  onClose,
}: ReadingTranslationCardProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#21A8BD]/30 bg-[#21A8BD]/5 p-4">
      <div className="flex items-center justify-between">
        <span className="text-[18px] font-bold text-(--color-primary-blue-dark)">{word}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('reading.session.closeTranslation')}
          className="grid size-8 place-items-center rounded-full text-(--color-text-secondary) hover:bg-black/[0.04]"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {ESSAY_LANGUAGES.filter((l) => l.id !== textLanguageId).map((lang) => (
          <button
            key={lang.id}
            type="button"
            onClick={() => onSelectTarget(lang.id)}
            className={`h-8 rounded-full border px-3 text-[12px] font-semibold transition-colors ${
              targetLanguageId === lang.id
                ? 'border-[#21A8BD]/50 bg-[#21A8BD]/15 text-(--color-primary-blue-dark)'
                : 'border-(--color-auth-field-border) bg-white text-(--color-text-secondary)'
            }`}
          >
            {lang.shortTitle}
          </button>
        ))}
      </div>

      {isTranslating ? (
        <p className="text-[14px] font-medium text-(--color-text-secondary)">
          {t('reading.session.translating')}
        </p>
      ) : hasError ? (
        <p role="alert" className="text-[14px] font-semibold text-(--color-cs-red)">
          {t('reading.session.translationError')}
        </p>
      ) : translation ? (
        <p className="text-[16px] font-bold text-[#0F6A78]">{translation}</p>
      ) : null}
    </div>
  );
};
