/* One titled section card on a create screen — port of
   CreateSetSectionContainer + CreateSetSectionLabel. Recolours with the active
   theme: translucent-white fill, soft accent border, bold accent-dark title. */
import type { ReactNode } from 'react';

import type { SetTheme } from '@/lib/setColors';

interface CreateSectionProps {
  title: string;
  theme: SetTheme;
  children: ReactNode;
}

export const CreateSection = ({ title, theme, children }: CreateSectionProps) => (
  <section
    className="flex flex-col gap-3.5 rounded-[22px] border p-3.5 transition-colors md:rounded-[26px] md:p-[22px]"
    style={{
      background: theme.sectionBackground,
      borderColor: theme.softBorderColor,
      boxShadow: `0 6px 16px ${theme.shadowColor}`,
    }}
  >
    <h2 className="text-[13px] font-bold md:text-[16px]" style={{ color: theme.titleColor }}>
      {title}
    </h2>
    {children}
  </section>
);
