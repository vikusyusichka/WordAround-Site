/* A reading or listening task: the text (or the recording, played no more
   often than the exam allows), then the questions. In review mode every
   question shows whether it was right, the correct answer and why, and a
   listening task reveals its script. */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/primitives/Icon';
import { playScript, stopScript } from '@/lib/exams/examAudio';
import type { GeneratedObjectiveTask, ObjectiveQuestion } from '@/lib/exams/generation';
import { isAnswerCorrect, type ObjectiveAnswers } from '@/lib/exams/marking';

import { BODY_TEXT, CARD, FIELD, SECONDARY_BUTTON, SECTION_TITLE } from './ui';

interface ObjectiveTaskViewProps {
  generated: GeneratedObjectiveTask;
  languageId: string;
  /** Listening: how many times the recording may play. */
  maxPlays?: number;
  answers: ObjectiveAnswers;
  onAnswer: (questionId: string, answer: number | string) => void;
  review?: boolean;
  /** Plays already used, when the caller keeps count (the mock exam does, so
      switching tasks cannot reset it). */
  playsUsed?: number;
  onPlay?: () => void;
}

export const ObjectiveTaskView = ({
  generated,
  languageId,
  maxPlays,
  answers,
  onAnswer,
  review,
  playsUsed,
  onPlay,
}: ObjectiveTaskViewProps) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      <section className={`${CARD} flex flex-col gap-4`}>
        <h2 className={SECTION_TITLE}>{generated.title}</h2>
        <p className="text-[14px] font-semibold text-(--color-muted-text)">{generated.instructions}</p>
        {generated.script && (
          <ListeningPlayer
            script={generated.script}
            languageId={languageId}
            maxPlays={review ? undefined : maxPlays}
            playsUsed={playsUsed}
            onPlay={onPlay}
          />
        )}
        {generated.passage && (
          <div className={`${BODY_TEXT} max-h-[60vh] overflow-y-auto whitespace-pre-line pr-1 lg:max-h-none`}>
            {generated.passage}
          </div>
        )}
        {review && generated.script && (
          <details className="rounded-2xl bg-(--color-hover-wash) p-4">
            <summary className="cursor-pointer text-[14px] font-bold text-(--color-primary-blue-dark)">
              {t('exams.task.showScript')}
            </summary>
            <div className="mt-3 flex flex-col gap-2">
              {generated.script.map((line, i) => (
                <p key={i} className={BODY_TEXT}>
                  <span className="font-bold text-(--color-primary-blue-dark)">{line.speaker}: </span>
                  {line.text}
                </p>
              ))}
            </div>
          </details>
        )}
      </section>

      <ol className="flex flex-col gap-3">
        {generated.questions.map((question, index) => (
          <QuestionCard
            key={question.id}
            number={index + 1}
            question={question}
            answer={answers[question.id]}
            onAnswer={(answer) => onAnswer(question.id, answer)}
            review={review}
          />
        ))}
      </ol>
    </div>
  );
};

const QuestionCard = ({
  number,
  question,
  answer,
  onAnswer,
  review,
}: {
  number: number;
  question: ObjectiveQuestion;
  answer: number | string | undefined;
  onAnswer: (answer: number | string) => void;
  review?: boolean;
}) => {
  const { t } = useTranslation();
  const correct = review ? isAnswerCorrect(question, answer) : undefined;
  return (
    <li
      className={`${CARD} flex flex-col gap-3`}
      style={
        review ? { borderColor: correct ? 'var(--color-green-accent)' : 'var(--color-profile-danger)' } : undefined
      }
    >
      <div className="flex items-start gap-2">
        <span className="text-[14px] font-bold text-(--color-muted-text)">{number}.</span>
        <p className="flex-1 text-[15px] font-semibold text-(--color-primary-blue-dark)">{question.prompt}</p>
        {review && (
          <Icon
            name={correct ? 'checkmark' : 'xmark'}
            className="size-5 shrink-0"
            style={{ color: correct ? 'var(--color-green-accent)' : 'var(--color-profile-danger)' }}
            aria-label={correct ? t('exams.task.correct') : t('exams.task.incorrect')}
          />
        )}
      </div>

      {question.kind === 'choice' ? (
        <div role="radiogroup" className="flex flex-col gap-2">
          {question.options.map((option, i) => {
            const selected = answer === i;
            const isRight = review && i === question.answerIndex;
            return (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={review}
                onClick={() => onAnswer(i)}
                className="flex items-center gap-3 rounded-2xl border px-4 py-2.5 text-left text-[15px] font-medium transition-colors disabled:cursor-default"
                style={{
                  borderColor: isRight
                    ? 'var(--color-green-accent)'
                    : selected
                      ? 'var(--color-primary-blue)'
                      : 'var(--color-surface-border)',
                  background: selected ? 'color-mix(in srgb, var(--color-primary-blue) 10%, transparent)' : 'transparent',
                  color: 'var(--color-primary-blue-dark)',
                }}
              >
                <span
                  className="grid size-6 shrink-0 place-items-center rounded-full border text-[12px] font-bold"
                  style={{
                    borderColor: selected ? 'var(--color-primary-blue)' : 'var(--color-surface-border)',
                    color: selected ? 'var(--color-primary-blue)' : 'var(--color-muted-text)',
                  }}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                {option}
              </button>
            );
          })}
        </div>
      ) : (
        <input
          type="text"
          value={typeof answer === 'string' ? answer : ''}
          onChange={(e) => onAnswer(e.target.value)}
          readOnly={review}
          aria-label={t('exams.task.answerFor', { number })}
          placeholder={t('exams.task.maxWords', { count: question.maxWords })}
          className={FIELD}
          autoComplete="off"
          spellCheck={false}
        />
      )}

      {review && (
        <div className="flex flex-col gap-1 rounded-2xl bg-(--color-hover-wash) px-4 py-3">
          {!correct && (
            <span className="text-[14px] font-bold text-(--color-primary-blue-dark)">
              {t('exams.task.rightAnswer', {
                answer: question.kind === 'choice' ? question.options[question.answerIndex] : question.answers[0],
              })}
            </span>
          )}
          {question.explanation && <span className="text-[13px] font-medium text-(--color-text-secondary)">{question.explanation}</span>}
        </div>
      )}
    </li>
  );
};

const ListeningPlayer = ({
  script,
  languageId,
  maxPlays,
  playsUsed,
  onPlay,
}: {
  script: { speaker: string; text: string }[];
  languageId: string;
  maxPlays?: number;
  playsUsed?: number;
  onPlay?: () => void;
}) => {
  const { t } = useTranslation();
  const [playing, setPlaying] = useState(false);
  const [ownPlays, setOwnPlays] = useState(0);
  const plays = playsUsed ?? ownPlays;
  const left = maxPlays === undefined ? undefined : maxPlays - plays;

  useEffect(() => stopScript, []);

  const play = () => {
    setPlaying(true);
    if (onPlay) onPlay();
    else setOwnPlays((n) => n + 1);
    playScript(script, languageId, { onEnd: () => setPlaying(false) });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-(--color-hover-wash) p-4">
      <button
        type="button"
        className={SECONDARY_BUTTON}
        disabled={playing || left === 0}
        onClick={play}
      >
        <Icon name="headphones" className="size-5" />
        {playing ? t('exams.task.playing') : t('exams.task.play')}
      </button>
      {playing && (
        <button
          type="button"
          className="text-[14px] font-bold text-(--color-muted-text) underline-offset-2 hover:underline"
          onClick={() => {
            stopScript();
            setPlaying(false);
          }}
        >
          {t('exams.task.stop')}
        </button>
      )}
      {left !== undefined && (
        <span className="text-[13px] font-semibold text-(--color-muted-text)">
          {t('exams.task.playsLeft', { count: Math.max(left, 0) })}
        </span>
      )}
    </div>
  );
};
