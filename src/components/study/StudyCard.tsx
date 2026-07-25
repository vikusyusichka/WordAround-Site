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

  // The face must be OPAQUE: iOS's flashcard is a solid card, and a translucent
  // fill let the reverse face show through when backface-visibility didn't cull
  // it (Motion's 3D transform defeats it in some browsers). An opaque fill makes
  // bleed-through impossible regardless. `overflow-hidden` is kept off the face
  // (it would flatten the 3D context); blobs are clipped by an inner wrapper.
  const faceClass =
    'absolute inset-0 flex flex-col items-center justify-center gap-4 overflow-hidden rounded-[28px] p-8 text-center md:rounded-[36px]';
  const faceStyle = {
    background: theme.previewBackground,
    border: `4px solid ${theme.fieldBackground}`,
    boxShadow: `0 8px 14px ${theme.shadowColor}`,
    backfaceVisibility: 'hidden' as const,
    WebkitBackfaceVisibility: 'hidden' as const,
  };

  // The face already clips (overflow-hidden), so the blobs are positioned
  // directly against it — no separate clip wrapper needed.
  const decorations = (
    <>
      <div className="pointer-events-none absolute -top-[8%] -right-[8%] h-[42%] w-[42%]">
        <WaveBlob color={theme.softAccent} className="size-full" />
      </div>
      <div className="pointer-events-none absolute -bottom-[8%] -left-[8%] h-[42%] w-[42%] rotate-180">
        <WaveBlob color={theme.softAccent} className="size-full" />
      </div>
      <Icon
        name="sparkle"
        className="pointer-events-none absolute size-[17px]"
        style={{ left: '78%', top: '76%', color: theme.accent, opacity: 0.3 }}
        aria-hidden
      />
    </>
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

  // iOS renders both faces identically (cardSide): the word/translation in the
  // title colour at the same big size + a speaker, with the counter capsule.
  const counter =
    index != null && total != null ? (
      <span
        className="absolute bottom-5 left-5 rounded-full px-3 py-1.5 text-[13px] font-bold tabular-nums"
        style={{ background: theme.fieldBackground, color: theme.mutedTextColor }}
      >
        {index} / {Math.max(total, 1)}
      </span>
    ) : null;

  const cardSide = (text: string, lang: string) => (
    <>
      {decorations}
      <div className="relative flex items-center gap-2.5">
        <span
          className="text-[42px] font-bold leading-tight md:text-[52px]"
          style={{ color: theme.titleColor }}
        >
          {text}
        </span>
        {speaker(text, lang)}
      </div>
      {counter}
    </>
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
        {/* Front — word. Opacity is bound to the flip state so the reverse face
            never paints in the settled state — the guaranteed cure for the
            coplanar z-fight when a browser fails to cull the backface. */}
        <div
          className={faceClass}
          style={{
            ...faceStyle,
            opacity: showTranslation ? 0 : 1,
            pointerEvents: showTranslation ? 'none' : 'auto',
          }}
        >
          {cardSide(card.word, 'en-US')}
        </div>

        {/* Back — translation, styled identically to the front (iOS cardSide). */}
        <div
          className={`${faceClass} [transform:rotateY(180deg)]`}
          style={{
            ...faceStyle,
            opacity: showTranslation ? 1 : 0,
            pointerEvents: showTranslation ? 'auto' : 'none',
          }}
        >
          {cardSide(card.translation, 'uk-UA')}
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
