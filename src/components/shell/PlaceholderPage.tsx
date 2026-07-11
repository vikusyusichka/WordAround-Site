/* Styled placeholder for routed pages whose real feature lands in a later phase
   (Folders, Sets, Profile, the 4 practice modes). Keeps the design DNA so the
   app feels complete while navigation is being built out. */
import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { Icon } from '@/components/primitives/Icon';

interface PlaceholderPageProps {
  title: string;
  subtitle?: string;
  icon: string;
  /** Optional body line; defaults to a generic "coming soon". */
  bodyKey?: string;
}

export const PlaceholderPage = ({ title, subtitle, icon, bodyKey }: PlaceholderPageProps) => {
  const { t } = useTranslation();
  return (
    <ContentContainer>
      <PageHeader title={title} subtitle={subtitle} />
      <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-white/80 bg-white/70 px-6 py-16 text-center shadow-[0_6px_16px_rgba(0,0,0,0.04)]">
        <span className="grid size-16 place-items-center rounded-2xl bg-(--color-goal-bg)">
          <Icon name={icon} className="size-8 text-(--color-home-brand)" />
        </span>
        <p className="max-w-sm text-[16px] font-medium text-(--color-text-secondary)">
          {bodyKey ? t(bodyKey) : t('home.placeholder.comingSoon', { title })}
        </p>
      </div>
    </ContentContainer>
  );
};
