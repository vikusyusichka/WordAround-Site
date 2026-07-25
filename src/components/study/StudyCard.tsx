/* The big study card — port of FlashcardSetDetailMainCardView. Click / Space
   flips it (3D rotateY via Motion). The whole card is themed by the set's
   colour: soft section fill, a thick field-coloured border, the word in the
   set's title colour, an accent speaker, two corner wave-blobs and a sparkle.
   Front = word, back = translation + example + optional image. A mastered
   (star) toggle sits in the corner. */
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { SpeakerHigh, Star } from '@phosphor-icons/react';

import { Icon } from '@/components/primitives/Icon';
import type { Flashcard } from '@/lib/models';
import type { SetTheme } from '@/lib/setColors';

interface StudyCardProps {
  card: Flashcard;
  showTranslation: boolean;
  theme: SetTheme;
  isMastered: boolean;
  /** 1-based position for the on-card counter capsule. */
  index?: number;
  total?: number;
  onFlip: () => void;
  onToggleMastered: () => void;
  onSpeak: (text: string, lang: string) => void;
}

// iOS TopRightWaveShape, factors ×100 for a 0..100 viewBox.
const WAVE_PATH =
  'M 24 0 L 100 0 L 100 100 C 86 100, 70 98, 64 78 C 58 58, 48 72, 38 64 C 20 48, 28 22, 24 0 Z';

const WaveBlob = ({ color, className }: { color: string; className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} aria-hidden preserveAspectRatio="none">
    <path d={WAVE_PATH} fill={color} />
  </svg>
);

export const StudyCard = ({
  card,
  showTranslation,
  theme,
  isMastered,
  index,
  total,
  onFlip,
  onToggleMastered,
  onSpeak,
}: StudyCardProps) => {
  const { t } = useTranslation();

  // No `overflow-hidden` on the face: it would force `transform-style: flat`
  // and defeat `backface-visibility`, showing both faces at once. Blobs are
  // clipped by a separate inner wrapper instead.
  const faceClass =
    'absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-[28px] p-8 text-center [backface-visibility:hidden] md:rounded-[36px]';
  const faceStyle = {
    background: theme.sectionBackground,
    border: `4px solid ${theme.fieldBackground}`,
    boxShadow: `0 8px 14px ${theme.shadowColor}`,
  };

  const decorations = (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[24px] md:rounded-[32px]">
      {/* Two opposite corner wave-blobs + a sparkle, clipped to the card. */}
      <div className="absolute -top-[8%] -right-[8%] h-[42%] w-[42%]">
        <WaveBlob color={theme.softAccent} className="size-full" />
      </div>
      <div className="absolute -bottom-[8%] -left-[8%] h-[42%] w-[42%] rotate-180">
        <WaveBlob color={theme.softAccent} className="size-full" />
      </div>
      <Icon
        name="sparkle"
        className="absolute size-[17px]"
        style={{ left: '78%', top: '76%', color: theme.accent, opacity: 0.3 }}
        aria-hidden
      />
    </div>
  );

  const speaker = (text: string, lang: string) => (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSpeak(text, lang);
      }}
      aria-label={t('study.speak')}
      className="grid size-11 place-items-center rounded-full hover:bg-black/[0.04] focus-visible:outline-none"
      style={{ color: theme.accent }}
    >
      <SpeakerHigh size={22} weight="bold" />
    </button>
  );

  return (
    <div className="relative mx-auto h-[260px] w-full max-w-2xl [perspective:1600px] md:h-[320px]">
      <motion.div
        className="relative h-full w-full cursor-pointer [transform-style:preserve-3d]"
        animate={{ rotateY: showTranslation ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        onClick={onFlip}
        role="button"
        aria-label={t('study.flip')}
      >
        {/* Front — word */}
        <div className={faceClass} style={faceStyle}>
          {decorations}
          <div className="relative flex items-center gap-2.5">
            <span
              className="text-[42px] font-bold md:text-[52px]"
              style={{ color: theme.titleColor }}
            >
              {card.word}
            </span>
            {speaker(card.word, 'en-US')}
          </div>
          {index != null && total != null && (
            <span
              className="absolute bottom-5 left-5 rounded-full px-3 py-1.5 text-[13px] font-bold tabular-nums"
              style={{ background: theme.fieldBackground, color: theme.mutedTextColor }}
            >
              {index} / {Math.max(total, 1)}
            </span>
          )}
        </div>

        {/* Back — translation + example + image */}
        <div className={`${faceClass} [transform:rotateY(180deg)]`} style={faceStyle}>
          {decorations}
          <div className="relative flex items-center gap-2.5">
            <span
              className="text-[32px] font-bold md:text-[38px]"
              style={{ color: theme.accent }}
            >
              {card.translation}
            </span>
            {speaker(card.translation, 'uk-UA')}
          </div>
          {card.example && (
            <span className="text-[16px] font-medium" style={{ color: theme.mutedTextColor }}>
              {card.example}
            </span>
          )}
          {card.imageURL && (
            <img src={card.imageURL} alt="" className="max-h-24 rounded-xl object-contain" />
          )}
        </div>
      </motion.div>

      {/* Mastered toggle — corner, outside the flipping element. */}
      <button
        type="button"
        onClick={onToggleMastered}
        aria-label={t('study.mastered')}
        aria-pressed={isMastered}
        className="absolute top-4 right-4 z-10 grid size-10 place-items-center rounded-full bg-white/90 shadow-[0_2px_6px_rgba(0,0,0,0.08)] focus-visible:outline-none"
        style={{ color: isMastered ? '#F5B942' : 'var(--color-cs-text-muted)' }}
      >
        <Star size={20} weight={isMastered ? 'fill' : 'bold'} />
      </button>
    </div>
  );
};
