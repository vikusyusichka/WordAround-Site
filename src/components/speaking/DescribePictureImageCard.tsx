/* Random photo + the Unsplash attribution their API terms require, plus the
   "try to mention" prompt chips. Web port of DescribePictureImageCardView +
   DescribePicturePromptCardView. */
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import { PICTURE_PROMPT_HINTS, type DescribePictureImage } from '@/lib/describePicture';

interface DescribePictureImageCardProps {
  image: DescribePictureImage | null;
  isLoading: boolean;
  error: string | null;
  accentColor: string;
  onRetry: () => void;
}

export const DescribePictureImageCard = ({
  image,
  isLoading,
  error,
  accentColor,
  onRetry,
}: DescribePictureImageCardProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-2">
      <div className="relative overflow-hidden rounded-2xl bg-black/[0.04] shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
        {isLoading && (
          <div className="flex aspect-4/3 w-full items-center justify-center">
            <span className="text-[14px] font-medium text-(--color-text-secondary)">
              {t('speaking.picture.loading')}
            </span>
          </div>
        )}

        {!isLoading && error && (
          <div className="flex aspect-4/3 w-full flex-col items-center justify-center gap-3 px-6 text-center">
            <Icon name="exclamationmark.triangle.fill" className="size-[22px] text-[#B45309]" />
            <span className="text-[14px] font-medium text-(--color-primary-blue-dark)">{error}</span>
            <button
              type="button"
              onClick={onRetry}
              className="h-9 rounded-2xl px-4 text-[13px] font-semibold text-white"
              style={{ background: accentColor }}
            >
              {t('speaking.picture.retry')}
            </button>
          </div>
        )}

        {!isLoading && !error && image && (
          <img
            src={image.imageURL}
            alt={t('speaking.picture.imageAlt')}
            className="aspect-4/3 w-full object-cover"
          />
        )}
      </div>

      {image && !error && (
        <p className="text-[11px] font-medium text-(--color-muted-text)">
          {t('speaking.picture.photoBy')}{' '}
          <a
            href={image.authorURL}
            target="_blank"
            rel="noreferrer noopener"
            className="font-semibold underline"
          >
            {image.authorName}
          </a>{' '}
          {t('speaking.picture.onUnsplash')}
        </p>
      )}

      {/* Prompt card */}
      <div
        className="flex flex-col gap-2.5 rounded-2xl border p-4"
        style={{ background: `${accentColor}12`, borderColor: `${accentColor}2E` }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="grid size-8 shrink-0 place-items-center rounded-full"
            style={{ background: `${accentColor}24`, color: accentColor }}
          >
            <Icon name="text.bubble.fill" className="size-[16px]" />
          </span>
          <span className="text-[15px] font-bold text-(--color-primary-blue-dark)">
            {t('speaking.picture.prompt')}
          </span>
        </div>
        <span className="text-[13px] font-semibold text-(--color-text-secondary)">
          {t('speaking.picture.tryToMention')}
        </span>
        <div className="flex flex-wrap gap-2">
          {PICTURE_PROMPT_HINTS.map((hint) => (
            <span
              key={hint.key}
              className="flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1.5 text-[12px] font-bold"
              style={{ color: accentColor }}
            >
              <Icon name={hint.icon} className="size-[12px]" />
              {t(`speaking.picture.hints.${hint.key}`)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
