/* Dynamic card editor for the set wizard. Each row: word, translation, example,
   and an optional photo (uploaded to Storage at save time). Controlled by the
   wizard via value/onChange over the DraftCard[] array. */
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Image as ImageIcon, Plus, Trash, X } from '@phosphor-icons/react';

import { emptyCard, EXAMPLE_MAX, type DraftCard } from '@/lib/createSetValidation';

interface CardEditorProps {
  cards: DraftCard[];
  onChange: (cards: DraftCard[]) => void;
}

export const CardEditor = ({ cards, onChange }: CardEditorProps) => {
  const { t } = useTranslation();

  const update = (id: string, patch: Partial<DraftCard>) =>
    onChange(cards.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const remove = (id: string) => onChange(cards.filter((c) => c.id !== id));
  const add = () => onChange([...cards, emptyCard()]);

  return (
    <div className="flex flex-col gap-4">
      {cards.map((card, index) => (
        <CardRow
          key={card.id}
          card={card}
          index={index}
          canRemove={cards.length > 1}
          onChange={(patch) => update(card.id, patch)}
          onRemove={() => remove(card.id)}
        />
      ))}

      <button
        type="button"
        onClick={add}
        className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-(--color-auth-field-border) py-3 text-[15px] font-semibold text-(--color-home-brand) transition-colors hover:bg-black/[0.02] focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:outline-none"
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
  onChange: (patch: Partial<DraftCard>) => void;
  onRemove: () => void;
}

const CardRow = ({ card, index, canRemove, onChange, onRemove }: CardRowProps) => {
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
    'h-11 rounded-xl border border-(--color-auth-field-border) bg-white px-3.5 text-[15px] font-medium text-(--color-cs-dark-text) outline-none focus-visible:border-(--color-home-brand)';

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-(--color-auth-field-border) bg-white/70 p-4">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-bold text-(--color-cs-text-muted)">
          {t('createSet.cardN', { n: index + 1 })}
        </span>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={t('createSet.removeCard')}
            className="grid size-8 place-items-center rounded-full text-(--color-cs-red) hover:bg-(--color-cs-soft-red) focus-visible:outline-none"
          >
            <Trash size={16} weight="bold" />
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={card.word}
          onChange={(e) => onChange({ word: e.target.value })}
          placeholder={t('createSet.word')}
          className={field}
        />
        <input
          value={card.translation}
          onChange={(e) => onChange({ translation: e.target.value })}
          placeholder={t('createSet.translation')}
          className={field}
        />
      </div>

      <input
        value={card.example}
        onChange={(e) => onChange({ example: e.target.value })}
        placeholder={t('createSet.example')}
        maxLength={EXAMPLE_MAX}
        className={field}
      />

      {/* Optional image */}
      <div className="flex items-center gap-3">
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
          <div className="relative">
            <img src={preview} alt="" className="size-16 rounded-xl object-cover" />
            <button
              type="button"
              onClick={() => onChange({ imageFile: null, imageURL: null })}
              aria-label={t('createSet.removeImage')}
              className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-white text-(--color-cs-red) shadow-[0_2px_6px_rgba(0,0,0,0.15)]"
            >
              <X size={12} weight="bold" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 rounded-xl border border-dashed border-(--color-auth-field-border) px-3 py-2 text-[14px] font-medium text-(--color-cs-text-muted) hover:bg-black/[0.02] focus-visible:outline-none"
          >
            <ImageIcon size={18} />
            {t('createSet.addImage')}
          </button>
        )}
      </div>
    </div>
  );
};
