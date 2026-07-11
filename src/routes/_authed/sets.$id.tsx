import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Trash } from '@phosphor-icons/react';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { Icon } from '@/components/primitives/Icon';
import { useDeleteSet, useSetsQuery } from '@/hooks/useSets';
import { themeForHex } from '@/lib/setColors';

export const Route = createFileRoute('/_authed/sets/$id')({
  component: SetDetailPage,
});

/* Read-only detail for slice 3B. 3C replaces this with the study screen
   (flip, known/unknown, TTS, card editing). */
function SetDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = Route.useParams();
  const { data: sets, isLoading } = useSetsQuery();
  const deleteSet = useDeleteSet();

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
        <PageHeader title={t('sets.notFoundTitle')} subtitle={t('sets.notFoundBody')} />
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

  const theme = themeForHex(set.colorHex);
  const icon = set.icon.type === 'systemName' ? set.icon.value : 'rectangle.stack.fill';

  const handleDelete = () => {
    if (window.confirm(t('sets.deleteConfirm', { title: set.title }))) {
      deleteSet.mutate(set.id, { onSuccess: () => void navigate({ to: '/sets' }) });
    }
  };

  return (
    <ContentContainer fluid>
      <div
        className="mb-8 flex items-center gap-5 rounded-3xl border border-white/80 p-6 shadow-[0_6px_16px_rgba(0,0,0,0.04)]"
        style={{ background: theme.bg }}
      >
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl" style={{ background: theme.accent }}>
          <Icon name={icon} className="size-8 text-white" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="truncate text-[26px] font-bold text-(--color-cs-dark-text)">{set.title}</h1>
          <p className="truncate text-[15px] font-medium text-(--color-cs-text-muted)">
            {set.description || t('sets.cardCount', { count: set.cards.length })}
          </p>
        </div>
        <button
          type="button"
          onClick={handleDelete}
          aria-label={t('sets.delete')}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-white/90 text-(--color-cs-red) shadow-[0_2px_6px_rgba(0,0,0,0.08)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none"
        >
          <Trash size={18} weight="bold" />
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {set.cards.map((card, index) => (
          <div
            key={card.id}
            className="flex items-center gap-4 rounded-2xl border border-white/80 bg-white/80 p-4 shadow-[0_4px_10px_rgba(0,0,0,0.03)]"
          >
            <span className="w-6 shrink-0 text-center text-[13px] font-bold text-(--color-cs-text-muted)">
              {index + 1}
            </span>
            {card.imageURL && (
              <img src={card.imageURL} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-[16px] font-bold text-(--color-cs-dark-text)">
                {card.word}
              </span>
              <span className="truncate text-[15px] font-medium" style={{ color: theme.accent }}>
                {card.translation}
              </span>
              {card.example && (
                <span className="truncate text-[13px] text-(--color-cs-text-muted)">
                  {card.example}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </ContentContainer>
  );
}
