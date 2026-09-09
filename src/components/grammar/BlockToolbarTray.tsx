/* Insert a block — port of GrammarNoteEditorView.toolbarTray + toolbarItems.

   The old control was a dashed "Add block" button that expanded a grid of all
   fifteen types. Two clicks for every block, and the grid pushed the note you
   were writing down the page each time. The tray is always there instead: the
   eight everyday types as one row of pills, the remaining seven behind "More".
   Nothing is lost — every type the editor supports is still one or two clicks
   away.

   Below lg it sticks to the bottom of the viewport and scrolls sideways, so it
   stays reachable while you type; from lg it is a static centred row. (The
   mobile create FAB is not shown on editor routes — see showsCreateFab in
   lib/navigation.ts — so nothing collides with it down there.) */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CaretDown } from '@phosphor-icons/react';

import { Icon } from '@/components/primitives/Icon';
import { BLOCK_TYPE_ICON, EDITOR_BLOCK_TYPES } from '@/lib/grammarMeta';
import type { GrammarBlockType } from '@/lib/models';

/* The order iOS puts in the tray itself; everything else goes under "More". */
const TRAY_TYPES: GrammarBlockType[] = [
  'heading',
  'subheading',
  'paragraph',
  'bulletList',
  'numberedList',
  'checklist',
  'quote',
  'image',
];

interface BlockToolbarTrayProps {
  /** Quiz blocks are hidden when "allow quick quizzes" is off (iOS allowsQuiz). */
  allowsQuiz?: boolean;
  onAdd: (type: GrammarBlockType) => void;
}

export const BlockToolbarTray = ({ allowsQuiz = true, onAdd }: BlockToolbarTrayProps) => {
  const { t } = useTranslation();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const available = allowsQuiz
    ? EDITOR_BLOCK_TYPES
    : EDITOR_BLOCK_TYPES.filter((type) => type !== 'quiz');
  const tray = TRAY_TYPES.filter((type) => available.includes(type));
  const more = available.filter((type) => !TRAY_TYPES.includes(type));

  /* A popover that only closes on its own button is a popover people leave
     open by accident. */
  useEffect(() => {
    if (!isMoreOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!moreRef.current?.contains(event.target as Node)) setIsMoreOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMoreOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isMoreOpen]);

  const insert = (type: GrammarBlockType) => {
    onAdd(type);
    setIsMoreOpen(false);
  };

  const pill =
    'flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-(--color-primary-blue)/10 px-3.5 text-[12px] font-bold text-(--color-primary-blue) transition-colors hover:bg-(--color-primary-blue)/20 focus-visible:ring-2 focus-visible:ring-(--color-home-brand) focus-visible:outline-none';

  return (
    <div className="sticky bottom-0 z-20 -mx-1 bg-(--color-app-bg) pt-2 pb-2 lg:static lg:mx-0 lg:bg-transparent lg:pb-0">
      <div
        role="toolbar"
        aria-label={t('writing.grammar.block.trayLabel')}
        className="flex items-center gap-2 rounded-[18px] border border-white/60 bg-white/95 px-2.5 py-2 shadow-[0_5px_10px_rgba(0,0,0,0.05)]"
      >
        {/* Two things this markup is carrying.

            min-w-0 on the scroller: a flex child defaults to min-width:auto, so
            without it the row of pills widens the tray instead of scrolling
            inside it, and the whole page scrolls sideways on a phone.

            The centring is `w-max mx-auto` on the inner row rather than
            `justify-center` on the scroller. With justify-center, a row wider
            than its container spills out BOTH sides and the left end becomes
            unreachable — which is what happened in Ukrainian, where the block
            names are longer than in English. `mx-auto` centres a row that fits
            and collapses to nothing for one that doesn't. */}
        <div className="min-w-0 flex-1 overflow-x-auto">
          <div className="flex w-max items-center gap-2 lg:mx-auto">
            {tray.map((type) => (
              <button key={type} type="button" onClick={() => insert(type)} className={pill}>
                <Icon name={BLOCK_TYPE_ICON[type]} className="size-[13px]" aria-hidden />
                {t(`writing.grammar.block.${type}`)}
              </button>
            ))}
          </div>
        </div>

        <div ref={moreRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setIsMoreOpen((open) => !open)}
            aria-expanded={isMoreOpen}
            aria-haspopup="menu"
            className={pill}
          >
            {t('writing.grammar.block.more')}
            <CaretDown size={12} weight="bold" aria-hidden />
          </button>

          {isMoreOpen && (
            <div
              role="menu"
              className="absolute right-0 bottom-[calc(100%+8px)] z-30 grid w-[240px] grid-cols-2 gap-1 rounded-2xl border border-white bg-white p-2 shadow-[0_16px_40px_rgba(20,24,40,0.16)]"
            >
              {more.map((type) => (
                <button
                  key={type}
                  type="button"
                  role="menuitem"
                  onClick={() => insert(type)}
                  className="flex flex-col items-center gap-1.5 rounded-xl px-2 py-2.5 text-center transition-colors hover:bg-(--color-goal-bg) focus-visible:outline-none"
                >
                  <Icon
                    name={BLOCK_TYPE_ICON[type]}
                    className="size-5 text-(--color-primary-blue)"
                    aria-hidden
                  />
                  <span className="text-[12px] font-semibold text-(--color-primary-blue-dark)">
                    {t(`writing.grammar.block.${type}`)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
