/* Body of /practice/writing/essays. Composes topic-mode picker → topic
   generation UI (suggested button or custom input) → task card → language +
   difficulty selectors → editor. All state lives in useEssaySession. */
import { useTranslation } from 'react-i18next';

import { EssayCustomTopicInput } from './EssayCustomTopicInput';
import { EssayDifficultySelector } from './EssayDifficultySelector';
import { EssayEditor } from './EssayEditor';
import { EssayLanguageSelector } from './EssayLanguageSelector';
import { EssayTopicCard } from './EssayTopicCard';
import { EssayTopicModePicker } from './EssayTopicModePicker';
import { useEssaySession } from '@/hooks/useEssaySession';

export const EssaysScreen = () => {
  const { t } = useTranslation();
  const { state, dispatch, generateTopic } = useEssaySession();

  const hasTask = state.task !== null;
  const busy = state.isGenerating;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      {/* Topic mode picker */}
      <EssayTopicModePicker
        value={state.topicMode}
        onChange={(mode) => dispatch({ type: 'SET_TOPIC_MODE', mode })}
      />

      {/* Generate UI — differs by mode */}
      {state.topicMode === 'suggested' ? (
        <button
          type="button"
          onClick={() => void generateTopic()}
          disabled={busy}
          className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) px-6 text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98] disabled:opacity-60 focus-visible:outline-none md:text-[16px]"
        >
          {busy
            ? t('writing.essays.generating')
            : hasTask
              ? t('writing.essays.suggested.regenerate')
              : t('writing.essays.suggested.generate')}
        </button>
      ) : (
        <EssayCustomTopicInput
          value={state.customTopicText}
          onChange={(text) => dispatch({ type: 'SET_CUSTOM_TOPIC', text })}
          onGenerate={() => void generateTopic()}
          isGenerating={busy}
        />
      )}

      {state.generationError && (
        <p role="alert" className="text-[14px] font-semibold text-(--color-cs-red)">
          {state.generationError}
        </p>
      )}

      {/* Task card once we have one */}
      {state.task && <EssayTopicCard task={state.task} />}

      {/* Config row */}
      <div className="grid gap-3 md:grid-cols-2 md:gap-4">
        <EssayLanguageSelector
          value={state.selectedLanguage}
          onChange={(language) => dispatch({ type: 'SET_LANGUAGE', language })}
          disabled={busy}
        />
        <EssayDifficultySelector
          value={state.selectedDifficulty}
          onChange={(difficulty) => dispatch({ type: 'SET_DIFFICULTY', difficulty })}
          disabled={busy}
        />
      </div>

      {/* Editor */}
      {state.task && (
        <EssayEditor
          task={state.task}
          text={state.essayText}
          wordCount={state.wordCount}
          validation={state.validation}
          onChange={(text) => dispatch({ type: 'SET_ESSAY_TEXT', text })}
          onReset={() => dispatch({ type: 'RESET_ESSAY' })}
        />
      )}
    </div>
  );
};
