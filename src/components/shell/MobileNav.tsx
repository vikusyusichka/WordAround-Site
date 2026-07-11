/* Mobile navigation (<lg): a top app bar (hamburger + current page title +
   profile avatar) plus a slide-in drawer that reuses the Sidebar. */
import { Link, useRouterState } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { List } from '@phosphor-icons/react';

import { Icon } from '@/components/primitives/Icon';
import { Sidebar } from '@/components/shell/Sidebar';
import { pageCopyForPath } from '@/lib/navigation';
import { useUiStore } from '@/stores/uiStore';

export const MobileNav = () => {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isDrawerOpen = useUiStore((s) => s.isDrawerOpen);
  const openDrawer = useUiStore((s) => s.openDrawer);
  const closeDrawer = useUiStore((s) => s.closeDrawer);

  const copy = pageCopyForPath(pathname);
  const title = t(copy.titleKey);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-black/5 bg-(--color-app-bg)/90 px-3 backdrop-blur-md">
        <button
          type="button"
          onClick={openDrawer}
          aria-label={t('nav.menu')}
          className="grid size-10 place-items-center rounded-xl text-(--color-primary-blue-dark) hover:bg-black/[0.04] focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:outline-none"
        >
          <List size={22} weight="bold" />
        </button>

        <span className="truncate text-[17px] font-bold text-(--color-primary-blue-dark)">
          {title}
        </span>

        <Link
          to="/profile"
          aria-label={t('nav.profile')}
          className="grid size-9 place-items-center rounded-full bg-white/95 shadow-[0_2px_6px_rgba(0,0,0,0.06)] focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:outline-none"
        >
          <Icon name="person.crop.circle.fill" className="home-avatar-gradient size-7" />
        </Link>
      </header>

      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDrawer}
            />
            <motion.div
              className="fixed inset-y-0 left-0 z-50 w-[272px] max-w-[82%] bg-(--color-app-bg) shadow-[8px_0_24px_rgba(0,0,0,0.12)] lg:hidden"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            >
              <Sidebar onNavigate={closeDrawer} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
