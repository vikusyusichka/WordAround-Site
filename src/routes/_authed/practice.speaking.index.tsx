/* Speaking landing — /practice/speaking. Static file wins over practice.$mode
   (Phase-4A precedent). 6-mode grid; only ai-conversation enabled in 7A. */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { ProgressCard } from '@/components/home/ProgressCard';
import { WritingMenuCard } from '@/components/writing/WritingMenuCard';
import { SPEAKING_MENU_ITEMS, SPEAKING_TODAY_GOAL, type SpeakingModeId } from '@/lib/speakingTypes';

export const Route = createFileRoute('/_authed/practice/speaking/')({
  component: SpeakingLanding,
});

function SpeakingLanding() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleSelect = (mode: SpeakingModeId) => {
    if (mode === 'ai-conversation') void navigate({ to: '/practice/speaking/conversation' });
    /* other modes flip on in 7B-7E. */
  };

  return (
    <ContentContainer fluid>
      <PageHeader title={t('nav.speaking')} subtitle={t('home.subtitle.speaking')} />

      <div className="flex flex-col gap-8">
        <ProgressCard
          item={SPEAKING_TODAY_GOAL}
          layout="goal"
          title={t('speaking.today.title')}
          subtitle={t('speaking.today.subtitle')}
        />

        <section className="flex flex-col gap-4">
          <h2 className="text-[21px] font-bold text-(--color-primary-blue-dark) lg:text-[26px]">
            {t('speaking.sectionTitle')}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {SPEAKING_MENU_ITEMS.map((item) => (
              <WritingMenuCard
                key={item.id}
                title={t(item.titleKey)}
                subtitle={t(item.subtitleKey)}
                iconSystemName={item.iconSystemName}
                accentColor={item.accentColor}
                blobColor={item.blobColor}
                disabled={!item.enabled}
                comingSoonLabel={item.enabled ? undefined : t('speaking.menu.comingSoon')}
                onClick={item.enabled ? () => handleSelect(item.id) : undefined}
              />
            ))}
          </div>
        </section>
      </div>
    </ContentContainer>
  );
}
