/* Frame shared by /profile/language, /profile/appearance and
   /profile/notifications.

   Below lg it is one column with a round back button, the way the iOS
   sub-screens work. From lg it becomes master-detail: a rail on the left
   listing every section with the open one marked, and the sub-screen's own
   content on the right. On a wide screen a settings page that hides its
   siblings behind a back button wastes the space and costs a round trip per
   section — the rail is the web-native answer.

   The rail carries the sections you can navigate INTO. Sign out and Delete
   account stay on /profile itself, reached through the "Profile" row at the
   top: they open dialogs rather than pages, and a destructive action is not
   something to put one stray click away in a navigation rail. */
import type { ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { SurfaceCard } from '@/components/primitives/SurfaceCard';
import { ProfileSubScreenHeader } from '@/components/profile/ProfileSubScreenHeader';
import { SectionTitle } from '@/components/profile/SectionTitle';
import { SettingsRow } from '@/components/profile/SettingsRow';
import { PRIVACY_URL, TERMS_URL } from '@/lib/profileLinks';

export type ProfileSubScreen = 'language' | 'appearance' | 'notifications';

interface ProfileSubScreenLayoutProps {
  active: ProfileSubScreen;
  title: string;
  subtitle: string;
  children: ReactNode;
}

export const ProfileSubScreenLayout = ({
  active,
  title,
  subtitle,
  children,
}: ProfileSubScreenLayoutProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <ContentContainer fluid>
      <PageHeader title={t('home.title.profile')} subtitle={t('profile.subtitle')} />

      <div className="flex gap-8">
        <nav
          aria-label={t('home.title.profile')}
          className="hidden w-[280px] shrink-0 flex-col gap-5 lg:flex"
        >
          <SurfaceCard as="section">
            <SettingsRow
              icon="person.fill"
              title={t('home.title.profile')}
              onClick={() => void navigate({ to: '/profile' })}
            />
          </SurfaceCard>

          <div className="flex flex-col gap-2">
            <SectionTitle>{t('profile.section.account')}</SectionTitle>
            <SurfaceCard as="section">
              <SettingsRow
                icon="globe"
                title={t('profile.row.language')}
                isActive={active === 'language'}
                showsDivider
                onClick={() => void navigate({ to: '/profile/language' })}
              />
              <SettingsRow
                icon="paintbrush.fill"
                title={t('profile.row.appearance')}
                isActive={active === 'appearance'}
                showsDivider
                onClick={() => void navigate({ to: '/profile/appearance' })}
              />
              <SettingsRow
                icon="bell.fill"
                title={t('profile.row.notifications')}
                isActive={active === 'notifications'}
                onClick={() => void navigate({ to: '/profile/notifications' })}
              />
            </SurfaceCard>
          </div>

          <div className="flex flex-col gap-2">
            <SectionTitle>{t('profile.section.support')}</SectionTitle>
            <SurfaceCard as="section">
              <SettingsRow
                icon="hand.raised.fill"
                title={t('profile.row.privacy')}
                href={PRIVACY_URL}
                showsDivider
              />
              <SettingsRow icon="doc.text.fill" title={t('profile.row.terms')} href={TERMS_URL} />
            </SurfaceCard>
          </div>
        </nav>

        <div className="flex min-w-0 flex-1 flex-col gap-5 lg:max-w-[760px]">
          <div className="lg:hidden">
            <ProfileSubScreenHeader
              title={title}
              subtitle={subtitle}
              backLabel={t('home.title.profile')}
            />
          </div>
          <div className="hidden flex-col gap-1 lg:flex">
            <h2 className="text-[22px] font-black text-(--color-primary-blue-dark)">{title}</h2>
            <p className="text-[13px] leading-[1.45] font-bold text-(--color-text-secondary)">
              {subtitle}
            </p>
          </div>

          {children}
        </div>
      </div>
    </ContentContainer>
  );
};
