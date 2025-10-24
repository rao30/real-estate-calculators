import { clamp } from './formatters.js';

export function monthlyPayment(principal, annualRatePct, termYears) {
  const amount = Math.max(0, Number(principal) || 0);
  const years = Math.max(1, Number(termYears) || 0);
  const rate = Math.max(0, Number(annualRatePct) || 0) / 100 / 12;
  const periods = Math.round(years * 12);

  if (periods <= 0) return 0;
  if (rate === 0) return amount / periods;

  const factor = Math.pow(1 + rate, periods);
  return amount * ((rate * factor) / (factor - 1));
}

export function interestOnlyPayment(principal, annualRatePct) {
  const amount = Math.max(0, Number(principal) || 0);
  const rate = Math.max(0, Number(annualRatePct) || 0) / 100 / 12;
  return amount * rate;
}

export function balloonBalance(principal, annualRatePct, termYears, balloonYears) {
  const amount = Math.max(0, Number(principal) || 0);
  const totalYears = Math.max(0, Number(termYears) || 0);
  const horizonYears = clamp(Number(balloonYears) || 0, 0, totalYears);
  if (amount === 0 || horizonYears <= 0) return 0;

  const totalMonths = Math.round(Math.max(1, totalYears * 12));
  const horizonMonths = Math.round(Math.min(totalMonths, horizonYears * 12));
  const rate = Math.max(0, Number(annualRatePct) || 0) / 100 / 12;

  if (rate === 0) {
    const payment = monthlyPayment(amount, annualRatePct, termYears);
    const remaining = amount - payment * horizonMonths;
    return Math.max(0, remaining);
  }

  const payment = monthlyPayment(amount, annualRatePct, termYears);
  const factor = Math.pow(1 + rate, horizonMonths);
  const balance = amount * factor - payment * ((factor - 1) / rate);
  return Math.max(0, balance);
}
