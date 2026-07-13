/* Editable rendering of one content block, by type. Per-block toolbar
   (move up / move down / remove) sits in the top-right. Dispatches editor
   actions up to the parent. */
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import type { EditorAction } from '@/lib/grammarNoteEditor';
import type { GrammarNoteBlock } from '@/lib/models';

interface GrammarBlockEditorProps {
  block: GrammarNoteBlock;
  isFirst: boolean;
  isLast: boolean;
  dispatch: (action: EditorAction) => void;
}

const field =
  'w-full rounded-xl border border-(--color-auth-field-border) bg-white px-3.5 py-2.5 text-[15px] font-medium text-(--color-primary-blue-dark) outline-none focus-visible:border-(--color-home-brand)';

export const GrammarBlockEditor = ({ block, isFirst, isLast, dispatch }: GrammarBlockEditorProps) => {
  const { t } = useTranslation();
  const ph = (key: string) => t(`writing.grammar.blockPlaceholder.${key}`);

  const toolbar = (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={() => dispatch({ type: 'MOVE_BLOCK', id: block.id, dir: 'up' })}
        disabled={isFirst}
        aria-label={t('writing.grammar.block.moveUp')}
        className="grid size-7 place-items-center rounded-lg text-(--color-cs-text-muted) hover:bg-black/[0.04] disabled:opacity-30 focus-visible:outline-none"
      >
        <Icon name="arrow.up" className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => dispatch({ type: 'MOVE_BLOCK', id: block.id, dir: 'down' })}
        disabled={isLast}
        aria-label={t('writing.grammar.block.moveDown')}
        className="grid size-7 place-items-center rounded-lg text-(--color-cs-text-muted) hover:bg-black/[0.04] disabled:opacity-30 focus-visible:outline-none"
      >
        <Icon name="arrow.down" className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => dispatch({ type: 'DELETE_BLOCK', id: block.id })}
        aria-label={t('writing.grammar.block.remove')}
        className="grid size-7 place-items-center rounded-lg text-(--color-cs-text-muted) hover:bg-black/[0.04] hover:text-(--color-cs-red) focus-visible:outline-none"
      >
        <Icon name="trash" className="size-4" />
      </button>
    </div>
  );

  const setText = (value: string) => dispatch({ type: 'UPDATE_BLOCK', id: block.id, patch: { text: value } });
  const setSecondary = (value: string) =>
    dispatch({ type: 'UPDATE_BLOCK', id: block.id, patch: { secondaryText: value } });

  const body = () => {
    switch (block.type) {
      case 'divider':
        return <div className="my-1 h-px w-full bg-(--color-auth-field-border)" />;

      case 'heading':
        return (
          <input
            value={block.text}
            onChange={(e) => setText(e.target.value)}
            placeholder={ph('heading')}
            className={`${field} text-[18px] font-bold`}
          />
        );

      case 'bulletList':
        return (
          <div className="flex flex-col gap-2">
            {block.items.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-(--color-text-secondary)">•</span>
                <input
                  value={item}
                  onChange={(e) =>
                    dispatch({ type: 'UPDATE_LIST_ITEM', id: block.id, index: i, value: e.target.value })
                  }
                  placeholder={ph('bulletList')}
                  className={field}
                />
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'REMOVE_LIST_ITEM', id: block.id, index: i })}
                  aria-label={t('writing.grammar.block.remove')}
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-(--color-cs-text-muted) hover:text-(--color-cs-red) focus-visible:outline-none"
                >
                  <Icon name="minus" className="size-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => dispatch({ type: 'ADD_LIST_ITEM', id: block.id })}
              className="w-fit text-[13px] font-semibold text-(--color-primary-blue) hover:underline focus-visible:outline-none"
            >
              + {t('writing.grammar.block.addItem')}
            </button>
          </div>
        );

      case 'example':
      case 'rule':
        return (
          <div className="flex flex-col gap-2">
            <textarea
              value={block.text}
              onChange={(e) => setText(e.target.value)}
              placeholder={ph(block.type)}
              rows={2}
              className={`${field} resize-y`}
            />
            <input
              value={block.secondaryText ?? ''}
              onChange={(e) => setSecondary(e.target.value)}
              placeholder={t('writing.grammar.block.secondaryPlaceholder')}
              className={field}
            />
          </div>
        );

      default: // paragraph, warning, quote
        return (
          <textarea
            value={block.text}
            onChange={(e) => setText(e.target.value)}
            placeholder={ph(block.type)}
            rows={3}
            className={`${field} resize-y`}
          />
        );
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-white bg-white/70 p-3 shadow-[0_2px_8px_rgba(0,0,0,0.03)] md:p-4">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-bold uppercase tracking-wide text-(--color-text-secondary)">
          {t(`writing.grammar.block.${block.type}`)}
        </span>
        {toolbar}
      </div>
      {body()}
    </div>
  );
};
