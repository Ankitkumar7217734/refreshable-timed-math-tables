export type ThemeId = 'ocean' | 'forest' | 'sunset' | 'classic' | 'berry';

export type TabType = 'addition' | 'subtraction' | 'powers' | 'multiplication';

export type CellStatus = 'correct' | 'wrong' | 'neutral';

export interface SharedData {
  topHeaders: number[];   // 9 numbers (10 - 99)
  leftHeaders: number[];  // 9 numbers (10 - 99)
  corner: number;         // 1 corner number (10 - 99)
}

export interface PracticeState {
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

export type PowerMode = 'all' | 'squares' | 'cubes';

export interface PowerQuestion {
  id: string;
  base: number;
  power: 2 | 3;
  answer: number;
}

export interface PowerHistoryItem {
  id: string;
  base: number;
  power: 2 | 3;
  answer: number;
  userAnswer: string;
  isCorrect: boolean;
  timestamp: number;
}

export interface MultiplicationQuestion {
  id: string;
  table: number;
  multiplier: number;
  answer: number;
}

export interface MultiplicationHistoryItem {
  id: string;
  table: number;
  multiplier: number;
  answer: number;
  userAnswer: string;
  isCorrect: boolean;
  timestamp: number;
}
