/* My Texts library — /practice/reading/my-texts. Continue-reading hero for
   the most recent unfinished text + saved-text grid. Web port of
   ReadingMyTextsView. */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Plus } from '@phosphor-icons/react';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { ContinueReadingCard } from '@/components/reading/ContinueReadingCard';
import { ReadingTextCard } from '@/components/reading/ReadingTextCard';
import { GrammarNotesEmptyState } from '@/components/grammar/GrammarNotesEmptyState';
import {
  useDeleteReadingItem,
  useReadingItemsQuery,
  useRenameReadingItem,
} from '@/hooks/useReadingItems';
import type { ReadingLibraryItem } from '@/lib/models';

export const Route = createFileRoute('/_authed/practice/reading/my-texts/')({
  component: MyTextsScreen,
});

function MyTextsScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: items, isLoading, isError } = useReadingItemsQuery('my-texts');
  const renameItem = useRenameReadingItem();
  const deleteItem = useDeleteReadingItem();

  const continueItem = items?.find((i) => i.status !== 'completed' && i.progress > 0);

  const openItem = (item: ReadingLibraryItem) =>
    void navigate({
      to: '/practice/reading/session/$itemId',
      params: { itemId: item.id },
    });

  const handleRename = (item: ReadingLibraryItem) => {
    const next = window.prompt(t('reading.card.renamePrompt'), item.title);
    if (next && next.trim().length > 0) {
      renameItem.mutate({ id: item.id, title: next });
    }
  };

  const handleDelete = (item: ReadingLibraryItem) => {
    if (window.confirm(t('reading.card.deleteConfirm', { title: item.title }))) {
      deleteItem.mutate(item.id);
    }
  };

  return (
    <ContentContainer fluid>
      <PageHeader
        title={t('reading.myTexts.title')}
        subtitle={t('reading.myTexts.subtitle')}
        actions={
          <button
            type="button"
            onClick={() => void navigate({ to: '/practice/reading/my-texts/new' })}
            className="flex h-11 items-center gap-2 rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) px-4 text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98] focus-visible:outline-none"
          >
            <Plus size={18} weight="bold" />
            {t('reading.myTexts.addText')}
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

        {items && items.length === 0 && (
          <GrammarNotesEmptyState
            title={t('reading.myTexts.emptyTitle')}
            body={t('reading.myTexts.emptyBody')}
          />
        )}

        {continueItem && (
          <ContinueReadingCard item={continueItem} onContinue={() => openItem(continueItem)} />
        )}

        {items && items.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-[16px] font-bold text-(--color-primary-blue-dark)">
              {t('reading.myTexts.savedTitle')}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {items.map((item) => (
                <ReadingTextCard
                  key={item.id}
                  item={item}
                  onOpen={() => openItem(item)}
                  onRename={() => handleRename(item)}
                  onDelete={() => handleDelete(item)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </ContentContainer>
  );
}
