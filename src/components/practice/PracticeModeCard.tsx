/* One practice-mode card — icon circle, title/subtitle, arrow circle,
   decorative blob. Shared by all four modules on purpose: iOS defines
   WritingMenuCardView / ReadingModeCardView / ListeningModeCardView /
   SpeakingModeCardView separately but with *identical* geometry, so one
   component against the --*-mode-* tokens is the faithful port.
   `disabled` dims the card, drops the arrow and disables the click. */
import { StatBlobShape } from '@/components/home/blobs';
import { Icon } from '@/components/primitives/Icon';

interface PracticeModeCardProps {
  title: string;
  subtitle: string;
  iconSystemName: string;
  accentColor: string;
  blobColor: string;
  disabled?: boolean;
  comingSoonLabel?: string;
  onClick?: () => void;
}

export const PracticeModeCard = ({
  title,
  subtitle,
  iconSystemName,
  accentColor,
  blobColor,
  disabled,
  comingSoonLabel,
  onClick,
}: PracticeModeCardProps) => {
  const inner = (
    <div
      className={`relative flex h-full w-full flex-col overflow-hidden rounded-(--radius-mode-card) border border-white/92 bg-white p-(--spacing-mode-card-pad) text-left shadow-[0_4px_10px_rgba(0,0,0,0.055)] min-h-(--size-mode-card-min-h) ${
        disabled ? 'opacity-60' : ''
      }`}
    >
      {/* Bottom-right blob, pushed out past the corner and clipped (iOS
          ZStack(.bottomTrailing) + offset x/y). */}
      <div
        className="pointer-events-none absolute h-(--size-mode-blob-h) w-(--size-mode-blob-w)"
        style={{
          bottom: 'calc(var(--spacing-mode-blob-y) * -1)',
          right: 'calc(var(--spacing-mode-blob-x) * -1)',
        }}
      >
        <StatBlobShape color={blobColor} opacity={0.72} className="size-full" />
      </div>

      <div
        className="grid size-(--size-mode-icon-circle) shrink-0 place-items-center rounded-full"
        style={{ background: `${accentColor}1F` /* ~12% opacity */ }}
      >
        <Icon
          name={iconSystemName}
          className="size-(--size-mode-icon)"
          style={{ color: accentColor }}
        />
      </div>

      <div className="mt-auto flex flex-col gap-1 pt-2.5">
        <span className="text-(length:--text-mode-title) font-bold leading-tight text-(--color-primary-blue-dark)">
          {title}
        </span>
        <span className="text-(length:--text-mode-subtitle) font-medium leading-snug text-(--color-text-secondary)">
          {subtitle}
        </span>
        {comingSoonLabel && (
          <span
            className="mt-1.5 inline-flex w-fit rounded-full bg-black/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: accentColor }}
          >
            {comingSoonLabel}
          </span>
        )}
      </div>

      {!disabled && (
        <div className="mt-2.5 flex justify-end">
          <div
            className="grid size-(--size-mode-arrow-circle) place-items-center rounded-full"
            style={{ background: `${accentColor}1F` }}
          >
            <Icon
              name="arrow.right"
              className="size-(--size-mode-arrow-icon)"
              style={{ color: accentColor }}
            />
          </div>
        </div>
      )}
    </div>
  );

  if (disabled) {
    return (
      <div aria-disabled className="block w-full">
        {inner}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="group block w-full rounded-(--radius-mode-card) text-left transition-transform active:scale-[0.995] focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      {inner}
    </button>
  );
};
