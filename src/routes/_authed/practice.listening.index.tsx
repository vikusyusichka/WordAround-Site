/* Listening landing — /practice/listening. Static file wins over
   practice.$mode (Phase-4A precedent). The progress card is REAL — minutes
   are computed from the local IndexedDB session store (iOS parity: completed
   sessions updated today vs a 15-minute goal). */
import { useEffect, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { ProgressCard } from '@/components/home/ProgressCard';
import { WritingMenuCard } from '@/components/writing/WritingMenuCard';
import { DAILY_GOAL_MINUTES, minutesListenedToday } from '@/lib/listeningStore';
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
  const [minutes, setMinutes] = useState(0);

  useEffect(() => {
    void minutesListenedToday().then(setMinutes).catch(() => {});
  }, []);

  const handleSelect = (mode: ListeningModeId) => {
    if (mode === 'listen-from-text') void navigate({ to: '/practice/listening/from-text' });
    else if (mode === 'import-audio') void navigate({ to: '/practice/listening/import-audio' });
    else if (mode === 'import-video') void navigate({ to: '/practice/listening/import-video' });
    /* saved-practice flips on in 6D. */
  };

  return (
    <ContentContainer fluid>
      <PageHeader title={t('nav.listening')} subtitle={t('home.subtitle.listening')} />

      <div className="flex flex-col gap-8">
        <ProgressCard
          item={{
            ...LISTENING_TODAY_GOAL,
            currentValue: minutes,
            totalValue: DAILY_GOAL_MINUTES,
            progress: Math.min(minutes / DAILY_GOAL_MINUTES, 1),
          }}
          layout="goal"
          title={t('listening.today.title')}
          subtitle={t('listening.today.subtitle')}
        />

        <section className="flex flex-col gap-4">
          <h2 className="text-[21px] font-bold text-(--color-primary-blue-dark) lg:text-[26px]">
            {t('listening.sectionTitle')}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {LISTENING_MENU_ITEMS.map((item) => (
              <WritingMenuCard
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
