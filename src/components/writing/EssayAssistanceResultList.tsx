/* Presentational list of translation / synonym results shown inside the
   assistance modal. */
import type { EssayAssistanceItem } from '@/lib/essayTypes';

interface EssayAssistanceResultListProps {
  items: EssayAssistanceItem[];
}

export const EssayAssistanceResultList = ({ items }: EssayAssistanceResultListProps) => {
  if (items.length === 0) return null;
  return (
    <div className="flex max-h-[240px] flex-col gap-2 overflow-y-auto pr-1">
      {items.map((item) => (
        <div
          key={item.id}
          className="rounded-xl bg-(--color-primary-blue)/7 px-4 py-3"
        >
          <span className="text-[15px] font-bold text-(--color-primary-blue-dark) md:text-[16px]">
            {item.result}
          </span>
          {item.detail && (
            <span className="mt-1 block text-[13px] font-medium text-(--color-text-secondary)">
              {item.detail}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};
