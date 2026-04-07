export const fmtTime = (s: number): string =>
  `${Math.floor(s / 60).toString().padStart(2, '0')}:${Math.round(s % 60).toString().padStart(2, '0')}`;

export const fmtPct = (value: number, decimals = 0): string =>
  `${(value * 100).toFixed(decimals)}%`;

export const fmtScore = (score: number, maxScore: number): string =>
  `${score}/${maxScore}`;
