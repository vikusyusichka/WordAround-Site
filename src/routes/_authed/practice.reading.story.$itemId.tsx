/* Story session — /practice/reading/story/$itemId. Per chapter: read →
   optional questions (≤6, mainIdea focus) → chapter score → choices → next
   chapter generation. Short stories end after chapter 1; infinite stories
   end via the End Story button. Web port of StorySessionView. */
import { useMemo, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ContentContainer } from '@/components/shell/ContentContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { ReadingQuestionSection } from '@/components/reading/ReadingQuestionSection';
import { GrammarNotesEmptyState } from '@/components/grammar/GrammarNotesEmptyState';
import { useReadingItemsQuery, useSaveReadingItem } from '@/hooks/useReadingItems';
import { useUid } from '@/hooks/useFolders';
import { generateReadingQuestions, type ReadingQuestion } from '@/lib/readingQuestionService';
import { readingParagraphs } from '@/lib/readingTextAnalyzer';
import { scoreReadingSession } from '@/lib/readingScoring';
import {
  generateChapter,
  storyItemFromSession,
  storyProgress,
  storySessionFromItem,
  type StoryChapter,
} from '@/lib/storyMode';
import type { ReadingLibraryItem } from '@/lib/models';

export const Route = createFileRoute('/_authed/practice/reading/story/$itemId')({
  component: StorySessionScreen,
});

type ChapterPhase = 'reading' | 'questions' | 'choices';

function StorySessionScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const uid = useUid();
  const { itemId } = Route.useParams();
  const { data: items, isLoading } = useReadingItemsQuery('story-mode');
  const item = items?.find((i) => i.id === itemId);

  if (isLoading) {
    return (
      <ContentContainer fluid>
        <p className="py-16 text-center text-[15px] font-medium text-(--color-text-secondary)">
          {t('reading.loading')}
        </p>
      </ContentContainer>
    );
  }
  if (!item || !uid) {
    return (
      <ContentContainer fluid>
        <p role="alert" className="py-16 text-center text-[15px] font-medium text-(--color-cs-red)">
          {t('reading.notFound')}
        </p>
      </ContentContainer>
    );
  }
  return <StorySession key={item.id} itemSnapshot={item} uid={uid} onExit={() => void navigate({ to: '/practice/reading/story' })} />;
}

function StorySession({
  itemSnapshot,
  uid,
  onExit,
}: {
  itemSnapshot: ReadingLibraryItem;
  uid: string;
  onExit: () => void;
}) {
  const { t } = useTranslation();
  const saveItem = useSaveReadingItem();
  const initial = useMemo(() => storySessionFromItem(itemSnapshot), [itemSnapshot]);

  const [chapters, setChapters] = useState<StoryChapter[]>(initial.chapters);
  const [phase, setPhase] = useState<ChapterPhase>('reading');
  const [questions, setQuestions] = useState<ReadingQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isGeneratingNext, setIsGeneratingNext] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [storyEnded, setStoryEnded] = useState(false);

  const config = initial.config;
  const chapter = chapters[chapters.length - 1];
  const progress = storyProgress(chapters, config.storyLength, storyEnded);

  const persist = (nextChapters: StoryChapter[], ended = storyEnded) => {
    const updated = storyItemFromSession({
      existingItem: itemSnapshot,
      ownerUID: uid,
      config,
      chapters: nextChapters,
      endedByUser: ended,
    });
    saveItem.mutate(updated);
  };

  const startQuestions = () => {
    const generated = generateReadingQuestions({
      content: chapter.text,
      title: t('reading.story.chapterN', { n: chapter.chapterIndex }),
      preview: chapter.text.slice(0, 160),
      focus: 'mainIdea',
      enabledTypes: [],
      maxQuestions: 6,
    });
    if (generated.length === 0) {
      completeChapter(undefined);
      return;
    }
    setQuestions(generated);
    setQuestionIndex(0);
    setAnswers({});
    setPhase('questions');
  };

  const completeChapter = (scorePercent: number | undefined) => {
    const updatedChapters = chapters.map((c, i) =>
      i === chapters.length - 1 ? { ...c, isCompleted: true, scorePercent } : c,
    );
    setChapters(updatedChapters);
    setPhase('choices');
    persist(updatedChapters);
  };

  const finishQuestions = () => {
    const result = scoreReadingSession({
      questions,
      answers,
      wordCount: 0,
      readingTimeSeconds: 0,
    });
    completeChapter(result.comprehensionPercent);
  };

  const chooseNext = async (choiceLabel: string) => {
    if (isGeneratingNext) return;
    setIsGeneratingNext(true);
    setGenError(null);
    const withChoice = chapters.map((c, i) =>
      i === chapters.length - 1 ? { ...c, madeChoiceLabel: choiceLabel } : c,
    );
    try {
      const next = await generateChapter(config, withChoice, choiceLabel);
      const nextChapters = [...withChoice, next];
      setChapters(nextChapters);
      setPhase('reading');
      persist(nextChapters);
    } catch {
      setGenError(t('reading.story.generateError'));
      setChapters(withChoice);
    } finally {
      setIsGeneratingNext(false);
    }
  };

  const endStory = () => {
    setStoryEnded(true);
    persist(chapters, true);
  };

  const question = questions[questionIndex];
  const selectedAnswer = question ? answers[question.id] : undefined;
  const isLastQuestion = questionIndex >= questions.length - 1;
  const isComplete = progress.isStoryComplete || storyEnded;

  return (
    <ContentContainer fluid>
      <PageHeader
        title={itemSnapshot.title}
        subtitle={
          progress.totalChaptersTarget > 0
            ? t('reading.story.chapterOf', {
                current: chapter?.chapterIndex ?? 1,
                total: progress.totalChaptersTarget,
              })
            : t('reading.story.chapterN', { n: chapter?.chapterIndex ?? 1 })
        }
      />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
        <button
          type="button"
          onClick={onExit}
          className="w-fit text-[13px] font-semibold text-(--color-primary-blue) hover:underline focus-visible:outline-none"
        >
          ← {t('reading.story.title')}
        </button>

        {!chapter && (
          <GrammarNotesEmptyState title={t('reading.notFound')} body="" />
        )}

        {/* Progress bar */}
        {chapter && (
          <div className="h-[5px] w-full overflow-hidden rounded-full bg-(--color-goal-bg)">
            <div
              className="h-full rounded-full bg-[#ED6699] transition-[width]"
              style={{ width: `${Math.max(progress.overallProgress * 100, 4)}%` }}
            />
          </div>
        )}

        {chapter && isComplete && (
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-white bg-white/95 p-6 shadow-[0_4px_10px_rgba(0,0,0,0.045)]">
            <span className="text-[22px] font-extrabold text-(--color-primary-blue-dark)">
              {t('reading.story.completeTitle')}
            </span>
            <p className="text-center text-[14px] font-medium text-(--color-text-secondary)">
              {t('reading.story.completeBody', { count: progress.completedChapters })}
            </p>
            <button
              type="button"
              onClick={onExit}
              className="h-11 rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) px-6 text-[14px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)]"
            >
              {t('reading.story.backToStories')}
            </button>
          </div>
        )}

        {chapter && !isComplete && phase === 'reading' && (
          <>
            <div className="flex flex-col gap-2 rounded-3xl border border-white bg-white/95 p-5 shadow-[0_4px_10px_rgba(0,0,0,0.045)] md:p-6">
              <span className="w-fit rounded-full bg-[#ED6699]/12 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#ED6699]">
                {t('reading.story.chapterN', { n: chapter.chapterIndex })}
              </span>
              {readingParagraphs(chapter.text).map((paragraph, i) => (
                <p key={i} className="text-[16px] font-medium leading-relaxed text-(--color-primary-blue-dark)">
                  {paragraph}
                </p>
              ))}
            </div>
            <button
              type="button"
              onClick={startQuestions}
              className="h-12 w-full rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98]"
            >
              {t('reading.session.startQuestions')}
            </button>
          </>
        )}

        {chapter && !isComplete && phase === 'questions' && question && (
          <>
            <ReadingQuestionSection
              question={question}
              index={questionIndex}
              total={questions.length}
              selectedAnswer={selectedAnswer}
              showHints={false}
              onSelect={(answer) => setAnswers((prev) => ({ ...prev, [question.id]: answer }))}
            />
            <button
              type="button"
              disabled={selectedAnswer === undefined}
              onClick={() =>
                isLastQuestion ? finishQuestions() : setQuestionIndex((i) => i + 1)
              }
              className="h-12 w-full rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) text-[15px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)] transition-transform hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
            >
              {isLastQuestion ? t('reading.session.finish') : t('reading.session.next')}
            </button>
          </>
        )}

        {chapter && !isComplete && phase === 'choices' && (
          <div className="flex flex-col gap-3">
            {chapter.scorePercent !== undefined && (
              <div className="flex items-center justify-between rounded-2xl border border-white bg-white/95 px-4 py-3 shadow-[0_4px_10px_rgba(0,0,0,0.045)]">
                <span className="text-[14px] font-semibold text-(--color-text-secondary)">
                  {t('reading.story.chapterScore')}
                </span>
                <span className="text-[18px] font-extrabold text-(--color-primary-blue-dark)">
                  {Math.round(chapter.scorePercent)}%
                </span>
              </div>
            )}

            {chapter.choices.length > 0 ? (
              <>
                <h3 className="text-[16px] font-bold text-(--color-primary-blue-dark)">
                  {t('reading.story.whatNext')}
                </h3>
                {chapter.choices.map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    disabled={isGeneratingNext}
                    onClick={() => void chooseNext(choice.label)}
                    className="flex items-center justify-between rounded-2xl border border-(--color-auth-field-border) bg-white px-4 py-3 text-left text-[15px] font-semibold text-(--color-primary-blue-dark) transition-colors hover:border-[#ED6699]/40 disabled:opacity-60"
                  >
                    {choice.label}
                    <span className="text-[#ED6699]">→</span>
                  </button>
                ))}
                {isGeneratingNext && (
                  <p className="text-center text-[14px] font-medium text-(--color-text-secondary)">
                    {t('reading.story.generatingNext')}
                  </p>
                )}
                {genError && (
                  <p role="alert" className="text-[14px] font-semibold text-(--color-cs-red)">
                    {genError}
                  </p>
                )}
                {config.storyLength === 'infinite' && (
                  <button
                    type="button"
                    onClick={endStory}
                    className="h-11 w-full rounded-2xl border border-(--color-auth-field-border) bg-white text-[14px] font-semibold text-(--color-cs-text-muted) transition-colors hover:bg-black/[0.03]"
                  >
                    {t('reading.story.endStory')}
                  </button>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-3xl border border-white bg-white/95 p-6 shadow-[0_4px_10px_rgba(0,0,0,0.045)]">
                <span className="text-[22px] font-extrabold text-(--color-primary-blue-dark)">
                  {t('reading.story.completeTitle')}
                </span>
                <button
                  type="button"
                  onClick={onExit}
                  className="h-11 rounded-2xl bg-linear-to-r from-(--color-auth-grad-from) to-(--color-auth-grad-to) px-6 text-[14px] font-semibold text-white shadow-[0_8px_14px_rgba(43,92,250,0.22)]"
                >
                  {t('reading.story.backToStories')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </ContentContainer>
  );
}
