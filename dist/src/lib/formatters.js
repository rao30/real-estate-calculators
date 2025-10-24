export function formatCurrency(value, { maximumFractionDigits = 0 } = {}) {
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits,
    minimumFractionDigits: Math.min(2, maximumFractionDigits)
  });
}

export function formatPercent(value, fractionDigits = 2) {
  if (!Number.isFinite(value)) return '—';
  return `${value.toFixed(fractionDigits)}%`;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
