/**
 * Refreshable Timed Math Tables Web App
 * 
 * A self-contained, browser-only math practice application with:
 * - Shared random 9x9 dataset (top headers, left headers, corner number)
 * - Immediate full-state re-render via "Press to refresh the data" button
 * - Fixed Ocean visual theme (Azure & Deep Marine, no theme switching)
 * - True aquatic Ocean palette: Vibrant Ocean Azure Addition & Deep Marine Royal Subtraction (no green-teal clash)
 * - Dynamic cell highlight colors: active cell background tint, operation-matched focus ring,
 *   crosshair row & column header highlight tracing, and theme-harmonized validation feedback
 * - Addition & Subtraction tabs (strictly isolated views)
 * - Writable practice grids with live check/clear and instant error clearing
 * - Auto-filled answer key tables
 * - Independent stopwatches starting on first keystroke and stopping on full submission
 * - Accessible responsive layout and tabular numeral alignment
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SquaresCubesPractice } from './components/SquaresCubesPractice';
import { MultiplicationPractice } from './components/MultiplicationPractice';

// ==========================================
// 1. DATA TYPES & INTERFACES
// ==========================================

interface SharedData {
  topHeaders: number[];   // 9 numbers (10 - 99)
  leftHeaders: number[];  // 9 numbers (10 - 99)
  corner: number;         // 1 corner number (10 - 99)
}

export type TabType = 'addition' | 'subtraction' | 'powers' | 'multiplication';
type CellStatus = 'correct' | 'wrong' | 'neutral';
export type ThemeId = 'ocean';

interface PracticeState {
  answers: Record<string, string>;       // Key format: "row-col" (0-8, 0-8)
  statusMap: Record<string, CellStatus>; // Visual feedback per cell
  hasChecked: boolean;
  scoreMessage: string;
  scoreType: 'neutral' | 'perfect' | 'success' | 'amber' | 'error';
  // Stopwatch state
  timerStatus: 'idle' | 'running' | 'finished';
  startTime: number | null;
  elapsedSeconds: number;
  finalTimeFormatted: string;
}

export interface TableThemeColors {
  headerBg: string;
  headerText: string;
  cornerBg: string;
  cornerText: string;
  answerBodyBg: string;
  answerBodyText: string;
  checkBtnBg: string;
  checkBtnHoverBg: string;
  tabActiveBg: string;
  tabFocusRing: string;
}

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  icon: string;
  description: string;
  pageBg: string;
  cardBorder: string;
  refreshBtnBg: string;
  refreshBtnHoverBg: string;
  // Dynamic cell highlight colors:
  cellFocusBg: string;
  cellHoverBg: string;
  cellFocusRing: string;
  headerHighlightBg: string;
  headerHighlightRing: string;
  // Validation cell highlights:
  correctBg: string;
  correctBorder: string;
  correctText: string;
  wrongBg: string;
  wrongBorder: string;
  wrongText: string;
  // Operation table specific colors:
  addition: TableThemeColors;
  subtraction: TableThemeColors;
}

// ==========================================
// 2. OCEAN THEME CONFIGURATION (single fixed theme)
// ==========================================

export const THEMES: Record<ThemeId, ThemeConfig> = {
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    icon: '🌊',
    description: 'Azure & Deep Marine oceanic waves',
    pageBg: '#F0F9FF',
    cardBorder: '#BAE6FD',
    refreshBtnBg: '#0284C7',
    refreshBtnHoverBg: '#0369A1',
    cellFocusBg: '#E0F2FE',
    cellHoverBg: '#F0F9FF',
    cellFocusRing: '#0284C7',
    headerHighlightBg: '#0369A1',
    headerHighlightRing: '#38BDF8',
    correctBg: '#DCFCE7',
    correctBorder: '#10B981',
    correctText: '#047857',
    wrongBg: '#FFE4E6',
    wrongBorder: '#F43F5E',
    wrongText: '#BE123C',
    addition: {
      headerBg: '#0284C7',        // Ocean Azure
      headerText: '#FFFFFF',
      cornerBg: '#075985',        // Deep Ocean Navy
      cornerText: '#FFFFFF',
      answerBodyBg: '#E0F2FE',    // Seafoam Ice Blue
      answerBodyText: '#0369A1',
      checkBtnBg: '#0369A1',
      checkBtnHoverBg: '#075985',
      tabActiveBg: '#0284C7',
      tabFocusRing: '#0284C7',
    },
    subtraction: {
      headerBg: '#1D4ED8',        // Deep Royal Navy Blue (pure ocean blue, no green-teal clash)
      headerText: '#FFFFFF',
      cornerBg: '#172554',        // Midnight Abyss Navy
      cornerText: '#FFFFFF',
      answerBodyBg: '#DBEAFE',    // Soft Marine Blue
      answerBodyText: '#1E3A8A',
      checkBtnBg: '#1E3A8A',
      checkBtnHoverBg: '#1D4ED8',
      tabActiveBg: '#1D4ED8',
      tabFocusRing: '#1D4ED8',
    },
  },
};

// ==========================================
// 3. HELPER FUNCTIONS
// ==========================================

/**
 * Generate a random integer between min and max (inclusive: 10 to 99)
 */
function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Create a fresh set of shared random numbers (9 top, 9 left, 1 corner)
 */
function createSharedData(): SharedData {
  return {
    topHeaders: Array.from({ length: 9 }, () => getRandomInt(10, 99)),
    leftHeaders: Array.from({ length: 9 }, () => getRandomInt(10, 99)),
    corner: getRandomInt(10, 99),
  };
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

const initialPracticeState: PracticeState = {
  answers: {},
  statusMap: {},
  hasChecked: false,
  scoreMessage: '',
  scoreType: 'neutral',
  timerStatus: 'idle',
  startTime: null,
  elapsedSeconds: 0,
  finalTimeFormatted: '',
};

// ==========================================
// 4. MAIN APPLICATION COMPONENT
// ==========================================

export default function App() {
  // Shared random numbers state
  const [sharedData, setSharedData] = useState<SharedData>(createSharedData);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<TabType>('addition');

  // Fixed Ocean theme (theme selector removed)
  const currentTheme = THEMES.ocean;

  // Track focused cell for crosshair highlight (row & col headers + cell highlight)
  const [activeCell, setActiveCell] = useState<{ tab: TabType; r: number; c: number } | null>(null);

  // Button hover states via React state (preventing DOM style mutation bugs)
  const [isRefreshHovered, setIsRefreshHovered] = useState(false);
  const [isCheckAddHovered, setIsCheckAddHovered] = useState(false);
  const [isCheckSubHovered, setIsCheckSubHovered] = useState(false);

  // Independent practice states for Addition and Subtraction
  const [additionState, setAdditionState] = useState<PracticeState>(initialPracticeState);
  const [subtractionState, setSubtractionState] = useState<PracticeState>(initialPracticeState);

  // References to input elements for keyboard navigation
  const additionInputsRef = useRef<Record<string, HTMLInputElement | null>>({});
  const subtractionInputsRef = useRef<Record<string, HTMLInputElement | null>>({});

  // ------------------------------------------
  // Stopwatch Ticker Effects (Active whenever status is 'running')
  // ------------------------------------------
  useEffect(() => {
    if (additionState.timerStatus !== 'running' || !additionState.startTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - additionState.startTime!) / 1000);
      setAdditionState((prev) => {
        if (prev.timerStatus !== 'running') return prev;
        return { ...prev, elapsedSeconds: elapsed };
      });
    }, 500);

    return () => clearInterval(interval);
  }, [additionState.timerStatus, additionState.startTime]);

  useEffect(() => {
    if (subtractionState.timerStatus !== 'running' || !subtractionState.startTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - subtractionState.startTime!) / 1000);
      setSubtractionState((prev) => {
        if (prev.timerStatus !== 'running') return prev;
        return { ...prev, elapsedSeconds: elapsed };
      });
    }, 500);

    return () => clearInterval(interval);
  }, [subtractionState.timerStatus, subtractionState.startTime]);

  // ------------------------------------------
  // Action 1: Refresh Button ("Press to refresh the data")
  // ------------------------------------------
  const handleRefreshAll = () => {
    // Regenerate shared numbers
    setSharedData(createSharedData());
    setActiveCell(null);

    // Reset Addition state and stopwatch
    setAdditionState({
      ...initialPracticeState,
      answers: {},
      statusMap: {},
    });

    // Reset Subtraction state and stopwatch
    setSubtractionState({
      ...initialPracticeState,
      answers: {},
      statusMap: {},
    });
  };

  // ------------------------------------------
  // Manual Clock Controls (user starts & stops the timer themselves)
  // ------------------------------------------
  const handleStartClock = (tab: TabType) => {
    const setter = tab === 'addition' ? setAdditionState : setSubtractionState;
    setter((prev) => ({
      ...prev,
      timerStatus: 'running',
      startTime: Date.now(),
      elapsedSeconds: 0,
      finalTimeFormatted: '',
    }));
  };

  const handleStopClock = (tab: TabType) => {
    const setter = tab === 'addition' ? setAdditionState : setSubtractionState;
    setter((prev) => {
      if (prev.timerStatus !== 'running') return prev;
      const elapsed = prev.startTime ? Math.floor((Date.now() - prev.startTime) / 1000) : prev.elapsedSeconds;
      return {
        ...prev,
        timerStatus: 'finished',
        elapsedSeconds: elapsed,
        finalTimeFormatted: formatTime(elapsed),
      };
    });
  };

  // ------------------------------------------
  // Action 2: Input Change Handler
  // ------------------------------------------
  const handleInputChange = (
    tab: TabType,
    rowIndex: number,
    colIndex: number,
    value: string
  ) => {
    // Sanitize input: allow only digits and minus sign
    if (value !== '' && !/^-?\d*$/.test(value)) return;

    const cellKey = `${rowIndex}-${colIndex}`;
    const setter = tab === 'addition' ? setAdditionState : setSubtractionState;

    setter((prev) => {
      // Live feel: immediately clear any previous correct/wrong mark on this cell
      const nextStatusMap = { ...prev.statusMap };
      delete nextStatusMap[cellKey];

      return {
        ...prev,
        answers: {
          ...prev.answers,
          [cellKey]: value,
        },
        statusMap: nextStatusMap,
      };
    });
  };

  // ------------------------------------------
  // Action 3: Check Answers
  // ------------------------------------------
  const handleCheckAnswers = useCallback((tab: TabType) => {
    const isAddition = tab === 'addition';
    const currentState = isAddition ? additionState : subtractionState;
    const setter = isAddition ? setAdditionState : setSubtractionState;

    const newStatusMap: Record<string, CellStatus> = {};
    let correctCount = 0;
    let wrongCount = 0;
    let blankCount = 0;

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const key = `${r}-${c}`;
        const rawVal = currentState.answers[key]?.trim();
        const expected = isAddition
          ? sharedData.leftHeaders[r] + sharedData.topHeaders[c]
          : sharedData.leftHeaders[r] - sharedData.topHeaders[c];

        if (!rawVal || rawVal === '' || rawVal === '-') {
          blankCount++;
          newStatusMap[key] = 'neutral';
        } else {
          const parsed = parseInt(rawVal, 10);
          if (parsed === expected) {
            correctCount++;
            newStatusMap[key] = 'correct';
          } else {
            wrongCount++;
            newStatusMap[key] = 'wrong';
          }
        }
      }
    }

    setter((prev) => {
      // Build score line
      let scoreMessage = '';
      let scoreType: PracticeState['scoreType'] = 'neutral';

      if (correctCount === 81) {
        scoreType = 'perfect';
        scoreMessage = `🎉 Perfect! 81 / 81 correct · 0 blank`;
      } else {
        scoreMessage = `${correctCount} / 81 correct · ${blankCount} blank`;
        if (correctCount >= 50) {
          scoreType = 'amber';
        } else {
          scoreType = 'error';
        }
      }

      // Show current clock time if the clock was started (does NOT auto-stop it)
      const displayTime =
        prev.timerStatus === 'running'
          ? formatTime(prev.startTime ? Math.floor((Date.now() - prev.startTime) / 1000) : prev.elapsedSeconds)
          : prev.timerStatus === 'finished'
            ? prev.finalTimeFormatted || formatTime(prev.elapsedSeconds)
            : '';
      if (displayTime) {
        scoreMessage += ` · ⏱ ${displayTime}`;
      }

      return {
        ...prev,
        statusMap: newStatusMap,
        hasChecked: true,
        scoreMessage,
        scoreType,
      };
    });
  }, [additionState, subtractionState, sharedData]);

  // ------------------------------------------
  // Action 4: Clear Single Table
  // ------------------------------------------
  const handleClearTable = (tab: TabType) => {
    const setter = tab === 'addition' ? setAdditionState : setSubtractionState;
    setActiveCell(null);
    setter({
      ...initialPracticeState,
      answers: {},
      statusMap: {},
    });
  };

  // ------------------------------------------
  // Action 5: Keyboard Grid Navigation
  // ------------------------------------------
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    tab: TabType,
    r: number,
    c: number
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCheckAnswers(tab);
      return;
    }

    const inputsMap = tab === 'addition' ? additionInputsRef.current : subtractionInputsRef.current;

    let targetR = r;
    let targetC = c;

    if (e.key === 'ArrowUp') {
      targetR = Math.max(0, r - 1);
    } else if (e.key === 'ArrowDown') {
      targetR = Math.min(8, r + 1);
    } else if (e.key === 'ArrowLeft' && e.currentTarget.selectionStart === 0) {
      targetC = Math.max(0, c - 1);
    } else if (e.key === 'ArrowRight' && e.currentTarget.selectionEnd === e.currentTarget.value.length) {
      targetC = Math.min(8, c + 1);
    } else {
      return;
    }

    if (targetR !== r || targetC !== c) {
      const targetInput = inputsMap[`${targetR}-${targetC}`];
      if (targetInput) {
        targetInput.focus();
        targetInput.select();
      }
    }
  };

  // ------------------------------------------
  // Render Timer Pill Component
  // ------------------------------------------
  const renderTimerPill = (state: PracticeState, tab: TabType) => {
    const displayTime =
      state.timerStatus === 'finished' && state.finalTimeFormatted
        ? state.finalTimeFormatted
        : formatTime(state.elapsedSeconds);

    const controlBtn =
      state.timerStatus === 'running' ? (
        <button
          id={`btn-stop-clock-${tab}`}
          type="button"
          onClick={() => handleStopClock(tab)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors cursor-pointer shadow-2xs"
          title="Stop the clock and freeze your total time"
        >
          ■ Stop
        </button>
      ) : (
        <button
          id={`btn-start-clock-${tab}`}
          type="button"
          onClick={() => handleStartClock(tab)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors cursor-pointer shadow-2xs"
          title="Start the clock — solve as many as you can, then press Stop"
        >
          ▶ Start Clock
        </button>
      );

    let pill;
    if (state.timerStatus === 'running') {
      pill = (
        <div
          id={`timer-pill-running-${tab}`}
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
    } else if (state.timerStatus === 'finished') {
      pill = (
        <div
          id={`timer-pill-finished-${tab}`}
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
          id={`timer-pill-idle-${tab}`}
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

  // Operation specific colors derived from current dynamic theme
  const additionColors = currentTheme.addition;
  const subtractionColors = currentTheme.subtraction;

  return (
    <div
      id="math-tables-app"
      className="min-h-screen text-slate-800 antialiased font-sans pb-12 transition-colors duration-300"
      style={{ backgroundColor: currentTheme.pageBg }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
        
        {/* ========================================================= */}
        {/* HEADER & REFRESH BUTTON */}
        {/* ========================================================= */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1
              id="app-title"
              className="text-3xl sm:text-4xl font-bold font-serif text-slate-900 tracking-tight"
            >
              Timed Math Tables
            </h1>
            <p className="text-slate-600 text-sm sm:text-base mt-1">
              9×9 practice tables with shared headers, rapid-fire squares (2–30) & cubes (2–20), multiplication tables (2–30), auto-checking, and stopwatches.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="refresh-data-button"
              onClick={handleRefreshAll}
              onMouseEnter={() => setIsRefreshHovered(true)}
              onMouseLeave={() => setIsRefreshHovered(false)}
              className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 text-sm sm:text-base font-semibold text-white rounded-xl shadow-xs transition-all duration-150 cursor-pointer outline-none focus-visible:ring-3 focus-visible:ring-offset-2 focus-visible:ring-slate-800 active:scale-95"
              style={{
                backgroundColor: isRefreshHovered ? currentTheme.refreshBtnHoverBg : currentTheme.refreshBtnBg,
              }}
            >
              <span className="mr-2 text-base">🔄</span>
              Press to refresh the data
            </button>
          </div>
        </header>

        {/* ========================================================= */}
        {/* OPERATION TABS */}
        {/* ========================================================= */}
        <div
          id="operation-tabs-container"
          role="tablist"
          className="flex flex-wrap items-center gap-2.5 sm:gap-3 mb-8 border-b border-slate-200 pb-3"
        >
          {/* Addition Tab Button */}
          <button
            id="tab-addition-button"
            role="tab"
            aria-selected={activeTab === 'addition'}
            aria-controls="addition-tab-panel"
            onClick={() => setActiveTab('addition')}
            className="px-5 sm:px-6 py-2.5 rounded-xl font-bold text-sm sm:text-base transition-all duration-200 cursor-pointer outline-none focus-visible:ring-3 focus-visible:ring-offset-2 active:scale-95 shadow-xs"
            style={{
              backgroundColor: activeTab === 'addition' ? additionColors.tabActiveBg : '#FFFFFF',
              color: activeTab === 'addition' ? '#FFFFFF' : '#475569',
              border: activeTab === 'addition' ? `1px solid ${additionColors.tabActiveBg}` : '1px solid #D1D5DB',
              boxShadow: activeTab === 'addition' ? `0 2px 8px -1px ${additionColors.tabActiveBg}40` : undefined,
            }}
          >
            ➕ Addition Tables
          </button>

          {/* Subtraction Tab Button */}
          <button
            id="tab-subtraction-button"
            role="tab"
            aria-selected={activeTab === 'subtraction'}
            aria-controls="subtraction-tab-panel"
            onClick={() => setActiveTab('subtraction')}
            className="px-5 sm:px-6 py-2.5 rounded-xl font-bold text-sm sm:text-base transition-all duration-200 cursor-pointer outline-none focus-visible:ring-3 focus-visible:ring-offset-2 active:scale-95 shadow-xs"
            style={{
              backgroundColor: activeTab === 'subtraction' ? subtractionColors.tabActiveBg : '#FFFFFF',
              color: activeTab === 'subtraction' ? '#FFFFFF' : '#475569',
              border: activeTab === 'subtraction' ? `1px solid ${subtractionColors.tabActiveBg}` : '1px solid #D1D5DB',
              boxShadow: activeTab === 'subtraction' ? `0 2px 8px -1px ${subtractionColors.tabActiveBg}40` : undefined,
            }}
          >
            ➖ Subtraction Tables
          </button>

          {/* Squares & Cubes Tab Button */}
          <button
            id="tab-powers-button"
            role="tab"
            aria-selected={activeTab === 'powers'}
            aria-controls="powers-tab-panel"
            onClick={() => setActiveTab('powers')}
            className="px-5 sm:px-6 py-2.5 rounded-xl font-bold text-sm sm:text-base transition-all duration-200 cursor-pointer outline-none focus-visible:ring-3 focus-visible:ring-offset-2 active:scale-95 shadow-xs inline-flex items-center gap-2"
            style={{
              backgroundColor: activeTab === 'powers' ? currentTheme.addition.cornerBg : '#FFFFFF',
              color: activeTab === 'powers' ? '#FFFFFF' : '#475569',
              border: activeTab === 'powers' ? `1px solid ${currentTheme.addition.cornerBg}` : '1px solid #D1D5DB',
              boxShadow: activeTab === 'powers' ? `0 2px 8px -1px ${currentTheme.addition.cornerBg}40` : undefined,
            }}
          >
            <span>⚡</span>
            <span>Squares & Cubes</span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-semibold tabular-nums"
              style={{
                backgroundColor: activeTab === 'powers' ? 'rgba(255,255,255,0.2)' : '#F1F5F9',
                color: activeTab === 'powers' ? '#FFFFFF' : '#64748B',
              }}
            >
              2–30 & 2–20
            </span>
          </button>

          {/* Multiplication Tables Tab Button */}
          <button
            id="tab-multiplication-button"
            role="tab"
            aria-selected={activeTab === 'multiplication'}
            aria-controls="multiplication-tab-panel"
            onClick={() => setActiveTab('multiplication')}
            className="px-5 sm:px-6 py-2.5 rounded-xl font-bold text-sm sm:text-base transition-all duration-200 cursor-pointer outline-none focus-visible:ring-3 focus-visible:ring-offset-2 active:scale-95 shadow-xs inline-flex items-center gap-2"
            style={{
              backgroundColor: activeTab === 'multiplication' ? currentTheme.subtraction.cornerBg : '#FFFFFF',
              color: activeTab === 'multiplication' ? '#FFFFFF' : '#475569',
              border: activeTab === 'multiplication' ? `1px solid ${currentTheme.subtraction.cornerBg}` : '1px solid #D1D5DB',
              boxShadow: activeTab === 'multiplication' ? `0 2px 8px -1px ${currentTheme.subtraction.cornerBg}40` : undefined,
            }}
          >
            <span>✖️</span>
            <span>Multiplication</span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-semibold tabular-nums"
              style={{
                backgroundColor: activeTab === 'multiplication' ? 'rgba(255,255,255,0.2)' : '#F1F5F9',
                color: activeTab === 'multiplication' ? '#FFFFFF' : '#64748B',
              }}
            >
              2–30
            </span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* TAB CONTENT PANELS */}
        {/* ========================================================= */}

        {/* --------------------------------------------------------- */}
        {/* TAB 1: ADDITION (Only visible when activeTab === 'addition') */}
        {/* --------------------------------------------------------- */}
        <div
          id="addition-tab-panel"
          role="tabpanel"
          aria-labelledby="tab-addition-button"
          style={{ display: activeTab === 'addition' ? 'block' : 'none' }}
        >
          {/* Table 1(a): Addition Table: Your Turn */}
          <section
            id="card-addition-practice"
            className="bg-white rounded-2xl border p-5 sm:p-7 mb-8 shadow-xs transition-colors duration-200"
            style={{ borderColor: currentTheme.cardBorder }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
              <h2
                id="title-addition-practice"
                className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight"
              >
                Addition Table: Your Turn
              </h2>
              {renderTimerPill(additionState, 'addition')}
            </div>
            <p className="text-slate-600 italic text-sm mb-1">
              Fill in each cell with the sum of its row header and column header.
            </p>
            <p className="text-xs text-slate-500 mb-5">
              ⏱ Press <strong>Start Clock</strong> when you begin and <strong>Stop</strong> when you finish — the total time is measured across as many checks as you like.
            </p>

            {/* Scroll Wrapper for Grid */}
            <div className="overflow-x-auto pb-4 pt-1">
              <div
                className="inline-block min-w-[700px] sm:min-w-[760px] select-none"
                data-corner-number={sharedData.corner}
              >
                <div className="grid grid-cols-10 gap-1.5 sm:gap-2">
                  {/* Row 1: Corner + 9 Top Headers */}
                  <div
                    id="cell-corner-addition"
                    className="flex items-center justify-center font-bold text-lg sm:text-xl rounded-lg h-12 sm:h-14 shadow-xs select-none transition-all duration-150"
                    style={{
                      backgroundColor: additionColors.cornerBg,
                      color: additionColors.cornerText,
                    }}
                    title={`Operator: + (Corner number in data: ${sharedData.corner})`}
                  >
                    +
                  </div>
                  {sharedData.topHeaders.map((num, cIdx) => {
                    const isColHighlighted = activeCell?.tab === 'addition' && activeCell?.c === cIdx;
                    return (
                      <div
                        key={`add-top-${cIdx}`}
                        id={`cell-header-top-add-${cIdx}`}
                        className="flex items-center justify-center font-bold text-base sm:text-lg rounded-lg h-12 sm:h-14 tabular-nums shadow-xs select-none transition-all duration-150"
                        style={{
                          backgroundColor: isColHighlighted
                            ? currentTheme.headerHighlightBg
                            : additionColors.headerBg,
                          color: additionColors.headerText,
                          boxShadow: isColHighlighted ? `0 0 0 2px ${currentTheme.headerHighlightRing}` : undefined,
                          transform: isColHighlighted ? 'scale(1.03)' : 'scale(1)',
                        }}
                      >
                        {num}
                      </div>
                    );
                  })}

                  {/* Rows 2–10: Left Header + 9 Question Cells */}
                  {sharedData.leftHeaders.map((rowNum, rIdx) => {
                    const isRowHighlighted = activeCell?.tab === 'addition' && activeCell?.r === rIdx;
                    return (
                      <React.Fragment key={`add-row-${rIdx}`}>
                        {/* Left Header Column */}
                        <div
                          id={`cell-header-left-add-${rIdx}`}
                          className="flex items-center justify-center font-bold text-base sm:text-lg rounded-lg h-12 sm:h-14 tabular-nums shadow-xs select-none transition-all duration-150"
                          style={{
                            backgroundColor: isRowHighlighted
                              ? currentTheme.headerHighlightBg
                              : additionColors.headerBg,
                            color: additionColors.headerText,
                            boxShadow: isRowHighlighted ? `0 0 0 2px ${currentTheme.headerHighlightRing}` : undefined,
                            transform: isRowHighlighted ? 'scale(1.03)' : 'scale(1)',
                          }}
                        >
                          {rowNum}
                        </div>

                        {/* 9 Input Cells */}
                        {sharedData.topHeaders.map((colNum, cIdx) => {
                          const cellKey = `${rIdx}-${cIdx}`;
                          const currentVal = additionState.answers[cellKey] ?? '';
                          const status = additionState.statusMap[cellKey] || 'neutral';
                          const isFocused = activeCell?.tab === 'addition' && activeCell?.r === rIdx && activeCell?.c === cIdx;

                          // Calculate cell color style per dynamic theme
                          let cellBg = '#FFFFFF';
                          let cellBorder = '#D1D5DB';
                          let cellText = '#1F2937';
                          let cellOutline = 'none';

                          if (status === 'correct') {
                            cellBg = currentTheme.correctBg;
                            cellBorder = currentTheme.correctBorder;
                            cellText = currentTheme.correctText;
                          } else if (status === 'wrong') {
                            cellBg = currentTheme.wrongBg;
                            cellBorder = currentTheme.wrongBorder;
                            cellText = currentTheme.wrongText;
                          } else if (isFocused) {
                            cellBg = currentTheme.cellFocusBg;
                            cellBorder = currentTheme.cellFocusRing;
                            cellOutline = `2px solid ${currentTheme.cellFocusRing}`;
                          }

                          return (
                            <input
                              key={`add-cell-${cellKey}`}
                              id={`input-add-${cellKey}`}
                              ref={(el) => {
                                additionInputsRef.current[cellKey] = el;
                              }}
                              type="text"
                              inputMode="numeric"
                              autoComplete="off"
                              autoCorrect="off"
                              spellCheck="false"
                              aria-label={`Row ${rowNum} plus column ${colNum}`}
                              value={currentVal}
                              onFocus={() => setActiveCell({ tab: 'addition', r: rIdx, c: cIdx })}
                              onBlur={() =>
                                setActiveCell((curr) =>
                                  curr?.tab === 'addition' && curr?.r === rIdx && curr?.c === cIdx ? null : curr
                                )
                              }
                              onChange={(e) =>
                                handleInputChange('addition', rIdx, cIdx, e.target.value)
                              }
                              onKeyDown={(e) => handleKeyDown(e, 'addition', rIdx, cIdx)}
                              className="w-full h-12 sm:h-14 text-center font-bold text-base sm:text-lg rounded-lg tabular-nums transition-all duration-150 border shadow-2xs hover:brightness-98"
                              style={{
                                backgroundColor: cellBg,
                                borderColor: cellBorder,
                                color: cellText,
                                outline: cellOutline,
                                outlineOffset: '-1px',
                              }}
                            />
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Action Buttons & Score Line */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  id="btn-check-addition"
                  onClick={() => handleCheckAnswers('addition')}
                  onMouseEnter={() => setIsCheckAddHovered(true)}
                  onMouseLeave={() => setIsCheckAddHovered(false)}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm sm:text-base text-white shadow-xs transition-all duration-150 cursor-pointer outline-none focus-visible:ring-3 focus-visible:ring-offset-2 active:scale-95"
                  style={{
                    backgroundColor: isCheckAddHovered ? additionColors.checkBtnHoverBg : additionColors.checkBtnBg,
                  }}
                >
                  Check Answers
                </button>

                <button
                  id="btn-clear-addition"
                  onClick={() => handleClearTable('addition')}
                  className="px-5 py-2.5 rounded-xl font-semibold text-sm sm:text-base text-slate-700 bg-white border border-slate-300 shadow-2xs transition-all duration-150 cursor-pointer outline-none hover:bg-slate-100 active:bg-slate-200 active:scale-95 focus-visible:ring-2 focus-visible:ring-slate-400"
                >
                  Clear
                </button>
              </div>

              {/* Score Line */}
              {additionState.hasChecked && (
                <div
                  id="score-addition"
                  aria-live="polite"
                  className="text-base sm:text-lg font-bold tabular-nums"
                  style={{
                    color:
                      additionState.scoreType === 'perfect' || additionState.scoreType === 'success'
                        ? currentTheme.correctText
                        : additionState.scoreType === 'amber'
                        ? '#B45309'
                        : currentTheme.wrongText,
                  }}
                >
                  {additionState.scoreMessage}
                </div>
              )}
            </div>
          </section>

          {/* Table 1(b): Addition Table: Answers */}
          <section
            id="card-addition-answers"
            className="bg-white rounded-2xl border p-5 sm:p-7 shadow-xs transition-colors duration-200"
            style={{ borderColor: currentTheme.cardBorder }}
          >
            <h2
              id="title-addition-answers"
              className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight"
            >
              Addition Table: Answers
            </h2>
            <p className="text-slate-600 italic text-sm mb-5">
              Reference answer key for row header + column header.
            </p>

            {/* Scroll Wrapper for Answers Grid */}
            <div className="overflow-x-auto pb-4 pt-1">
              <div
                className="inline-block min-w-[700px] sm:min-w-[760px] select-none"
                data-corner-number={sharedData.corner}
              >
                <div className="grid grid-cols-10 gap-1.5 sm:gap-2">
                  {/* Row 1: Corner + 9 Top Headers */}
                  <div
                    id="cell-corner-addition-ans"
                    className="flex items-center justify-center font-bold text-lg sm:text-xl rounded-lg h-12 sm:h-14 shadow-xs transition-colors duration-200"
                    style={{
                      backgroundColor: additionColors.cornerBg,
                      color: additionColors.cornerText,
                    }}
                  >
                    +
                  </div>
                  {sharedData.topHeaders.map((num, cIdx) => (
                    <div
                      key={`add-ans-top-${cIdx}`}
                      id={`cell-ans-header-top-add-${cIdx}`}
                      className="flex items-center justify-center font-bold text-base sm:text-lg rounded-lg h-12 sm:h-14 tabular-nums shadow-xs transition-colors duration-200"
                      style={{
                        backgroundColor: additionColors.headerBg,
                        color: additionColors.headerText,
                      }}
                    >
                      {num}
                    </div>
                  ))}

                  {/* Rows 2–10: Left Header + 9 Answer Cells */}
                  {sharedData.leftHeaders.map((rowNum, rIdx) => (
                    <React.Fragment key={`add-ans-row-${rIdx}`}>
                      {/* Left Header */}
                      <div
                        id={`cell-ans-header-left-add-${rIdx}`}
                        className="flex items-center justify-center font-bold text-base sm:text-lg rounded-lg h-12 sm:h-14 tabular-nums shadow-xs transition-colors duration-200"
                        style={{
                          backgroundColor: additionColors.headerBg,
                          color: additionColors.headerText,
                        }}
                      >
                        {rowNum}
                      </div>

                      {/* 9 Calculated Answers */}
                      {sharedData.topHeaders.map((colNum, cIdx) => {
                        const sum = rowNum + colNum;
                        return (
                          <div
                            key={`add-ans-cell-${rIdx}-${cIdx}`}
                            id={`cell-ans-val-add-${rIdx}-${cIdx}`}
                            className="flex items-center justify-center font-bold text-base sm:text-lg rounded-lg h-12 sm:h-14 tabular-nums shadow-2xs transition-colors duration-200"
                            style={{
                              backgroundColor: additionColors.answerBodyBg,
                              color: additionColors.answerBodyText,
                            }}
                          >
                            {sum}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* --------------------------------------------------------- */}
        {/* TAB 2: SUBTRACTION (Only visible when activeTab === 'subtraction') */}
        {/* --------------------------------------------------------- */}
        <div
          id="subtraction-tab-panel"
          role="tabpanel"
          aria-labelledby="tab-subtraction-button"
          style={{ display: activeTab === 'subtraction' ? 'block' : 'none' }}
        >
          {/* Table 2(a): Subtraction Table: Your Turn */}
          <section
            id="card-subtraction-practice"
            className="bg-white rounded-2xl border p-5 sm:p-7 mb-8 shadow-xs transition-colors duration-200"
            style={{ borderColor: currentTheme.cardBorder }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
              <h2
                id="title-subtraction-practice"
                className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight"
              >
                Subtraction Table: Your Turn
              </h2>
              {renderTimerPill(subtractionState, 'subtraction')}
            </div>
            <p className="text-slate-600 italic text-sm mb-1">
              Fill in each cell with the difference of its row header minus column header.
            </p>
            <p className="text-xs text-slate-500 mb-5">
              ⏱ Press <strong>Start Clock</strong> when you begin and <strong>Stop</strong> when you finish — the total time is measured across as many checks as you like.
            </p>

            {/* Scroll Wrapper for Grid */}
            <div className="overflow-x-auto pb-4 pt-1">
              <div
                className="inline-block min-w-[700px] sm:min-w-[760px] select-none"
                data-corner-number={sharedData.corner}
              >
                <div className="grid grid-cols-10 gap-1.5 sm:gap-2">
                  {/* Row 1: Corner + 9 Top Headers */}
                  <div
                    id="cell-corner-subtraction"
                    className="flex items-center justify-center font-bold text-lg sm:text-xl rounded-lg h-12 sm:h-14 shadow-xs select-none transition-all duration-150"
                    style={{
                      backgroundColor: subtractionColors.cornerBg,
                      color: subtractionColors.cornerText,
                    }}
                    title={`Operator: − (Corner number in data: ${sharedData.corner})`}
                  >
                    −
                  </div>
                  {sharedData.topHeaders.map((num, cIdx) => {
                    const isColHighlighted = activeCell?.tab === 'subtraction' && activeCell?.c === cIdx;
                    return (
                      <div
                        key={`sub-top-${cIdx}`}
                        id={`cell-header-top-sub-${cIdx}`}
                        className="flex items-center justify-center font-bold text-base sm:text-lg rounded-lg h-12 sm:h-14 tabular-nums shadow-xs select-none transition-all duration-150"
                        style={{
                          backgroundColor: isColHighlighted
                            ? currentTheme.headerHighlightBg
                            : subtractionColors.headerBg,
                          color: subtractionColors.headerText,
                          boxShadow: isColHighlighted ? `0 0 0 2px ${currentTheme.headerHighlightRing}` : undefined,
                          transform: isColHighlighted ? 'scale(1.03)' : 'scale(1)',
                        }}
                      >
                        {num}
                      </div>
                    );
                  })}

                  {/* Rows 2–10: Left Header + 9 Question Cells */}
                  {sharedData.leftHeaders.map((rowNum, rIdx) => {
                    const isRowHighlighted = activeCell?.tab === 'subtraction' && activeCell?.r === rIdx;
                    return (
                      <React.Fragment key={`sub-row-${rIdx}`}>
                        {/* Left Header Column */}
                        <div
                          id={`cell-header-left-sub-${rIdx}`}
                          className="flex items-center justify-center font-bold text-base sm:text-lg rounded-lg h-12 sm:h-14 tabular-nums shadow-xs select-none transition-all duration-150"
                          style={{
                            backgroundColor: isRowHighlighted
                              ? currentTheme.headerHighlightBg
                              : subtractionColors.headerBg,
                            color: subtractionColors.headerText,
                            boxShadow: isRowHighlighted ? `0 0 0 2px ${currentTheme.headerHighlightRing}` : undefined,
                            transform: isRowHighlighted ? 'scale(1.03)' : 'scale(1)',
                          }}
                        >
                          {rowNum}
                        </div>

                        {/* 9 Input Cells */}
                        {sharedData.topHeaders.map((colNum, cIdx) => {
                          const cellKey = `${rIdx}-${cIdx}`;
                          const currentVal = subtractionState.answers[cellKey] ?? '';
                          const status = subtractionState.statusMap[cellKey] || 'neutral';
                          const isFocused = activeCell?.tab === 'subtraction' && activeCell?.r === rIdx && activeCell?.c === cIdx;

                          // Calculate cell color style per dynamic theme
                          let cellBg = '#FFFFFF';
                          let cellBorder = '#D1D5DB';
                          let cellText = '#1F2937';
                          let cellOutline = 'none';

                          if (status === 'correct') {
                            cellBg = currentTheme.correctBg;
                            cellBorder = currentTheme.correctBorder;
                            cellText = currentTheme.correctText;
                          } else if (status === 'wrong') {
                            cellBg = currentTheme.wrongBg;
                            cellBorder = currentTheme.wrongBorder;
                            cellText = currentTheme.wrongText;
                          } else if (isFocused) {
                            cellBg = currentTheme.cellFocusBg;
                            cellBorder = currentTheme.cellFocusRing;
                            cellOutline = `2px solid ${currentTheme.cellFocusRing}`;
                          }

                          return (
                            <input
                              key={`sub-cell-${cellKey}`}
                              id={`input-sub-${cellKey}`}
                              ref={(el) => {
                                subtractionInputsRef.current[cellKey] = el;
                              }}
                              type="text"
                              inputMode="numeric"
                              autoComplete="off"
                              autoCorrect="off"
                              spellCheck="false"
                              aria-label={`Row ${rowNum} minus column ${colNum}`}
                              value={currentVal}
                              onFocus={() => setActiveCell({ tab: 'subtraction', r: rIdx, c: cIdx })}
                              onBlur={() =>
                                setActiveCell((curr) =>
                                  curr?.tab === 'subtraction' && curr?.r === rIdx && curr?.c === cIdx ? null : curr
                                )
                              }
                              onChange={(e) =>
                                handleInputChange('subtraction', rIdx, cIdx, e.target.value)
                              }
                              onKeyDown={(e) => handleKeyDown(e, 'subtraction', rIdx, cIdx)}
                              className="w-full h-12 sm:h-14 text-center font-bold text-base sm:text-lg rounded-lg tabular-nums transition-all duration-150 border shadow-2xs hover:brightness-98"
                              style={{
                                backgroundColor: cellBg,
                                borderColor: cellBorder,
                                color: cellText,
                                outline: cellOutline,
                                outlineOffset: '-1px',
                              }}
                            />
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Action Buttons & Score Line */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  id="btn-check-subtraction"
                  onClick={() => handleCheckAnswers('subtraction')}
                  onMouseEnter={() => setIsCheckSubHovered(true)}
                  onMouseLeave={() => setIsCheckSubHovered(false)}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm sm:text-base text-white shadow-xs transition-all duration-150 cursor-pointer outline-none focus-visible:ring-3 focus-visible:ring-offset-2 active:scale-95"
                  style={{
                    backgroundColor: isCheckSubHovered ? subtractionColors.checkBtnHoverBg : subtractionColors.checkBtnBg,
                  }}
                >
                  Check Answers
                </button>

                <button
                  id="btn-clear-subtraction"
                  onClick={() => handleClearTable('subtraction')}
                  className="px-5 py-2.5 rounded-xl font-semibold text-sm sm:text-base text-slate-700 bg-white border border-slate-300 shadow-2xs transition-all duration-150 cursor-pointer outline-none hover:bg-slate-100 active:bg-slate-200 active:scale-95 focus-visible:ring-2 focus-visible:ring-slate-400"
                >
                  Clear
                </button>
              </div>

              {/* Score Line */}
              {subtractionState.hasChecked && (
                <div
                  id="score-subtraction"
                  aria-live="polite"
                  className="text-base sm:text-lg font-bold tabular-nums"
                  style={{
                    color:
                      subtractionState.scoreType === 'perfect' ||
                      subtractionState.scoreType === 'success'
                        ? currentTheme.correctText
                        : subtractionState.scoreType === 'amber'
                        ? '#B45309'
                        : currentTheme.wrongText,
                  }}
                >
                  {subtractionState.scoreMessage}
                </div>
              )}
            </div>
          </section>

          {/* Table 2(b): Subtraction Table: Answers */}
          <section
            id="card-subtraction-answers"
            className="bg-white rounded-2xl border p-5 sm:p-7 shadow-xs transition-colors duration-200"
            style={{ borderColor: currentTheme.cardBorder }}
          >
            <h2
              id="title-subtraction-answers"
              className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight"
            >
              Subtraction Table: Answers
            </h2>
            <p className="text-slate-600 italic text-sm mb-5">
              Reference answer key for row header − column header.
            </p>

            {/* Scroll Wrapper for Answers Grid */}
            <div className="overflow-x-auto pb-4 pt-1">
              <div
                className="inline-block min-w-[700px] sm:min-w-[760px] select-none"
                data-corner-number={sharedData.corner}
              >
                <div className="grid grid-cols-10 gap-1.5 sm:gap-2">
                  {/* Row 1: Corner + 9 Top Headers */}
                  <div
                    id="cell-corner-subtraction-ans"
                    className="flex items-center justify-center font-bold text-lg sm:text-xl rounded-lg h-12 sm:h-14 shadow-xs transition-colors duration-200"
                    style={{
                      backgroundColor: subtractionColors.cornerBg,
                      color: subtractionColors.cornerText,
                    }}
                  >
                    −
                  </div>
                  {sharedData.topHeaders.map((num, cIdx) => (
                    <div
                      key={`sub-ans-top-${cIdx}`}
                      id={`cell-ans-header-top-sub-${cIdx}`}
                      className="flex items-center justify-center font-bold text-base sm:text-lg rounded-lg h-12 sm:h-14 tabular-nums shadow-xs transition-colors duration-200"
                      style={{
                        backgroundColor: subtractionColors.headerBg,
                        color: subtractionColors.headerText,
                      }}
                    >
                      {num}
                    </div>
                  ))}

                  {/* Rows 2–10: Left Header + 9 Answer Cells */}
                  {sharedData.leftHeaders.map((rowNum, rIdx) => (
                    <React.Fragment key={`sub-ans-row-${rIdx}`}>
                      {/* Left Header */}
                      <div
                        id={`cell-ans-header-left-sub-${rIdx}`}
                        className="flex items-center justify-center font-bold text-base sm:text-lg rounded-lg h-12 sm:h-14 tabular-nums shadow-xs transition-colors duration-200"
                        style={{
                          backgroundColor: subtractionColors.headerBg,
                          color: subtractionColors.headerText,
                        }}
                      >
                        {rowNum}
                      </div>

                      {/* 9 Calculated Answers */}
                      {sharedData.topHeaders.map((colNum, cIdx) => {
                        const diff = rowNum - colNum;
                        return (
                          <div
                            key={`sub-ans-cell-${rIdx}-${cIdx}`}
                            id={`cell-ans-val-sub-${rIdx}-${cIdx}`}
                            className="flex items-center justify-center font-bold text-base sm:text-lg rounded-lg h-12 sm:h-14 tabular-nums shadow-2xs transition-colors duration-200"
                            style={{
                              backgroundColor: subtractionColors.answerBodyBg,
                              color: subtractionColors.answerBodyText,
                            }}
                          >
                            {diff}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* --------------------------------------------------------- */}
        {/* TAB 3: SQUARES & CUBES (Only visible when activeTab === 'powers') */}
        {/* --------------------------------------------------------- */}
        <div
          id="powers-tab-panel"
          role="tabpanel"
          aria-labelledby="tab-powers-button"
          style={{ display: activeTab === 'powers' ? 'block' : 'none' }}
        >
          <SquaresCubesPractice currentTheme={currentTheme} />
        </div>

        {/* --------------------------------------------------------- */}
        {/* TAB 4: MULTIPLICATION (Only visible when activeTab === 'multiplication') */}
        {/* --------------------------------------------------------- */}
        <div
          id="multiplication-tab-panel"
          role="tabpanel"
          aria-labelledby="tab-multiplication-button"
          style={{ display: activeTab === 'multiplication' ? 'block' : 'none' }}
        >
          <MultiplicationPractice currentTheme={currentTheme} />
        </div>

        {/* ========================================================= */}
        {/* FOOTER */}
        {/* ========================================================= */}
        <footer id="app-footer" className="mt-12 text-center">
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl mx-auto leading-relaxed">
            All tables share the same headers · Green = correct / Red = try again · Squares, cubes, and multiplication trainers check answers on Enter and pass to the next question.
          </p>
        </footer>
      </div>
    </div>
  );
}
