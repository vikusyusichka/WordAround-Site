/* Story Mode setup — /practice/reading/story. Pick type / length /
   difficulty → generate the opening chapter → save → session. Saved stories
   list below (Continue). Web port of the StoryMode setup flow. */
import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { ReadingTextCard } from '@/components/reading/ReadingTextCard';
import { GrammarNotesEmptyState } from '@/components/grammar/GrammarNotesEmptyState';
import {
  useDeleteReadingItem,
  useReadingItemsQuery,
  useRenameReadingItem,
  useSaveReadingItem,
} from '@/hooks/useReadingItems';
import { useUid } from '@/hooks/useFolders';
import {
  generateChapter,
  STORY_DIFFICULTIES,
  STORY_LENGTHS,
  STORY_TYPES,
  storyItemFromSession,
  type StoryConfiguration,
  type StoryLength,
  type StoryType,
} from '@/lib/storyMode';
import type { ReadingDifficulty, ReadingLibraryItem } from '@/lib/models';

export const Route = createFileRoute('/_authed/practice/reading/story/')({
  component: StorySetupScreen,
});

const pill = (selected: boolean) =>
  `h-9 rounded-full border px-3.5 text-[13px] font-semibold transition-colors ${
    selected
      ? 'border-[#ED6699]/50 bg-[#ED6699]/10 text-(--color-primary-blue-dark)'
      : 'border-(--color-auth-field-border) bg-white text-(--color-text-secondary)'
  }`;

function StorySetupScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const uid = useUid();
  const { data: items, isLoading, isError } = useReadingItemsQuery('story-mode');
  const saveItem = useSaveReadingItem();
  const renameItem = useRenameReadingItem();
  const deleteItem = useDeleteReadingItem();

  const [storyType, setStoryType] = useState<StoryType>('adventure');
  const [storyLength, setStoryLength] = useState<StoryLength>('shortStory');
  const [difficulty, setDifficulty] = useState<ReadingDifficulty>('B1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startStory = async () => {
    if (isGenerating || !uid) return;
    setIsGenerating(true);
    setError(null);
    try {
      const config: StoryConfiguration = {
        languageId: 'english',
        storyType,
        storyLength,
        difficulty,
      };
      const chapter = await generateChapter(config, [], null);
      const item = storyItemFromSession({ ownerUID: uid, config, chapters: [chapter] });
      saveItem.mutate(item, {
        onSuccess: () =>
          void navigate({ to: '/practice/reading/story/$itemId', params: { itemId: item.id } }),
      });
    } catch {
      setError(t('reading.story.generateError'));
    } finally {
      setIsGenerating(false);
    }
  };

  const openItem = (item: ReadingLibraryItem) =>
    void navigate({ to: '/practice/reading/story/$itemId', params: { itemId: item.id } });

  return (
    <ContentContainer fluid>
      <PageHeader title={t('reading.story.title')} subtitle={t('reading.story.subtitle')} />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
        <button
          type="button"
          onClick={() => void navigate({ to: '/practice/reading' })}
          className="w-fit text-[13px] font-semibold text-(--color-primary-blue) hover:underline focus-visible:outline-none"
        >
          ← {t('nav.reading')}
        </button>

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold uppercase tracking-wide text-(--color-text-secondary)">
            {t('reading.story.typeSection')}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {STORY_TYPES.map((type) => (
              <button key={type} type="button" onClick={() => setStoryType(type)} className={pill(storyType === type)}>
                {t(`reading.story.type.${type}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold uppercase tracking-wide text-(--color-text-secondary)">
            {t('reading.story.lengthSection')}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {STORY_LENGTHS.map((length) => (
              <button key={length} type="button" onClick={() => setStoryLength(length)} className={pill(storyLength === length)}>
                {t(`reading.story.length.${length}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold uppercase tracking-wide text-(--color-text-secondary)">
            {t('reading.addText.difficulty')}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {STORY_DIFFICULTIES.map((level) => (
              <button key={level} type="button" onClick={() => setDifficulty(level)} className={pill(difficulty === level)}>
                {level}
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
          onClick={() => void startStory()}
          disabled={isGenerating || saveItem.isPending}
          className="h-12 w-full rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98] disabled:opacity-60"
        >
          {isGenerating || saveItem.isPending
            ? t('reading.story.generating')
            : t('reading.story.start')}
        </button>

        {isLoading && (
          <p className="py-6 text-center text-[15px] font-medium text-(--color-text-secondary)">
            {t('reading.loading')}
          </p>
        )}
        {isError && (
          <p role="alert" className="py-6 text-center text-[15px] font-medium text-(--color-cs-red)">
            {t('reading.loadError')}
          </p>
        )}

        {items && items.length === 0 && (
          <GrammarNotesEmptyState
            title={t('reading.story.emptyTitle')}
            body={t('reading.story.emptyBody')}
          />
        )}

        {items && items.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-[16px] font-bold text-(--color-primary-blue-dark)">
              {t('reading.story.savedTitle')}
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
    </ContentContainer>
  );
}
