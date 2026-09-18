import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PowerMode, PowerQuestion, PowerHistoryItem, ThemeConfig } from '../types';

interface SquaresCubesPracticeProps {
  currentTheme: ThemeConfig;
}

/**
 * Format elapsed seconds to MM:SS (or HH:MM:SS if past 1 hour)
 */
function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Generate a random integer between min and max inclusive
 */
function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a new question according to the selected mode:
 * - Squares: 2 to 30
 * - Cubes: 2 to 20
 */
function generateQuestion(mode: PowerMode, previousQuestion?: PowerQuestion | null): PowerQuestion {
  let pickPower: 2 | 3 = 2;

  if (mode === 'all') {
    // 55% squares, 45% cubes
    pickPower = Math.random() < 0.55 ? 2 : 3;
  } else if (mode === 'squares') {
    pickPower = 2;
  } else {
    pickPower = 3;
  }

  let base = pickPower === 2 ? getRandomInt(2, 30) : getRandomInt(2, 20);

  // Avoid identical question immediately if possible
  if (previousQuestion && previousQuestion.base === base && previousQuestion.power === pickPower) {
    if (pickPower === 2) {
      base = base < 30 ? base + 1 : 2;
    } else {
      base = base < 20 ? base + 1 : 2;
    }
  }

  const answer = pickPower === 2 ? base * base : base * base * base;

  return {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    base,
    power: pickPower,
    answer,
  };
}

// Pre-computed tables for the Reference Modal / Drawer
const ALL_SQUARES = Array.from({ length: 29 }, (_, i) => {
  const n = i + 2; // 2 to 30
  return { n, val: n * n };
});

const ALL_CUBES = Array.from({ length: 19 }, (_, i) => {
  const n = i + 2; // 2 to 20
  return { n, val: n * n * n };
});

export const SquaresCubesPractice: React.FC<SquaresCubesPracticeProps> = ({ currentTheme }) => {
  const [mode, setMode] = useState<PowerMode>('all');
  const [currentQuestion, setCurrentQuestion] = useState<PowerQuestion>(() => generateQuestion('all'));
  const [userInputValue, setUserInputValue] = useState<string>('');
  const [lastResult, setLastResult] = useState<{
    base: number;
    power: 2 | 3;
    userAnswer: string;
    correctAnswer: number;
    isCorrect: boolean;
    wasPassed?: boolean;
    timeTaken?: string;
  } | null>(null);

  // Stats & streaks
  const [history, setHistory] = useState<PowerHistoryItem[]>([]);
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [bestStreak, setBestStreak] = useState<number>(0);
  const [totalAttempts, setTotalAttempts] = useState<number>(0);
  const [correctAttempts, setCorrectAttempts] = useState<number>(0);
  const [showReference, setShowReference] = useState<boolean>(false);
  const [inputErrorNotice, setInputErrorNotice] = useState<string>('');

  // Manual session clock — user starts it, solves as many questions as possible, then stops it
  const [timerStatus, setTimerStatus] = useState<'idle' | 'running' | 'finished'>('idle');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [finalTimeFormatted, setFinalTimeFormatted] = useState<string>('');

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input automatically whenever question changes or mounts
  useEffect(() => {
    inputRef.current?.focus();
  }, [currentQuestion]);

  // Clock ticker (active whenever status is 'running')
  useEffect(() => {
    if (timerStatus !== 'running' || !startTime) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSeconds(elapsed);
    }, 500);

    return () => clearInterval(interval);
  }, [timerStatus, startTime]);

  const resetTimer = () => {
    setTimerStatus('idle');
    setStartTime(null);
    setElapsedSeconds(0);
    setFinalTimeFormatted('');
  };

  const handleStartClock = () => {
    setTimerStatus('running');
    setStartTime(Date.now());
    setElapsedSeconds(0);
    setFinalTimeFormatted('');
  };

  const handleStopClock = () => {
    if (timerStatus !== 'running') return;
    const elapsed = startTime ? Math.floor((Date.now() - startTime) / 1000) : elapsedSeconds;
    setElapsedSeconds(elapsed);
    setFinalTimeFormatted(formatTime(elapsed));
    setTimerStatus('finished');
  };

  // Handle switching modes
  const handleModeChange = (newMode: PowerMode) => {
    setMode(newMode);
    setCurrentQuestion(generateQuestion(newMode, currentQuestion));
    setUserInputValue('');
    setInputErrorNotice('');
    inputRef.current?.focus();
  };

  // Submit and check answer, reveal correct answer, and pass on to another
  const submitAnswer = useCallback((passed = false) => {
    const trimmed = userInputValue.trim();

    if (!passed && trimmed === '') {
      setInputErrorNotice('Type your answer first, or click "Pass / Show Answer"');
      inputRef.current?.focus();
      return;
    }

    setInputErrorNotice('');
    const userNum = parseInt(trimmed, 10);
    const isCorrect = !passed && !isNaN(userNum) && userNum === currentQuestion.answer;

    // Snapshot the current clock time for this answer (clock keeps running — no per-question freeze)
    const timeTaken =
      timerStatus === 'running' && startTime
        ? formatTime(Math.floor((Date.now() - startTime) / 1000))
        : undefined;

    // Record last result so user gets instant feedback with the correct answer
    const resultItem = {
      base: currentQuestion.base,
      power: currentQuestion.power,
      userAnswer: passed ? '(Passed)' : trimmed,
      correctAnswer: currentQuestion.answer,
      isCorrect,
      wasPassed: passed,
      timeTaken,
    };
    setLastResult(resultItem);

    // Update stats
    setTotalAttempts((prev) => prev + 1);
    if (isCorrect) {
      setCorrectAttempts((prev) => prev + 1);
      setCurrentStreak((prev) => {
        const next = prev + 1;
        setBestStreak((b) => Math.max(b, next));
        return next;
      });
    } else {
      setCurrentStreak(0);
    }

    // Add to history log (keep last 20)
    setHistory((prev) => [
      {
        id: currentQuestion.id,
        base: currentQuestion.base,
        power: currentQuestion.power,
        answer: currentQuestion.answer,
        userAnswer: passed ? 'Passed' : trimmed,
        isCorrect,
        timestamp: Date.now(),
        timeTaken,
      },
      ...prev.slice(0, 19),
    ]);

    // Pass on to another question immediately!
    const nextQ = generateQuestion(mode, currentQuestion);
    setCurrentQuestion(nextQ);
    setUserInputValue('');
    inputRef.current?.focus();
  }, [userInputValue, currentQuestion, mode, timerStatus, startTime]);

  // Handle keyboard events (Enter to submit, Escape to pass)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitAnswer(false);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      submitAnswer(true);
    }
  };

  // Reset all stats
  const handleResetStats = () => {
    setHistory([]);
    setCurrentStreak(0);
    setTotalAttempts(0);
    setCorrectAttempts(0);
    setLastResult(null);
    setInputErrorNotice('');
    setCurrentQuestion(generateQuestion(mode));
    setUserInputValue('');
    resetTimer();
    inputRef.current?.focus();
  };

  const accuracyPct = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;
  const isSquare = currentQuestion.power === 2;
  const powerSymbol = isSquare ? '²' : '³';
  const powerWord = isSquare ? 'Square' : 'Cube';

  // Render Timer Pill Component with manual Start / Stop controls
  const renderTimerPill = () => {
    const displayTime =
      timerStatus === 'finished' && finalTimeFormatted
        ? finalTimeFormatted
        : formatTime(elapsedSeconds);

    const controlBtn =
      timerStatus === 'running' ? (
        <button
          id="btn-stop-clock-powers"
          type="button"
          onClick={handleStopClock}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors cursor-pointer shadow-2xs"
          title="Stop the clock and freeze your total time"
        >
          ■ Stop
        </button>
      ) : (
        <button
          id="btn-start-clock-powers"
          type="button"
          onClick={handleStartClock}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors cursor-pointer shadow-2xs"
          title="Start the clock — solve as many questions as you can, then press Stop"
        >
          ▶ Start Clock
        </button>
      );

    let pill;
    if (timerStatus === 'running') {
      pill = (
        <div
          id="powers-timer-pill-running"
          aria-live="polite"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-semibold tracking-wide border tabular-nums transition-colors duration-200 bg-rose-50 border-rose-300 text-rose-700"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
          </span>
          <span>⏱ {displayTime}</span>
        </div>
      );
    } else if (timerStatus === 'finished') {
      pill = (
        <div
          id="powers-timer-pill-finished"
          aria-live="polite"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-semibold tracking-wide border tabular-nums transition-colors duration-200"
          style={{
            backgroundColor: currentTheme.correctBg,
            borderColor: currentTheme.correctBorder,
            color: currentTheme.correctText,
          }}
        >
          <span className="inline-block text-xs font-bold">✓</span>
          <span>⏱ {displayTime}</span>
        </div>
      );
    } else {
      pill = (
        <div
          id="powers-timer-pill-idle"
          aria-live="polite"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-semibold tracking-wide border tabular-nums text-slate-500 bg-slate-100 border-slate-300 transition-colors duration-200"
        >
          <span className="inline-block opacity-70">⏱</span>
          <span>00:00</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 flex-wrap">
        {pill}
        {controlBtn}
      </div>
    );
  };

  return (
    <div id="squares-cubes-module" className="space-y-6">
      {/* Top Controls Card: Mode Selector & Reference Table Toggle */}
      <section
        id="card-powers-controls"
        className="bg-white rounded-2xl border p-4 sm:p-5 shadow-xs transition-colors duration-200"
        style={{ borderColor: currentTheme.cardBorder }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Mode Selector */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Practice Focus:
            </div>
            <div className="inline-flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                id="btn-mode-all"
                type="button"
                onClick={() => handleModeChange('all')}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  mode === 'all'
                    ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All (Squares 2–30 & Cubes 2–20)
              </button>
              <button
                id="btn-mode-squares"
                type="button"
                onClick={() => handleModeChange('squares')}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  mode === 'squares'
                    ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Squares Only (2² to 30²)
              </button>
              <button
                id="btn-mode-cubes"
                type="button"
                onClick={() => handleModeChange('cubes')}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  mode === 'cubes'
                    ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cubes Only (2³ to 20³)
              </button>
            </div>
          </div>

          {/* Quick Actions: Reference Sheet & Reset Stats */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              id="btn-toggle-reference"
              type="button"
              onClick={() => setShowReference((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            >
              <span>📖</span>
              <span>{showReference ? 'Hide Table' : 'Lookup Table'}</span>
            </button>

            {totalAttempts > 0 && (
              <button
                id="btn-reset-power-stats"
                type="button"
                onClick={handleResetStats}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Reset session score and streak"
              >
                Reset Stats
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Main Flashcard Practice Area */}
      <section
        id="card-powers-active-question"
        className="bg-white rounded-2xl border p-6 sm:p-10 shadow-xs transition-colors duration-200 text-center relative overflow-hidden"
        style={{ borderColor: currentTheme.cardBorder }}
      >
        {/* Streak & Score Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100 text-xs sm:text-sm">
          <div className="flex items-center gap-3 font-semibold text-slate-700">
            <span
              id="streak-indicator"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-amber-700 bg-amber-50 border border-amber-200 tabular-nums font-bold"
            >
              🔥 Streak: {currentStreak}
              {bestStreak > 0 && (
                <span className="text-amber-500 font-normal ml-1">(Best: {bestStreak})</span>
              )}
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-600">
              Score: <strong className="text-slate-900">{correctAttempts}</strong> / {totalAttempts}
              {totalAttempts > 0 && ` (${accuracyPct}%)`}
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {renderTimerPill()}
            <div className="text-slate-500 font-medium">
              Range:{' '}
              <span className="font-semibold text-slate-700">
                {isSquare ? 'Squares 2 to 30' : 'Cubes 2 to 20'}
              </span>
            </div>
          </div>
        </div>

        {/* Previous Answer Feedback Banner (Displays instantly with the correct answer!) */}
        {lastResult && (
          <div
            id="previous-question-feedback"
            aria-live="polite"
            className="mb-6 p-4 rounded-xl border transition-all text-left flex items-center justify-between gap-4"
            style={{
              backgroundColor: lastResult.isCorrect ? currentTheme.correctBg : currentTheme.wrongBg,
              borderColor: lastResult.isCorrect ? currentTheme.correctBorder : currentTheme.wrongBorder,
              color: lastResult.isCorrect ? currentTheme.correctText : currentTheme.wrongText,
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black">
                {lastResult.isCorrect ? '✓' : '✗'}
              </span>
              <div>
                <p className="font-bold text-base sm:text-lg tracking-tight">
                  {lastResult.isCorrect ? (
                    <span>
                      Correct! {lastResult.base}
                      <sup>{lastResult.power}</sup> = {lastResult.correctAnswer}
                    </span>
                  ) : (
                    <span>
                      {lastResult.wasPassed ? 'Answer Revealed: ' : 'Incorrect! '}
                      The correct answer is{' '}
                      <strong>
                        {lastResult.base}
                        <sup>{lastResult.power}</sup> = {lastResult.correctAnswer}
                      </strong>
                    </span>
                  )}
                </p>
                {!lastResult.isCorrect && !lastResult.wasPassed && (
                  <p className="text-xs sm:text-sm opacity-90 mt-0.5">
                    Your entered answer was: <span className="line-through">{lastResult.userAnswer}</span>
                  </p>
                )}
                {lastResult.timeTaken && (
                  <p className="text-xs sm:text-sm opacity-90 mt-0.5 font-semibold">
                    ⏱ Clock at answer: {lastResult.timeTaken}
                  </p>
                )}
              </div>
            </div>

            <div className="text-xs font-semibold uppercase tracking-wider opacity-75 hidden sm:block">
              Next question loaded below ↓
            </div>
          </div>
        )}

        {/* Question Prompt Title */}
        <div className="mb-2">
          <span
            className="inline-block px-3 py-1 text-xs font-bold tracking-wider uppercase rounded-full"
            style={{
              backgroundColor: currentTheme.cellFocusBg,
              color: currentTheme.addition.checkBtnBg,
            }}
          >
            {powerWord} of {currentQuestion.base}
          </span>
        </div>

        {/* Big Visual Math Equation */}
        <div className="my-6">
          <div className="text-5xl sm:text-7xl font-extrabold tracking-tight text-slate-900 select-none">
            {currentQuestion.base}
            <sup
              className="text-3xl sm:text-4xl ml-1 font-black"
              style={{ color: currentTheme.addition.headerBg }}
            >
              {currentQuestion.power}
            </sup>
            <span className="text-slate-400 font-normal mx-3">=</span>
            <span className="text-slate-300 font-light">?</span>
          </div>
          <p className="text-slate-500 text-sm mt-2">
            {isSquare
              ? `Calculate ${currentQuestion.base} × ${currentQuestion.base}`
              : `Calculate ${currentQuestion.base} × ${currentQuestion.base} × ${currentQuestion.base}`}
          </p>
        </div>

        {/* Input Form with Enter Key Handler */}
        <div className="max-w-md mx-auto mt-6">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full">
              <input
                id="input-power-answer"
                ref={inputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                autoFocus
                placeholder="Type answer & press Enter"
                value={userInputValue}
                onChange={(e) => {
                  const val = e.target.value;
                  // Allow only numeric digits
                  if (val === '' || /^\d+$/.test(val)) {
                    setUserInputValue(val);
                    if (inputErrorNotice) setInputErrorNotice('');
                  }
                }}
                onKeyDown={handleKeyDown}
                className="w-full h-14 sm:h-16 px-4 text-center font-bold text-2xl sm:text-3xl rounded-xl border-2 tabular-nums shadow-xs outline-none transition-all duration-150"
                style={{
                  backgroundColor: currentTheme.cellFocusBg,
                  borderColor: currentTheme.cellFocusRing,
                  color: '#0F172A',
                }}
              />
            </div>

            <button
              id="btn-submit-power-answer"
              type="button"
              onClick={() => submitAnswer(false)}
              className="w-full sm:w-auto h-14 sm:h-16 px-6 sm:px-8 rounded-xl font-bold text-base text-white shadow-xs transition-all duration-150 cursor-pointer outline-none focus-visible:ring-3 focus-visible:ring-offset-2 active:scale-95 shrink-0 flex items-center justify-center gap-2"
              style={{ backgroundColor: currentTheme.addition.headerBg }}
            >
              <span>Submit</span>
              <span className="text-xs opacity-80 border border-white/40 px-1.5 py-0.5 rounded">
                ↵ Enter
              </span>
            </button>
          </div>

          {/* Validation Notice or Input Prompt */}
          {inputErrorNotice ? (
            <p className="text-rose-600 text-xs sm:text-sm font-semibold mt-2 animate-pulse">
              {inputErrorNotice}
            </p>
          ) : (
            <div className="flex items-center justify-between text-xs text-slate-500 mt-2.5 px-1">
              <span>Press <strong className="text-slate-700">Enter ↵</strong> to submit</span>
              <button
                id="btn-pass-power-question"
                type="button"
                onClick={() => submitAnswer(true)}
                className="text-slate-600 hover:text-slate-900 underline font-medium cursor-pointer"
                title="Show answer and advance to next question"
              >
                Pass / Don't know (Esc)
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Lookup Reference Tables (Collapsible / Toggleable) */}
      {showReference && (
        <section
          id="card-powers-reference-table"
          className="bg-white rounded-2xl border p-5 sm:p-7 shadow-xs transition-colors duration-200"
          style={{ borderColor: currentTheme.cardBorder }}
        >
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                Squares & Cubes Reference Key
              </h3>
              <p className="text-xs sm:text-sm text-slate-500">
                Squares from 2 to 30 · Cubes from 2 to 20
              </p>
            </div>
            <button
              id="btn-close-reference"
              type="button"
              onClick={() => setShowReference(false)}
              className="text-slate-400 hover:text-slate-600 font-bold text-lg px-2 py-1"
              title="Close reference table"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Squares Reference (2 to 30) */}
            <div>
              <h4 className="font-bold text-sm text-slate-800 mb-2 flex items-center justify-between">
                <span>Squares (n² : 2 to 30)</span>
                <span className="text-xs text-slate-500 font-normal">29 entries</span>
              </h4>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-72 overflow-y-auto pr-1">
                {ALL_SQUARES.map(({ n, val }) => (
                  <div
                    key={`ref-sq-${n}`}
                    className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-center tabular-nums hover:bg-sky-50 transition-colors"
                  >
                    <span className="font-bold text-slate-700">{n}²</span>
                    <span className="text-slate-400 mx-1">=</span>
                    <span className="font-extrabold text-slate-900">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cubes Reference (2 to 20) */}
            <div>
              <h4 className="font-bold text-sm text-slate-800 mb-2 flex items-center justify-between">
                <span>Cubes (n³ : 2 to 20)</span>
                <span className="text-xs text-slate-500 font-normal">19 entries</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-72 overflow-y-auto pr-1">
                {ALL_CUBES.map(({ n, val }) => (
                  <div
                    key={`ref-cb-${n}`}
                    className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-center tabular-nums hover:bg-indigo-50 transition-colors"
                  >
                    <span className="font-bold text-slate-700">{n}³</span>
                    <span className="text-slate-400 mx-1">=</span>
                    <span className="font-extrabold text-slate-900">{val.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Answer History Log */}
      {history.length > 0 && (
        <section
          id="card-powers-history"
          className="bg-white rounded-2xl border p-5 sm:p-6 shadow-xs transition-colors duration-200"
          style={{ borderColor: currentTheme.cardBorder }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>📋</span> Recent Practice History
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              Last {history.length} questions
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto pr-1">
            {history.map((item) => (
              <div
                key={item.id}
                className="py-2.5 flex items-center justify-between gap-3 text-xs sm:text-sm tabular-nums"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold"
                    style={{
                      backgroundColor: item.isCorrect ? currentTheme.correctBg : currentTheme.wrongBg,
                      color: item.isCorrect ? currentTheme.correctText : currentTheme.wrongText,
                    }}
                  >
                    {item.isCorrect ? '✓' : '✗'}
                  </span>
                  <span className="font-bold text-slate-800">
                    {item.base}
                    <sup>{item.power}</sup>
                  </span>
                  <span className="text-slate-400">=</span>
                  <span className="font-semibold text-slate-900">{item.answer}</span>
                </div>

                <div className="text-right">
                  {item.isCorrect ? (
                    <span className="text-emerald-700 font-semibold">Correct ({item.userAnswer})</span>
                  ) : (
                    <span className="text-rose-700 font-medium">
                      You entered:{' '}
                      <span className="line-through text-slate-500">{item.userAnswer}</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
