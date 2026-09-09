/* The full-screen flashcard — port of
   Features/Flashcards/SetDetail/StudyCard/FlashcardExpandedView.swift.

   This screen earns its place twice over. It is the only place a card's IMAGE
   is ever shown — the picture you attach when building a set had, until now,
   no way back onto the screen — and the only place the example sentence
   appears. (iOS does not show the example here either; there is room for it at
   this size and nowhere else on the web, so it is a deliberate addition.)

   No state of its own: the caller passes the study session's `state` and
   `dispatch`, so a card marked known here is the same card marked known behind
   the overlay. Swipes and the arrow keys go through the same actions the
   buttons on the small card use. */
import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { SpeakerHigh, X } from '@phosphor-icons/react';

import { Icon } from '@/components/primitives/Icon';
import { RoundFinish } from '@/components/study/RoundFinish';
import { swipeOutcome } from '@/lib/cardSwipe';
import { speak } from '@/lib/speech';
import { activeCard, roundStats, type StudyAction, type StudyState } from '@/lib/studySession';
import type { SetTheme } from '@/lib/setColors';

interface ExpandedCardProps {
  open: boolean;
  state: StudyState;
  theme: SetTheme;
  dispatch: (action: StudyAction) => void;
  onClose: () => void;
}

export const ExpandedCard = ({ open, state, theme, dispatch, onClose }: ExpandedCardProps) => {
  const { t } = useTranslation();
  const card = activeCard(state);
  const stats = roundStats(state);

  /* Which way the card flew out, so the next one can spring in from the other
     side the way iOS does. */
  const [exitTo, setExitTo] = useState<'left' | 'right' | null>(null);

  const answer = useCallback(
    (outcome: 'known' | 'unknown') => {
      if (!card) return;
      setExitTo(outcome === 'known' ? 'right' : 'left');
      dispatch({ type: outcome === 'known' ? 'KNOWN' : 'UNKNOWN' });
    },
    [card, dispatch],
  );

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        answer('known');
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        answer('unknown');
      } else if (event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
        dispatch({ type: 'FLIP' });
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, answer, dispatch, onClose]);

  /* The page behind must not scroll while a full-screen overlay is up. */
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const isFlipped = state.isShowingTranslation;

  const faceStyle = {
    background: theme.previewBackground,
    border: `6px solid rgba(255,255,255,0.9)`,
    boxShadow: `0 16px 28px ${theme.shadowColor}`,
    backfaceVisibility: 'hidden' as const,
    WebkitBackfaceVisibility: 'hidden' as const,
  };

  /* Same trick as StudyCard: opacity bound to the flip state, because some
     browsers fail to cull the reverse face under Motion's 3D transform and it
     bleeds through the front. */
  const face = (text: string, sublabel: string, lang: string, visible: boolean) => (
    <div
      className="absolute inset-0 flex flex-col items-center overflow-hidden rounded-[34px] px-6 pt-10 pb-8 lg:rounded-[44px] lg:px-10 lg:pt-14"
      style={{
        ...faceStyle,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <div className="flex shrink-0 flex-col items-center gap-2">
        <span
          className="line-clamp-3 text-center text-[34px] leading-tight font-bold lg:text-[46px]"
          style={{ color: theme.titleColor }}
        >
          {text || t('study.noTranslation')}
        </span>
        <span
          className="text-[13px] font-semibold lg:text-[16px]"
          style={{ color: theme.mutedTextColor }}
        >
          {sublabel}
        </span>
      </div>

      <div className="flex min-h-0 w-full flex-1 items-center justify-center py-4">
        <CardImageArea card={card} theme={theme} />
      </div>

      {card?.example ? (
        <p
          /* Right padding keeps the sentence clear of the speaker button,
             which floats over this corner of the card. */
          className="line-clamp-2 w-full shrink-0 rounded-xl py-2 pr-14 pl-3.5 text-center text-[14px] leading-[1.45] font-medium lg:text-[16px]"
          style={{ background: theme.softAccent, color: theme.accent }}
        >
          {t('study.exampleFormat', { text: card.example })}
        </p>
      ) : null}

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          speak(text, lang);
        }}
        aria-label={t('study.speak')}
        className="absolute right-5 bottom-5 grid size-12 place-items-center rounded-full hover:bg-black/[0.04] focus-visible:outline-none lg:right-8 lg:bottom-8"
        style={{ color: theme.accent }}
      >
        <SpeakerHigh size={26} weight="fill" />
      </button>
    </div>
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex flex-col overflow-hidden lg:items-center lg:justify-center lg:bg-black/35 lg:p-8 lg:backdrop-blur-sm"
          style={{ background: theme.screenBackground }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={t('study.expandedTitle')}
        >
          {/* From lg the whole thing becomes a capped panel on a dimmed page,
              rather than a phone screen stretched across a monitor. */}
          {/* A definite height, not `auto`: the card below fills its share of
              it, and without one the whole column collapses to the height of
              the picture and swallows the word and the example. */}
          <div
            className="flex h-full w-full flex-col lg:h-[min(92dvh,780px)] lg:max-w-[900px] lg:rounded-[36px] lg:p-8"
            style={{ background: theme.screenBackground }}
          >
            <div className="flex shrink-0 items-center justify-between px-5 pt-4 lg:px-0 lg:pt-0">
              <button
                type="button"
                onClick={onClose}
                aria-label={t('study.close')}
                className="grid size-10 place-items-center rounded-full shadow-[0_5px_10px_rgba(0,0,0,0.06)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none lg:size-12"
                style={{ background: theme.fieldBackground, color: theme.titleColor }}
              >
                <X size={16} weight="bold" />
              </button>
            </div>

            {state.isShowingRoundFinish ? (
              <div className="flex flex-1 items-center justify-center overflow-y-auto p-5">
                <RoundFinish
                  known={stats.known}
                  total={stats.total}
                  learning={stats.learning}
                  accent={theme.accent}
                  onRepeatUnknown={() => dispatch({ type: 'REPEAT_UNKNOWN' })}
                  onRestart={() => dispatch({ type: 'RESTART' })}
                />
              </div>
            ) : (
              <>
                <div className="flex min-h-0 flex-1 items-center px-5 py-4 lg:px-6">
                  <motion.div
                    key={card?.id ?? 'empty'}
                    className="relative h-full min-h-[340px] w-full cursor-pointer [perspective:1600px]"
                    drag="x"
                    dragSnapToOrigin
                    dragElastic={0.55}
                    onDragEnd={(_, info) => {
                      const outcome = swipeOutcome({
                        dx: info.offset.x,
                        dy: info.offset.y,
                      });
                      if (outcome) answer(outcome);
                    }}
                    onClick={() => dispatch({ type: 'FLIP' })}
                    initial={{ x: exitTo === 'right' ? -460 : exitTo === 'left' ? 460 : 0 }}
                    animate={{ x: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                  >
                    <motion.div
                      className="relative h-full w-full [transform-style:preserve-3d]"
                      animate={{ rotateY: isFlipped ? 180 : 0 }}
                      transition={{ type: 'spring', stiffness: 220, damping: 26 }}
                    >
                      {face(card?.word ?? '', t('study.cardSubWord'), 'en-US', !isFlipped)}
                      <div className="absolute inset-0 [transform:rotateY(180deg)]">
                        {face(
                          card?.translation ?? '',
                          t('study.cardSubTranslation'),
                          'uk-UA',
                          isFlipped,
                        )}
                      </div>
                    </motion.div>
                  </motion.div>
                </div>

                {state.trackProgress && (
                  <div className="shrink-0 px-6 pt-2 pb-7 lg:px-16 lg:pb-4">
                    <ProgressSection stats={stats} theme={theme} />
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* iOS draws a rotated blob and two sparkles behind the picture, so an image
   with a transparent or awkward edge still sits on something deliberate. */
const CardImageArea = ({
  card,
  theme,
}: {
  card: ReturnType<typeof activeCard>;
  theme: SetTheme;
}) => (
  /* Height comes from the flex slot, not from an aspect ratio — an aspect
     ratio here forces a height the card may not have and pushes the word off
     the top of it. */
  <div className="relative flex h-full w-full max-w-[300px] items-center justify-center lg:max-w-[420px]">
    <span
      aria-hidden
      className="absolute inset-0 -rotate-[8deg] rounded-[42%_58%_45%_55%/55%_45%_58%_42%]"
      style={{ background: theme.softAccent, opacity: 0.78 }}
    />
    <Icon
      name="sparkle"
      aria-hidden
      className="absolute top-[6%] left-[6%] size-5"
      style={{ color: theme.accent, opacity: 0.26 }}
    />
    <Icon
      name="sparkle"
      aria-hidden
      className="absolute right-[6%] bottom-[16%] size-4"
      style={{ color: theme.accent, opacity: 0.23 }}
    />
    {card?.imageURL ? (
      <img
        src={card.imageURL}
        alt=""
        className="relative max-h-full max-w-[68%] rounded-2xl object-contain"
      />
    ) : (
      <Icon
        name="hand.wave.fill"
        aria-hidden
        className="relative size-[46%]"
        style={{ color: theme.accent, opacity: 0.9 }}
      />
    )}
  </div>
);

const ProgressSection = ({
  stats,
  theme,
}: {
  stats: ReturnType<typeof roundStats>;
  theme: SetTheme;
}) => {
  const { t } = useTranslation();
  const progress = stats.total > 0 ? stats.answered / stats.total : 0;

  const counter = (count: number, label: string) => (
    <span
      className="flex h-12 w-[72px] shrink-0 flex-col items-center justify-center rounded-full bg-white/95 shadow-[0_5px_10px_rgba(0,0,0,0.05)] lg:h-14 lg:w-[92px]"
      style={{ border: '1px solid rgba(255,255,255,0.85)' }}
    >
      <span
        className="text-[15px] font-bold tabular-nums lg:text-[18px]"
        style={{ color: theme.titleColor }}
      >
        {count}
      </span>
      <span
        className="truncate text-[9px] font-semibold lg:text-[11px]"
        style={{ color: theme.mutedTextColor }}
      >
        {label}
      </span>
    </span>
  );

  return (
    <div className="flex flex-col items-center gap-3 lg:gap-4">
      <span
        className="text-[19px] font-bold tabular-nums lg:text-[24px]"
        style={{ color: theme.mutedTextColor }}
      >
        {stats.answered + 1} / {Math.max(stats.total, 1)}
      </span>
      <div className="flex w-full items-center gap-3.5 lg:gap-5">
        {counter(stats.learning, t('study.learning'))}
        <span
          className="h-3 flex-1 overflow-hidden rounded-full"
          style={{ background: theme.softAccent }}
        >
          <span
            className="block h-full rounded-full transition-[width] duration-200"
            style={{ width: `${Math.round(progress * 100)}%`, background: theme.accent }}
          />
        </span>
        {counter(stats.known, t('study.knownShort'))}
      </div>
    </div>
  );
};
