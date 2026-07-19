/* Reading landing — /practice/reading. Static file wins over practice.$mode
   for the exact URL (Phase-4A precedent); listening/speaking keep the
   placeholder. `.index.tsx` so nested my-texts routes don't turn this into a
   layout-without-Outlet. */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { ReadingMenuGrid } from '@/components/reading/ReadingMenuGrid';
import { ReadingProgressCard } from '@/components/reading/ReadingProgressCard';
import type { ReadingModeId } from '@/lib/readingTypes';

export const Route = createFileRoute('/_authed/practice/reading/')({
  component: ReadingLanding,
});

function ReadingLanding() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleSelect = (mode: ReadingModeId) => {
    if (mode === 'my-texts') void navigate({ to: '/practice/reading/my-texts' });
    else if (mode === 'reading-from-sets') void navigate({ to: '/practice/reading/from-sets' });
    else if (mode === 'speed-reading') void navigate({ to: '/practice/reading/speed' });
    else if (mode === 'story-mode') void navigate({ to: '/practice/reading/story' });
  };

  return (
    <ContentContainer fluid>
      <PageHeader title={t('nav.reading')} subtitle={t('home.subtitle.reading')} />

      <div className="flex flex-col gap-8">
        <ReadingProgressCard />

        <section className="flex flex-col gap-4">
          <h2 className="text-[21px] font-bold text-(--color-primary-blue-dark) lg:text-[26px]">
            {t('reading.sectionTitle')}
          </h2>
          <ReadingMenuGrid onSelect={handleSelect} />
        </section>
      </div>
    </ContentContainer>
  );
}
