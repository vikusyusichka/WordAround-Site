/* Body of /practice/writing/essays. Composes topic-mode picker → topic
   generation UI (suggested button or custom input) → task card → language +
   difficulty selectors → editor → hint button + reset → hints list →
   check button → feedback (score card + grammar issues). All state lives
   in useEssaySession. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { EssayAssistanceModal, type AssistanceModalType } from './EssayAssistanceModal';
import { EssayCheckButton } from './EssayCheckButton';
import { EssayCustomTopicInput } from './EssayCustomTopicInput';
import { EssayDifficultySelector } from './EssayDifficultySelector';
import { EssayEditor } from './EssayEditor';
import { EssayFeedbackSection } from './EssayFeedbackSection';
import { EssayHelperToolbar } from './EssayHelperToolbar';
import { EssayHintButton } from './EssayHintButton';
import { EssayHintsList } from './EssayHintsList';
import { EssayLanguageSelector } from './EssayLanguageSelector';
import { EssayTopicCard } from './EssayTopicCard';
import { EssayTopicModePicker } from './EssayTopicModePicker';
import { autoSaveActionFor } from '@/lib/essaySession';
import { useEssaySession } from '@/hooks/useEssaySession';
import { useSaveMistake } from '@/hooks/useSaveMistake';
import { ConfirmDialog } from '@/components/shell/ConfirmDialog';
import { useGrammarSettings } from '@/stores/grammarSettingsStore';
import {
  supportsGrammarCheck,
  SYNONYM_LIMIT,
  TRANSLATION_LIMIT,
  type GrammarIssue,
} from '@/lib/essayTypes';

export const EssaysScreen = () => {
  const { t } = useTranslation();
  const { state, dispatch, generateTopic, requestHint, checkEssay } = useEssaySession();
  const [assistModal, setAssistModal] = useState<AssistanceModalType | null>(null);
  const saveMistake = useSaveMistake();
  /* Notes settings drive what happens to a grammar issue (iOS
     EssayPracticeViewModel.requestSaveGrammarIssue / auto-save). */
  const askBeforeSaving = useGrammarSettings((st) => st.askBeforeSavingMistakes);
  const autoSaveMistakes = useGrammarSettings((st) => st.saveGrammarMistakesAutomatically);
  const [pendingIssue, setPendingIssue] = useState<GrammarIssue | null>(null);
  /* The whole batch from one check, waiting on a single confirmation. */
  const [pendingAutoSave, setPendingAutoSave] = useState<GrammarIssue[] | null>(null);
  const autoSavedRef = useRef<string | null>(null);

  /* iOS makeMistakeSavePayload: original = incorrectText, corrected =
     suggestion (fallback original), explanation = the LT message. */
  const saveIssue = useCallback(
    (issue: GrammarIssue) => {
      const state = saveMistake.stateFor(issue.id);
      if (state === 'saving' || state === 'saved' || state === 'duplicate') return;
      void saveMistake.save(issue.id, {
        original: issue.incorrectText,
        corrected: issue.suggestedCorrection ?? issue.incorrectText,
        explanation: issue.message,
        sourceIssueId: issue.id,
      });
    },
    [saveMistake],
  );

  const handleSaveIssue = (issue: GrammarIssue) => {
    if (askBeforeSaving) {
      setPendingIssue(issue);
      return;
    }
    saveIssue(issue);
  };

  /* "Save essay mistakes automatically": every issue from a check becomes a
     note, once per check (iOS triggerAutoSaveIfEnabled).

     "Ask before saving" wins over it. iOS runs the two independently, so
     switching both on saved silently and the asking setting appeared to do
     nothing — two switches where the quieter one won. Here the batch still
     happens automatically, but it asks once for the whole check rather than
     once per mistake, which would be a queue of dialogs. */
  useEffect(() => {
    if (!autoSaveMistakes || state.grammarIssues.length === 0) return;
    const checkKey = state.grammarIssues.map((issue) => issue.id).join('|');
    if (autoSavedRef.current === checkKey) return;
    /* Marked before either branch: a declined batch must not re-prompt for
       the same check either. */
    autoSavedRef.current = checkKey;
    const action = autoSaveActionFor({
      autoSave: autoSaveMistakes,
      askFirst: askBeforeSaving,
      issueCount: state.grammarIssues.length,
    });
    if (action === 'confirmAll') {
      setPendingAutoSave(state.grammarIssues);
      return;
    }
    if (action === 'saveAll') {
      for (const issue of state.grammarIssues) saveIssue(issue);
    }
  }, [autoSaveMistakes, askBeforeSaving, state.grammarIssues, saveIssue]);

  const hasTask = state.task !== null;
  const busy = state.isGenerating;

  const remainingFor = (type: AssistanceModalType): number => {
    const limit = type === 'translate'
      ? TRANSLATION_LIMIT[state.selectedDifficulty]
      : SYNONYM_LIMIT[state.selectedDifficulty];
    const used = type === 'translate' ? state.usedTranslations : state.usedSynonyms;
    return Math.max(limit - used, 0);
  };

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

      {/* Editor + action row (hint + reset) + hints list + check + feedback */}
      {state.task && (
        <>
          <EssayEditor
            task={state.task}
            text={state.essayText}
            wordCount={state.wordCount}
            validation={state.validation}
            onChange={(text) => dispatch({ type: 'SET_ESSAY_TEXT', text })}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <EssayHintButton
              difficulty={state.selectedDifficulty}
              hintsUsedCount={state.hintsUsedCount}
              isRequestingHint={state.isRequestingHint}
              onRequest={() => void requestHint()}
            />
            <button
              type="button"
              onClick={() => dispatch({ type: 'RESET_ESSAY' })}
              disabled={state.wordCount === 0}
              className="h-11 rounded-2xl border border-(--color-auth-field-border) bg-white px-4 text-[14px] font-semibold text-(--color-cs-text-muted) transition-transform hover:-translate-y-0.5 disabled:opacity-60 focus-visible:outline-none md:h-12 md:px-5 md:text-[15px]"
            >
              {t('writing.essays.editor.reset')}
            </button>
          </div>

          {state.hintError && (
            <p role="alert" className="text-[13px] font-semibold text-(--color-cs-red)">
              {state.hintError}
            </p>
          )}

          <EssayHintsList hints={state.hints} />

          {/* Helper toolbar — translate + synonym */}
          <EssayHelperToolbar
            difficulty={state.selectedDifficulty}
            usedTranslations={state.usedTranslations}
            usedSynonyms={state.usedSynonyms}
            onTranslate={() => setAssistModal('translate')}
            onSynonym={() => setAssistModal('synonym')}
          />

          <EssayCheckButton
            validationValid={state.validation === 'valid'}
            isChecking={state.isChecking}
            languageUnsupported={!supportsGrammarCheck(state.selectedLanguage.id)}
            languageName={state.selectedLanguage.title}
            onCheck={() => void checkEssay()}
            errorMessage={state.checkError}
          />

          {state.score && (
            <EssayFeedbackSection
              score={state.score}
              issues={state.grammarIssues}
              wordCount={state.wordCount}
              usedHints={state.hintsUsedCount}
              usedTranslations={state.usedTranslations}
              usedSynonyms={state.usedSynonyms}
              saveStateFor={(issue) => saveMistake.stateFor(issue.id)}
              onSaveIssue={handleSaveIssue}
            />
          )}
        </>
      )}

      {pendingAutoSave && (
        <ConfirmDialog
          title={t('writing.essays.autoSaveConfirmTitle')}
          body={t('writing.essays.autoSaveConfirmBody', { count: pendingAutoSave.length })}
          confirmLabel={t('writing.essays.grammar.save.idle')}
          onConfirm={() => {
            for (const issue of pendingAutoSave) saveIssue(issue);
            setPendingAutoSave(null);
          }}
          onCancel={() => setPendingAutoSave(null)}
        />
      )}

      {pendingIssue && (
        <ConfirmDialog
          title={t('writing.essays.saveMistakeConfirmTitle')}
          body={t('writing.essays.saveMistakeConfirmBody', {
            correction: pendingIssue.suggestedCorrection ?? pendingIssue.incorrectText,
          })}
          confirmLabel={t('writing.essays.grammar.save.idle')}
          onConfirm={() => {
            saveIssue(pendingIssue);
            setPendingIssue(null);
          }}
          onCancel={() => setPendingIssue(null)}
        />
      )}

      {/* Assistance modal (translate / synonym) */}
      <EssayAssistanceModal
        open={assistModal !== null}
        type={assistModal ?? 'translate'}
        targetLanguage={state.selectedLanguage}
        remaining={remainingFor(assistModal ?? 'translate')}
        onRecord={() =>
          dispatch({ type: assistModal === 'synonym' ? 'RECORD_SYNONYM' : 'RECORD_TRANSLATION' })
        }
        onClose={() => setAssistModal(null)}
      />
    </div>
  );
};
