/* Body of /practice/writing/essays — laid out like iOS EssayPracticeView:
   topic-mode picker → task card (with refresh) or custom-topic input →
   "Writing setup" card (language + difficulty) → "Your essay" card
   (helper tiles, hints, editor, Reset + Check) → feedback. All state lives
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
import { EssayTopicCard, EssayTopicCardSkeleton } from './EssayTopicCard';
import { EssayTopicModePicker } from './EssayTopicModePicker';
import { autoSaveActionFor } from '@/lib/essaySession';
import { useEssaySession } from '@/hooks/useEssaySession';
import { Icon } from '@/components/primitives/Icon';
import { useSaveMistake } from '@/hooks/useSaveMistake';
import { ConfirmDialog } from '@/components/shell/ConfirmDialog';
import { useGrammarSettings } from '@/stores/grammarSettingsStore';
import {
  HINTS_LIMIT,
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

  const busy = state.isGenerating;
  const hintsLeft = Math.max(HINTS_LIMIT[state.selectedDifficulty] - state.hintsUsedCount, 0);

  /* iOS generates a suggested task as soon as the screen opens
     (EssayPracticeView .task), so the page starts with a topic card rather
     than an empty generate button. Mount-only on purpose; StrictMode's
     remount aborts the first request and this effect starts a fresh one. */
  useEffect(() => {
    if (state.topicMode === 'suggested' && !state.task) void generateTopic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remainingFor = (type: AssistanceModalType): number => {
    const limit = type === 'translate'
      ? TRANSLATION_LIMIT[state.selectedDifficulty]
      : SYNONYM_LIMIT[state.selectedDifficulty];
    const used = type === 'translate' ? state.usedTranslations : state.usedSynonyms;
    return Math.max(limit - used, 0);
  };

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4 md:gap-[22px]">
      {/* Topic — mode picker, then the task card (suggested) or the
          "Your topic" input + generate button (custom). iOS topicSection. */}
      <div className="flex flex-col gap-2.5 md:gap-3.5">
        <EssayTopicModePicker
          value={state.topicMode}
          onChange={(mode) => dispatch({ type: 'SET_TOPIC_MODE', mode })}
        />

        {state.topicMode === 'custom' && (
          <EssayCustomTopicInput
            value={state.customTopicText}
            onChange={(text) => dispatch({ type: 'SET_CUSTOM_TOPIC', text })}
            onGenerate={() => void generateTopic()}
            isGenerating={busy}
          />
        )}

        {state.task ? (
          <EssayTopicCard
            task={state.task}
            onRefresh={() => void generateTopic()}
            isRefreshing={busy}
            errorMessage={state.generationError}
          />
        ) : state.topicMode === 'suggested' ? (
          busy ? (
            <EssayTopicCardSkeleton />
          ) : (
            <div className="flex flex-col items-start gap-3 rounded-3xl bg-(--color-surface)/72 p-[18px] md:p-[22px]">
              {state.generationError && (
                <p role="alert" className="text-[13px] font-semibold text-(--color-text-secondary)">
                  {state.generationError}
                </p>
              )}
              <button
                type="button"
                onClick={() => void generateTopic()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-(--color-primary-blue-solid) py-[13px] text-[14px] font-bold text-white transition-[filter] hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-(--color-home-brand) md:py-3.5 md:text-[15px]"
              >
                <Icon name="sparkles" className="size-[14px]" />
                {t('writing.essays.suggested.generate')}
              </button>
            </div>
          )
        ) : (
          state.generationError && (
            <p
              role="alert"
              className="rounded-3xl bg-(--color-surface)/72 p-[18px] text-[12px] font-semibold text-(--color-text-secondary) md:p-[22px] md:text-[13px]"
            >
              {state.generationError}
            </p>
          )
        )}
      </div>

      {/* Writing setup — iOS configurationSection. */}
      <section className="flex flex-col gap-2.5 rounded-3xl bg-(--color-surface)/58 p-[18px] shadow-[0_8px_14px_rgba(0,0,0,0.035)] md:gap-3 md:p-[22px]">
        <div className="flex items-center gap-2">
          <Icon
            name="wand.and.stars.inverse"
            className="size-[13px] text-(--color-primary-blue) md:size-[15px]"
          />
          <h2 className="text-[15px] font-bold text-(--color-primary-blue-dark) md:text-[16px]">
            {t('writing.essays.setup.title')}
          </h2>
          <span className="ml-auto rounded-full bg-(--color-primary-blue)/8 px-2.5 py-1.5 text-[11px] font-bold leading-none text-(--color-primary-blue) md:text-[12px]">
            {t('writing.essays.setup.hintsLeft', { n: hintsLeft })}
          </span>
        </div>

        <div className="grid items-start gap-2.5 md:grid-cols-2 md:gap-3">
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

        <p className="pt-0.5 text-[11px] font-medium leading-normal text-(--color-text-secondary) md:text-[12px]">
          {t('writing.essays.setup.privacy')}
        </p>
      </section>

      {/* Your essay — toolbar, hints, editor, Reset + Check. iOS
          EssayInputSectionView. Then feedback. */}
      {state.task && (
        <>
          <EssayEditor
            task={state.task}
            text={state.essayText}
            wordCount={state.wordCount}
            validation={state.validation}
            onChange={(text) => dispatch({ type: 'SET_ESSAY_TEXT', text })}
            footer={
              <EssayCheckButton
                validationValid={state.validation === 'valid'}
                isChecking={state.isChecking}
                languageUnsupported={!supportsGrammarCheck(state.selectedLanguage.id)}
                languageName={state.selectedLanguage.title}
                onCheck={() => void checkEssay()}
                errorMessage={state.checkError}
                onReset={() => dispatch({ type: 'RESET_ESSAY' })}
                resetDisabled={state.wordCount === 0}
              />
            }
          >
            <EssayHelperToolbar
              difficulty={state.selectedDifficulty}
              usedTranslations={state.usedTranslations}
              usedSynonyms={state.usedSynonyms}
              onTranslate={() => setAssistModal('translate')}
              onSynonym={() => setAssistModal('synonym')}
            >
              <EssayHintButton
                difficulty={state.selectedDifficulty}
                hintsUsedCount={state.hintsUsedCount}
                isRequestingHint={state.isRequestingHint}
                onRequest={() => void requestHint()}
              />
            </EssayHelperToolbar>

            {state.hintError && (
              <p role="alert" className="text-[13px] font-semibold text-(--color-cs-red)">
                {state.hintError}
              </p>
            )}

            <EssayHintsList hints={state.hints} />
          </EssayEditor>

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
