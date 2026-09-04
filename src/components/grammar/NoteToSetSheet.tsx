/* "Make a set from this note" — the bridge between a grammar note and the
   flashcard side of the app (Study, Write Words, Reading from sets).

   The pairs are shown before anything is created, with checkboxes, because
   extraction is a guess: a list item split on a dash usually gives a good
   card and sometimes gives a bad one, and the learner can see which in a
   second. Creating the set first and asking them to clean it up afterwards
   would put the work in the harder place. */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import type { CardPair } from '@/lib/grammarNoteToCards';

interface NoteToSetSheetProps {
  open: boolean;
  /** Every pair the note yielded; empty renders the "nothing to convert" copy. */
  pairs: CardPair[];
  /** Seeds the title field — the note's own title. */
  defaultTitle: string;
  isSaving: boolean;
  error: string | null;
  onCreate: (title: string, pairs: CardPair[]) => void;
  onClose: () => void;
}

export const NoteToSetSheet = ({
  open,
  pairs,
  defaultTitle,
  isSaving,
  error,
  onCreate,
  onClose,
}: NoteToSetSheetProps) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState(defaultTitle);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());

  /* Reopening on a different note must not carry the previous note's title or
     ticks. */
  useEffect(() => {
    if (!open) return;
    setTitle(defaultTitle);
    setExcluded(new Set());
  }, [open, defaultTitle]);

  const selected = useMemo(
    () => pairs.filter((pair) => !excluded.has(pair.id)),
    [pairs, excluded],
  );

  if (!open) return null;

  const toggle = (id: string) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const canCreate = selected.length > 0 && title.trim().length > 0 && !isSaving;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 backdrop-blur-sm md:items-center md:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('writing.grammar.toSet.title')}
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-[560px] flex-col gap-4 overflow-y-auto rounded-t-3xl bg-(--color-app-bg) p-5 shadow-[0_20px_40px_rgba(0,0,0,0.2)] md:rounded-3xl md:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-(--color-primary-blue)/12">
            <Icon name="rectangle.stack.fill" className="size-5 text-(--color-primary-blue)" />
          </span>
          <div className="flex min-w-0 flex-col">
            <h2 className="text-[19px] font-bold text-(--color-primary-blue-dark)">
              {t('writing.grammar.toSet.title')}
            </h2>
            <p className="text-[13px] font-medium text-(--color-text-secondary)">
              {t('writing.grammar.toSet.subtitle')}
            </p>
          </div>
        </div>

        {pairs.length === 0 ? (
          <p className="rounded-2xl border border-(--color-auth-field-border) bg-white p-4 text-[14px] font-medium text-(--color-text-secondary)">
            {t('writing.grammar.toSet.empty')}
          </p>
        ) : (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-bold text-(--color-text-secondary)">
                {t('writing.grammar.toSet.setTitle')}
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-11 w-full rounded-2xl border border-(--color-auth-field-border) bg-white px-4 text-[15px] font-semibold text-(--color-primary-blue-dark) outline-none focus-visible:border-(--color-home-brand)"
              />
            </label>

            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-bold text-(--color-text-secondary)">
                {t('writing.grammar.toSet.cards', { count: selected.length })}
              </span>
              {pairs.map((pair) => {
                const isOn = !excluded.has(pair.id);
                return (
                  <label
                    key={pair.id}
                    className="flex cursor-pointer items-center gap-3 rounded-2xl border border-(--color-auth-field-border) bg-white px-4 py-3 transition-colors hover:bg-black/[0.02]"
                  >
                    <input
                      type="checkbox"
                      checked={isOn}
                      onChange={() => toggle(pair.id)}
                      className="size-5 shrink-0 accent-(--color-primary-blue)"
                    />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-[14px] font-bold text-(--color-primary-blue-dark)">
                        {pair.word}
                      </span>
                      <span className="truncate text-[13px] font-semibold text-(--color-text-secondary)">
                        {pair.translation}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </>
        )}

        {error && (
          <p role="alert" className="text-[14px] font-semibold text-(--color-cs-red)">
            {error}
          </p>
        )}

        <div className="mt-1 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-2xl border border-(--color-auth-field-border) bg-white px-5 text-[15px] font-semibold text-(--color-text-secondary) transition-colors hover:bg-black/[0.03] focus-visible:outline-none"
          >
            {t('common.cancel')}
          </button>
          {pairs.length > 0 && (
            <button
              type="button"
              onClick={() => onCreate(title.trim(), selected)}
              disabled={!canCreate}
              className="h-11 rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) px-5 text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98] disabled:opacity-60 focus-visible:outline-none"
            >
              {isSaving
                ? t('writing.grammar.toSet.creating')
                : t('writing.grammar.toSet.create')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
