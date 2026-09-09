/* One row inside a profile settings card — port of ProfileView.settingsRow /
   dangerRow: a 36px rounded icon box tinted 14% of the accent, a 15px bold
   title, an optional muted trailing value, and a chevron. The divider is
   inset by the icon's width plus both gaps (16 + 36 + 14 = 66px), which is what
   makes a stack of these read as one list rather than separate strips.

   Renders as a <button> for in-app destinations and as an <a> for the two
   support links, so Privacy and Terms behave like links (middle-click, copy
   address) instead of buttons that happen to navigate. */
import { Icon } from '@/components/primitives/Icon';

interface SettingsRowProps {
  icon: string;
  title: string;
  /** Right-aligned current value ("Ukrainian", "Light", "2"). */
  trailing?: string | null;
  showsDivider?: boolean;
  tone?: 'default' | 'danger';
  /** Marks the row as the open one in the desktop master-detail rail. */
  isActive?: boolean;
  onClick?: () => void;
  /** Set for an external link; renders an <a target="_blank"> instead. */
  href?: string;
}

export const SettingsRow = ({
  icon,
  title,
  trailing,
  showsDivider = false,
  tone = 'default',
  isActive = false,
  onClick,
  href,
}: SettingsRowProps) => {
  const isDanger = tone === 'danger';

  const body = (
    <>
      <span
        aria-hidden
        className="grid size-9 shrink-0 place-items-center rounded-[10px]"
        style={{
          background: isDanger
            ? 'var(--color-profile-danger-soft)'
            : 'color-mix(in srgb, var(--color-primary-blue) 14%, transparent)',
        }}
      >
        <Icon
          name={icon}
          className="size-[15px]"
          style={{
            color: isDanger ? 'var(--color-profile-danger)' : 'var(--color-primary-blue)',
          }}
        />
      </span>

      {/* Wraps rather than truncating: "Privacy policy" is one short line in
          English and two in Ukrainian, and in the 280px desktop rail an
          ellipsis would hide which of the two support links this is. */}
      <span
        className={`min-w-0 text-[15px] leading-[1.3] font-bold ${
          isDanger ? 'text-(--color-profile-danger)' : 'text-(--color-primary-blue-dark)'
        }`}
      >
        {title}
      </span>

      <span className="ml-auto flex shrink-0 items-center gap-2">
        {trailing && (
          <span className="max-w-[140px] truncate text-[13px] font-semibold text-(--color-text-secondary) sm:max-w-[220px]">
            {trailing}
          </span>
        )}
        <Icon
          name="chevron.right"
          aria-hidden
          className={`size-3 ${
            isDanger ? 'text-(--color-profile-danger)/45' : 'text-(--color-text-secondary)/60'
          }`}
        />
      </span>
    </>
  );

  const shared = `flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:outline-none ${
    isDanger ? 'hover:bg-(--color-profile-danger)/[0.05]' : 'hover:bg-(--color-primary-blue)/[0.04]'
  } ${isActive ? 'bg-(--color-primary-blue)/[0.07]' : ''}`;

  return (
    <div className="flex flex-col">
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className={shared}>
          {body}
        </a>
      ) : (
        <button type="button" onClick={onClick} aria-current={isActive || undefined} className={shared}>
          {body}
        </button>
      )}

      {showsDivider && (
        <span
          aria-hidden
          className="ml-[66px] h-px"
          style={{
            background: isDanger
              ? 'color-mix(in srgb, var(--color-profile-danger) 10%, transparent)'
              : 'color-mix(in srgb, var(--color-primary-blue) 8%, transparent)',
          }}
        />
      )}
    </div>
  );
};
