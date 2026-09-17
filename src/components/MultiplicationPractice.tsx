import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MultiplicationQuestion, MultiplicationHistoryItem, ThemeConfig } from '../types';

interface MultiplicationPracticeProps {
  currentTheme: ThemeConfig;
}

export const MIN_TABLE = 2;
export const MAX_TABLE = 30;
export const MIN_MULTIPLIER = 1;
export const MAX_MULTIPLIER = 10;

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

function generateMultiplicationQuestion(
  minTable: number,
  maxTable: number,
  previousQuestion?: MultiplicationQuestion | null,
): MultiplicationQuestion {
  const low = Math.max(MIN_TABLE, Math.min(minTable, maxTable));
  const high = Math.min(MAX_TABLE, Math.max(minTable, maxTable));

  let table = getRandomInt(low, high);
  let multiplier = getRandomInt(MIN_MULTIPLIER, MAX_MULTIPLIER);

  if (
    previousQuestion &&
    previousQuestion.table === table &&
    previousQuestion.multiplier === multiplier
  ) {
    multiplier = multiplier < MAX_MULTIPLIER ? multiplier + 1 : MIN_MULTIPLIER;
    if (low !== high && multiplier === previousQuestion.multiplier) {
      table = table < high ? table + 1 : low;
    }
  }

  return {
    id: makeId(),
    table,
    multiplier,
    answer: table * multiplier,
  };
}

export const MultiplicationPractice: React.FC<MultiplicationPracticeProps> = ({ currentTheme }) => {
  const [minTable, setMinTable] = useState<number>(2);
  const [maxTable, setMaxTable] = useState<number>(10);
  const [currentQuestion, setCurrentQuestion] = useState<MultiplicationQuestion>(() =>
    generateMultiplicationQuestion(2, 10),
  );
  const [userInputValue, setUserInputValue] = useState<string>('');
  const [lastResult, setLastResult] = useState<{
    table: number;
    multiplier: number;
    userAnswer: string;
    correctAnswer: number;
    isCorrect: boolean;
    wasPassed?: boolean;
  } | null>(null);

  const [history, setHistory] = useState<MultiplicationHistoryItem[]>([]);
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [bestStreak, setBestStreak] = useState<number>(0);
  const [totalAttempts, setTotalAttempts] = useState<number>(0);
  const [correctAttempts, setCorrectAttempts] = useState<number>(0);
  const [showReference, setShowReference] = useState<boolean>(false);
  const [inputErrorNotice, setInputErrorNotice] = useState<string>('');

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [currentQuestion]);

  const applyRangeChange = (nextMin: number, nextMax: number) => {
    const safeMin = Math.max(MIN_TABLE, Math.min(MAX_TABLE, nextMin));
    const safeMax = Math.max(MIN_TABLE, Math.min(MAX_TABLE, nextMax));
    const low = Math.min(safeMin, safeMax);
    const high = Math.max(safeMin, safeMax);
    setMinTable(low);
    setMaxTable(high);
    setCurrentQuestion((prev) => generateMultiplicationQuestion(low, high, prev));
    setUserInputValue('');
    setInputErrorNotice('');
    inputRef.current?.focus();
  };

  const handleQuickRange = (low: number, high: number) => {
    applyRangeChange(low, high);
  };

  const submitAnswer = useCallback(
    (passed = false) => {
      const trimmed = userInputValue.trim();

      if (!passed && trimmed === '') {
        setInputErrorNotice('Type your answer first, or click "Pass / Show Answer"');
        inputRef.current?.focus();
        return;
      }

      setInputErrorNotice('');
      const userNum = parseInt(trimmed, 10);
      const isCorrect = !passed && !isNaN(userNum) && userNum === currentQuestion.answer;

      setLastResult({
        table: currentQuestion.table,
        multiplier: currentQuestion.multiplier,
        userAnswer: passed ? '(Passed)' : trimmed,
        correctAnswer: currentQuestion.answer,
        isCorrect,
        wasPassed: passed,
      });

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

      setHistory((prev) => [
        {
          id: currentQuestion.id,
          table: currentQuestion.table,
          multiplier: currentQuestion.multiplier,
          answer: currentQuestion.answer,
          userAnswer: passed ? 'Passed' : trimmed,
          isCorrect,
          timestamp: Date.now(),
        },
        ...prev.slice(0, 19),
      ]);

      const low = Math.min(minTable, maxTable);
      const high = Math.max(minTable, maxTable);
      setCurrentQuestion(generateMultiplicationQuestion(low, high, currentQuestion));
      setUserInputValue('');
      inputRef.current?.focus();
    },
    [userInputValue, currentQuestion, minTable, maxTable],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitAnswer(false);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      submitAnswer(true);
    }
  };

  const handleResetStats = () => {
    setHistory([]);
    setCurrentStreak(0);
    setTotalAttempts(0);
    setCorrectAttempts(0);
    setLastResult(null);
    setInputErrorNotice('');
    const low = Math.min(minTable, maxTable);
    const high = Math.max(minTable, maxTable);
    setCurrentQuestion(generateMultiplicationQuestion(low, high));
    setUserInputValue('');
    inputRef.current?.focus();
  };

  const accuracyPct = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;
  const isSingleTable = minTable === maxTable;
  const tableOptions = Array.from({ length: MAX_TABLE - MIN_TABLE + 1 }, (_, i) => MIN_TABLE + i);

  return (
    <div id="multiplication-module" className="space-y-6">
      <section
        id="card-multiplication-controls"
        className="bg-white rounded-2xl border p-4 sm:p-5 shadow-xs transition-colors duration-200"
        style={{ borderColor: currentTheme.cardBorder }}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Choose tables (2 to 30):
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-700">
                  From
                  <select
                    id="select-multiplication-min"
                    value={minTable}
                    onChange={(e) => applyRangeChange(Number(e.target.value), maxTable)}
                    className="px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-bold tabular-nums cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
                    aria-label="Minimum multiplication table"
                  >
                    {tableOptions.map((n) => (
                      <option key={`min-${n}`} value={n}>
                        Table {n}
                      </option>
                    ))}
                  </select>
                </label>
                <span className="text-slate-400 font-bold">to</span>
                <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-700">
                  To
                  <select
                    id="select-multiplication-max"
                    value={maxTable}
                    onChange={(e) => applyRangeChange(minTable, Number(e.target.value))}
                    className="px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-bold tabular-nums cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
                    aria-label="Maximum multiplication table"
                  >
                    {tableOptions.map((n) => (
                      <option key={`max-${n}`} value={n}>
                        Table {n}
                      </option>
                    ))}
                  </select>
                </label>
                <span
                  id="multiplication-range-label"
                  className="text-xs sm:text-sm text-slate-500 font-medium tabular-nums"
                  aria-live="polite"
                >
                  {isSingleTable
                    ? `Practicing table of ${minTable} × 1–10`
                    : `Practicing tables ${minTable}–${maxTable} × 1–10`}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                <button
                  id="btn-range-2-10"
                  type="button"
                  onClick={() => handleQuickRange(2, 10)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  2–10
                </button>
                <button
                  id="btn-range-11-20"
                  type="button"
                  onClick={() => handleQuickRange(11, 20)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  11–20
                </button>
                <button
                  id="btn-range-21-30"
                  type="button"
                  onClick={() => handleQuickRange(21, 30)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  21–30
                </button>
                <button
                  id="btn-range-2-30"
                  type="button"
                  onClick={() => handleQuickRange(2, 30)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  All 2–30
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end lg:self-auto">
              <button
                id="btn-toggle-multiplication-reference"
                type="button"
                onClick={() => setShowReference((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              >
                <span>📖</span>
                <span>{showReference ? 'Hide Tables' : 'Lookup Tables'}</span>
              </button>

              {totalAttempts > 0 && (
                <button
                  id="btn-reset-multiplication-stats"
                  type="button"
                  onClick={handleResetStats}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Reset multiplication session score and streak"
                >
                  Reset Stats
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section
        id="card-multiplication-active-question"
        className="bg-white rounded-2xl border p-6 sm:p-10 shadow-xs transition-colors duration-200 text-center relative overflow-hidden"
        style={{ borderColor: currentTheme.cardBorder }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100 text-xs sm:text-sm">
          <div className="flex items-center gap-3 font-semibold text-slate-700">
            <span
              id="multiplication-streak-indicator"
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

          <div className="text-slate-500 font-medium tabular-nums">
            Range:{' '}
            <span className="font-semibold text-slate-700">
              {isSingleTable ? `Table ${minTable}` : `Tables ${minTable} to ${maxTable}`} × 1–10
            </span>
          </div>
        </div>

        {lastResult && (
          <div
            id="multiplication-previous-feedback"
            aria-live="polite"
            className="mb-6 p-4 rounded-xl border transition-all text-left flex items-center justify-between gap-4"
            style={{
              backgroundColor: lastResult.isCorrect ? currentTheme.correctBg : currentTheme.wrongBg,
              borderColor: lastResult.isCorrect ? currentTheme.correctBorder : currentTheme.wrongBorder,
              color: lastResult.isCorrect ? currentTheme.correctText : currentTheme.wrongText,
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black">{lastResult.isCorrect ? '✓' : '✗'}</span>
              <div>
                <p className="font-bold text-base sm:text-lg tracking-tight">
                  {lastResult.isCorrect ? (
                    <span>
                      Correct! {lastResult.table} × {lastResult.multiplier} = {lastResult.correctAnswer}
                    </span>
                  ) : (
                    <span>
                      {lastResult.wasPassed ? 'Answer Revealed: ' : 'Incorrect! '}
                      The correct answer is{' '}
                      <strong>
                        {lastResult.table} × {lastResult.multiplier} = {lastResult.correctAnswer}
                      </strong>
                    </span>
                  )}
                </p>
                {!lastResult.isCorrect && !lastResult.wasPassed && (
                  <p className="text-xs sm:text-sm opacity-90 mt-0.5">
                    Your entered answer was: <span className="line-through">{lastResult.userAnswer}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="text-xs font-semibold uppercase tracking-wider opacity-75 hidden sm:block">
              Next question loaded below ↓
            </div>
          </div>
        )}

        <div className="mb-2">
          <span
            className="inline-block px-3 py-1 text-xs font-bold tracking-wider uppercase rounded-full tabular-nums"
            style={{
              backgroundColor: currentTheme.cellFocusBg,
              color: currentTheme.addition.checkBtnBg,
            }}
          >
            Table of {currentQuestion.table}
          </span>
        </div>

        <div className="my-6">
          <div className="text-5xl sm:text-7xl font-extrabold tracking-tight text-slate-900 select-none tabular-nums">
            {currentQuestion.table}
            <span className="text-slate-400 font-normal mx-3">×</span>
            {currentQuestion.multiplier}
            <span className="text-slate-400 font-normal mx-3">=</span>
            <span className="text-slate-300 font-light">?</span>
          </div>
          <p className="text-slate-500 text-sm mt-2">
            Random question from {isSingleTable ? `table ${minTable}` : `tables ${minTable} to ${maxTable}`}
          </p>
        </div>

        <div className="max-w-md mx-auto mt-6">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full">
              <input
                id="input-multiplication-answer"
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
              id="btn-submit-multiplication-answer"
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

          {inputErrorNotice ? (
            <p className="text-rose-600 text-xs sm:text-sm font-semibold mt-2 animate-pulse">
              {inputErrorNotice}
            </p>
          ) : (
            <div className="flex items-center justify-between text-xs text-slate-500 mt-2.5 px-1">
              <span>
                Press <strong className="text-slate-700">Enter ↵</strong> to submit
              </span>
              <button
                id="btn-pass-multiplication-question"
                type="button"
                onClick={() => submitAnswer(true)}
                className="text-slate-600 hover:text-slate-900 underline font-medium cursor-pointer"
                title="Show answer and advance to next question"
              >
                Pass / Don&apos;t know (Esc)
              </button>
            </div>
          )}
        </div>
      </section>

      {showReference && (
        <section
          id="card-multiplication-reference-table"
          className="bg-white rounded-2xl border p-5 sm:p-7 shadow-xs transition-colors duration-200"
          style={{ borderColor: currentTheme.cardBorder }}
        >
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">Multiplication Reference Key</h3>
              <p className="text-xs sm:text-sm text-slate-500 tabular-nums">
                {isSingleTable
                  ? `Table ${minTable} × 1 to 10`
                  : `Tables ${minTable} to ${maxTable} × 1 to 10`}
              </p>
            </div>
            <button
              id="btn-close-multiplication-reference"
              type="button"
              onClick={() => setShowReference(false)}
              className="text-slate-400 hover:text-slate-600 font-bold text-lg px-2 py-1"
              title="Close reference table"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto pr-1">
            {Array.from({ length: maxTable - minTable + 1 }, (_, i) => minTable + i).map((table) => (
              <div key={`ref-mult-${table}`} className="rounded-xl border border-slate-200 overflow-hidden">
                <div
                  className="px-3 py-2 text-sm font-bold text-white tabular-nums"
                  style={{ backgroundColor: currentTheme.addition.headerBg }}
                >
                  Table of {table}
                </div>
                <div className="divide-y divide-slate-100">
                  {Array.from({ length: MAX_MULTIPLIER }, (_, j) => j + MIN_MULTIPLIER).map((multiplier) => (
                    <div
                      key={`ref-mult-${table}-${multiplier}`}
                      className="px-3 py-1.5 flex items-center justify-between text-sm tabular-nums"
                    >
                      <span className="text-slate-600 font-medium">
                        {table} × {multiplier}
                      </span>
                      <span className="font-extrabold text-slate-900">{table * multiplier}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {history.length > 0 && (
        <section
          id="card-multiplication-history"
          className="bg-white rounded-2xl border p-5 sm:p-6 shadow-xs transition-colors duration-200"
          style={{ borderColor: currentTheme.cardBorder }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>📋</span> Recent Practice History
            </h3>
            <span className="text-xs text-slate-500 font-medium">Last {history.length} questions</span>
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
                    {item.table} × {item.multiplier}
                  </span>
                  <span className="text-slate-400">=</span>
                  <span className="font-semibold text-slate-900">{item.answer}</span>
                </div>

                <div className="text-right">
                  {item.isCorrect ? (
                    <span className="text-emerald-700 font-semibold">Correct ({item.userAnswer})</span>
                  ) : (
                    <span className="text-rose-700 font-medium">
                      You entered: <span className="line-through text-slate-500">{item.userAnswer}</span>
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
