/* Dynamic card editor for the set wizard. Each row: word, translation and an
   optional photo side by side, with the example underneath. Controlled by the
   wizard via value/onChange over the DraftCard[] array, and painted with the
   set's chosen theme like every other part of the create screen. */
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Image as ImageIcon, Plus, Trash, X } from '@phosphor-icons/react';

import { emptyCard, EXAMPLE_MAX, type DraftCard } from '@/lib/createSetValidation';
import type { SetTheme } from '@/lib/setColors';

interface CardEditorProps {
  cards: DraftCard[];
  onChange: (cards: DraftCard[]) => void;
  theme: SetTheme;
}

export const CardEditor = ({ cards, onChange, theme }: CardEditorProps) => {
  const { t } = useTranslation();

  const update = (id: string, patch: Partial<DraftCard>) =>
    onChange(cards.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const remove = (id: string) => onChange(cards.filter((c) => c.id !== id));
  const add = () => onChange([...cards, emptyCard()]);

  return (
    <div className="flex flex-col gap-3.5">
      {cards.map((card, index) => (
        <CardRow
          key={card.id}
          card={card}
          index={index}
          canRemove={cards.length > 1}
          theme={theme}
          onChange={(patch) => update(card.id, patch)}
          onRemove={() => remove(card.id)}
        />
      ))}

      <button
        type="button"
        onClick={add}
        className="flex items-center justify-center gap-2 rounded-2xl border border-dashed py-3 text-[15px] font-semibold transition-colors hover:brightness-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        style={{
          borderColor: theme.borderColor,
          color: theme.accent,
          background: theme.softAccent,
        }}
      >
        <Plus size={18} weight="bold" />
        {t('createSet.addCard')}
      </button>
    </div>
  );
};

interface CardRowProps {
  card: DraftCard;
  index: number;
  canRemove: boolean;
  theme: SetTheme;
  onChange: (patch: Partial<DraftCard>) => void;
  onRemove: () => void;
}

const CardRow = ({ card, index, canRemove, theme, onChange, onRemove }: CardRowProps) => {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);

  const preview = useMemo(
    () => (card.imageFile ? URL.createObjectURL(card.imageFile) : card.imageURL),
    [card.imageFile, card.imageURL],
  );
  useEffect(() => {
    return () => {
      if (card.imageFile && preview) URL.revokeObjectURL(preview);
    };
  }, [preview, card.imageFile]);

  const field =
    'h-11 w-full min-w-0 rounded-xl border px-3.5 text-[15px] font-medium outline-none transition-colors focus-visible:outline-2';
  /* The accent shows only on focus, where Tailwind turns the outline width on. */
  const fieldStyle = {
    background: theme.fieldBackground,
    borderColor: theme.softBorderColor,
    color: theme.textColor,
    outlineColor: theme.accent,
  };

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border p-3.5 transition-colors md:p-4"
      style={{
        background: theme.previewBackground,
        borderColor: theme.softBorderColor,
        boxShadow: `0 2px 8px ${theme.shadowColor}`,
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-bold" style={{ color: theme.titleColor }}>
          {t('createSet.cardN', { n: index + 1 })}
        </span>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={t('createSet.removeCard')}
            className="grid size-8 place-items-center rounded-full transition-colors hover:brightness-95 focus-visible:outline-none"
            style={{ color: theme.accent, background: theme.softAccent }}
          >
            <Trash size={16} weight="bold" />
          </button>
        )}
      </div>

      {/* Word, translation and the picture live in one block. */}
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-center">
        <input
          value={card.word}
          onChange={(e) => onChange({ word: e.target.value })}
          placeholder={t('createSet.word')}
          className={field}
          style={fieldStyle}
        />
        <input
          value={card.translation}
          onChange={(e) => onChange({ translation: e.target.value })}
          placeholder={t('createSet.translation')}
          className={field}
          style={fieldStyle}
        />

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onChange({ imageFile: file, imageURL: null });
            e.target.value = '';
          }}
        />
        {preview ? (
          <div className="relative size-16 justify-self-start">
            <img
              src={preview}
              alt=""
              className="size-16 rounded-xl border object-cover"
              style={{ borderColor: theme.softBorderColor }}
            />
            <button
              type="button"
              onClick={() => onChange({ imageFile: null, imageURL: null })}
              aria-label={t('createSet.removeImage')}
              className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full focus-visible:outline-none"
              style={{
                background: theme.fieldBackground,
                color: theme.accent,
                boxShadow: `0 2px 6px ${theme.shadowColor}`,
              }}
            >
              <X size={12} weight="bold" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label={t('createSet.addImage')}
            title={t('createSet.addImage')}
            className="grid size-16 place-items-center justify-self-start rounded-xl border border-dashed transition-colors hover:brightness-[0.98] focus-visible:outline-none"
            style={{
              background: theme.imageBackground,
              borderColor: theme.borderColor,
              color: theme.mutedTextColor,
            }}
          >
            <ImageIcon size={22} />
          </button>
        )}
      </div>

      <input
        value={card.example}
        onChange={(e) => onChange({ example: e.target.value })}
        placeholder={t('createSet.example')}
        maxLength={EXAMPLE_MAX}
        className={field}
        style={fieldStyle}
      />
    </div>
  );
};
