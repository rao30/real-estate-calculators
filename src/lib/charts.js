const PIE_COLORS = ['#38bdf8', '#34d399', '#f97316', '#facc15'];
const BAR_SERIES = [
  { label: 'Mortgage (1st)', color: '#38bdf8' },
  { label: 'Seller (2nd)', color: '#34d399' },
  { label: 'Taxes', color: '#ef4444' },
  { label: 'Insurance', color: '#f59e0b' }
];

function ensureResolution(canvas, ctx) {
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || canvas.width || 1;
  const height = canvas.clientHeight || canvas.height || 1;
  const scaledWidth = Math.round(width * ratio);
  const scaledHeight = Math.round(height * ratio);
  if (canvas.width !== scaledWidth || canvas.height !== scaledHeight) {
    canvas.width = scaledWidth;
    canvas.height = scaledHeight;
  }
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);
  return { width, height };
}

export function renderOfferPie(canvas, values, options = {}) {
  const ctx = canvas.getContext('2d');
  const { width, height } = ensureResolution(canvas, ctx);
  const labels = options.labels || ['First (P&I)', 'Second', 'Taxes', 'Insurance'];
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 18;
  const total = values.reduce((sum, value) => sum + Math.max(0, value), 0);

  let startAngle = -Math.PI / 2;
  if (total <= 0) {
    ctx.fillStyle = 'rgba(148, 163, 184, 0.25)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
  } else {
    values.forEach((value, index) => {
      const slice = Math.max(0, value);
      if (!slice) return;
      const angle = (slice / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + angle);
      ctx.closePath();
      ctx.fillStyle = (options.colors || PIE_COLORS)[index % PIE_COLORS.length];
      ctx.fill();
      startAngle += angle;
    });
  }

  ctx.beginPath();
  ctx.fillStyle = options.innerColor || '#ffffff';
  ctx.arc(centerX, centerY, radius * 0.55, 0, Math.PI * 2);
  ctx.fill();

  if (options.legendContainer) {
    options.legendContainer.innerHTML = labels
      .map((label, index) => `<span><i style="background:${(options.colors || PIE_COLORS)[index % PIE_COLORS.length]}"></i>${label}</span>`)
      .join('');
  }
}

export function renderOfferBars(canvas, groups, options = {}) {
  const ctx = canvas.getContext('2d');
  const { width, height } = ensureResolution(canvas, ctx);
  const padding = { top: 24, right: 24, bottom: 54, left: 80 };
  const chartWidth = Math.max(1, width - padding.left - padding.right);
  const chartHeight = Math.max(1, height - padding.top - padding.bottom);

  const totals = groups.map(group => group.values.reduce((sum, value) => sum + Math.max(0, value), 0));
  const maxTotal = Math.max(...totals, 1);

  const steps = options.gridLines || 4;
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
  ctx.font = '12px Inter, system-ui';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = options.axisColor || 'rgba(100,116,139,0.9)';
  for (let i = 0; i <= steps; i++) {
    const y = padding.top + chartHeight - (chartHeight / steps) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + chartWidth, y);
    ctx.stroke();
    const labelValue = (maxTotal / steps) * i;
    ctx.fillText(labelValue.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }), padding.left - 10, y);
  }

  const spacing = chartWidth / Math.max(groups.length, 1);
  const barWidth = Math.min(80, spacing * 0.55);

  groups.forEach((group, index) => {
    const x = padding.left + spacing * index + (spacing - barWidth) / 2;
    let currentY = padding.top + chartHeight;

    BAR_SERIES.forEach((series, sIndex) => {
      const value = group.values[sIndex];
      if (!value) return;
      const portion = (Math.max(0, value) / maxTotal) * chartHeight;
      if (portion <= 0) return;
      ctx.fillStyle = series.color;
      ctx.fillRect(x, currentY - portion, barWidth, portion);
      currentY -= portion;
    });

    ctx.fillStyle = options.axisColor || 'rgba(100,116,139,0.9)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(group.label, x + barWidth / 2, padding.top + chartHeight + 8);

    ctx.fillStyle = options.totalColor || '#0f172a';
    ctx.textBaseline = 'bottom';
    ctx.fillText(totals[index].toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }), x + barWidth / 2, currentY - 6);
  });

  if (options.legendContainer) {
    options.legendContainer.innerHTML = BAR_SERIES
      .map(series => `<span><i style="background:${series.color}"></i>${series.label}</span>`)
      .join('');
  }
}
