/* Paste-and-import screen for the set wizard. Opened from the Import button on
   the create screen and closed again by importing or cancelling — the wizard
   keeps its draft in the background, so nothing typed there is lost.

   Everything is themed with the set's chosen colour, exactly like the create
   screen it sits in front of. */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from '@phosphor-icons/react';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { CreateSection } from '@/components/create/CreateSection';
import { ThemedScreen } from '@/components/create/ThemedScreen';
import {
  defaultSeparators,
  parseImportedCards,
  type CardSeparatorId,
  type ImportSeparators,
  type ParsedCard,
  type TermSeparatorId,
} from '@/lib/importCards';
import type { SetTheme } from '@/lib/setColors';

interface ImportCardsScreenProps {
  theme: SetTheme;
  onCancel: () => void;
  onImport: (cards: ParsedCard[]) => void;
}

export const ImportCardsScreen = ({ theme, onCancel, onImport }: ImportCardsScreenProps) => {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [separators, setSeparators] = useState<ImportSeparators>(defaultSeparators);

  const cards = useMemo(() => parseImportedCards(text, separators), [text, separators]);

  const patch = (p: Partial<ImportSeparators>) => setSeparators((s) => ({ ...s, ...p }));

  const labelStyle = { color: theme.titleColor };
  const mutedStyle = { color: theme.mutedTextColor };

  return (
    <ContentContainer>
      <ThemedScreen background={theme.screenBackground} />

      <PageHeader
        title={t('createSet.import.title')}
        subtitle={t('createSet.import.subtitle')}
        actions={
          <button
            type="button"
            onClick={onCancel}
            aria-label={t('createSet.import.close')}
            className="grid size-11 place-items-center rounded-full bg-white transition-colors hover:bg-black/[0.03] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            style={{ color: theme.titleColor, boxShadow: `0 4px 10px ${theme.shadowColor}` }}
          >
            <X size={18} weight="bold" />
          </button>
        }
      />

      <div className="flex flex-col gap-3.5 lg:gap-[18px]">
        <CreateSection title={t('createSet.import.dataSection')} theme={theme}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={9}
            placeholder={t('createSet.import.placeholder')}
            aria-label={t('createSet.import.dataSection')}
            className="w-full resize-y rounded-2xl border bg-white px-4 py-3 text-[15px] font-medium outline-none transition-colors"
            style={{ borderColor: theme.softBorderColor, color: theme.textColor }}
          />
        </CreateSection>

        <CreateSection title={t('createSet.import.separatorsSection')} theme={theme}>
          <div className="grid gap-5 sm:grid-cols-2">
            <SeparatorGroup
              legend={t('createSet.import.betweenTermAndDefinition')}
              theme={theme}
              options={[
                { id: 'tab' as TermSeparatorId, label: t('createSet.import.tab') },
                { id: 'comma' as TermSeparatorId, label: t('createSet.import.comma') },
              ]}
              selected={separators.term}
              onSelect={(term) => patch({ term })}
              customValue={separators.termCustom}
              onCustomChange={(termCustom) => patch({ term: 'custom', termCustom })}
            />

            <SeparatorGroup
              legend={t('createSet.import.betweenCards')}
              theme={theme}
              options={[
                { id: 'newline' as CardSeparatorId, label: t('createSet.import.newline') },
                { id: 'semicolon' as CardSeparatorId, label: t('createSet.import.semicolon') },
              ]}
              selected={separators.card}
              onSelect={(card) => patch({ card })}
              customValue={separators.cardCustom}
              onCustomChange={(cardCustom) => patch({ card: 'custom', cardCustom })}
            />
          </div>
        </CreateSection>

        <CreateSection title={t('createSet.import.previewSection')} theme={theme}>
          <span className="text-[13px] font-semibold" style={mutedStyle}>
            {t('sets.cardCount', { count: cards.length })}
          </span>

          {cards.length === 0 ? (
            <p className="text-[15px] font-medium" style={mutedStyle}>
              {t('createSet.import.previewEmpty')}
            </p>
          ) : (
            <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
              {cards.map((card, index) => (
                <li
                  key={`${card.term}-${index}`}
                  className="grid gap-1 rounded-2xl border px-4 py-2.5 sm:grid-cols-2 sm:gap-4"
                  style={{ background: theme.fieldBackground, borderColor: theme.softBorderColor }}
                >
                  <span className="text-[15px] font-semibold" style={labelStyle}>
                    {card.term}
                  </span>
                  <span className="text-[15px] font-medium" style={mutedStyle}>
                    {card.definition || t('createSet.import.noDefinition')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CreateSection>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onImport(cards)}
            disabled={cards.length === 0}
            className="h-14 flex-1 rounded-[24px] px-6 text-[18px] font-semibold text-white transition-transform hover:brightness-105 active:scale-[0.99] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none md:h-[66px] md:rounded-[28px] md:text-[21px]"
            style={{ background: theme.accent, boxShadow: `0 8px 12px ${theme.shadowColor}` }}
          >
            {t('createSet.import.confirm')}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="h-14 rounded-[24px] bg-white px-6 text-[15px] font-semibold transition-colors hover:bg-black/[0.03] focus-visible:outline-none md:h-[66px]"
            style={mutedStyle}
          >
            {t('createSet.cancel')}
          </button>
        </div>
      </div>
    </ContentContainer>
  );
};

interface SeparatorGroupProps<Id extends string> {
  legend: string;
  theme: SetTheme;
  options: { id: Id; label: string }[];
  selected: Id | 'custom';
  onSelect: (id: Id | 'custom') => void;
  customValue: string;
  onCustomChange: (value: string) => void;
}

const SeparatorGroup = <Id extends string>({
  legend,
  theme,
  options,
  selected,
  onSelect,
  customValue,
  onCustomChange,
}: SeparatorGroupProps<Id>) => {
  const { t } = useTranslation();

  return (
    <div role="radiogroup" aria-label={legend} className="flex flex-col gap-2.5">
      <span className="text-[14px] font-bold" style={{ color: theme.titleColor }}>
        {legend}
      </span>

      {options.map((option) => (
        <RadioRow
          key={option.id}
          checked={selected === option.id}
          onSelect={() => onSelect(option.id)}
          label={option.label}
          theme={theme}
        />
      ))}

      <div className="flex items-center gap-2.5">
        <RadioRow
          checked={selected === 'custom'}
          onSelect={() => onSelect('custom')}
          label={t('createSet.import.custom')}
          theme={theme}
        />
        <input
          value={customValue}
          onChange={(e) => onCustomChange(e.target.value)}
          onFocus={() => onSelect('custom')}
          placeholder={t('createSet.import.customPlaceholder')}
          aria-label={`${legend} — ${t('createSet.import.custom')}`}
          className="h-10 w-24 rounded-xl border bg-white px-3 text-[15px] font-semibold outline-none transition-colors"
          style={{ borderColor: theme.softBorderColor, color: theme.titleColor }}
        />
      </div>
    </div>
  );
};

interface RadioRowProps {
  checked: boolean;
  onSelect: () => void;
  label: string;
  theme: SetTheme;
}

const RadioRow = ({ checked, onSelect, label, theme }: RadioRowProps) => (
  <button
    type="button"
    role="radio"
    aria-checked={checked}
    onClick={onSelect}
    className="flex items-center gap-2.5 self-start text-[15px] font-semibold focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
    style={{ color: checked ? theme.titleColor : theme.mutedTextColor }}
  >
    <span
      className="grid size-[19px] shrink-0 place-items-center rounded-full border-2 transition-colors"
      style={{ borderColor: checked ? theme.accent : theme.borderColor }}
      aria-hidden
    >
      {checked && <span className="size-2.5 rounded-full" style={{ background: theme.accent }} />}
    </span>
    {label}
  </button>
);
