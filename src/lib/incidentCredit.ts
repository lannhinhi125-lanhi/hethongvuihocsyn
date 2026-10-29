export function incidentCredit(coefficients: number[]): number | null {
  if (!coefficients.length) return null;
  if (coefficients.some(value => !Number.isFinite(value))) throw new Error('Hệ số công không hợp lệ.');
  const positive = Math.max(0, ...coefficients);
  const negative = Math.min(0, ...coefficients);
  return Math.round((positive + negative) * 1000) / 1000;
}
