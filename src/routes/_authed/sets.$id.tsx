import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ArrowsClockwise, CaretLeft, PencilSimple, Plus, Trash } from '@phosphor-icons/react';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { ThemedScreen } from '@/components/create/ThemedScreen';
import { Icon } from '@/components/primitives/Icon';
import { StudyCard } from '@/components/study/StudyCard';
import { StudyControls } from '@/components/study/StudyControls';
import { RoundFinish } from '@/components/study/RoundFinish';
import { FilterTabs } from '@/components/study/FilterTabs';
import { CardListRow } from '@/components/study/CardListRow';
import { CardEditDialog } from '@/components/study/CardEditDialog';
import { useDeleteSet, useSetsQuery } from '@/hooks/useSets';
import { useStudySession } from '@/hooks/useStudySession';
import { activeCard, counts, filteredCards, roundStats } from '@/lib/studySession';
import { speak } from '@/lib/speech';
import { themeForHex, type SetTheme } from '@/lib/setColors';
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
    'grid size-11 place-items-center rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.06)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none';

  return (
    <ContentContainer fluid>
      {/* iOS repaints the whole detail screen in the set's color. */}
      <ThemedScreen background={theme.screenBackground} />

      {/* Top bar — back on the left, session actions on the right (iOS TopBar). */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => void navigate({ to: '/sets' })}
          aria-label={t('sets.backToSets')}
          className={iconBtn}
          style={{ background: theme.fieldBackground, color: theme.titleColor }}
        >
          <CaretLeft size={18} weight="bold" />
        </button>
        <button
          type="button"
          onClick={handleDeleteSet}
          aria-label={t('sets.delete')}
          className={iconBtn}
          style={{ background: theme.fieldBackground, color: 'var(--color-cs-red)' }}
        >
          <Trash size={18} weight="bold" />
        </button>
      </div>

      {/* Header — big set title in the set's colour, its own line (iOS Header). */}
      <div className="mb-6 flex items-center gap-3.5">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl" style={{ background: theme.accent }}>
          <Icon
            name={set.icon.type === 'systemName' ? set.icon.value : 'rectangle.stack.fill'}
            className="size-6 text-white"
          />
        </span>
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate text-[28px] font-bold lg:text-[32px]" style={{ color: theme.titleColor }}>
            {set.title}
          </h1>
          {set.description && (
            <p className="truncate text-[15px] font-medium" style={{ color: theme.mutedTextColor }}>
              {set.description}
            </p>
          )}
        </div>
      </div>

      {/* Study area */}
      {state.cards.length === 0 ? (
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 rounded-3xl border border-white/80 bg-white/70 px-6 py-16 text-center shadow-[0_6px_16px_rgba(0,0,0,0.04)]">
          <span className="text-[16px] font-medium text-(--color-text-secondary)">
            {t('study.emptyPrompt')}
          </span>
          <AddCardButton theme={theme} onClick={openAdd} />
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
        <div className="mx-auto flex max-w-2xl flex-col gap-6">
          <StudyCard
            card={card}
            showTranslation={state.isShowingTranslation}
            theme={theme}
            isMastered={state.masteredCardIDs.has(card.id)}
            index={stats.answered + 1}
            total={stats.total}
            onFlip={() => dispatch({ type: 'FLIP' })}
            onToggleMastered={() => dispatch({ type: 'TOGGLE_MASTERED', cardId: card.id })}
            onSpeak={speak}
          />
          <StudyControls
            onKnown={() => dispatch({ type: 'KNOWN' })}
            onUnknown={() => dispatch({ type: 'UNKNOWN' })}
            onFlip={() => dispatch({ type: 'FLIP' })}
          />

          {/* Controls row — Track progress toggle (left), shuffle + edit
              (right), 1:1 with FlashcardSetDetailControlsView. */}
          <div className="flex items-center justify-between" style={{ color: theme.mutedTextColor }}>
            <div className="flex items-center gap-2.5">
              <span className="text-[13px] font-bold lg:text-[16px]">{t('study.trackProgress')}</span>
              <button
                type="button"
                role="switch"
                aria-checked={state.trackProgress}
                aria-label={t('study.trackProgress')}
                onClick={() => dispatch({ type: 'SET_TRACK_PROGRESS', value: !state.trackProgress })}
                className="relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none"
                style={{ background: state.trackProgress ? theme.accent : 'rgba(0,0,0,0.15)' }}
              >
                <span
                  className="absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow transition-transform"
                  style={{ transform: state.trackProgress ? 'translateX(20px)' : 'none' }}
                />
              </button>
            </div>
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => dispatch({ type: 'SHUFFLE' })}
                aria-label={t('study.shuffle')}
                className="grid size-10 place-items-center rounded-full hover:bg-black/[0.04] focus-visible:outline-none"
              >
                <ArrowsClockwise size={18} weight="bold" />
              </button>
              <span className="mx-1 h-6 w-px" style={{ background: theme.borderColor, opacity: 0.4 }} />
              <button
                type="button"
                onClick={() => openEdit(card)}
                aria-label={t('study.editCard')}
                className="grid size-10 place-items-center rounded-full hover:bg-black/[0.04] focus-visible:outline-none"
              >
                <PencilSimple size={18} weight="bold" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Filter tabs + card list + add card (iOS: three stacked containers). */}
      <div className="mx-auto mt-8 flex max-w-2xl flex-col gap-4">
        <FilterTabs
          value={state.selectedFilter}
          counts={c}
          theme={theme}
          onChange={(filter) => dispatch({ type: 'SELECT_FILTER', filter })}
        />

        <div
          className="overflow-hidden rounded-[22px]"
          style={{ background: theme.sectionBackground, boxShadow: `0 6px 12px ${theme.shadowColor}` }}
        >
          {filteredCards(state).map((fc, i) => (
            <div key={fc.id}>
              {i > 0 && (
                <div className="mx-4 h-px" style={{ background: theme.borderColor, opacity: 0.3 }} />
              )}
              <CardListRow
                card={fc}
                index={i}
                accent={theme.accent}
                onEdit={() => openEdit(fc)}
                onDelete={() => handleDeleteCard(fc)}
              />
            </div>
          ))}
        </div>

        <AddCardButton theme={theme} onClick={openAdd} />
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

function AddCardButton({ theme, onClick }: { theme?: SetTheme; onClick: () => void }) {
  const { t } = useTranslation();
  // iOS FlashcardSetDetailAddButton: solid section fill, 1px accent-tinted
  // border, title-coloured label — no dashed outline.
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-[18px] border py-[13px] text-[15px] font-semibold transition-transform hover:-translate-y-0.5 focus-visible:outline-none"
      style={
        theme
          ? {
              background: theme.sectionBackground,
              borderColor: `color-mix(in srgb, ${theme.borderColor} 35%, transparent)`,
              color: theme.titleColor,
              boxShadow: `0 5px 10px ${theme.shadowColor}`,
            }
          : undefined
      }
    >
      <Plus size={16} weight="bold" />
      {t('study.addCard')}
    </button>
  );
}
