/* Grammar notes home — /practice/writing/grammar. Topics grid + create modal.
   `.index` so the nested $topicId routes sit below without turning this into
   a layout-without-Outlet (Phase-3 trap). */
import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { Plus } from '@phosphor-icons/react';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { GrammarNotesEmptyState } from '@/components/grammar/GrammarNotesEmptyState';
import { GrammarTopicCard } from '@/components/grammar/GrammarTopicCard';
import { GrammarTopicForm } from '@/components/grammar/GrammarTopicForm';
import { ReviewTodayCard } from '@/components/grammar/ReviewTodayCard';
import { TemplateLibraryModal } from '@/components/grammar/TemplateLibraryModal';
import {
  useCreateTopic,
  useCreateTopicFromTemplate,
  useDeleteTopic,
  useGrammarTopicsQuery,
} from '@/hooks/useGrammarTopics';
import { useReviewQueueQuery } from '@/hooks/useGrammarReview';

export const Route = createFileRoute('/_authed/practice/writing/grammar/')({
  component: GrammarHome,
});

function GrammarHome() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: topics, isLoading, isError } = useGrammarTopicsQuery();
  const { data: reviewQueue, isLoading: reviewLoading } = useReviewQueueQuery();
  const createTopic = useCreateTopic();
  const createFromTemplate = useCreateTopicFromTemplate();
  const deleteTopic = useDeleteTopic();
  const [formOpen, setFormOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  const handleDelete = (id: string, title: string) => {
    if (window.confirm(t('writing.grammar.deleteTopicConfirm', { title }))) {
      deleteTopic.mutate(id);
    }
  };

  return (
    <ContentContainer fluid>
      <PageHeader
        title={t('writing.grammar.title')}
        subtitle={t('writing.grammar.subtitle')}
        actions={
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="flex h-11 items-center gap-2 rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) px-4 text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98] focus-visible:outline-none"
          >
            <Plus size={18} weight="bold" />
            {t('writing.grammar.newTopic')}
          </button>
        }
      />

      <div className="mb-5">
        <ReviewTodayCard
          queue={reviewQueue}
          isLoading={reviewLoading}
          onStart={() => void navigate({ to: '/practice/writing/grammar/review' })}
        />
      </div>

      {isLoading ? (
        <p className="text-[15px] font-medium text-(--color-text-secondary)">
          {t('writing.grammar.loading')}
        </p>
      ) : isError ? (
        <p role="alert" className="text-[15px] font-medium text-(--color-cs-red)">
          {t('writing.grammar.loadError')}
        </p>
      ) : !topics || topics.length === 0 ? (
        <GrammarNotesEmptyState
          title={t('writing.grammar.topicsEmptyTitle')}
          body={t('writing.grammar.topicsEmptyBody')}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {topics.map((topic) => (
            <GrammarTopicCard
              key={topic.id}
              topic={topic}
              onOpen={() =>
                void navigate({
                  to: '/practice/writing/grammar/$topicId',
                  params: { topicId: topic.id },
                })
              }
              onDelete={() => handleDelete(topic.id, topic.title)}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {formOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 backdrop-blur-sm md:items-center md:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setFormOpen(false)}
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              className="flex max-h-[88vh] w-full max-w-[520px] flex-col gap-4 overflow-y-auto rounded-t-3xl bg-(--color-app-bg) p-5 shadow-[0_20px_40px_rgba(0,0,0,0.2)] md:rounded-3xl md:p-6"
              initial={{ scale: 0.96, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 12 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-[19px] font-bold text-(--color-primary-blue-dark) md:text-[22px]">
                {t('writing.grammar.form.newTitle')}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setFormOpen(false);
                  setTemplatesOpen(true);
                }}
                className="flex items-center gap-2 rounded-2xl border border-(--color-primary-blue)/35 bg-(--color-primary-blue)/5 px-4 py-3 text-left text-[14px] font-semibold text-(--color-primary-blue) transition-colors hover:bg-(--color-primary-blue)/10"
              >
                <Plus size={16} weight="bold" />
                {t('writing.grammar.templates.startFromTemplate')}
              </button>
              <GrammarTopicForm
                isSaving={createTopic.isPending}
                onSubmit={(values) =>
                  createTopic.mutate(values, {
                    onSuccess: (topic) => {
                      setFormOpen(false);
                      void navigate({
                        to: '/practice/writing/grammar/$topicId',
                        params: { topicId: topic.id },
                      });
                    },
                  })
                }
                onCancel={() => setFormOpen(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <TemplateLibraryModal
        open={templatesOpen}
        kind="topic"
        isBusy={createFromTemplate.isPending}
        onUseTopic={(tpl) =>
          createFromTemplate.mutate(tpl, {
            onSuccess: (topic) => {
              setTemplatesOpen(false);
              void navigate({
                to: '/practice/writing/grammar/$topicId',
                params: { topicId: topic.id },
              });
            },
          })
        }
        onClose={() => setTemplatesOpen(false)}
      />
    </ContentContainer>
  );
}
