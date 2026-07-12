/* One menu card on the Writing landing — icon circle, title/subtitle, arrow
   circle, decorative blob. Web port of WritingMenuCardView.swift.
   `disabled` dims the card and disables the click (Essays/GrammarNotes in 4A). */
import { StatBlobShape } from '@/components/home/blobs';
import { Icon } from '@/components/primitives/Icon';

interface WritingMenuCardProps {
  title: string;
  subtitle: string;
  iconSystemName: string;
  accentColor: string;
  blobColor: string;
  disabled?: boolean;
  comingSoonLabel?: string;
  onClick?: () => void;
}

export const WritingMenuCard = ({
  title,
  subtitle,
  iconSystemName,
  accentColor,
  blobColor,
  disabled,
  comingSoonLabel,
  onClick,
}: WritingMenuCardProps) => {
  const inner = (
    <div
      className={`relative flex h-full min-h-[200px] w-full flex-col overflow-hidden rounded-[22px] border border-white/95 bg-white p-4 text-left shadow-[0_6px_10px_rgba(0,0,0,0.055)] md:min-h-[240px] md:rounded-[30px] md:p-5 ${
        disabled ? 'opacity-60' : ''
      }`}
    >
      <StatBlobShape
        color={blobColor}
        opacity={0.72}
        className="pointer-events-none absolute -bottom-2 -right-2 h-[60px] w-[72px] md:h-[76px] md:w-[92px]"
      />

      <div
        className="grid size-[44px] shrink-0 place-items-center rounded-full md:size-[52px]"
        style={{ background: `${accentColor}1F` /* ~12% opacity */ }}
      >
        <Icon
          name={iconSystemName}
          className="size-[22px] md:size-[26px]"
          style={{ color: accentColor }}
        />
      </div>

      <div className="mt-auto flex flex-col gap-1.5 pt-4">
        <span className="text-[18px] font-bold leading-tight text-(--color-primary-blue-dark) md:text-[22px]">
          {title}
        </span>
        <span className="text-[13px] font-medium leading-snug text-(--color-text-secondary) md:text-[15px]">
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
        <div className="mt-3 flex justify-end">
          <div
            className="grid size-[38px] place-items-center rounded-full md:size-[44px]"
            style={{ background: `${accentColor}1F` }}
          >
            <Icon
              name="arrow.right"
              className="size-[16px] md:size-[18px]"
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
      className="group block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-(--color-home-brand) rounded-[22px] md:rounded-[30px] transition-transform active:scale-[0.995]"
    >
      {inner}
    </button>
  );
};
