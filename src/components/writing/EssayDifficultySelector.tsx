/* CEFR difficulty picker — port of iOS DifficultySelectorView: slider icon,
   level, helper-intensity badge (Guided / Balanced / Limited / Independent),
   and per-option "N hints • translation" subtitles. */
import { useTranslation } from 'react-i18next';

import { EssaySelector } from './EssaySelector';
import {
  ESSAY_DIFFICULTIES,
  HINTS_LIMIT,
  TRANSLATION_LIMIT,
  type EssayDifficulty,
} from '@/lib/essayTypes';

interface EssayDifficultySelectorProps {
  value: EssayDifficulty;
  onChange: (difficulty: EssayDifficulty) => void;
  disabled?: boolean;
}

/* iOS EssayDifficulty.helperIntensityTitle */
const INTENSITY: Record<EssayDifficulty, 'guided' | 'balanced' | 'limited' | 'independent'> = {
  A1: 'guided',
  A2: 'guided',
  B1: 'balanced',
  B2: 'limited',
  C1: 'limited',
  Native: 'independent',
};

export const EssayDifficultySelector = ({
  value,
  onChange,
  disabled,
}: EssayDifficultySelectorProps) => {
  const { t } = useTranslation();
  const intensity = (level: EssayDifficulty) => t(`writing.essays.intensity.${INTENSITY[level]}`);

  return (
    <EssaySelector
      icon="slider.horizontal.3"
      label={t('writing.essays.difficulty')}
      value={value}
      badge={intensity(value)}
      optionBadgeWidth={46}
      disabled={disabled}
      options={ESSAY_DIFFICULTIES.map((level) => ({
        key: level,
        badge: level,
        title: intensity(level),
        subtitle: t(
          TRANSLATION_LIMIT[level] > 0
            ? 'writing.essays.difficultyOption.withTranslation'
            : 'writing.essays.difficultyOption.noTranslation',
          { n: HINTS_LIMIT[level] },
        ),
        active: level === value,
        onSelect: () => onChange(level),
      }))}
    />
  );
};
