/* One of the two summary tiles under the profile card — port of
   ProfileView.statCard: a 40px tinted icon circle, the value in the heaviest
   weight, and a muted caption. Always two per row, with more breathing room
   from lg. */
import { Icon } from '@/components/primitives/Icon';
import { ProfileCard } from '@/components/profile/ProfileCard';

interface ProfileStatCardProps {
  icon: string;
  value: string;
  label: string;
}

export const ProfileStatCard = ({ icon, value, label }: ProfileStatCardProps) => (
  <ProfileCard className="min-w-0">
    <div className="flex flex-col gap-3 p-4 lg:p-5">
      <span
        aria-hidden
        className="grid size-10 place-items-center rounded-full"
        style={{ background: 'color-mix(in srgb, var(--color-primary-blue) 14%, transparent)' }}
      >
        <Icon name={icon} className="size-4 text-(--color-primary-blue)" />
      </span>

      <span className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-[20px] font-black text-(--color-primary-blue-dark)">
          {value}
        </span>
        <span className="truncate text-[12px] font-bold text-(--color-text-secondary)">
          {label}
        </span>
      </span>
    </div>
  </ProfileCard>
);
