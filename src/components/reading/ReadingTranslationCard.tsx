/* Word-translation card — port of ReadingReadingToolbarView's translation
   cards: a white card with an accent hairline border, an icon circle + labels
   header, target-language pills, then the tapped word (22px) over a divider and
   its translation (20px) in the accent. */
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import { ESSAY_LANGUAGES, findLanguage } from '@/lib/essayTypes';

// Reading My-Texts mode accent (teal).
const ACCENT = '#21A8BD';
const ACCENT_DARK = '#0F6A78';

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
    <div
      className="flex flex-col gap-3.5 rounded-[22px] bg-white/95 p-4 shadow-[0_4px_12px_rgba(0,0,0,0.05)]"
      style={{ border: `1px solid color-mix(in srgb, ${ACCENT} 22%, transparent)` }}
    >
      {/* Header — icon circle + labels + close. */}
      <div className="flex items-center gap-2">
        <span
          className="grid size-9 shrink-0 place-items-center rounded-full"
          style={{ background: `color-mix(in srgb, ${ACCENT} 14%, transparent)` }}
        >
          <Icon name="character.book.closed.fill" className="size-[15px]" style={{ color: ACCENT }} />
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="text-[14px] font-bold" style={{ color: ACCENT_DARK }}>
            {t('reading.session.translation')}
          </span>
          <span className="text-[11px] font-medium text-(--color-muted-text)">
            {findLanguage(textLanguageId).title} → {findLanguage(targetLanguageId).title}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('reading.session.closeTranslation')}
          className="ml-auto grid size-8 shrink-0 place-items-center rounded-full text-(--color-text-secondary) hover:bg-black/[0.04]"
        >
          <Icon name="xmark" className="size-[13px]" />
        </button>
      </div>

      {/* Target-language pills. */}
      <div className="flex flex-wrap gap-1.5">
        {ESSAY_LANGUAGES.filter((l) => l.id !== textLanguageId).map((lang) => {
          const active = targetLanguageId === lang.id;
          return (
            <button
              key={lang.id}
              type="button"
              onClick={() => onSelectTarget(lang.id)}
              className="h-8 rounded-full border px-3 text-[12px] font-bold transition-colors focus-visible:outline-none"
              style={
                active
                  ? { background: ACCENT, borderColor: 'transparent', color: '#fff' }
                  : {
                      background: `color-mix(in srgb, ${ACCENT} 8%, transparent)`,
                      borderColor: `color-mix(in srgb, ${ACCENT} 22%, transparent)`,
                      color: ACCENT_DARK,
                    }
              }
            >
              {lang.shortTitle}
            </button>
          );
        })}
      </div>

      {/* Word → translation. */}
      {isTranslating ? (
        <p className="text-[14px] font-medium text-(--color-text-secondary)">
          {t('reading.session.translating')}
        </p>
      ) : hasError ? (
        <p role="alert" className="text-[13px] font-medium text-(--color-cs-red)">
          {t('reading.session.translationError')}
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          <span className="text-[22px] font-bold" style={{ color: ACCENT_DARK }}>
            {word}
          </span>
          {translation && (
            <>
              <span
                className="h-px w-full"
                style={{ background: `color-mix(in srgb, ${ACCENT} 14%, transparent)` }}
              />
              <span className="text-[20px] font-semibold" style={{ color: ACCENT }}>
                {translation}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
};
