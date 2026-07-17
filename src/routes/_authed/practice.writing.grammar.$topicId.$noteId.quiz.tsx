/* Quiz screen for one note — /practice/writing/grammar/$topicId/$noteId/quiz.
   iOS-style screen machine (GrammarNoteQuizListView.Screen): list → taking →
   result. Quiz creation happens in CreateQuizSheet; play state lives in the
   pure quizSessionReducer. */
import { useReducer, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { CreateQuizSheet } from '@/components/grammar/CreateQuizSheet';
import { QuizCard } from '@/components/grammar/QuizCard';
import { QuizQuestionView } from '@/components/grammar/QuizQuestionView';
import { QuizResultView } from '@/components/grammar/QuizResultView';
import { GrammarNotesEmptyState } from '@/components/grammar/GrammarNotesEmptyState';
import { useGrammarNotesQuery } from '@/hooks/useGrammarNotes';
import { useCreateQuiz, useDeleteQuiz, useGrammarQuizzesQuery } from '@/hooks/useGrammarQuizzes';
import { useUid } from '@/hooks/useFolders';
import {
  answeredQuestions,
  correctCount,
  currentQuestion,
  initialQuizSessionState,
  isLastQuestion,
  LOW_SCORE_REVIEW_THRESHOLD,
  quizSessionReducer,
  scorePercentage,
} from '@/lib/grammarQuizSession';
import { makeReviewItem, reviewItemIdForQuiz } from '@/lib/grammarReview';
import { upsertReviewItem } from '@/lib/grammarReviewService';
import type { GrammarNoteQuiz, GrammarQuizQuestion } from '@/lib/models';

export const Route = createFileRoute(
  '/_authed/practice/writing/grammar/$topicId/$noteId/quiz',
)({
  component: QuizRoute,
});

type Screen = 'list' | 'taking' | 'result';

function QuizRoute() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const uid = useUid();
  const { topicId, noteId } = Route.useParams();
  const { data: notes, isLoading: notesLoading } = useGrammarNotesQuery(topicId);
  const { data: quizzes, isLoading, isError } = useGrammarQuizzesQuery(topicId, noteId);
  const createQuiz = useCreateQuiz();
  const deleteQuiz = useDeleteQuiz();

  const [screen, setScreen] = useState<Screen>('list');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [session, dispatch] = useReducer(quizSessionReducer, initialQuizSessionState);

  const note = notes?.find((n) => n.id === noteId);

  const goToEditor = () =>
    void navigate({
      to: '/practice/writing/grammar/$topicId/$noteId',
      params: { topicId, noteId },
    });

  if (notesLoading) {
    return (
      <ContentContainer fluid>
        <p className="py-16 text-center text-[15px] font-medium text-(--color-text-secondary)">
          {t('writing.grammar.loading')}
        </p>
      </ContentContainer>
    );
  }

  if (!note) {
    return (
      <ContentContainer fluid>
        <p role="alert" className="py-16 text-center text-[15px] font-medium text-(--color-cs-red)">
          {t('writing.grammar.notFoundBody')}
        </p>
      </ContentContainer>
    );
  }

  const handleSaveQuiz = (title: string, questions: GrammarQuizQuestion[]) => {
    const now = Date.now();
    const quiz: GrammarNoteQuiz = {
      id: crypto.randomUUID(),
      ownerUID: uid as string,
      topicId,
      noteId,
      title,
      sourceNoteTitle: note.title,
      questions,
      createdAt: now,
      updatedAt: now,
    };
    createQuiz.mutate(quiz, { onSuccess: () => setSheetOpen(false) });
  };

  const handleStart = (quiz: GrammarNoteQuiz) => {
    dispatch({ type: 'START', quiz });
    setScreen('taking');
  };

  const handleAdvance = () => {
    if (isLastQuestion(session)) {
      dispatch({ type: 'FINISH' });
      setScreen('result');
      /* iOS: a low score queues the note for spaced review (4D3), high
         priority, due in one hour. Fire-and-forget. */
      const quiz = session.quiz;
      if (quiz && scorePercentage(session) < LOW_SCORE_REVIEW_THRESHOLD) {
        void upsertReviewItem(
          makeReviewItem({
            id: reviewItemIdForQuiz(topicId, noteId, quiz.id),
            ownerUID: uid as string,
            sourceType: 'quiz',
            topicId,
            noteId,
            quizId: quiz.id,
            title: quiz.title,
            previewText: note.previewText,
            priority: 'high',
            dueAt: Date.now() + 60 * 60 * 1000,
          }),
        ).catch(() => {});
      }
    } else {
      dispatch({ type: 'NEXT' });
    }
  };

  const handleDelete = (quiz: GrammarNoteQuiz) => {
    if (window.confirm(t('writing.grammar.quiz.deleteConfirm', { title: quiz.title }))) {
      deleteQuiz.mutate({ topicId, noteId, id: quiz.id });
    }
  };

  const question = currentQuestion(session);
  const total = session.quiz?.questions.length ?? 0;

  return (
    <ContentContainer fluid>
      <PageHeader
        title={note.title}
        subtitle={t('writing.grammar.quiz.title')}
        actions={
          screen === 'list' ? (
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="h-11 rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) px-5 text-[14px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98] md:text-[15px]"
            >
              {t('writing.grammar.quiz.new')}
            </button>
          ) : undefined
        }
      />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
        <button
          type="button"
          onClick={() => {
            if (screen === 'list') {
              goToEditor();
            } else {
              setScreen('list');
            }
          }}
          className="w-fit text-[13px] font-semibold text-(--color-primary-blue) hover:underline focus-visible:outline-none"
        >
          ← {screen === 'list' ? note.title : t('writing.grammar.quiz.title')}
        </button>

        {screen === 'list' && (
          <>
            {isLoading && (
              <p className="py-10 text-center text-[15px] font-medium text-(--color-text-secondary)">
                {t('writing.grammar.loading')}
              </p>
            )}
            {isError && (
              <p role="alert" className="py-10 text-center text-[15px] font-medium text-(--color-cs-red)">
                {t('writing.grammar.quiz.loadError')}
              </p>
            )}
            {quizzes && quizzes.length === 0 && (
              <GrammarNotesEmptyState
                title={t('writing.grammar.quiz.emptyTitle')}
                body={t('writing.grammar.quiz.emptyBody')}
              />
            )}
            {quizzes && quizzes.length > 0 && (
              <div className="flex flex-col gap-3">
                {quizzes.map((quiz) => (
                  <QuizCard
                    key={quiz.id}
                    quiz={quiz}
                    onStart={() => handleStart(quiz)}
                    onDelete={() => handleDelete(quiz)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {screen === 'taking' && session.quiz && question && (
          <>
            {/* Progress */}
            <div className="flex flex-col gap-1.5">
              <p className="text-[13px] font-semibold text-(--color-text-secondary)">
                {t('writing.grammar.quiz.play.questionOf', {
                  current: session.currentIndex + 1,
                  total,
                })}
              </p>
              <div className="h-[5px] w-full overflow-hidden rounded-full bg-(--color-goal-bg)">
                <div
                  className="h-full rounded-full bg-(--color-primary-blue) transition-[width]"
                  style={{ width: `${((session.currentIndex + 1) / Math.max(total, 1)) * 100}%` }}
                />
              </div>
            </div>

            <QuizQuestionView
              key={question.id}
              question={question}
              isLast={isLastQuestion(session)}
              onSubmit={(answer) => dispatch({ type: 'SUBMIT_ANSWER', answer })}
              onAdvance={handleAdvance}
            />
          </>
        )}

        {screen === 'result' && session.quiz && (
          <QuizResultView
            score={scorePercentage(session)}
            correct={correctCount(session)}
            total={total}
            answered={answeredQuestions(session)}
            onTryAgain={() => {
              dispatch({ type: 'RESET' });
              setScreen('taking');
            }}
            onReviewNote={goToEditor}
            onDone={() => setScreen('list')}
          />
        )}
      </div>

      <CreateQuizSheet
        open={sheetOpen}
        note={note}
        isSaving={createQuiz.isPending}
        onSave={handleSaveQuiz}
        onClose={() => setSheetOpen(false)}
      />
    </ContentContainer>
  );
}
