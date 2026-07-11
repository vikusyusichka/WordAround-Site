/* Responsive web app shell. ≥lg: a persistent left Sidebar + scrollable main.
   <lg: a MobileNav top bar + slide-in drawer. Ambient blob background for the
   brand feel. Pages render their own ContentContainer + PageHeader inside the
   <Outlet/>. */
import type { ReactNode } from 'react';
import { motion } from 'motion/react';

import { HomeBackground } from '@/components/home/HomeBackground';
import { HomeIconGradientDefs } from '@/components/home/HomeIconGradientDefs';
import { Icon } from '@/components/primitives/Icon';
import { CreateMenuOverlay } from '@/components/shell/CreateMenuOverlay';
import { MobileNav } from '@/components/shell/MobileNav';
import { Sidebar } from '@/components/shell/Sidebar';
import { useUiStore } from '@/stores/uiStore';

interface AppShellProps {
  children: ReactNode;
}

export const AppShell = ({ children }: AppShellProps) => {
  const isCreateMenuOpen = useUiStore((s) => s.isCreateMenuOpen);
  const toggleCreateMenu = useUiStore((s) => s.toggleCreateMenu);
  const closeCreateMenu = useUiStore((s) => s.closeCreateMenu);

  return (
    <div className="relative flex min-h-dvh bg-(--color-app-bg)">
      <HomeIconGradientDefs />
      {/* Ambient decoration — sits behind everything, in the gutters. */}
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <HomeBackground />
      </div>

      {/* Desktop sidebar */}
      <aside className="relative z-10 hidden w-(--spacing-shell-sidebar) shrink-0 border-r border-black/5 lg:block">
        <div className="sticky top-0 h-dvh">
          <Sidebar />
        </div>
      </aside>

      {/* Main column */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <div className="lg:hidden">
          <MobileNav />
        </div>
        <main className="flex-1">{children}</main>
      </div>

      {/* Mobile create — signature radial "fan" (desktop uses the sidebar dropdown). */}
      <button
        type="button"
        onClick={toggleCreateMenu}
        aria-label="Create"
        aria-expanded={isCreateMenuOpen}
        className="fixed bottom-6 left-1/2 z-[60] grid size-[60px] -translate-x-1/2 place-items-center rounded-full bg-(--color-home-brand) shadow-[0_6px_14px_rgba(43,92,250,0.32)] lg:hidden"
      >
        <motion.span
          className="grid place-items-center"
          animate={{ rotate: isCreateMenuOpen ? 45 : 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 22 }}
        >
          <Icon name="plus" className="size-[30px] text-white" />
        </motion.span>
      </button>

      <CreateMenuOverlay isOpen={isCreateMenuOpen} onClose={closeCreateMenu} />
    </div>
  );
};
