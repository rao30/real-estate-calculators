import { clamp } from './formatters.js';
import { monthlyPayment, interestOnlyPayment, balloonBalance } from './finance.js';

export function calculateOffer(inputs) {
  const price = Math.max(0, Number(inputs.price) || 0);
  const taxRate = Math.max(0, Number(inputs.taxRate) || 0);
  const insuranceAnnual = Math.max(0, Number(inputs.insuranceAnnual) || 0);
  const closingPercent = Math.max(0, Number(inputs.closingPercent) || 0);

  const firstPercent = clamp(Number(inputs.firstPercent) || 0, 0, 100);
  const secondPercent = clamp(Number(inputs.secondPercent) || 0, 0, 100);
  const downPercent = clamp(100 - firstPercent - secondPercent, 0, 100);

  const firstAmount = price * (firstPercent / 100);
  const secondAmount = price * (secondPercent / 100);
  const downAmount = price * (downPercent / 100);

  const taxMonthly = price * (taxRate / 100) / 12;
  const insuranceMonthly = insuranceAnnual / 12;
  const closingCash = price * (closingPercent / 100);

  const firstRate = Number(inputs.firstRate) || 0;
  const firstTerm = Number(inputs.firstTerm) || 0;
  const secondRate = Number(inputs.secondRate) || 0;
  const secondTerm = Number(inputs.secondTerm) || 0;
  const secondInterestOnly = Boolean(inputs.secondInterestOnly);
  const balloonYears = Math.max(0, Number(inputs.balloonYears) || 0);

  const firstPayment = monthlyPayment(firstAmount, firstRate, firstTerm);
  const secondPayment = secondInterestOnly
    ? interestOnlyPayment(secondAmount, secondRate)
    : monthlyPayment(secondAmount, secondRate, secondTerm);

  const totalPiti = firstPayment + secondPayment + taxMonthly + insuranceMonthly;
  const cashToClose = closingCash + downAmount;

  const conventionalDownPercent = clamp(Number(inputs.conventionalDownPercent) || 0, 0, 100);
  const conventionalRate = Number(inputs.conventionalRate) || 0;
  const conventionalTerm = Number(inputs.conventionalTerm) || 0;
  const conventionalClosingPercent = Math.max(0, Number(inputs.conventionalClosingPercent) || 0);

  const conventionalDownAmount = price * (conventionalDownPercent / 100);
  const conventionalLoanAmount = price - conventionalDownAmount;
  const conventionalPayment = monthlyPayment(conventionalLoanAmount, conventionalRate, conventionalTerm);
  const conventionalPiti = conventionalPayment + taxMonthly + insuranceMonthly;
  const conventionalCash = price * (conventionalClosingPercent / 100) + conventionalDownAmount;

  const balloonDue = balloonYears > 0
    ? (secondInterestOnly
        ? secondAmount
        : balloonBalance(secondAmount, secondRate, secondTerm, balloonYears))
    : 0;

  return {
    price,
    formattedPrice: price,
    taxMonthly,
    insuranceMonthly,
    closingCash,
    firstPercent,
    secondPercent,
    downPercent,
    firstAmount,
    secondAmount,
    downAmount,
    firstPayment,
    secondPayment,
    totalPiti,
    cashToClose,
    conventional: {
      downAmount: conventionalDownAmount,
      payment: conventionalPayment,
      piti: conventionalPiti,
      cashToClose: conventionalCash
    },
    balloon: {
      years: balloonYears,
      amount: balloonDue
    }
  };
}

export function calculateDealAnalysis(inputs) {
  const price = Math.max(0, Number(inputs.price) || 0);
  const sqft = Math.max(0, Number(inputs.squareFeet) || 0);
  const rehabMode = inputs.rehabMode === 'perSqft' ? 'perSqft' : 'total';
  const rehabValue = Math.max(0, Number(inputs.rehabValue) || 0);
  const closingPercent = Math.max(0, Number(inputs.closingPercent) || 0);
  const downPercent = clamp(Number(inputs.downPercent) || 0, 0, 100);

  const monthlyExpenses = Math.max(0, Number(inputs.monthlyExpenses) || 0);
  const utilities = Math.max(0, Number(inputs.utilities) || 0);
  const managementPercent = Math.max(0, Number(inputs.managementPercent) || 0);
  const otherIncome = Math.max(0, Number(inputs.otherIncome) || 0);
  const taxesAnnual = Math.max(0, Number(inputs.taxesAnnual) || 0);
  const insuranceAnnual = Math.max(0, Number(inputs.insuranceAnnual) || 0);
  const otherAnnual = Math.max(0, Number(inputs.otherAnnual) || 0);
  const vacancyPercent = clamp(Number(inputs.vacancyPercent) || 0, 0, 100);
  const rate = Number(inputs.rate) || 0;
  const amortYears = Math.max(1, Number(inputs.amortYears) || 0);

  const rehabTotal = rehabMode === 'perSqft' ? rehabValue * sqft : rehabValue;
  const closingCost = price * (closingPercent / 100);
  const downPayment = price * (downPercent / 100);
  const loanAmount = Math.max(0, price - downPayment);

  const rents = Array.isArray(inputs.rents) ? inputs.rents.map(Number) : [];
  const grossRent = rents.reduce((sum, value) => sum + (Number.isFinite(value) ? Math.max(0, value) : 0), 0);
  const grossMonthlyIncome = grossRent + otherIncome;
  const vacancyLoss = grossMonthlyIncome * (vacancyPercent / 100);
  const effectiveIncome = grossMonthlyIncome - vacancyLoss;

  const managementFee = effectiveIncome * (managementPercent / 100);
  const baseOperatingMonthly = monthlyExpenses + utilities + (taxesAnnual / 12) + (insuranceAnnual / 12) + (otherAnnual / 12);
  const operatingExpenses = baseOperatingMonthly + managementFee;
  const noiMonthly = effectiveIncome - operatingExpenses;
  const noiAnnual = noiMonthly * 12;
  const mortgagePayment = loanAmount > 0 ? monthlyPayment(loanAmount, rate, amortYears) : 0;
  const monthlyCashflow = noiMonthly - mortgagePayment;

  const projectCost = price + rehabTotal;
  const cashNeeded = downPayment + closingCost + rehabTotal;
  const capRate = projectCost > 0 ? (noiAnnual / projectCost) * 100 : Number.NaN;
  const cashOnCash = cashNeeded > 0 ? (monthlyCashflow * 12 / cashNeeded) * 100 : Number.NaN;
  const dscr = mortgagePayment > 0 ? noiMonthly / mortgagePayment : Number.NaN;

  return {
    price,
    rehabTotal,
    closingCost,
    projectCost,
    downPayment,
    loanAmount,
    cashNeeded,
    rents: grossRent,
    otherIncome,
    vacancyLoss: -vacancyLoss,
    effectiveIncome,
    managementFee,
    operatingExpenses,
    noiMonthly,
    noiAnnual,
    mortgagePayment,
    monthlyCashflow,
    capRate,
    cashOnCash,
    dscr
  };
}
