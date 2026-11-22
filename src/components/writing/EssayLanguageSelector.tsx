/* Essay language picker — port of iOS LanguageSelectorView (globe icon,
   language name, short-code badge). */
import { useTranslation } from 'react-i18next';

import { EssaySelector } from './EssaySelector';
import { ESSAY_LANGUAGES, type GrammarLanguage } from '@/lib/essayTypes';

interface EssayLanguageSelectorProps {
  value: GrammarLanguage;
  onChange: (language: GrammarLanguage) => void;
  disabled?: boolean;
}

export const EssayLanguageSelector = ({
  value,
  onChange,
  disabled,
}: EssayLanguageSelectorProps) => {
  const { t } = useTranslation();
  return (
    <EssaySelector
      icon="globe.europe.africa.fill"
      label={t('writing.essays.language')}
      value={value.title}
      badge={value.shortTitle}
      optionBadgeWidth={34}
      disabled={disabled}
      scrollable
      options={ESSAY_LANGUAGES.map((lang) => ({
        key: lang.id,
        badge: lang.shortTitle,
        title: lang.title,
        active: lang.id === value.id,
        onSelect: () => onChange(lang),
      }))}
    />
  );
};
