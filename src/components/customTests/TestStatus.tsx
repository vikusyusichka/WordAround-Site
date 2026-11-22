/* What a test page shows before it has a test: loading, an error (often the
   security rules not being published yet), or "no such test" — a deleted
   test or a mistyped link. */
import type { UseQueryResult } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { CARD, SECONDARY_BUTTON, SECTION_TITLE } from '@/components/exams/ui';
import { Icon } from '@/components/primitives/Icon';
import { ContentContainer } from '@/components/shell/ContentContainer';

export const TestStatus = ({ query }: { query: Pick<UseQueryResult<unknown>, 'isPending' | 'isError'> }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (query.isPending) {
    return (
      <ContentContainer>
        <p className="text-[15px] font-medium text-(--color-muted-text)">{t('exams.custom.loading')}</p>
      </ContentContainer>
    );
  }

  return (
    <ContentContainer>
      <div className={`${CARD} flex flex-col items-center gap-3 py-10 text-center`}>
        <Icon name="exclamationmark.circle.fill" className="size-9 text-(--color-primary-blue)" />
        <p className={SECTION_TITLE}>{t(query.isError ? 'exams.custom.unavailable' : 'exams.custom.notFound')}</p>
        <button
          type="button"
          className={SECONDARY_BUTTON}
          onClick={() => void navigate({ to: '/exams', search: { tab: 'custom' } })}
        >
          {t('exams.tabs.custom')}
        </button>
      </div>
    </ContentContainer>
  );
};
