import test from 'node:test';
import assert from 'node:assert/strict';

import { monthlyPayment, balloonBalance } from '../src/lib/finance.js';
import { calculateOffer, calculateDealAnalysis } from '../src/lib/calculators.js';

test('finance utilities: amortized payment', () => {
  assert.ok(Math.abs(monthlyPayment(100000, 6, 30) - 599.55) < 0.01);
});

test('finance utilities: zero interest payment', () => {
  assert.ok(Math.abs(monthlyPayment(120000, 0, 30) - 333.33) < 0.01);
});

test('finance utilities: balloon balance less than principal', () => {
  const principal = 100000;
  const balance = balloonBalance(principal, 7, 30, 10);
  assert.ok(balance > 0);
  assert.ok(balance < principal);
});

test('offer calculator: matches baseline scenario', () => {
  const result = calculateOffer({
    price: 500000,
    taxRate: 2.23503,
    insuranceAnnual: 500000 * 0.008,
    closingPercent: 2.5,
    firstPercent: 50,
    secondPercent: 40,
    firstRate: 7.25,
    firstTerm: 30,
    secondRate: 5.5,
    secondTerm: 30,
    secondInterestOnly: false,
    balloonYears: 0,
    conventionalDownPercent: 20,
    conventionalRate: 7.25,
    conventionalTerm: 30,
    conventionalClosingPercent: 2.5
  });

  assert.ok(Math.abs(result.firstPayment - 1705.4407) < 0.01);
  assert.ok(Math.abs(result.secondPayment - 1135.5780) < 0.01);
  assert.ok(Math.abs(result.taxMonthly - 931.2625) < 0.01);
  assert.ok(Math.abs(result.insuranceMonthly - 333.3333) < 0.01);
  assert.ok(Math.abs(result.totalPiti - 4105.6145) < 0.02);
  assert.ok(Math.abs(result.cashToClose - 62500) < 0.5);
  assert.ok(Math.abs(result.conventional.payment - 2728.7051) < 0.01);
  assert.ok(Math.abs(result.conventional.piti - 3993.3009) < 0.02);
  assert.ok(Math.abs(result.conventional.cashToClose - 112500) < 0.5);
  assert.ok(Math.abs(result.downPercent - 10) < 0.0001);
  assert.ok(Math.abs(result.downAmount - 50000) < 0.5);
});

test('offer calculator: balloon on interest-only second equals principal', () => {
  const result = calculateOffer({
    price: 500000,
    taxRate: 2.23503,
    insuranceAnnual: 500000 * 0.008,
    closingPercent: 2.5,
    firstPercent: 50,
    secondPercent: 40,
    firstRate: 7.25,
    firstTerm: 30,
    secondRate: 5.5,
    secondTerm: 30,
    secondInterestOnly: true,
    balloonYears: 5,
    conventionalDownPercent: 20,
    conventionalRate: 7.25,
    conventionalTerm: 30,
    conventionalClosingPercent: 2.5
  });

  assert.ok(Math.abs(result.balloon.amount - result.secondAmount) < 0.01);
  assert.equal(result.balloon.years, 5);
});

test('deal analyzer: default scenario metrics', () => {
  const analysis = calculateDealAnalysis({
    price: 350000,
    squareFeet: 1800,
    rehabMode: 'total',
    rehabValue: 30000,
    closingPercent: 3,
    downPercent: 20,
    rents: [1800],
    monthlyExpenses: 450,
    utilities: 150,
    managementPercent: 8,
    otherIncome: 0,
    taxesAnnual: 5200,
    insuranceAnnual: 1800,
    otherAnnual: 600,
    vacancyPercent: 5,
    rate: 6.75,
    amortYears: 30
  });

  assert.ok(Math.abs(analysis.cashNeeded - 110500) < 0.5);
  assert.ok(Math.abs(analysis.monthlyCashflow + 1476.2080) < 0.02);
  assert.ok(Math.abs(analysis.capRate - 1.07326) < 0.01);
  assert.ok(Math.abs(analysis.cashOnCash + 16.0312) < 0.05);
  assert.ok(Math.abs(analysis.dscr - 0.18714) < 0.001);
});
