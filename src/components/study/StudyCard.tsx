/* The big study card. Click / Space flips it (3D rotateY via Motion). Front =
   word, back = translation + example + optional image. Speaker button (TTS) and
   a mastered (star) toggle. */
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { SpeakerHigh, Star } from '@phosphor-icons/react';

import type { Flashcard } from '@/lib/models';

interface StudyCardProps {
  card: Flashcard;
  showTranslation: boolean;
  accent: string;
  isMastered: boolean;
  onFlip: () => void;
  onToggleMastered: () => void;
  onSpeak: (text: string, lang: string) => void;
}

const faceClass =
  'absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-3xl border border-white/80 bg-white p-8 text-center shadow-[0_10px_30px_rgba(0,0,0,0.06)] [backface-visibility:hidden]';

export const StudyCard = ({
  card,
  showTranslation,
  accent,
  isMastered,
  onFlip,
  onToggleMastered,
  onSpeak,
}: StudyCardProps) => {
  const { t } = useTranslation();

  return (
    <div className="relative mx-auto h-[320px] w-full max-w-2xl [perspective:1600px]">
      <motion.div
        className="relative h-full w-full cursor-pointer [transform-style:preserve-3d]"
        animate={{ rotateY: showTranslation ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        onClick={onFlip}
        role="button"
        aria-label={t('study.flip')}
      >
        {/* Front — word */}
        <div className={faceClass}>
          <span className="text-[34px] font-bold text-(--color-cs-dark-text)">{card.word}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSpeak(card.word, 'en-US');
            }}
            aria-label={t('study.speak')}
            className="grid size-11 place-items-center rounded-full text-(--color-cs-text-muted) hover:bg-black/[0.04] focus-visible:outline-none"
          >
            <SpeakerHigh size={22} weight="bold" />
          </button>
        </div>

        {/* Back — translation + example + image */}
        <div className={`${faceClass} [transform:rotateY(180deg)]`}>
          <span className="text-[30px] font-bold" style={{ color: accent }}>
            {card.translation}
          </span>
          {card.example && (
            <span className="text-[16px] font-medium text-(--color-cs-text-muted)">
              {card.example}
            </span>
          )}
          {card.imageURL && (
            <img src={card.imageURL} alt="" className="max-h-28 rounded-xl object-contain" />
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSpeak(card.translation, 'uk-UA');
            }}
            aria-label={t('study.speak')}
            className="grid size-11 place-items-center rounded-full text-(--color-cs-text-muted) hover:bg-black/[0.04] focus-visible:outline-none"
          >
            <SpeakerHigh size={22} weight="bold" />
          </button>
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
