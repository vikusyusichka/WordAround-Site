/* App sidebar — the primary web navigation (persistent on desktop, slid into a
   drawer on mobile). Brand, a Create control, grouped nav links, and Profile
   pinned to the bottom. Active state comes from the router (<Link> isActive). */
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import { CreateMenu } from '@/components/shell/CreateMenu';
import { NAV_GROUPS, PROFILE_NAV, type NavItem } from '@/lib/navigation';

interface SidebarProps {
  /** Called after a nav link is chosen — lets the mobile drawer close itself. */
  onNavigate?: () => void;
}

const NavLink = ({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) => {
  const { t } = useTranslation();
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      activeOptions={item.to === '/home' ? { exact: true } : undefined}
      className="group block rounded-xl focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:outline-none"
    >
      {({ isActive }) => (
        <span
          className={[
            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold transition-colors',
            isActive
              ? 'bg-(--color-home-nav-sel-bg) text-(--color-home-brand)'
              : 'text-(--color-text-secondary) hover:bg-black/[0.03] hover:text-(--color-primary-blue-dark)',
          ].join(' ')}
        >
          <Icon
            name={isActive ? (item.iconActive ?? item.icon) : item.icon}
            className={[
              'size-5 shrink-0',
              isActive ? 'text-(--color-home-brand)' : 'text-(--color-muted-text)',
            ].join(' ')}
          />
          {t(item.labelKey)}
        </span>
      )}
    </Link>
  );
};

export const Sidebar = ({ onNavigate }: SidebarProps) => {
  const { t } = useTranslation();

  return (
    <nav className="flex h-full flex-col gap-5 p-4" aria-label={t('nav.menu')}>
      {/* Brand */}
      <div className="px-2 pt-2">
        <span className="text-[22px] font-extrabold text-(--color-auth-title)">WordAround</span>
      </div>

      <CreateMenu />

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto">
        {NAV_GROUPS.map((group, i) => (
          <div key={group.labelKey ?? `group-${i}`} className="flex flex-col gap-1">
            {group.labelKey && (
              <span className="px-3 pb-1 text-[11px] font-bold tracking-wide text-(--color-muted-text) uppercase">
                {t(group.labelKey)}
              </span>
            )}
            {group.items.map((item) => (
              <NavLink key={item.id} item={item} onNavigate={onNavigate} />
            ))}
          </div>
        ))}
      </div>

      {/* Profile pinned to the bottom */}
      <div className="border-t border-black/5 pt-3">
        <NavLink item={PROFILE_NAV} onNavigate={onNavigate} />
      </div>
    </nav>
  );
};
