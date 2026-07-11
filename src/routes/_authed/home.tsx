import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { StatCard } from '@/components/home/StatCard';
import { ProgressCard } from '@/components/home/ProgressCard';
import { SetItem } from '@/components/home/SetItem';
import {
  STAT_CARDS,
  STUB_CONTINUE_LEARNING,
  STUB_USER_SETS,
  TODAY_GOAL,
} from '@/lib/homeTypes';

export const Route = createFileRoute('/_authed/home')({
  component: HomeDashboard,
});

/* Web dashboard — capped, multi-column, grid-based. Reuses the Phase-2 visual
   cards (StatCard/ProgressCard/SetItem) and the static/stub data in homeTypes
   (swapped for Firestore in Phase 3). */
function HomeDashboard() {
  const { t } = useTranslation();

  return (
    <ContentContainer fluid>
      <PageHeader title={t('home.title.flashcards')} subtitle={t('home.subtitle.pickSet')} />

      <div className="flex flex-col gap-8">
        {/* Stat cards — full width, 3 across. */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
          {STAT_CARDS.map((card) => (
            <StatCard key={card.id} item={card} />
          ))}
        </div>

        {/* Today's goal + continue learning, two-up on desktop. */}
        <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
          <ProgressCard
            item={TODAY_GOAL}
            layout="goal"
            title={t('home.todayGoal.title')}
            subtitle={t('home.todayGoal.left', {
              count: TODAY_GOAL.totalValue - TODAY_GOAL.currentValue,
            })}
          />
          <div className="flex flex-col gap-3">
            <h2 className="text-[18px] font-bold text-(--color-primary-blue-dark) lg:text-[20px]">
              {t('home.continueLearning')}
            </h2>
            <ProgressCard
              item={STUB_CONTINUE_LEARNING}
              layout="action"
              title={STUB_CONTINUE_LEARNING.title}
              subtitle={STUB_CONTINUE_LEARNING.subtitle}
              actionSystemName="arrow.right"
            />
          </div>
        </div>

        {/* Your sets — responsive card grid. */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[21px] font-bold text-(--color-primary-blue-dark) lg:text-[26px]">
              {t('home.yourSets')}
            </h2>
            <Link
              to="/sets"
              className="flex h-10 items-center rounded-full bg-white/98 px-4 text-[14px] font-semibold text-(--color-primary-blue) shadow-[0_4px_8px_rgba(43,92,250,0.10)] transition-transform hover:-translate-y-px active:scale-[0.98] lg:text-[15px]"
            >
              {t('home.viewAll')}
            </Link>
          </div>

          {STUB_USER_SETS.length === 0 ? (
            <div className="flex flex-col gap-2.5 rounded-3xl bg-white/92 p-6">
              <span className="text-[22px] font-bold text-(--color-primary-blue-dark)">
                {t('home.sets.emptyTitle')}
              </span>
              <span className="text-[15px] font-medium text-(--color-text-secondary)">
                {t('home.sets.emptyBody')}
              </span>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {STUB_USER_SETS.map((set) => (
                <button
                  key={set.id}
                  type="button"
                  className="block text-left transition-transform hover:-translate-y-0.5 active:scale-[0.99]"
                >
                  <SetItem item={set} trailingText={t('home.review')} />
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </ContentContainer>
  );
}
