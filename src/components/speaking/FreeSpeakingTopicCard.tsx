/* Topic card for Free Speaking — shows the generated (or generating) topic with
   its description and a row of context chips. Web port of FreeSpeakingTopicCardView. */
import { Icon } from '@/components/primitives/Icon';

interface FreeSpeakingTopicCardProps {
  title: string;
  description: string;
  chips: string[];
  accentColor: string;
  loading?: boolean;
}

export const FreeSpeakingTopicCard = ({
  title,
  description,
  chips,
  accentColor,
  loading,
}: FreeSpeakingTopicCardProps) => (
  <div className="flex flex-col gap-2.5 rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
    <div className="flex items-start gap-2.5">
      <span
        className="grid size-9 shrink-0 place-items-center rounded-xl"
        style={{ background: `${accentColor}1A`, color: accentColor }}
      >
        <Icon name={loading ? 'sparkles' : 'waveform'} className="size-[18px]" />
      </span>
      <div className="flex flex-col gap-0.5">
        <span className="text-[16px] font-bold text-(--color-primary-blue-dark)">{title}</span>
        <span className="text-[13px] font-medium text-(--color-text-secondary)">{description}</span>
      </div>
    </div>

    {chips.length > 0 && (
      <div className="flex flex-wrap gap-1.5">
        {chips.map((chip) => (
          <span
            key={chip}
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{ background: `${accentColor}14`, color: accentColor }}
          >
            {chip}
          </span>
        ))}
      </div>
    )}
  </div>
);
