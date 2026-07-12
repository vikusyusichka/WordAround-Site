import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ArrowsClockwise, CaretLeft, Plus, Trash } from '@phosphor-icons/react';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { Icon } from '@/components/primitives/Icon';
import { StudyCard } from '@/components/study/StudyCard';
import { StudyControls } from '@/components/study/StudyControls';
import { StudyProgress } from '@/components/study/StudyProgress';
import { RoundFinish } from '@/components/study/RoundFinish';
import { FilterTabs } from '@/components/study/FilterTabs';
import { CardListRow } from '@/components/study/CardListRow';
import { CardEditDialog } from '@/components/study/CardEditDialog';
import { useDeleteSet, useSetsQuery } from '@/hooks/useSets';
import { useStudySession } from '@/hooks/useStudySession';
import { activeCard, counts, filteredCards, roundStats } from '@/lib/studySession';
import { speak } from '@/lib/speech';
import { themeForHex } from '@/lib/setColors';
import type { Flashcard, FlashcardSet } from '@/lib/models';

export const Route = createFileRoute('/_authed/sets/$id')({
  component: SetDetailPage,
});

function SetDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = Route.useParams();
  const { data: sets, isLoading } = useSetsQuery();

  const set = sets?.find((s) => s.id === id);

  if (isLoading) {
    return (
      <ContentContainer>
        <p className="text-[15px] font-medium text-(--color-text-secondary)">{t('sets.loading')}</p>
      </ContentContainer>
    );
  }

  if (!set) {
    return (
      <ContentContainer>
        <h1 className="mb-2 text-[26px] font-bold text-(--color-primary-blue-dark)">
          {t('sets.notFoundTitle')}
        </h1>
        <button
          type="button"
          onClick={() => void navigate({ to: '/sets' })}
          className="h-11 rounded-2xl border border-(--color-auth-field-border) bg-white px-5 text-[15px] font-semibold text-(--color-primary-blue) focus-visible:outline-none"
        >
          {t('sets.backToSets')}
        </button>
      </ContentContainer>
    );
  }

  /* Keyed by set.id so the study session re-seeds only when the set changes. */
  return <StudyScreen key={set.id} set={set} />;
}

function StudyScreen({ set }: { set: FlashcardSet }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const deleteSet = useDeleteSet();
  const { state, dispatch, addCard, saveEdit, deleteCard } = useStudySession(set);
  const [dialogCard, setDialogCard] = useState<Flashcard | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const theme = themeForHex(set.colorHex);
  const card = activeCard(state);
  const stats = roundStats(state);
  const c = counts(state);

  const openAdd = () => {
    setDialogCard(null);
    setDialogOpen(true);
  };
  const openEdit = (fc: Flashcard) => {
    setDialogCard(fc);
    setDialogOpen(true);
  };
  const handleSave = (fc: Flashcard) => {
    if (state.cards.some((x) => x.id === fc.id)) saveEdit(fc);
    else addCard(fc);
    setDialogOpen(false);
  };
  const handleDeleteCard = (fc: Flashcard) => {
    if (window.confirm(t('study.deleteCardConfirm'))) deleteCard(fc.id);
  };
  const handleDeleteSet = () => {
    if (window.confirm(t('sets.deleteConfirm', { title: set.title }))) {
      deleteSet.mutate(set.id, { onSuccess: () => void navigate({ to: '/sets' }) });
    }
  };

  const iconBtn =
    'grid size-11 place-items-center rounded-full bg-white/90 shadow-[0_2px_6px_rgba(0,0,0,0.08)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none';

  return (
    <ContentContainer fluid>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => void navigate({ to: '/sets' })}
          aria-label={t('sets.backToSets')}
          className={iconBtn + ' text-(--color-primary-blue-dark)'}
        >
          <CaretLeft size={18} weight="bold" />
        </button>
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl" style={{ background: theme.accent }}>
          <Icon
            name={set.icon.type === 'systemName' ? set.icon.value : 'rectangle.stack.fill'}
            className="size-6 text-white"
          />
        </span>
        <h1 className="min-w-0 flex-1 truncate text-[24px] font-bold text-(--color-cs-dark-text)">
          {set.title}
        </h1>
        <button
          type="button"
          onClick={() => dispatch({ type: 'SET_TRACK_PROGRESS', value: !state.trackProgress })}
          className={[
            'h-11 rounded-full px-4 text-[14px] font-semibold transition-colors focus-visible:outline-none',
            state.trackProgress
              ? 'bg-(--color-home-nav-sel-bg) text-(--color-home-brand)'
              : 'bg-white text-(--color-cs-text-muted)',
          ].join(' ')}
        >
          {t('study.trackProgress')}
        </button>
        <button type="button" onClick={() => dispatch({ type: 'SHUFFLE' })} aria-label={t('study.shuffle')} className={iconBtn + ' text-(--color-primary-blue-dark)'}>
          <ArrowsClockwise size={18} weight="bold" />
        </button>
        <button type="button" onClick={handleDeleteSet} aria-label={t('sets.delete')} className={iconBtn + ' text-(--color-cs-red)'}>
          <Trash size={18} weight="bold" />
        </button>
      </div>

      {/* Study area */}
      {state.cards.length === 0 ? (
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 rounded-3xl border border-white/80 bg-white/70 px-6 py-16 text-center shadow-[0_6px_16px_rgba(0,0,0,0.04)]">
          <span className="text-[16px] font-medium text-(--color-text-secondary)">
            {t('study.emptyPrompt')}
          </span>
          <AddCardButton onClick={openAdd} />
        </div>
      ) : state.isShowingRoundFinish ? (
        <RoundFinish
          known={stats.known}
          total={stats.total}
          learning={stats.learning}
          accent={theme.accent}
          onRepeatUnknown={() => dispatch({ type: 'REPEAT_UNKNOWN' })}
          onRestart={() => dispatch({ type: 'RESTART' })}
        />
      ) : card ? (
        <div className="flex flex-col gap-6">
          <StudyProgress answered={stats.answered} total={stats.total} progress={stats.progress} accent={theme.accent} />
          <StudyCard
            card={card}
            showTranslation={state.isShowingTranslation}
            accent={theme.accent}
            isMastered={state.masteredCardIDs.has(card.id)}
            onFlip={() => dispatch({ type: 'FLIP' })}
            onToggleMastered={() => dispatch({ type: 'TOGGLE_MASTERED', cardId: card.id })}
            onSpeak={speak}
          />
          <StudyControls
            onKnown={() => dispatch({ type: 'KNOWN' })}
            onUnknown={() => dispatch({ type: 'UNKNOWN' })}
            onFlip={() => dispatch({ type: 'FLIP' })}
          />
        </div>
      ) : null}

      {/* Card list */}
      <div className="mt-10 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <FilterTabs
            value={state.selectedFilter}
            counts={c}
            onChange={(filter) => dispatch({ type: 'SELECT_FILTER', filter })}
          />
          <AddCardButton onClick={openAdd} />
        </div>
        <div className="flex flex-col gap-3">
          {filteredCards(state).map((fc, i) => (
            <CardListRow
              key={fc.id}
              card={fc}
              index={i}
              accent={theme.accent}
              onEdit={() => openEdit(fc)}
              onDelete={() => handleDeleteCard(fc)}
            />
          ))}
        </div>
      </div>

      <CardEditDialog
        key={dialogCard?.id ?? 'new'}
        card={dialogCard}
        open={dialogOpen}
        onSave={handleSave}
        onClose={() => setDialogOpen(false)}
      />
    </ContentContainer>
  );
}

function AddCardButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 items-center gap-2 rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) px-4 text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98] focus-visible:outline-none"
    >
      <Plus size={18} weight="bold" />
      {t('study.addCard')}
    </button>
  );
}
