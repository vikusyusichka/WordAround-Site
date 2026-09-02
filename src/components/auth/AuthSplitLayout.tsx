/* Shell for every auth screen: brand panel on the left from lg up, form panel
   on the right. Below lg the brand panel drops away and the form takes the
   full width over the same blob background — web-native rather than a phone
   layout stretched across a desktop. */
import type { ReactNode } from 'react';

import { AuthBackground, type BlobSpec } from '@/components/auth/AuthBackground';
import { AuthBrandPanel } from '@/components/auth/AuthBrandPanel';
import { AuthIconGradientDefs } from '@/components/auth/AuthIconGradientDefs';

/* Only drawn below lg — the desktop blobs live inside the brand panel. */
const COMPACT_BLOBS: BlobSpec[] = [
  { color: '#F2DBA1', width: 250, height: 285, rotation: 16, x: 180, y: -320 },
  { color: '#D1E3D9', width: 150, height: 170, rotation: -14, x: 180, y: 300, opacity: 0.55 },
  { color: '#D4DEF5', width: 150, height: 170, rotation: 20, x: -180, y: 250, opacity: 0.5 },
  { color: '#EBD1DE', width: 120, height: 140, rotation: -18, x: -175, y: -40, opacity: 0.42 },
];

interface AuthSplitLayoutProps {
  children: ReactNode;
}

export const AuthSplitLayout = ({ children }: AuthSplitLayoutProps) => (
  <main className="relative flex min-h-dvh overflow-hidden bg-[#F5F5FB]">
    <AuthIconGradientDefs />

    <div className="absolute inset-0 lg:hidden" aria-hidden="true">
      <AuthBackground blobs={COMPACT_BLOBS} />
    </div>

    <AuthBrandPanel />

    <div className="relative z-10 flex flex-1 items-center justify-center px-6 py-12 sm:px-10 lg:-ml-12 lg:rounded-l-[48px] lg:bg-white lg:px-16 lg:shadow-[-26px_0_60px_rgba(61,82,153,0.07)]">
      <div className="flex w-full max-w-[404px] flex-col gap-6">{children}</div>
    </div>
  </main>
);
