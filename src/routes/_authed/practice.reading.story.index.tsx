/* Story Mode setup — /practice/reading/story. Pick type / length /
   difficulty → generate the opening chapter → save → session. Saved stories
   list below (Continue). Web port of the StoryMode setup flow. */
import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { SetupSection } from '@/components/practice/SetupSection';
import { OptionPillGroup } from '@/components/practice/OptionPill';
import { StartButton } from '@/components/practice/StartButton';
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

      <div className="flex w-full max-w-(--size-setup-max) flex-col gap-6">
        <SetupSection title={t('reading.story.typeSection')}>
          <OptionPillGroup
            options={STORY_TYPES.map((type) => ({ id: type, label: t(`reading.story.type.${type}`) }))}
            value={storyType}
            onChange={setStoryType}
            columns={3}
          />
        </SetupSection>

        <SetupSection title={t('reading.story.lengthSection')}>
          <OptionPillGroup
            options={STORY_LENGTHS.map((length) => ({ id: length, label: t(`reading.story.length.${length}`) }))}
            value={storyLength}
            onChange={setStoryLength}
            columns={3}
          />
        </SetupSection>

        <SetupSection title={t('reading.addText.difficulty')}>
          <OptionPillGroup
            options={STORY_DIFFICULTIES.map((level) => ({ id: level, label: level }))}
            value={difficulty}
            onChange={setDifficulty}
          />
        </SetupSection>

        {error && (
          <p role="alert" className="text-[14px] font-semibold text-(--color-cs-red)">
            {error}
          </p>
        )}

        <StartButton
          label={isGenerating || saveItem.isPending ? t('reading.story.generating') : t('reading.story.start')}
          icon="book.fill"
          disabled={isGenerating || saveItem.isPending}
          onClick={() => void startStory()}
        />

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
