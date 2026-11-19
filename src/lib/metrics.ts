export function callReduction(baseline: number, current: number): number | null {
  return baseline > 0 ? Math.round(((baseline - current) / baseline) * 1000) / 10 : null;
}