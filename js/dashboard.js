const reportState = {
  department: '',
  records: [],
  isSimplex: false,
  sortColumn: null,
  sortDirection: 1,
  filters: {
    text: '',
    date: '',
    shift: '',
    machine: ''
  }
};

function getStorageKey(department) {
  return `spinning_mill_${department.toLowerCase()}`;
}

function loadRecords(department) {
  return JSON.parse(localStorage.getItem(getStorageKey(department)) || '[]');
}

function saveRecords(department, records) {
  localStorage.setItem(getStorageKey(department), JSON.stringify(records));
}

function setThemeToggle() {
  const button = document.getElementById('themeToggle');
  if (!button) return;
  const activeTheme = localStorage.getItem('spinning_mill_theme') || 'light';
  document.body.classList.toggle('theme-dark', activeTheme === 'dark');
  button.textContent = activeTheme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
  button.addEventListener('click', () => {
    const nextTheme = document.body.classList.contains('theme-dark') ? 'light' : 'dark';
    document.body.classList.toggle('theme-dark', nextTheme === 'dark');
    button.textContent = nextTheme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
    localStorage.setItem('spinning_mill_theme', nextTheme);
  });
}

function setMobileToggle() {
  const toggleBtn = document.getElementById('mobileToggle');
  const sidebar = document.getElementById('sidebar');
  if (!toggleBtn || !sidebar) return;
  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== toggleBtn) {
      sidebar.classList.remove('open');
    }
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      sidebar.classList.remove('open');
    }
  });
}

function setDefaultDate(target) {
  if (!target) return;
  const today = new Date().toISOString().slice(0, 10);
  target.value = today;
}

// Get only the sample values that actually have data entered (value > 0)
function getValidSampleValues() {
  const sampleInputs = [
    document.getElementById('s1'), document.getElementById('s2'), document.getElementById('s3'),
    document.getElementById('s4'), document.getElementById('s5'), document.getElementById('s6')
  ];
  return sampleInputs
    .map(input => Number(input.value) || 0)
    .filter(v => v > 0);
}

function initializeDepartmentPage(department) {
  reportState.department = department;
  reportState.isSimplex = false;
  setThemeToggle();
  setMobileToggle();
  setDefaultDate(document.getElementById('date'));

  const inputs = Array.from(document.querySelectorAll('.entry-card input[type="number"]'));
  inputs.forEach(input => input.addEventListener('input', refreshCalculations));
  document.getElementById('shift').addEventListener('change', refreshCalculations);
  document.getElementById('machine').addEventListener('change', refreshCalculations);
  document.getElementById('targetWeight').addEventListener('input', refreshCalculations);
  document.getElementById('gMin').addEventListener('input', refreshCalculations);
  document.getElementById('gMax').addEventListener('input', refreshCalculations);

  document.getElementById('saveBtn').addEventListener('click', () => saveRecord(department, false));
  document.getElementById('excelBtn').addEventListener('click', () => exportDepartmentToExcel(department, loadRecords(department)));

  document.getElementById('searchText').addEventListener('input', e => { reportState.filters.text = e.target.value; updateReportTable(); });
  document.getElementById('filterDate').addEventListener('change', e => { reportState.filters.date = e.target.value; updateReportTable(); });
  document.getElementById('filterShift').addEventListener('change', e => { reportState.filters.shift = e.target.value; updateReportTable(); });
  document.getElementById('filterMachine').addEventListener('change', e => { reportState.filters.machine = e.target.value; updateReportTable(); });

  reportState.records = loadRecords(department);
  refreshCalculations();
  updateReportTable();
}

function initializeSimplexPage() {
  reportState.department = 'Simplex';
  reportState.isSimplex = true;
  setThemeToggle();
  setMobileToggle();
  setDefaultDate(document.getElementById('date'));

  const inputs = Array.from(document.querySelectorAll('.entry-card input[type="number"]'));
  inputs.forEach(input => input.addEventListener('input', refreshCalculations));
  document.getElementById('shift').addEventListener('change', refreshCalculations);
  document.getElementById('machine').addEventListener('change', refreshCalculations);
  document.getElementById('lengthYards').addEventListener('input', refreshCalculations);
  document.getElementById('gMin').addEventListener('input', refreshCalculations);
  document.getElementById('gMax').addEventListener('input', refreshCalculations);

  document.getElementById('saveBtn').addEventListener('click', () => saveRecord('Simplex', true));
  document.getElementById('excelBtn').addEventListener('click', () => exportDepartmentToExcel('Simplex', loadRecords('Simplex')));

  document.getElementById('searchText').addEventListener('input', e => { reportState.filters.text = e.target.value; updateReportTable(); });
  document.getElementById('filterDate').addEventListener('change', e => { reportState.filters.date = e.target.value; updateReportTable(); });
  document.getElementById('filterShift').addEventListener('change', e => { reportState.filters.shift = e.target.value; updateReportTable(); });
  document.getElementById('filterMachine').addEventListener('change', e => { reportState.filters.machine = e.target.value; updateReportTable(); });

  reportState.records = loadRecords('Simplex');
  refreshCalculations();
  updateReportTable();
}

function refreshCalculations() {
  const sampleValues = getValidSampleValues();
  const sampleCount = sampleValues.length;

  // Calculate Mean - display 2 decimal places
  const meanValue = sampleCount > 0 ? average(sampleValues) : 0;
  const meanDisplay = roundMean(meanValue);

  // Calculate Population Standard Deviation - display 3 decimal places
  const sdValue = (sampleCount > 1) ? standardDeviation(sampleValues) : 0;
  const sdDisplay = roundSD(sdValue);

  // Calculate CV% = (SD / Mean) × 100 - display 2 decimal places
  const cvValue = sampleCount > 0 ? cvPercent(sampleValues) : 0;
  const cvDisplay = roundCV(cvValue);

  // G/Y (%) = (Weight_grams × 15.432) / 8
  // For Carding/Breaker/Finisher: use targetGrams (replaces old targetWeight)
  // For Simplex: G/Y is the Hank Roving validation value
  const targetGrams = Number(document.getElementById('targetWeight')?.value || 0);
  const gMin = Number(document.getElementById('gMin').value || 0);
  const gMax = Number(document.getElementById('gMax').value || 0);

  let gValue = 0;
  let gDisplay = '0.00';

  if (reportState.isSimplex) {
    // Hank Roving = (Length_Yards × 453.6) / (Weight_grams × 840)
    const lengthYards = Number(document.getElementById('lengthYards')?.value || 1);
    gValue = hankRovingValue(meanValue, lengthYards);
    gDisplay = roundHank(gValue);
  } else {
    // G/Y (%) = (Weight_grams × 15.432) / 8
    gValue = gyPercent(meanValue, targetGrams);
    gDisplay = roundGY(gValue);
  }

  // Evaluate range
  const status = evaluateRange(gValue, gMin, gMax);

  // Validate fields - need at least 2 samples
  const valid = validateEntryFields({
    date: document.getElementById('date').value,
    shift: document.getElementById('shift').value,
    machine: document.getElementById('machine').value,
    operator: document.getElementById('operator').value,
    samples: sampleValues,
    minSamples: 2
  });

  // Update display with correct decimal places
  document.getElementById('avgWeight').textContent = meanDisplay;
  if (!reportState.isSimplex) {
    document.getElementById('sdValue').textContent = sdDisplay;
  }
  document.getElementById('cvValue').textContent = cvDisplay;
  document.getElementById('gValue').textContent = gDisplay;

  const statusMessage = document.getElementById('statusMessage');
  if (sampleCount < 2) {
    statusMessage.innerHTML = `ℹ️ Enter at least 2 samples (currently ${sampleCount} sample${sampleCount !== 1 ? 's' : ''})`;
    statusMessage.style.color = '#888';
    statusMessage.dataset.status = '';
    document.getElementById('saveBtn').disabled = true;
    return;
  }
  const emoji = status.status === 'ACCEPTED' ? '🟢' : '🔴';
  statusMessage.innerHTML = valid ? `${emoji} ${status.status}: ${status.message} (${sampleCount} samples)` : '⚠️ Complete all fields before saving.';
  statusMessage.style.color = status.color;
  statusMessage.dataset.status = valid ? status.status : '';
  document.getElementById('saveBtn').disabled = !valid || !status.accepted;
}

function saveRecord(department, isSimplex) {
  const sampleValues = getValidSampleValues();
  const sampleCount = sampleValues.length;

  const meanValue = sampleCount > 0 ? average(sampleValues) : 0;
  const sdValue = (sampleCount > 1) ? standardDeviation(sampleValues) : 0;
  const cvValue = sampleCount > 0 ? cvPercent(sampleValues) : 0;

  const targetGrams = Number(document.getElementById('targetWeight')?.value || 0);
  const gMin = Number(document.getElementById('gMin').value || 0);
  const gMax = Number(document.getElementById('gMax').value || 0);

  let gValue = 0;
  if (isSimplex) {
    const lengthYards = Number(document.getElementById('lengthYards')?.value || 1);
    gValue = hankRovingValue(meanValue, lengthYards);
  } else {
    gValue = gyPercent(meanValue, targetGrams);
  }

  const status = evaluateRange(gValue, gMin, gMax);

  const record = {
    date: document.getElementById('date').value,
    shift: document.getElementById('shift').value,
    machine: document.getElementById('machine').value,
    operator: document.getElementById('operator').value,
    samples: sampleValues,
    sampleCount: sampleCount,
    average: roundMean(meanValue),
    sd: roundSD(sdValue),
    cv: roundCV(cvValue),
    g: isSimplex ? roundHank(gValue) : roundGY(gValue),
    gy: roundGY(gValue),
    status: status.status,
    targetWeight: targetGrams || undefined,
    lengthYards: isSimplex ? Number(document.getElementById('lengthYards')?.value || 1) : undefined,
    count: isSimplex ? Number(document.getElementById('count')?.value || 0) : undefined
  };

  const records = loadRecords(department);
  records.unshift(record);
  saveRecords(department, records);
  reportState.records = records;
  updateReportTable();
  clearInputs(isSimplex);
  refreshCalculations();
}

function clearInputs(isSimplex) {
  document.getElementById('operator').value = '';
  if (document.getElementById('count')) document.getElementById('count').value = '';
  document.querySelectorAll('.entry-card input[type="number"]').forEach(input => {
    if (input.id !== 'targetWeight' && input.id !== 'gMin' && input.id !== 'gMax' && input.id !== 'lengthYards' && input.id !== 'hankFactor') {
      input.value = '';
    }
  });
}

function clearAllInputs() {
  document.querySelectorAll('.entry-card input, .entry-card select').forEach(el => {
    if (el.type === 'text' || el.type === 'number') {
      if (el.id === 'gMin' || el.id === 'gMax' || el.id === 'targetWeight' || el.id === 'lengthYards' || el.id === 'hankFactor') return;
      el.value = '';
    }
    if (el.tagName === 'SELECT') el.selectedIndex = 0;
  });
  if (document.getElementById('operator')) document.getElementById('operator').value = '';
  if (document.getElementById('count')) document.getElementById('count').value = '';
  refreshCalculations();
}

function updateReportTable() {
  const tbody = document.querySelector('#reportTable tbody');
  if (!tbody) return;
  const filtered = reportState.records.filter(record => {
    const text = reportState.filters.text.toLowerCase();
    const matchesText = text === '' || [record.operator, record.machine, record.shift, record.date].some(field => String(field).toLowerCase().includes(text));
    const matchesDate = !reportState.filters.date || record.date === reportState.filters.date;
    const matchesShift = !reportState.filters.shift || record.shift === reportState.filters.shift;
    const matchesMachine = !reportState.filters.machine || record.machine === reportState.filters.machine;
    return matchesText && matchesDate && matchesShift && matchesMachine;
  });

  const sorted = [...filtered];
  if (reportState.sortColumn !== null) {
    sorted.sort((a, b) => {
      const keys = ['date', 'shift', 'machine', 'operator', 'samples', 'average', 'sd', 'cv', 'g', 'status'];
      const key = keys[reportState.sortColumn];
      const aValue = a[key] ?? '';
      const bValue = b[key] ?? '';
      if (typeof aValue === 'number' && typeof bValue === 'number') return (aValue - bValue) * reportState.sortDirection;
      return String(aValue).localeCompare(String(bValue)) * reportState.sortDirection;
    });
  }

  tbody.innerHTML = sorted.map(record => {
    const sampleText = Array.isArray(record.samples) ? record.samples.join(' | ') : record.samples;
    const countLabel = record.sampleCount ? ` (${record.sampleCount})` : '';
    const statusColor = record.status === 'ACCEPTED' ? '#2f9c4d' : '#d23f3f';
    if (reportState.isSimplex) {
      return `<tr>
        <td>${record.date}</td>
        <td>${record.shift}</td>
        <td>${record.machine}</td>
        <td>${record.operator}</td>
        <td>${record.count || ''}</td>
        <td>${record.average}</td>
        <td>${record.cv}</td>
        <td>${record.g}</td>
        <td><span class="status-badge" style="background:${statusColor};">${record.status}</span></td>
      </tr>`;
    }
    return `<tr>
      <td>${record.date}</td>
      <td>${record.shift}</td>
      <td>${record.machine}</td>
      <td>${record.operator}</td>
      <td title="${sampleText}">${sampleText}${countLabel}</td>
      <td>${record.average}</td>
      <td>${record.sd}</td>
      <td>${record.cv}</td>
      <td>${record.g}</td>
      <td><span class="status-badge" style="background:${statusColor};">${record.status}</span></td>
    </tr>`;
  }).join('');
}

function sortTable(columnIndex) {
  reportState.sortDirection = reportState.sortColumn === columnIndex ? -reportState.sortDirection : 1;
  reportState.sortColumn = columnIndex;
  updateReportTable();
}

function initializeDashboard() {
  setThemeToggle();
  setMobileToggle();
  const departments = ['Carding', 'Breaker', 'Finisher', 'Simplex'];
  const allRecords = departments.reduce((acc, department) => {
    const records = loadRecords(department);
    if (records.length > 0) {
      acc[department] = records;
    }
    return acc;
  }, {});

  buildSummaryCards(allRecords);
  buildDashboardCharts(allRecords);
}

function buildSummaryCards(data) {
  const container = document.getElementById('summaryCards');
  if (!container) return;

  if (Object.keys(data).length === 0) {
    container.innerHTML = `<article class="metric-card" style="grid-column: 1 / -1;">
      <h3>📊 No Data Yet</h3>
      <p style="color: var(--text-muted);">Enter data from department pages to see summary here.</p>
    </article>`;
    return;
  }

  container.innerHTML = Object.entries(data).map(([department, records]) => {
    const accepted = records.filter(r => r.status === 'ACCEPTED').length;
    const rejected = records.filter(r => r.status === 'REJECTED').length;
    const avgCV = records.reduce((sum, r) => sum + Number(r.cv), 0) / records.length || 0;
    const avgG = records.reduce((sum, r) => sum + Number(r.g), 0) / records.length || 0;
    const statusIcon = rejected === 0 ? '🟢' : (rejected > accepted ? '🔴' : '🟡');
    const valueLabel = department === 'Simplex' ? 'Avg Hank Roving' : 'Avg G/Y%';
    return `<article class="metric-card">
      <h3>${department} ${statusIcon}</h3>
      <div class="metric-row"><span>Total Samples</span><strong>${records.length}</strong></div>
      <div class="metric-row"><span>✅ Accepted</span><strong>${accepted}</strong></div>
      <div class="metric-row"><span>❌ Rejected</span><strong>${rejected}</strong></div>
      <div class="metric-row"><span>📈 Avg CV%</span><strong>${round(avgCV)}%</strong></div>
      <div class="metric-row"><span>📊 ${valueLabel}</span><strong>${round(avgG)}</strong></div>
    </article>`;
  }).join('');
}

function buildDashboardCharts(data) {
  const allData = Object.values(data).flat();
  if (allData.length === 0) return;

  const dailyLabels = [...new Set(allData.map(r => r.date))].sort();
  const gTrend = dailyLabels.map(date => {
    const values = allData.filter(r => r.date === date).map(r => Number(r.g));
    return values.length ? round(average(values)) : 0;
  });
  const cvTrend = dailyLabels.map(date => {
    const values = allData.filter(r => r.date === date).map(r => Number(r.cv));
    return values.length ? round(average(values)) : 0;
  });
  const machineLabels = [...new Set(allData.map(r => r.machine))].sort();
  const machinePerf = machineLabels.map(machine => {
    const values = allData.filter(r => r.machine === machine).map(r => Number(r.g));
    return values.length ? round(average(values)) : 0;
  });
  const deptLabels = Object.keys(data);
  const deptAverageG = deptLabels.map(dep => {
    const values = data[dep].map(r => Number(r.g));
    return values.length ? round(average(values)) : 0;
  });
  const rejectionTrend = dailyLabels.map(date => {
    return allData.filter(r => r.date === date && r.status === 'REJECTED').length;
  });

  renderChart('gTrendChart', 'Daily G/Y% Trend', dailyLabels, gTrend, 'rgba(45, 108, 223, 0.8)');
  renderChart('cvTrendChart', 'Daily CV% Trend', dailyLabels, cvTrend, 'rgba(255, 149, 0, 0.8)');
  renderBarChart('machineChart', 'Machine Performance (Avg G/Y%)', machineLabels, machinePerf, 'rgba(46, 204, 113, 0.8)');
  renderBarChart('deptChart', 'Department Comparison (Avg G/Y%)', deptLabels, deptAverageG, 'rgba(90, 116, 255, 0.8)');
  renderLineChart('rejectionTrendChart', 'Rejection Trend', dailyLabels, rejectionTrend, 'rgba(210, 63, 63, 0.8)');
}

function renderChart(canvasId, label, labels, values, color) {
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return;
  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{ label, data: values, backgroundColor: color, borderColor: color, fill: false, tension: 0.3 }]
    },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
  });
}

function renderLineChart(canvasId, label, labels, values, color) {
  renderChart(canvasId, label, labels, values, color);
}

function renderBarChart(canvasId, label, labels, values, color) {
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return;
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label, data: values, backgroundColor: color }]
    },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
  });
}