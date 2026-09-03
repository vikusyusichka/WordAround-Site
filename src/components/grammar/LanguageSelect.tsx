/* Language of a topic / note (iOS GrammarLanguage). A plain select — the list
   is long enough that chips would push everything else off the screen. */
import { useTranslation } from 'react-i18next';

import { ESSAY_LANGUAGES } from '@/lib/essayTypes';

interface LanguageSelectProps {
  /** GrammarLanguage id (`english`, `spanish`, …); '' = not set. */
  value: string;
  onChange: (code: string, name: string) => void;
}

export const LanguageSelect = ({ value, onChange }: LanguageSelectProps) => {
  const { t } = useTranslation();

  return (
    <select
      value={value}
      onChange={(e) => {
        const code = e.target.value;
        const match = ESSAY_LANGUAGES.find((l) => l.id === code);
        onChange(code, match?.title ?? '');
      }}
      aria-label={t('writing.grammar.form.language')}
      className="w-full rounded-2xl border border-(--color-auth-field-border) bg-white px-4 py-3 text-[15px] font-medium text-(--color-primary-blue-dark) outline-none focus-visible:border-(--color-home-brand)"
    >
      <option value="">{t('writing.grammar.form.languageNone')}</option>
      {ESSAY_LANGUAGES.map((language) => (
        <option key={language.id} value={language.id}>
          {language.title}
        </option>
      ))}
    </select>
  );
};
