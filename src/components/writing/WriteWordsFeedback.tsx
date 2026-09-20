/* The verdict on an answer — port of WriteWordsExerciseCardView.feedbackView.

   This is the piece the web was missing, and its absence read as a broken
   button: pressing the primary on a wrong answer set the state, refused to
   advance (as it should — you are meant to try again) and showed nothing at
   all, so the button looked dead.

   The slot keeps its height whether or not a verdict is showing, exactly as
   iOS reserves it. Without that the field and the buttons jump apart the
   instant you answer, which is its own kind of wrong.

   The pop-in is a CSS animation, not a JS one. Two reasons, both learned
   here. AnimatePresence removes its wrapper only once every motion child
   reports its exit, and when that bookkeeping slips the node stays at
   opacity 0 — invisible, yet still announced, because it still carries
   role="status". And a JS entry animation that does not get to run leaves the
   pill at opacity 0 as well, which is precisely the bug this component
   exists to fix. A keyframe that never runs leaves the element visible. */
import { useTranslation } from 'react-i18next';

import type { WriteWordsValidation } from '@/lib/writingSession';

interface WriteWordsFeedbackProps {
  validation: WriteWordsValidation;
}

export const WriteWordsFeedback = ({ validation }: WriteWordsFeedbackProps) => {
  const { t } = useTranslation();

  const verdict =
    validation === 'correct'
      ? {
          text: t('writing.writeWords.correct'),
          className: 'bg-(--color-verdict-ok-bg) text-(--color-verdict-ok-text)',
        }
      : validation === 'incorrect'
        ? {
            text: t('writing.writeWords.incorrect'),
            className: 'bg-(--color-verdict-bad-bg) text-(--color-verdict-bad-text)',
          }
        : null;

  return (
    <div className="grid h-9 place-items-center">
      {verdict && (
        <span
          key={validation}
          role="status"
          className={`verdict-pop rounded-full px-4 py-1.5 text-[13px] font-bold [animation:verdict-pop_220ms_cubic-bezier(0.2,0.9,0.3,1.4)] ${verdict.className}`}
        >
          {verdict.text}
        </span>
      )}
    </div>
  );
};
