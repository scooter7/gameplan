// src/components/FlashcardCard.tsx

import { FormEvent, useState } from "react";

// --- Types needed by the component ---
interface MCQ {
  prompt: string;
  options: string[];
  correct: string;
}

export interface FlashcardParsed {
  videoUrl: string | null;
  descriptionLines: string[];
  questions: MCQ[];
}

interface FlashcardCardProps {
  fc: FlashcardParsed;
  index: number;
  onComplete: () => void;
}

// --- The Component Itself ---
export default function FlashcardCard({ fc, index, onComplete }: FlashcardCardProps) {
  const [answers, setAnswers] = useState<Map<number, string>>(new Map());
  const [showResults, setShowResults] = useState<boolean>(false);
  const [correctCount, setCorrectCount] = useState<number>(0);

  const formId = `flashcard-form-${index}`;

  const handleOptionChange = (qIdx: number, letter: string) => {
    setAnswers((prev) => new Map(prev.set(qIdx, letter)));
  };

  const allAnswered = fc.questions.every((_, idx) => answers.has(idx));

  const handleSubmitAnswers = (e: FormEvent) => {
    e.preventDefault();
    let correct = 0;
    fc.questions.forEach((q, idx) => {
      const userChoice = answers.get(idx);
      if (userChoice && q.correct && userChoice === q.correct.charAt(0).toLowerCase()) {
        correct++;
      }
    });
    setCorrectCount(correct);
    setShowResults(true);
    onComplete();
  };

  return (
    <div className="flashcard-container mb-8">
      <div className={`flashcard ${showResults ? "is-flipped" : ""}`}>
        {/* FRONT FACE */}
        <div className="flashcard-face flashcard-front">
          {/* Video Player (Header) */}
          {fc.videoUrl ? (
            <div className="mx-auto mb-4 flex-shrink-0 w-[560px] h-[315px]">
              <iframe
                src={fc.videoUrl.replace("watch?v=", "embed/")}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full rounded-lg"
                title="YouTube Video"
              />
            </div>
          ) : (
            <div className="h-48 bg-gray-200 text-center flex items-center justify-center rounded-lg mb-4 flex-shrink-0">
              <span className="font-body text-text-secondary">
                (no video URL provided)
              </span>
            </div>
          )}

          {/* Scrollable Content Area */}
          <div className="flex-grow overflow-y-auto min-h-0 pr-2">
            <form id={formId} onSubmit={handleSubmitAnswers}>
              <div className="mb-4 space-y-2">
                {fc.descriptionLines.map((line, idx) => (
                  <p
                    key={`desc-${idx}`}
                    className="font-body text-text-secondary"
                  >
                    {line}
                  </p>
                ))}
              </div>

              {fc.questions.map((q, idx) => (
                <div key={idx} className="mb-4">
                  <p className="font-heading text-base mb-2">
                    {idx + 1}. {q.prompt}
                  </p>
                  <div className="space-y-2">
                    {q.options.map((opt, optIdx) => {
                      const letter = String.fromCharCode(97 + optIdx);
                      return (
                        <label
                          key={optIdx}
                          className="flex items-center space-x-2"
                        >
                          <input
                            type="radio"
                            name={`q-${index}-${idx}`}
                            value={letter}
                            checked={answers.get(idx) === letter}
                            onChange={() => handleOptionChange(idx, letter)}
                            className="h-5 w-5 text-secondary-dark border-gray-300 rounded-full focus:ring-secondary-dark"
                            disabled={showResults}
                          />
                          <span className="font-body text-text-secondary">
                            {opt}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </form>
          </div>

          {/* Submit Button (Footer) */}
          <div className="mt-4 flex-shrink-0">
            <button
              type="submit"
              form={formId}
              disabled={!allAnswered || showResults}
              className={`button w-full ${!allAnswered || showResults
                  ? "opacity-50 cursor-not-allowed"
                  : "button-primary"
                }`}
            >
              Submit Answers
            </button>
          </div>
        </div>

        {/* BACK FACE */}
        <div className="flashcard-face flashcard-back">
          <h3 className="text-xl font-heading mb-3 text-secondary-dark">
            Results
          </h3>
          <p className="mb-4 font-body">
            You answered {correctCount} out of {fc.questions.length} correctly.
          </p>
          <div className="space-y-4 flashcard-content-scrollable">
            {fc.questions.map((q, idx) => {
              const userChoice = answers.get(idx);
              const isCorrect = userChoice && q.correct && userChoice === q.correct.charAt(0).toLowerCase();
              return (
                <div key={idx} className="text-left">
                  <p className="font-heading mb-1">
                    {idx + 1}. {q.prompt}
                  </p>
                  {q.options.map((opt, optIdx) => {
                    const letter = String.fromCharCode(97 + optIdx);
                    let textClass = "text-text-primary";
                    if (q.correct && letter === q.correct.charAt(0).toLowerCase()) {
                      textClass = "text-tertiary";
                    } else if (letter === userChoice && !isCorrect) {
                      textClass = "text-error";
                    }
                    return (
                      <p
                        key={optIdx}
                        className={`ml-4 ${textClass} font-body`}
                      >
                        {letter}) {opt}
                      </p>
                    );
                  })}
                  <p className="italic text-sm mt-1 font-body">
                    Your answer: {userChoice?.toUpperCase() ?? "–"} | Correct:{" "}
                    {q.correct.toUpperCase()}
                  </p>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => setShowResults(false)}
            className="button button-primary mt-4"
          >
            Review Again
          </button>
        </div>
      </div>
    </div>
  );
}