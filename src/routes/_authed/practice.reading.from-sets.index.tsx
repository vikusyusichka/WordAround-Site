/* Reading From Sets — /practice/reading/from-sets. Library of generated
   readings + the creation flow (pick a flashcard set → vocab preview →
   config → AI generate). Web port of ReadingFromSetCreationView +
   ReadingModeLibraryView. */
import { useMemo, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Plus } from '@phosphor-icons/react';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { ReadingTextCard } from '@/components/reading/ReadingTextCard';
import { GrammarNotesEmptyState } from '@/components/grammar/GrammarNotesEmptyState';
import { SetSelectionModal } from '@/components/writing/SetSelectionModal';
import {
  useDeleteReadingItem,
  useReadingItemsQuery,
  useRenameReadingItem,
  useSaveReadingItem,
} from '@/hooks/useReadingItems';
import { useUid } from '@/hooks/useFolders';
import {
  extractVocabulary,
  FROM_SET_DIFFICULTIES,
  FROM_SET_LENGTHS,
  FROM_SET_MIN_WORDS,
  FromSetError,
  GENERATION_STYLES,
  generateFromSetItem,
  type FromSetLength,
  type ReadingFromSetVocabulary,
  type ReadingGenerationStyle,
} from '@/lib/readingFromSets';
import type { FlashcardSet, ReadingDifficulty, ReadingLibraryItem } from '@/lib/models';

export const Route = createFileRoute('/_authed/practice/reading/from-sets/')({
  component: FromSetsScreen,
});

const pill = (selected: boolean) =>
  `h-9 rounded-full border px-3.5 text-[13px] font-semibold transition-colors ${
    selected
      ? 'border-[#F7A310]/50 bg-[#F7A310]/10 text-(--color-primary-blue-dark)'
      : 'border-(--color-auth-field-border) bg-white text-(--color-text-secondary)'
  }`;

function FromSetsScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const uid = useUid();
  const { data: items, isLoading, isError } = useReadingItemsQuery('reading-from-sets');
  const saveItem = useSaveReadingItem();
  const renameItem = useRenameReadingItem();
  const deleteItem = useDeleteReadingItem();

  const [setPickerOpen, setSetPickerOpen] = useState(false);
  const [selectedSet, setSelectedSet] = useState<FlashcardSet | null>(null);
  const [difficulty, setDifficulty] = useState<ReadingDifficulty>('B1');
  const [length, setLength] = useState<FromSetLength>('medium');
  const [mode, setMode] = useState<ReadingGenerationStyle>('natural');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vocabulary: ReadingFromSetVocabulary | null = useMemo(() => {
    if (!selectedSet) return null;
    try {
      return extractVocabulary(selectedSet);
    } catch (e) {
      if (e instanceof FromSetError) return null;
      return null;
    }
  }, [selectedSet]);

  const tooFewWords = selectedSet !== null && vocabulary === null;

  const handleGenerate = async () => {
    if (!vocabulary || isGenerating) return;
    setIsGenerating(true);
    setError(null);
    try {
      const item = await generateFromSetItem(
        {
          vocabulary,
          targetLanguageId: 'english',
          difficulty,
          length,
          generationMode: mode,
          readingFocus: 'mainIdea',
        },
        uid as string,
      );
      saveItem.mutate(item, {
        onSuccess: () =>
          void navigate({
            to: '/practice/reading/session/$itemId',
            params: { itemId: item.id },
          }),
      });
    } catch {
      setError(t('reading.fromSets.generateError'));
    } finally {
      setIsGenerating(false);
    }
  };

  const openItem = (item: ReadingLibraryItem) =>
    void navigate({ to: '/practice/reading/session/$itemId', params: { itemId: item.id } });

  return (
    <ContentContainer fluid>
      <PageHeader
        title={t('reading.fromSets.title')}
        subtitle={t('reading.fromSets.subtitle')}
        actions={
          <button
            type="button"
            onClick={() => setSetPickerOpen(true)}
            className="flex h-11 items-center gap-2 rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) px-4 text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98] focus-visible:outline-none"
          >
            <Plus size={18} weight="bold" />
            {t('reading.fromSets.pickSet')}
          </button>
        }
      />

      <div className="flex flex-col gap-6">
        <button
          type="button"
          onClick={() => void navigate({ to: '/practice/reading' })}
          className="w-fit text-[13px] font-semibold text-(--color-primary-blue) hover:underline focus-visible:outline-none"
        >
          ← {t('nav.reading')}
        </button>

        {/* Creation card (after a set is picked) */}
        {selectedSet && (
          <section className="flex flex-col gap-4 rounded-3xl border border-white bg-white/95 p-5 shadow-[0_4px_10px_rgba(0,0,0,0.045)]">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[16px] font-bold text-(--color-primary-blue-dark)">
                {selectedSet.title}
              </h2>
              <button
                type="button"
                onClick={() => setSetPickerOpen(true)}
                className="text-[13px] font-semibold text-(--color-primary-blue) hover:underline"
              >
                {t('reading.fromSets.changeSet')}
              </button>
            </div>

            {tooFewWords ? (
              <p role="alert" className="text-[14px] font-semibold text-(--color-cs-red)">
                {t('reading.fromSets.tooFewWords', { count: FROM_SET_MIN_WORDS })}
              </p>
            ) : (
              vocabulary && (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {vocabulary.words.slice(0, 14).map((w) => (
                      <span
                        key={w.term}
                        className="rounded-full bg-[#F7A310]/12 px-2.5 py-1 text-[12px] font-bold text-[#B97607]"
                      >
                        {w.term}
                      </span>
                    ))}
                    {vocabulary.words.length > 14 && (
                      <span className="rounded-full bg-(--color-goal-bg) px-2.5 py-1 text-[12px] font-bold text-(--color-text-secondary)">
                        +{vocabulary.words.length - 14}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-bold uppercase tracking-wide text-(--color-text-secondary)">
                      {t('reading.fromSets.mode')}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {GENERATION_STYLES.map((style) => (
                        <button key={style} type="button" onClick={() => setMode(style)} className={pill(mode === style)}>
                          {t(`reading.fromSets.modeOption.${style}`)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-bold uppercase tracking-wide text-(--color-text-secondary)">
                      {t('reading.addText.difficulty')}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {FROM_SET_DIFFICULTIES.map((level) => (
                        <button key={level} type="button" onClick={() => setDifficulty(level)} className={pill(difficulty === level)}>
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-bold uppercase tracking-wide text-(--color-text-secondary)">
                      {t('reading.fromSets.length')}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {FROM_SET_LENGTHS.map((l) => (
                        <button key={l} type="button" onClick={() => setLength(l)} className={pill(length === l)}>
                          {t(`reading.addText.length.${l}`)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {error && (
                    <p role="alert" className="text-[14px] font-semibold text-(--color-cs-red)">
                      {error}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => void handleGenerate()}
                    disabled={isGenerating || saveItem.isPending}
                    className="h-12 w-full rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98] disabled:opacity-60"
                  >
                    {isGenerating || saveItem.isPending
                      ? t('reading.fromSets.generating')
                      : t('reading.fromSets.generate')}
                  </button>
                </>
              )
            )}
          </section>
        )}

        {isLoading && (
          <p className="py-10 text-center text-[15px] font-medium text-(--color-text-secondary)">
            {t('reading.loading')}
          </p>
        )}
        {isError && (
          <p role="alert" className="py-10 text-center text-[15px] font-medium text-(--color-cs-red)">
            {t('reading.loadError')}
          </p>
        )}

        {items && items.length === 0 && !selectedSet && (
          <GrammarNotesEmptyState
            title={t('reading.fromSets.emptyTitle')}
            body={t('reading.fromSets.emptyBody')}
          />
        )}

        {items && items.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-[16px] font-bold text-(--color-primary-blue-dark)">
              {t('reading.fromSets.savedTitle')}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {items.map((item) => (
                <ReadingTextCard
                  key={item.id}
                  item={item}
                  onOpen={() => openItem(item)}
                  onRename={() => {
                    const next = window.prompt(t('reading.card.renamePrompt'), item.title);
                    if (next && next.trim().length > 0) renameItem.mutate({ id: item.id, title: next });
                  }}
                  onDelete={() => {
                    if (window.confirm(t('reading.card.deleteConfirm', { title: item.title }))) {
                      deleteItem.mutate(item.id);
                    }
                  }}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      <SetSelectionModal
        open={setPickerOpen}
        onClose={() => setSetPickerOpen(false)}
        onSelect={(set) => {
          setSelectedSet(set);
          setSetPickerOpen(false);
          setError(null);
        }}
      />
    </ContentContainer>
  );
}
