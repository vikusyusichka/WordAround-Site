/* Writing landing — /practice/writing. File-based flat routing: this static
   file wins over practice.$mode.tsx for the exact `/practice/writing` URL,
   leaving the placeholder route to still serve reading/listening/speaking.
   Named `.index.tsx` (not `.tsx`) so its nested game route
   `practice.writing.write-words.$setId.tsx` doesn't accidentally make this a
   layout-without-Outlet (Phase-3 folders trap). */
import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { WritingMenuGrid } from '@/components/writing/WritingMenuGrid';
import { WritingProgressCard } from '@/components/writing/WritingProgressCard';
import { SetSelectionModal } from '@/components/writing/SetSelectionModal';
import type { WritingMenuAction } from '@/lib/writingTypes';

export const Route = createFileRoute('/_authed/practice/writing/')({
  component: WritingLanding,
});

function WritingLanding() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isSetPickerOpen, setSetPickerOpen] = useState(false);

  const handleMenuSelect = (action: WritingMenuAction) => {
    if (action === 'writeFromSets') setSetPickerOpen(true);
    else if (action === 'essays') void navigate({ to: '/practice/writing/essays' });
    // GrammarNotes is still disabled — never fires this callback.
  };

  return (
    <ContentContainer fluid>
      <PageHeader title={t('nav.writing')} subtitle={t('home.subtitle.writing')} />

      <div className="flex flex-col gap-8">
        <WritingProgressCard />

        <section className="flex flex-col gap-4">
          <h2 className="text-[21px] font-bold text-(--color-primary-blue-dark) lg:text-[26px]">
            {t('writing.sectionTitle')}
          </h2>
          <WritingMenuGrid onSelect={handleMenuSelect} />
        </section>
      </div>

      <SetSelectionModal
        open={isSetPickerOpen}
        onClose={() => setSetPickerOpen(false)}
        onSelect={(set) =>
          void navigate({
            to: '/practice/writing/write-words/$setId',
            params: { setId: set.id },
          })
        }
      />
    </ContentContainer>
  );
}
