/* Listening landing — /practice/listening.

   The progress card reads the shared practice log, like the other three
   landings. It used to read the listening session store directly and pin the
   goal to a constant of its own, which meant the learner's chosen daily target
   was honoured everywhere except here. */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { ProgressCard } from '@/components/home/ProgressCard';
import { PracticeModeCard } from '@/components/practice/PracticeModeCard';
import { useDailyProgress, withDailyProgress } from '@/hooks/useDailyProgress';
import {
  LISTENING_MENU_ITEMS,
  LISTENING_TODAY_GOAL,
  type ListeningModeId,
} from '@/lib/listeningTypes';

export const Route = createFileRoute('/_authed/practice/listening/')({
  component: ListeningLanding,
});

function ListeningLanding() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const progress = useDailyProgress('listening');

  const handleSelect = (mode: ListeningModeId) => {
    if (mode === 'listen-from-text') void navigate({ to: '/practice/listening/from-text' });
    else if (mode === 'import-audio') void navigate({ to: '/practice/listening/import-audio' });
    else if (mode === 'import-video') void navigate({ to: '/practice/listening/import-video' });
    else if (mode === 'saved-practice') void navigate({ to: '/practice/listening/saved' });
  };

  return (
    <ContentContainer fluid>
      <PageHeader title={t('nav.listening')} subtitle={t('home.subtitle.listening')} />

      <div className="flex flex-col gap-8">
        <ProgressCard
          item={withDailyProgress(LISTENING_TODAY_GOAL, progress, t('units.min'))}
          layout="goal"
          title={t('listening.today.title')}
          subtitle={t('listening.today.subtitle')}
        />

        <section className="flex flex-col gap-4">
          <h2 className="text-[21px] font-bold text-(--color-primary-blue-dark) lg:text-[26px]">
            {t('listening.sectionTitle')}
          </h2>
          <div className="grid gap-(--spacing-mode-grid-gap) sm:grid-cols-2">
            {LISTENING_MENU_ITEMS.map((item) => (
              <PracticeModeCard
                key={item.id}
                title={t(item.titleKey)}
                subtitle={t(item.subtitleKey)}
                iconSystemName={item.iconSystemName}
                accentColor={item.accentColor}
                blobColor={item.blobColor}
                disabled={!item.enabled}
                comingSoonLabel={item.enabled ? undefined : t('listening.menu.comingSoon')}
                onClick={item.enabled ? () => handleSelect(item.id) : undefined}
              />
            ))}
          </div>
        </section>
      </div>
    </ContentContainer>
  );
}
