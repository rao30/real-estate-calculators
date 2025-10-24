import './style.css';
import { formatCurrency, formatPercent } from './lib/formatters.js';
import { calculateOffer, calculateDealAnalysis } from './lib/calculators.js';
import { renderOfferPie, renderOfferBars } from './lib/charts.js';

const bindingMap = new Map();
document.querySelectorAll('[data-bind]').forEach((el) => {
  bindingMap.set(el.dataset.bind, el);
});

const offerForm = document.getElementById('offerForm');
const analyzerForm = document.getElementById('analyzerForm');

const offerElements = {
  price: offerForm.querySelector('#price'),
  taxRate: offerForm.querySelector('#taxRate'),
  insurance: offerForm.querySelector('#insAnnual'),
  closingPercent: offerForm.querySelector('#closingPct'),
  firstPercent: offerForm.querySelector('#firstPct'),
  firstPercentNumber: offerForm.querySelector('#firstPctNum'),
  secondPercent: offerForm.querySelector('#secondPct'),
  secondPercentNumber: offerForm.querySelector('#secondPctNum'),
  firstRate: offerForm.querySelector('#firstRate'),
  firstTerm: offerForm.querySelector('#firstTerm'),
  secondRate: offerForm.querySelector('#secondRate'),
  secondTerm: offerForm.querySelector('#secondTerm'),
  secondInterestOnly: offerForm.querySelector('#secondIO'),
  balloonYears: offerForm.querySelector('#balloonYears'),
  convDown: offerForm.querySelector('#convDown'),
  convRate: offerForm.querySelector('#convRate'),
  convTerm: offerForm.querySelector('#convTerm'),
  convClose: offerForm.querySelector('#convClose'),
  dallasButton: offerForm.querySelector('[data-action="dallas-rate"]')
};

const analyzerElements = {
  price: analyzerForm.querySelector('#anPrice'),
  sqft: analyzerForm.querySelector('#anSqft'),
  rehabMode: analyzerForm.querySelector('#rehabMode'),
  rehabValue: analyzerForm.querySelector('#rehabValue'),
  closingPercent: analyzerForm.querySelector('#anClosingPct'),
  downPercent: analyzerForm.querySelector('#anDownPct'),
  unitsList: analyzerForm.querySelector('#unitsList'),
  addUnit: analyzerForm.querySelector('[data-action="add-unit"]'),
  monthlyExpenses: analyzerForm.querySelector('#anMonthlyExpenses'),
  utilities: analyzerForm.querySelector('#anUtilities'),
  managementPercent: analyzerForm.querySelector('#anMgmtPct'),
  otherIncome: analyzerForm.querySelector('#anOtherIncome'),
  taxesAnnual: analyzerForm.querySelector('#anTaxesAnnual'),
  insuranceAnnual: analyzerForm.querySelector('#anInsAnnual'),
  otherAnnual: analyzerForm.querySelector('#anOtherAnnual'),
  vacancyPercent: analyzerForm.querySelector('#anVacancyPct'),
  rate: analyzerForm.querySelector('#anRate'),
  amortYears: analyzerForm.querySelector('#anAmortYears')
};

const pieCanvas = document.getElementById('offerPie');
const barCanvas = document.getElementById('offerBars');

let insuranceLocked = false;
let lastOfferSnapshot = null;

const setText = (key, value) => {
  const target = bindingMap.get(key);
  if (!target) return;
  target.textContent = value;
};

const formatMoney = (value, maximumFractionDigits = 0) => formatCurrency(value, { maximumFractionDigits });

function ensureDefaultInsurance() {
  if (insuranceLocked) return;
  const priceValue = Number(offerElements.price.value) || 0;
  if (priceValue <= 0) return;
  offerElements.insurance.value = Math.round(priceValue * 0.008);
}

function syncStructure(source) {
  let firstValue = Number(offerElements.firstPercent.value) || 0;
  let secondValue = Number(offerElements.secondPercent.value) || 0;

  if (source === 'first') {
    if (firstValue + secondValue > 100) {
      secondValue = Math.max(0, 100 - firstValue);
      offerElements.secondPercent.value = secondValue;
      offerElements.secondPercentNumber.value = secondValue;
    }
  } else if (source === 'second') {
    if (firstValue + secondValue > 100) {
      firstValue = Math.max(0, 100 - secondValue);
      offerElements.firstPercent.value = firstValue;
      offerElements.firstPercentNumber.value = firstValue;
    }
  }

  offerElements.firstPercent.value = firstValue;
  offerElements.firstPercentNumber.value = firstValue;
  offerElements.secondPercent.value = secondValue;
  offerElements.secondPercentNumber.value = secondValue;

  setText('offer.firstPercentLabel', `${firstValue.toFixed(1)}%`);
  setText('offer.secondPercentLabel', `${secondValue.toFixed(1)}%`);
}

function extractOfferInputs() {
  return {
    price: offerElements.price.value,
    taxRate: offerElements.taxRate.value,
    insuranceAnnual: offerElements.insurance.value,
    closingPercent: offerElements.closingPercent.value,
    firstPercent: offerElements.firstPercent.value,
    secondPercent: offerElements.secondPercent.value,
    firstRate: offerElements.firstRate.value,
    firstTerm: offerElements.firstTerm.value,
    secondRate: offerElements.secondRate.value,
    secondTerm: offerElements.secondTerm.value,
    secondInterestOnly: offerElements.secondInterestOnly.checked,
    balloonYears: offerElements.balloonYears.value,
    conventionalDownPercent: offerElements.convDown.value,
    conventionalRate: offerElements.convRate.value,
    conventionalTerm: offerElements.convTerm.value,
    conventionalClosingPercent: offerElements.convClose.value
  };
}

function updateOffer() {
  ensureDefaultInsurance();
  const offer = calculateOffer(extractOfferInputs());
  lastOfferSnapshot = offer;

  setText('offer.formattedPrice', formatMoney(offer.formattedPrice));
  setText('offer.taxMonthly', `${formatMoney(offer.taxMonthly)} /mo`);
  setText('offer.insuranceMonthly', `${formatMoney(offer.insuranceMonthly)} /mo`);
  setText('offer.closingCash', formatMoney(offer.closingCash));
  setText('offer.firstAmount', formatMoney(offer.firstAmount));
  setText('offer.secondAmount', formatMoney(offer.secondAmount));
  setText('offer.downPayment', `${offer.downPercent.toFixed(2)}% = ${formatMoney(offer.downAmount)}`);

  setText('offer.firstPayment', formatMoney(offer.firstPayment));
  setText('offer.secondPayment', formatMoney(offer.secondPayment));
  setText('offer.piti', formatMoney(offer.totalPiti));
  setText('offer.cashToClose', formatMoney(offer.cashToClose));
  setText('offer.conventionalPiti', formatMoney(offer.conventional.piti));
  setText('offer.conventionalCash', formatMoney(offer.conventional.cashToClose));

  const balloonNote = offer.balloon.years > 0 && offer.balloon.amount > 0
    ? `Balloon due after ${offer.balloon.years} years: ${formatMoney(offer.balloon.amount)}`
    : '';
  setText('offer.balloonNote', balloonNote);

  setText('offer.taxMonthly', `${formatMoney(offer.taxMonthly)} /mo`);
  setText('offer.insuranceMonthly', `${formatMoney(offer.insuranceMonthly)} /mo`);

  renderOfferPie(pieCanvas, [offer.firstPayment, offer.secondPayment, offer.taxMonthly, offer.insuranceMonthly], {
    innerColor: getComputedStyle(document.documentElement).getPropertyValue('--surface') || '#ffffff'
  });

  renderOfferBars(barCanvas, [
    { label: '50/40/10', values: [offer.firstPayment, offer.secondPayment, offer.taxMonthly, offer.insuranceMonthly] },
    { label: 'Conventional', values: [offer.conventional.payment, 0, offer.taxMonthly, offer.insuranceMonthly] }
  ], {
    totalColor: getComputedStyle(document.documentElement).getPropertyValue('--text') || '#0f172a'
  });
}

function extractAnalyzerInputs() {
  const unitInputs = Array.from(analyzerElements.unitsList.querySelectorAll('input'));
  return {
    price: analyzerElements.price.value,
    squareFeet: analyzerElements.sqft.value,
    rehabMode: analyzerElements.rehabMode.value,
    rehabValue: analyzerElements.rehabValue.value,
    closingPercent: analyzerElements.closingPercent.value,
    downPercent: analyzerElements.downPercent.value,
    rents: unitInputs.map((input) => Number(input.value || 0)),
    monthlyExpenses: analyzerElements.monthlyExpenses.value,
    utilities: analyzerElements.utilities.value,
    managementPercent: analyzerElements.managementPercent.value,
    otherIncome: analyzerElements.otherIncome.value,
    taxesAnnual: analyzerElements.taxesAnnual.value,
    insuranceAnnual: analyzerElements.insuranceAnnual.value,
    otherAnnual: analyzerElements.otherAnnual.value,
    vacancyPercent: analyzerElements.vacancyPercent.value,
    rate: analyzerElements.rate.value,
    amortYears: analyzerElements.amortYears.value
  };
}

function updateAnalyzer() {
  const analysis = calculateDealAnalysis(extractAnalyzerInputs());

  const currencyAssignments = {
    'analyzer.formattedPrice': analysis.price,
    'analyzer.rehabDisplay': analysis.rehabTotal,
    'analyzer.totalCashNeeded': analysis.cashNeeded,
    'analyzer.grossRent': analysis.rents,
    'analyzer.monthlyCashflow': analysis.monthlyCashflow,
    'analyzer.price': analysis.price,
    'analyzer.rehab': analysis.rehabTotal,
    'analyzer.closingCosts': analysis.closingCost,
    'analyzer.projectCost': analysis.projectCost,
    'analyzer.loanAmount': analysis.loanAmount,
    'analyzer.otherIncome': analysis.otherIncome,
    'analyzer.vacancyLoss': analysis.vacancyLoss,
    'analyzer.effectiveIncome': analysis.effectiveIncome,
    'analyzer.managementFee': analysis.managementFee,
    'analyzer.operatingExpenses': analysis.operatingExpenses,
    'analyzer.noiMonthly': analysis.noiMonthly,
    'analyzer.noiAnnual': analysis.noiAnnual,
    'analyzer.mortgagePayment': analysis.mortgagePayment
  };

  Object.entries(currencyAssignments).forEach(([key, value]) => {
    setText(key, formatMoney(value));
  });

  setText('analyzer.cashOnCash', formatPercent(analysis.cashOnCash));
  setText('analyzer.capRate', formatPercent(analysis.capRate));
  setText('analyzer.dscr', Number.isFinite(analysis.dscr) ? analysis.dscr.toFixed(2) : '—');
}
function refreshUnitLabels() {
  const items = Array.from(analyzerElements.unitsList.querySelectorAll('.unit-item'));
  items.forEach((item, index) => {
    const label = item.querySelector('.unit-label');
    const remove = item.querySelector('button');
    if (label) label.textContent = `Unit ${index + 1} Rent ($/mo)`;
    if (remove) remove.disabled = items.length === 1;
  });
}

function addUnit(initialValue = 0) {
  const wrapper = document.createElement('div');
  wrapper.className = 'unit-item';
  const header = document.createElement('header');
  const label = document.createElement('span');
  label.className = 'unit-label';
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.textContent = 'Remove';
  remove.addEventListener('click', () => {
    wrapper.remove();
    refreshUnitLabels();
    updateAnalyzer();
  });
  header.append(label, remove);
  const input = document.createElement('input');
  input.type = 'number';
  input.min = '0';
  input.step = '25';
  input.value = String(initialValue);
  input.addEventListener('input', updateAnalyzer);
  wrapper.append(header, input);
  analyzerElements.unitsList.append(wrapper);
  refreshUnitLabels();
}

function bindOfferEvents() {
  offerElements.price.addEventListener('input', () => { ensureDefaultInsurance(); updateOffer(); });
  offerElements.taxRate.addEventListener('input', updateOffer);
  offerElements.insurance.addEventListener('input', () => { insuranceLocked = true; updateOffer(); });
  offerElements.closingPercent.addEventListener('input', updateOffer);

  offerElements.firstPercent.addEventListener('input', () => { syncStructure('first'); updateOffer(); });
  offerElements.secondPercent.addEventListener('input', () => { syncStructure('second'); updateOffer(); });
  offerElements.firstPercentNumber.addEventListener('input', () => {
    offerElements.firstPercent.value = offerElements.firstPercentNumber.value;
    syncStructure('first');
    updateOffer();
  });
  offerElements.secondPercentNumber.addEventListener('input', () => {
    offerElements.secondPercent.value = offerElements.secondPercentNumber.value;
    syncStructure('second');
    updateOffer();
  });

  offerElements.firstRate.addEventListener('input', updateOffer);
  offerElements.firstTerm.addEventListener('input', updateOffer);
  offerElements.secondRate.addEventListener('input', updateOffer);
  offerElements.secondTerm.addEventListener('input', updateOffer);
  offerElements.secondInterestOnly.addEventListener('change', updateOffer);
  offerElements.balloonYears.addEventListener('input', updateOffer);

  offerElements.convDown.addEventListener('input', updateOffer);
  offerElements.convRate.addEventListener('input', updateOffer);
  offerElements.convTerm.addEventListener('input', updateOffer);
  offerElements.convClose.addEventListener('input', updateOffer);

  offerElements.dallasButton?.addEventListener('click', () => {
    offerElements.taxRate.value = '2.23503';
    updateOffer();
  });
}

function bindAnalyzerEvents() {
  const controls = [
    analyzerElements.price,
    analyzerElements.sqft,
    analyzerElements.rehabMode,
    analyzerElements.rehabValue,
    analyzerElements.closingPercent,
    analyzerElements.downPercent,
    analyzerElements.monthlyExpenses,
    analyzerElements.utilities,
    analyzerElements.managementPercent,
    analyzerElements.otherIncome,
    analyzerElements.taxesAnnual,
    analyzerElements.insuranceAnnual,
    analyzerElements.otherAnnual,
    analyzerElements.vacancyPercent,
    analyzerElements.rate,
    analyzerElements.amortYears
  ];

  controls.forEach((input) => {
    const eventName = input.tagName === 'SELECT' ? 'change' : 'input';
    input.addEventListener(eventName, updateAnalyzer);
  });

  analyzerElements.addUnit.addEventListener('click', () => {
    addUnit();
    updateAnalyzer();
  });
}

bindOfferEvents();
bindAnalyzerEvents();
addUnit(1800);
ensureDefaultInsurance();
syncStructure('first');
updateOffer();
updateAnalyzer();

window.addEventListener('resize', () => {
  if (lastOfferSnapshot) {
    renderOfferPie(pieCanvas, [
      lastOfferSnapshot.firstPayment,
      lastOfferSnapshot.secondPayment,
      lastOfferSnapshot.taxMonthly,
      lastOfferSnapshot.insuranceMonthly
    ], {
      innerColor: getComputedStyle(document.documentElement).getPropertyValue('--surface') || '#ffffff'
    });
    renderOfferBars(barCanvas, [
      { label: '50/40/10', values: [lastOfferSnapshot.firstPayment, lastOfferSnapshot.secondPayment, lastOfferSnapshot.taxMonthly, lastOfferSnapshot.insuranceMonthly] },
      { label: 'Conventional', values: [lastOfferSnapshot.conventional.payment, 0, lastOfferSnapshot.taxMonthly, lastOfferSnapshot.insuranceMonthly] }
    ], {
      totalColor: getComputedStyle(document.documentElement).getPropertyValue('--text') || '#0f172a'
    });
  }
});
