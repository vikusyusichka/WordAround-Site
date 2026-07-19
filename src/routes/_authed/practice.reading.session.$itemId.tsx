/* Shared reading session — /practice/reading/session/$itemId. Serves any
   readingItems modeID (my-texts, reading-from-sets, …). Web port of
   ReadingSessionView: tappable text (word tap → highlight + translation) →
   questions (one at a time, A–F options) → result. "Read again" remounts the
   inner session via a generation key (iOS .id(generation) pattern). */
import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { ReadingQuestionSection } from '@/components/reading/ReadingQuestionSection';
import { ReadingResultView } from '@/components/reading/ReadingResultView';
import { ReadingTappableText } from '@/components/reading/ReadingTappableText';
import { ReadingTranslationCard } from '@/components/reading/ReadingTranslationCard';
import { useReadingItemsQuery } from '@/hooks/useReadingItems';
import { useReadingSession } from '@/hooks/useReadingSession';
import { vocabularyTermsFor } from '@/lib/readingFromSets';
import {
  currentReadingQuestion,
  isLastReadingQuestion,
  selectedAnswerFor,
} from '@/lib/readingSession';
import type { ReadingLibraryItem } from '@/lib/models';

export const Route = createFileRoute('/_authed/practice/reading/session/$itemId')({
  component: ReadingItemScreen,
});

function ReadingItemScreen() {
  const { t } = useTranslation();
  const { itemId } = Route.useParams();
  const { data: items, isLoading } = useReadingItemsQuery();
  const item = items?.find((i) => i.id === itemId);
  const [generation, setGeneration] = useState(0);

  if (isLoading) {
    return (
      <ContentContainer fluid>
        <p className="py-16 text-center text-[15px] font-medium text-(--color-text-secondary)">
          {t('reading.loading')}
        </p>
      </ContentContainer>
    );
  }

  if (!item) {
    return (
      <ContentContainer fluid>
        <p role="alert" className="py-16 text-center text-[15px] font-medium text-(--color-cs-red)">
          {t('reading.notFound')}
        </p>
      </ContentContainer>
    );
  }

  return (
    <ReadingSessionScreen
      key={`${item.id}-${generation}`}
      item={item}
      onReadAgain={() => setGeneration((g) => g + 1)}
    />
  );
}

interface ReadingSessionScreenProps {
  item: ReadingLibraryItem;
  onReadAgain: () => void;
}

function ReadingSessionScreen({ item, onReadAgain }: ReadingSessionScreenProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    state,
    dispatch,
    assistance,
    targetLanguageId,
    translation,
    isTranslating,
    translationError,
    handleWordTap,
    selectTarget,
    finishSession,
  } = useReadingSession(item);

  const isFromSets = item.modeID === 'reading-from-sets';
  const libraryTitle = isFromSets ? t('reading.fromSets.title') : t('reading.myTexts.title');
  const goBack = () =>
    void navigate({
      to: isFromSets ? '/practice/reading/from-sets' : '/practice/reading/my-texts',
    });
  const vocabularyTerms = vocabularyTermsFor(item);

  const question = currentReadingQuestion(state);
  const selectedAnswer = selectedAnswerFor(state);
  const minutes = Math.floor(state.elapsedSeconds / 60);
  const seconds = state.elapsedSeconds % 60;

  return (
    <ContentContainer fluid>
      <PageHeader
        title={item.title}
        subtitle={libraryTitle}
        actions={
          assistance.readingTimer && state.phase !== 'completed' ? (
            <span className="rounded-2xl bg-(--color-goal-bg) px-4 py-2 text-[14px] font-bold tabular-nums text-(--color-primary-blue-dark)">
              {minutes}:{String(seconds).padStart(2, '0')}
            </span>
          ) : undefined
        }
      />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
        <button
          type="button"
          onClick={goBack}
          className="w-fit text-[13px] font-semibold text-(--color-primary-blue) hover:underline focus-visible:outline-none"
        >
          ← {libraryTitle}
        </button>

        {state.phase === 'reading' && (
          <>
            <div className="rounded-3xl border border-white bg-white/95 p-5 shadow-[0_4px_10px_rgba(0,0,0,0.045)] md:p-6">
              <ReadingTappableText
                text={item.fullText}
                selectedWord={state.selectedWord}
                highlightUnknownWords={assistance.highlightUnknownWords}
                vocabularyTerms={vocabularyTerms}
                onWordTap={handleWordTap}
              />
            </div>

            {assistance.translationOnTap && state.selectedWord && (
              <ReadingTranslationCard
                word={state.selectedWord}
                textLanguageId={item.languageCode}
                targetLanguageId={targetLanguageId}
                translation={translation}
                isTranslating={isTranslating}
                hasError={translationError}
                onSelectTarget={selectTarget}
                onClose={() => dispatch({ type: 'CLEAR_WORD' })}
              />
            )}

            <button
              type="button"
              onClick={() =>
                state.questions.length > 0
                  ? dispatch({ type: 'START_QUESTIONS' })
                  : finishSession()
              }
              className="h-12 w-full rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98]"
            >
              {state.questions.length > 0
                ? t('reading.session.startQuestions')
                : t('reading.session.finish')}
            </button>
          </>
        )}

        {state.phase === 'questions' && question && (
          <>
            <ReadingQuestionSection
              question={question}
              index={state.currentQuestionIndex}
              total={state.questions.length}
              selectedAnswer={selectedAnswer}
              showHints={assistance.vocabularyHints}
              onSelect={(answer) => dispatch({ type: 'SELECT_ANSWER', answer })}
            />
            <button
              type="button"
              disabled={selectedAnswer === undefined}
              onClick={() =>
                isLastReadingQuestion(state)
                  ? finishSession()
                  : dispatch({ type: 'NEXT_QUESTION' })
              }
              className="h-12 w-full rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
            >
              {isLastReadingQuestion(state)
                ? t('reading.session.finish')
                : t('reading.session.next')}
            </button>
          </>
        )}

        {state.phase === 'completed' && state.result && (
          <ReadingResultView result={state.result} onReadAgain={onReadAgain} onBack={goBack} />
        )}
      </div>
    </ContentContainer>
  );
}
