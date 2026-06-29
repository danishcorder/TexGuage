const reportState = {
  department: '',
  records: [],
  isSimplex: false,
  role: 'operator',
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
  toggleBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== toggleBtn) {
      sidebar.classList.remove('open');
    }
  });
  window.addEventListener('resize', () => { if (window.innerWidth > 768) sidebar.classList.remove('open'); });
}

function setDefaultDate(target) {
  if (!target) return;
  target.value = new Date().toISOString().slice(0, 10);
}

// Get values from visible (enabled) sample inputs only
function getVisibleSampleValues() {
  return ['s1','s2','s3','s4','s5','s6','s7','s8','s9','s10']
    .map(id => document.getElementById(id))
    .filter(input => input && !input.disabled)
    .map(input => Number(input.value) || 0)
    .filter(v => v > 0);
}

// Get all sample input elements
function getAllSampleInputs() {
  return ['s1','s2','s3','s4','s5','s6','s7','s8','s9','s10'].map(id => document.getElementById(id));
}

// Update sample input visibility based on "No of Samples" dropdown
function updateSampleVisibility() {
  const noOfSamples = parseInt(document.getElementById('noOfSamples')?.value || 6);
  const sampleInputs = getAllSampleInputs();
  
  sampleInputs.forEach((input, index) => {
    if (!input) return;
    const sampleNumber = index + 1;
    if (sampleNumber <= noOfSamples) {
      input.disabled = false;
      input.closest('label').style.display = '';
      input.classList.remove('validation-error');
    } else {
      input.disabled = true;
      input.value = '';
      input.closest('label').style.display = 'none';
      input.classList.remove('validation-error');
    }
  });
}

// Update machine weight range display
function updateMachineWeightRange() {
  const machineSelect = document.getElementById('machine');
  const minWeightInput = document.getElementById('minWeight');
  const maxWeightInput = document.getElementById('maxWeight');
  
  if (!machineSelect || !minWeightInput || !maxWeightInput) return;
  
  const machineId = machineSelect.value;
  const range = getMachineWeightRange(machineId);
  
  minWeightInput.value = range.min;
  maxWeightInput.value = range.max;
  
  // Re-validate all visible samples with new range
  validateAllSamples();
}

// Update length display in both units
function updateLengthDisplay() {
  const lengthSelect = document.getElementById('sampleLength');
  const lengthDisplay = document.getElementById('lengthDisplay');
  const lengthDisplayMeter = document.getElementById('lengthDisplayMeter');
  
  if (!lengthSelect) return;
  
  const yards = parseInt(lengthSelect.value);
  const meters = yardsToMeters(yards);
  
  if (lengthDisplay) {
    lengthDisplay.textContent = `${yards} yd / ${meters.toFixed(4)} m`;
  }
  
  if (lengthDisplayMeter) {
    lengthDisplayMeter.textContent = `${meters.toFixed(4)} m / ${yards.toFixed(4)} yd`;
  }
}

// Validate a single sample input
function validateSampleInput(input) {
  // Only validate for Simplex department
  if (!reportState.isSimplex) {
    // Clear any existing validation for non-Simplex departments
    input.classList.remove('validation-error');
    const existingError = input.parentElement.querySelector('.validation-error-message');
    if (existingError) existingError.remove();
    return true;
  }
  
  const minWeight = parseFloat(document.getElementById('minWeight')?.value || 0);
  const maxWeight = parseFloat(document.getElementById('maxWeight')?.value || 0);
  const sampleValue = parseFloat(input.value);
  
  // Clear previous validation state
  input.classList.remove('validation-error');
  const existingError = input.parentElement.querySelector('.validation-error-message');
  if (existingError) existingError.remove();
  
  // Only validate if there's a value
  if (input.value && !Number.isNaN(sampleValue) && sampleValue > 0) {
    const validation = validateSampleWeight(sampleValue, minWeight, maxWeight);
    
    if (!validation.valid) {
      input.classList.add('validation-error');
      const errorMsg = document.createElement('span');
      errorMsg.className = 'validation-error-message';
      errorMsg.textContent = validation.message;
      errorMsg.style.cssText = 'color: var(--danger); font-size: 0.75rem; margin-top: 4px; display: block;';
      input.parentElement.appendChild(errorMsg);
    }
  }
  
  return !input.classList.contains('validation-error');
}

// Validate all visible samples
function validateAllSamples() {
  const sampleInputs = getAllSampleInputs();
  let allValid = true;
  
  sampleInputs.forEach(input => {
    if (input && !input.disabled && input.value) {
      const isValid = validateSampleInput(input);
      if (!isValid) allValid = false;
    }
  });
  
  return allValid;
}

// Check if any sample has validation error
function hasValidationErrors() {
  // Only check for validation errors in Simplex department
  if (!reportState.isSimplex) return false;
  
  const sampleInputs = getAllSampleInputs();
  return sampleInputs.some(input => input && input.classList.contains('validation-error'));
}

// =================== ROLE MANAGEMENT ===================
function setRole(role) {
  reportState.role = role;
  document.getElementById('roleOperator').className = role === 'operator' ? 'primary' : 'secondary';
  document.getElementById('roleManager').className = role === 'manager' ? 'primary' : 'secondary';
  document.getElementById('roleIndicator').textContent = role === 'operator' ? '🟢 Operator View Active' : '📈 Manager View Active';
  
  const panel = document.getElementById('managerPanel');
  if (panel) panel.style.display = role === 'manager' ? 'grid' : 'none';
  
  const flow = document.getElementById('processFlowSection');
  if (flow) flow.style.display = role === 'manager' ? 'block' : 'none';
  
  localStorage.setItem('texgauge_role', role);
}

// =================== LIVE MODE ===================
function toggleLiveMode() {
  const btn = document.getElementById('liveModeBtn');
  if (LiveSimulation.isRunning) {
    LiveSimulation.stop();
    btn.innerHTML = '⏸ Live Mode: OFF';
    btn.style.background = 'rgba(255,255,255,0.05)';
  } else {
    LiveSimulation.start();
    btn.innerHTML = '▶ Live Mode: ON';
    btn.style.background = 'rgba(47,156,77,0.3)';
    btn.style.color = '#4caf50';
  }
}

// =================== ALERT PANEL ===================
function updateAlertPanel() {
  const panel = document.getElementById('alertPanel');
  const badge = document.getElementById('alertBadge');
  if (!panel) return;
  
  const active = AlertSystem.getActiveAlerts();
  const counts = AlertSystem.getCounts();
  
  if (badge) badge.textContent = counts.total;
  if (badge) badge.style.background = counts.critical > 0 ? '#d23f3f' : (counts.warning > 0 ? '#e8a838' : '#2f9c4d');

  if (active.length === 0) {
    panel.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px;">No active alerts. All systems normal. 🟢</p>';
    return;
  }

  panel.innerHTML = active.slice(0, 20).map(a => `
    <div style="padding:10px 14px;margin-bottom:6px;border-radius:8px;background:${a.type === 'critical' ? 'var(--danger-light)' : 'var(--warning-light)'};border-left:4px solid ${a.type === 'critical' ? 'var(--danger)' : 'var(--warning)'};display:flex;align-items:center;gap:10px;cursor:pointer;" onclick="AlertSystem.acknowledge(${a.id});updateAlertPanel();">
      <span style="font-size:1.2rem;">${a.icon}</span>
      <div style="flex:1;">
        <div style="font-weight:600;font-size:0.85rem;">${a.title}</div>
        <div style="font-size:0.78rem;color:var(--text-muted);">${a.message}</div>
      </div>
      <span style="font-size:0.7rem;color:var(--text-muted);">${new Date(a.timestamp).toLocaleTimeString()}</span>
    </div>
  `).join('');
}

// Subscribe to alerts
document.addEventListener('DOMContentLoaded', () => {
  AlertSystem.subscribe(() => updateAlertPanel());
});

// =================== KPI UPDATE ===================
function updateKPI() {
  const depts = ['Carding', 'Breaker', 'Finisher', 'Simplex'];
  let totalSamples = 0;
  let totalRejected = 0;
  let totalCv = 0;
  let cvCount = 0;

  depts.forEach(d => {
    const records = loadRecords(d);
    totalSamples += records.length;
    totalRejected += records.filter(r => r.status === 'REJECTED').length;
    records.forEach(r => {
      if (Number(r.cv) > 0) { totalCv += Number(r.cv); cvCount++; }
    });
  });

  const avgCv = cvCount > 0 ? (totalCv / cvCount) : 0;
  const rejectRate = totalSamples > 0 ? ((totalRejected / totalSamples) * 100) : 0;
  let qualityIndex = 100 - (avgCv * 2) - rejectRate;
  qualityIndex = Math.max(0, Math.min(100, qualityIndex));

  const el = id => document.getElementById(id);
  if (el('kpiAvgCv')) el('kpiAvgCv').textContent = round(avgCv) + '%';
  if (el('kpiQuality')) el('kpiQuality').textContent = round(qualityIndex) + '%';
  if (el('kpiQuality')) el('kpiQuality').style.color = qualityIndex > 80 ? 'var(--success)' : (qualityIndex > 60 ? 'var(--warning)' : 'var(--danger)');
  if (el('kpiTotal')) el('kpiTotal').textContent = totalSamples;
  if (el('kpiReject')) el('kpiReject').textContent = round(rejectRate) + '%';
}

// =================== DEPARTMENT PAGES ===================
function initializeDepartmentPage(department) {
  reportState.department = department;
  reportState.isSimplex = false;
  setThemeToggle();
  setMobileToggle();
  setDefaultDate(document.getElementById('date'));

  // Add event listeners for new controls
  const noOfSamples = document.getElementById('noOfSamples');
  if (noOfSamples) {
    noOfSamples.addEventListener('change', () => {
      updateSampleVisibility();
      refreshCalculations();
    });
  }

  const sampleLength = document.getElementById('sampleLength');
  if (sampleLength) {
    sampleLength.addEventListener('change', () => {
      updateLengthDisplay();
      refreshCalculations();
    });
  }

  const machineSelect = document.getElementById('machine');
  if (machineSelect) {
    machineSelect.addEventListener('change', () => {
      updateMachineWeightRange();
      refreshCalculations();
    });
  }

  // Add input event listeners to sample inputs for validation
  const sampleInputs = getAllSampleInputs();
  sampleInputs.forEach(input => {
    if (input) {
      input.addEventListener('input', () => {
        validateSampleInput(input);
        refreshCalculations();
      });
      input.addEventListener('blur', () => {
        validateSampleInput(input);
      });
    }
  });

  // Add event listeners to number inputs
  const inputs = Array.from(document.querySelectorAll('.entry-card input[type="number"]'));
  inputs.forEach(input => {
    if (!input.id.includes('s')) { // Skip sample inputs, already handled above
      input.addEventListener('input', refreshCalculations);
    }
  });

  ['shift','gMin','gMax'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', refreshCalculations);
      el.addEventListener('input', refreshCalculations);
    }
  });

  document.getElementById('saveBtn')?.addEventListener('click', () => saveRecord(department, false));
  document.getElementById('excelBtn')?.addEventListener('click', () => exportDepartmentToExcel(department, loadRecords(department)));

  // Scale connection
  const scaleBtn = document.getElementById('scaleBtn');
  if (scaleBtn) {
    scaleBtn.addEventListener('click', async () => {
      const result = await ScaleManager.connect();
      scaleBtn.textContent = result.success ? '🔗 Scale Connected' : '❌ Scale Failed';
      scaleBtn.style.background = result.success ? 'var(--success)' : 'var(--danger)';
    });
    ScaleManager.onWeightRead = (weight) => {
      // Auto-fill first empty visible sample
      const visibleInputs = getVisibleSampleInputs();
      for (const input of visibleInputs) {
        if (input && (input.value === '' || Number(input.value) === 0)) {
          input.value = weight;
          validateSampleInput(input);
          input.dispatchEvent(new Event('input'));
          break;
        }
      }
    };
  }

  // Filters
  ['searchText','filterDate','filterShift','filterMachine'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const eventType = id === 'searchText' ? 'input' : 'change';
      const key = id.replace('filter','').toLowerCase();
      el.addEventListener(eventType, e => {
        reportState.filters[key === 'searchtext' ? 'text' : key === 'filtershift' ? 'shift' : key === 'filtermachine' ? 'machine' : key === 'filterdate' ? 'date' : key] = e.target.value;
        updateReportTable();
      });
    }
  });

  // Initialize machine weight range
  updateMachineWeightRange();
  
  // Initialize sample visibility
  updateSampleVisibility();
  
  // Initialize length display
  updateLengthDisplay();

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

  // Add event listeners for new controls
  const noOfSamples = document.getElementById('noOfSamples');
  if (noOfSamples) {
    noOfSamples.addEventListener('change', () => {
      updateSampleVisibility();
      refreshCalculations();
    });
  }

  const sampleLength = document.getElementById('sampleLength');
  if (sampleLength) {
    sampleLength.addEventListener('change', () => {
      updateLengthDisplay();
      refreshCalculations();
    });
  }

  const machineSelect = document.getElementById('machine');
  if (machineSelect) {
    machineSelect.addEventListener('change', () => {
      updateMachineWeightRange();
      refreshCalculations();
    });
  }

  // Add input event listeners to sample inputs for validation
  const sampleInputs = getAllSampleInputs();
  sampleInputs.forEach(input => {
    if (input) {
      input.addEventListener('input', () => {
        validateSampleInput(input);
        refreshCalculations();
      });
      input.addEventListener('blur', () => {
        validateSampleInput(input);
      });
    }
  });

  // Add event listeners to number inputs
  const inputs = Array.from(document.querySelectorAll('.entry-card input[type="number"]'));
  inputs.forEach(input => {
    if (!input.id.includes('s')) {
      input.addEventListener('input', refreshCalculations);
    }
  });

  ['shift','gMin','gMax','count'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', refreshCalculations);
      el.addEventListener('change', refreshCalculations);
    }
  });

  document.getElementById('saveBtn')?.addEventListener('click', () => saveRecord('Simplex', true));
  document.getElementById('excelBtn')?.addEventListener('click', () => exportDepartmentToExcel('Simplex', loadRecords('Simplex')));

  ['searchText','filterDate','filterShift','filterMachine'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener(id === 'searchText' ? 'input' : 'change', e => {
        const keyMap = { searchText: 'text', filterDate: 'date', filterShift: 'shift', filterMachine: 'machine' };
        reportState.filters[keyMap[id]] = e.target.value;
        updateReportTable();
      });
    }
  });

  // Initialize machine weight range
  updateMachineWeightRange();
  
  // Initialize sample visibility
  updateSampleVisibility();
  
  // Initialize length display
  updateLengthDisplay();

  reportState.records = loadRecords('Simplex');
  refreshCalculations();
  updateReportTable();
}

function refreshCalculations() {
  const sampleValues = getVisibleSampleValues();
  const sampleCount = sampleValues.length;

  const meanValue = sampleCount > 0 ? average(sampleValues) : 0;
  const meanDisplay = roundMean(meanValue);
  const sdValue = (sampleCount > 1) ? standardDeviation(sampleValues) : 0;
  const sdDisplay = roundSD(sdValue);
  const cvValue = sampleCount > 0 ? cvPercent(sampleValues) : 0;
  const cvDisplay = roundCV(cvValue);

  const gMinDisplay = Number(document.getElementById('gMin')?.value || 0);
  const gMaxDisplay = Number(document.getElementById('gMax')?.value || 0);

  let gValue = 0;
  let gDisplay = '0.00';
  
  if (reportState.isSimplex) {
    const lengthYards = parseInt(document.getElementById('sampleLength')?.value || 6);
    gValue = hankRovingValue(meanValue, lengthYards);
    gDisplay = roundHank(gValue);
  } else {
    const sampleLengthYards = parseInt(document.getElementById('sampleLength')?.value || 6);
    gValue = gyPercent(meanValue, sampleLengthYards);
    gDisplay = roundGY(gValue);
  }

  const status = evaluateRange(gValue, gMinDisplay, gMaxDisplay);
  
  // Check if all required fields are filled
  const requiredFields = ['date', 'shift', 'machine', 'operator'];
  let allFieldsFilled = true;
  for (const field of requiredFields) {
    const val = document.getElementById(field)?.value;
    if (!val) {
      allFieldsFilled = false;
      break;
    }
  }
  
  // Check if at least 2 samples are filled
  const validSamples = sampleValues.filter(s => s > 0);
  const hasEnoughSamples = validSamples.length >= 2;
  
  // Check for validation errors
  const hasErrors = hasValidationErrors();
  
  const valid = allFieldsFilled && hasEnoughSamples && !hasErrors;

  const avgEl = document.getElementById('avgWeight');
  if (avgEl) avgEl.textContent = meanDisplay;
  const sdEl = document.getElementById('sdValue');
  if (sdEl && !reportState.isSimplex) sdEl.textContent = sdDisplay;
  const cvEl = document.getElementById('cvValue');
  if (cvEl) cvEl.textContent = cvDisplay;
  const gEl = document.getElementById('gValue');
  if (gEl) gEl.textContent = gDisplay;

  const statusMessage = document.getElementById('statusMessage');
  if (statusMessage) {
    if (sampleCount < 2) {
      statusMessage.innerHTML = `ℹ️ Enter at least 2 samples (currently ${sampleCount} sample${sampleCount !== 1 ? 's' : ''})`;
      statusMessage.style.color = '#888';
      statusMessage.dataset.status = '';
    } else if (hasErrors) {
      statusMessage.innerHTML = `⚠️ Please fix validation errors before saving.`;
      statusMessage.style.color = 'var(--danger)';
      statusMessage.dataset.status = '';
    } else {
      const emoji = status.status === 'ACCEPTED' ? '🟢' : '🔴';
      statusMessage.innerHTML = `${emoji} ${status.status}: ${status.message} (${sampleCount} samples)`;
      statusMessage.style.color = status.color;
      statusMessage.dataset.status = valid ? status.status : '';
    }
  }
  
  const saveBtn = document.getElementById('saveBtn');
  // Allow save if all fields are filled and at least 2 samples, even if rejected
  if (saveBtn) saveBtn.disabled = !allFieldsFilled || !hasEnoughSamples;
}

function saveRecord(department, isSimplex) {
  const sampleValues = getVisibleSampleValues();
  const sampleCount = sampleValues.length;
  const meanValue = sampleCount > 0 ? average(sampleValues) : 0;
  const sdValue = (sampleCount > 1) ? standardDeviation(sampleValues) : 0;
  const cvValue = sampleCount > 0 ? cvPercent(sampleValues) : 0;
  const gMin = Number(document.getElementById('gMin')?.value || 0);
  const gMax = Number(document.getElementById('gMax')?.value || 0);
  const minWeight = parseFloat(document.getElementById('minWeight')?.value || 0);
  const maxWeight = parseFloat(document.getElementById('maxWeight')?.value || 0);

  let gValue = 0;
  if (isSimplex) {
    const lengthYards = parseInt(document.getElementById('sampleLength')?.value || 6);
    gValue = hankRovingValue(meanValue, lengthYards);
  } else {
    const sampleLengthYards = parseInt(document.getElementById('sampleLength')?.value || 6);
    gValue = gyPercent(meanValue, sampleLengthYards);
  }
  
  // Determine status based on G/Y% (or Hank Roving) range for all departments
  let recordStatus = 'ACCEPTED';
  if (isSimplex) {
    // Simplex: check sample weight range
    const hasOutOfRangeSample = sampleValues.some(sample => {
      return sample > 0 && (sample < minWeight || sample > maxWeight);
    });
    if (hasOutOfRangeSample) {
      recordStatus = 'REJECTED';
    }
  } else {
    // Carding, Breaker, Finisher: check G/Y% against target range
    if (gValue < gMin || gValue > gMax) {
      recordStatus = 'REJECTED';
    }
  }

  const record = {
    date: document.getElementById('date')?.value,
    shift: document.getElementById('shift')?.value,
    machine: document.getElementById('machine')?.value,
    operator: document.getElementById('operator')?.value,
    samples: sampleValues,
    sampleCount,
    average: roundMean(meanValue),
    sd: roundSD(sdValue),
    cv: roundCV(cvValue),
    g: isSimplex ? roundHank(gValue) : roundGY(gValue),
    status: recordStatus,
    targetWeight: undefined,
    sampleLength: parseInt(document.getElementById('sampleLength')?.value || 6),
    lengthYards: isSimplex ? parseInt(document.getElementById('sampleLength')?.value || 6) : undefined,
    count: isSimplex ? Number(document.getElementById('count')?.value || 0) : undefined
  };

  const records = loadRecords(department);
  records.unshift(record);
  saveRecords(department, records);
  reportState.records = records;
  updateReportTable();
  clearInputs(isSimplex);
  refreshCalculations();
  
  // Evaluate alert
  AlertSystem.evaluate(record, department);
  updateAlertPanel();
}

function clearInputs(isSimplex) {
  const cnt = document.getElementById('count');
  if (cnt) cnt.value = '';
  document.querySelectorAll('.entry-card input[type="number"]').forEach(input => {
    if (!['gMin','gMax','sampleLength'].includes(input.id)) input.value = '';
  });
  
  // Clear validation errors
  const sampleInputs = getAllSampleInputs();
  sampleInputs.forEach(input => {
    if (input) {
      input.classList.remove('validation-error');
      const errorMsg = input.parentElement.querySelector('.validation-error-message');
      if (errorMsg) errorMsg.remove();
    }
  });
}

function clearAllInputs() {
  document.querySelectorAll('.entry-card input, .entry-card select').forEach(el => {
    if (el.type === 'text' || el.type === 'number') {
      if (['gMin','gMax','sampleLength'].includes(el.id)) return;
      el.value = '';
    }
    if (el.tagName === 'SELECT') el.selectedIndex = 0;
  });
  const op = document.getElementById('operator');
  if (op) op.value = '';
  const cnt = document.getElementById('count');
  if (cnt) cnt.value = '';
  
  // Clear validation errors
  const sampleInputs = getAllSampleInputs();
  sampleInputs.forEach(input => {
    if (input) {
      input.classList.remove('validation-error');
      const errorMsg = input.parentElement.querySelector('.validation-error-message');
      if (errorMsg) errorMsg.remove();
    }
  });
  
  // Reset to defaults
  const noOfSamples = document.getElementById('noOfSamples');
  if (noOfSamples) noOfSamples.value = '6';
  
  const sampleLength = document.getElementById('sampleLength');
  if (sampleLength) sampleLength.value = '6';
  
  updateSampleVisibility();
  updateLengthDisplay();
  updateMachineWeightRange();
  refreshCalculations();
}

function clearAllRecords() {
  if (!confirm('Are you sure you want to clear all saved records? This action cannot be undone.')) {
    return;
  }
  
  const departments = ['Carding', 'Breaker', 'Finisher', 'Simplex'];
  departments.forEach(dept => {
    localStorage.removeItem(getStorageKey(dept));
  });
  
  reportState.records = [];
  updateReportTable();
  refreshCalculations();
  updateKPI();
  updateAlertPanel();
  
  alert('All records have been cleared successfully.');
}

function updateReportTable() {
  const tbody = document.querySelector('#reportTable tbody');
  if (!tbody) return;
  
  const filtered = reportState.records.filter(record => {
    const text = reportState.filters.text.toLowerCase();
    const matchText = text === '' || [record.operator, record.machine, record.shift, record.date].some(f => String(f).toLowerCase().includes(text));
    const matchDate = !reportState.filters.date || record.date === reportState.filters.date;
    const matchShift = !reportState.filters.shift || record.shift === reportState.filters.shift;
    const matchMachine = !reportState.filters.machine || record.machine === reportState.filters.machine;
    return matchText && matchDate && matchShift && matchMachine;
  });

  const sorted = [...filtered];
  if (reportState.sortColumn !== null) {
    const keys = ['date','shift','machine','operator','samples','average','sd','cv','g','status'];
    sorted.sort((a, b) => {
      const k = keys[reportState.sortColumn];
      const av = a[k] ?? '', bv = b[k] ?? '';
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * reportState.sortDirection;
      return String(av).localeCompare(String(bv)) * reportState.sortDirection;
    });
  }

  if (sorted.length === 0) {
    tbody.innerHTML = `<tr class="empty-state"><td colspan="10">No records saved yet. Enter data above and click <strong>Save Record</strong> to begin.</td></tr>`;
    return;
  }

  tbody.innerHTML = sorted.map(record => {
    const sampleText = Array.isArray(record.samples) ? record.samples.filter(s => s > 0).join(' | ') : record.samples;
    const statusColor = record.status === 'ACCEPTED' ? '#2f9c4d' : '#d23f3f';
    
    if (reportState.isSimplex) {
      return `<tr>
        <td>${record.date}</td><td>${record.shift}</td><td>${record.machine}</td>
        <td>${record.operator}</td><td>${record.count || ''}</td>
        <td>${record.average}</td><td>${record.cv}</td><td>${record.g}</td>
        <td><span class="status-badge" style="background:${statusColor};">${record.status}</span></td>
      </tr>`;
    }
    return `<tr>
      <td>${record.date}</td><td>${record.shift}</td><td>${record.machine}</td>
      <td>${record.operator}</td><td title="${sampleText}">${sampleText}</td>
      <td>${record.average}</td><td>${record.sd}</td><td>${record.cv}</td><td>${record.g}</td>
      <td><span class="status-badge" style="background:${statusColor};">${record.status}</span></td>
    </tr>`;
  }).join('');
}

function sortTable(columnIndex) {
  reportState.sortDirection = reportState.sortColumn === columnIndex ? -reportState.sortDirection : 1;
  reportState.sortColumn = columnIndex;
  updateReportTable();
}

// =================== DASHBOARD ===================
let dashboardCharts = [];

function initializeDashboard() {
  setThemeToggle();
  setMobileToggle();
  
  // Restore role preference
  const savedRole = localStorage.getItem('texgauge_role') || 'operator';
  setRole(savedRole);
  updateAlertPanel();

  // Subscribe live simulation to refresh dashboard
  LiveSimulation.subscribe((event, data) => {
    if (event === 'data') {
      // Auto-refresh dashboard components
      const allRecords = {};
      ['Carding','Breaker','Finisher','Simplex'].forEach(d => {
        const r = loadRecords(d);
        if (r.length > 0) allRecords[d] = r;
      });
      buildSummaryCards(allRecords);
      updateKPI();
      updateAlertPanel();
      buildDashboardCharts(allRecords);
    }
  });

  // Initial load
  const allRecords = {};
  ['Carding','Breaker','Finisher','Simplex'].forEach(d => {
    const r = loadRecords(d);
    if (r.length > 0) allRecords[d] = r;
  });
  buildSummaryCards(allRecords);
  updateKPI();
  buildDashboardCharts(allRecords);
  
  // Check if we should auto-start live simulation
  const liveState = localStorage.getItem('texgauge_live');
  if (liveState === 'on') toggleLiveMode();
}

function buildSummaryCards(data) {
  const container = document.getElementById('summaryCards');
  if (!container) return;

  if (Object.keys(data).length === 0) {
    container.innerHTML = `<article class="metric-card" style="grid-column:1/-1;">
      <h3>📊 No Data Yet</h3>
      <p style="color:var(--text-muted);">Enable Live Mode or enter data from department pages.</p>
    </article>`;
    return;
  }

  container.innerHTML = Object.entries(data).map(([department, records]) => {
    const accepted = records.filter(r => r.status === 'ACCEPTED').length;
    const rejected = records.filter(r => r.status === 'REJECTED').length;
    const avgCV = records.reduce((s, r) => s + Number(r.cv), 0) / records.length || 0;
    const avgG = records.reduce((s, r) => s + Number(r.g), 0) / records.length || 0;
    const pct = records.length > 0 ? round((accepted / records.length) * 100) : 0;
    const statusIcon = rejected === 0 ? '🟢' : (rejected > accepted ? '🔴' : '🟡');
    const valueLabel = department === 'Simplex' ? 'Avg Hank' : 'Avg G/Y%';
    
    return `<article class="metric-card">
      <h3>${department} ${statusIcon}</h3>
      <div class="metric-row"><span>Total Samples</span><strong>${records.length}</strong></div>
      <div class="metric-row"><span>✅ Accepted</span><strong>${accepted} (${pct}%)</strong></div>
      <div class="metric-row"><span>❌ Rejected</span><strong>${rejected}</strong></div>
      <div class="metric-row"><span>📈 Avg CV%</span><strong>${round(avgCV)}%</strong></div>
      <div class="metric-row"><span>📊 ${valueLabel}</span><strong>${round(avgG)}</strong></div>
    </article>`;
  }).join('');
}

function buildDashboardCharts(data) {
  const allData = Object.values(data).flat();
  destroyDashboardCharts();

  if (allData.length === 0) {
    renderEmptyCharts();
    return;
  }

  const dailyLabels = [...new Set(allData.map(r => r.date).filter(Boolean))].sort();
  const dateLabels = dailyLabels.length ? dailyLabels : ['No date'];
  
  const gTrend = dateLabels.map(d => {
    const vals = allData.filter(r => r.date === d).map(r => Number(r.g));
    return vals.length ? round(average(vals)) : 0;
  });
  const cvTrend = dateLabels.map(d => {
    const vals = allData.filter(r => r.date === d).map(r => Number(r.cv));
    return vals.length ? round(average(vals)) : 0;
  });

  const deptLabels = Object.keys(data);
  const deptRejectRate = deptLabels.map(d => {
    const records = data[d];
    const rejected = records.filter(r => r.status === 'REJECTED').length;
    return records.length ? round((rejected / records.length) * 100) : 0;
  });

  const machineLabels = [...new Set(allData.map(r => r.machine).filter(Boolean))].sort();
  const machineChartLabels = machineLabels.length ? machineLabels : ['No machine'];
  const machineRejects = machineChartLabels.map(m => allData.filter(r => r.machine === m && r.status === 'REJECTED').length);

  renderChart('gTrendChart', 'Average Output', dateLabels, gTrend, 'rgba(45,108,223,0.85)', 'Date', 'Output Value');
  renderChart('cvTrendChart', 'Average CV%', dateLabels, cvTrend, 'rgba(255,149,0,0.85)', 'Date', 'CV%');
  renderBarChart('deptChart', 'Rejected %', deptLabels, deptRejectRate, 'rgba(210,63,63,0.85)', 'Department', 'Rejected %');
  renderBarChart('machineChart', 'Rejected Samples', machineChartLabels, machineRejects, 'rgba(155,89,182,0.85)', 'Machine', 'Rejected Samples');
}

function destroyDashboardCharts() {
  dashboardCharts.forEach(chart => chart.destroy());
  dashboardCharts = [];
}

function renderEmptyCharts() {
  renderBarChart('gTrendChart', 'No records yet', ['No data'], [0], 'rgba(45,108,223,0.45)', 'Input', 'Output');
  renderBarChart('cvTrendChart', 'No records yet', ['No data'], [0], 'rgba(255,149,0,0.45)', 'Input', 'Output');
  renderBarChart('deptChart', 'No records yet', ['No data'], [0], 'rgba(210,63,63,0.45)', 'Input', 'Output');
  renderBarChart('machineChart', 'No records yet', ['No data'], [0], 'rgba(155,89,182,0.45)', 'Input', 'Output');
}

function getChartTextColor() {
  return getComputedStyle(document.body).getPropertyValue('--text-primary').trim() || '#1f2937';
}

function getChartGridColor() {
  return getComputedStyle(document.body).getPropertyValue('--border-color').trim() || 'rgba(120,120,120,0.25)';
}

function chartOptions(xTitle, yTitle) {
  const textColor = getChartTextColor();
  const gridColor = getChartGridColor();
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true }
    },
    scales: {
      x: {
        title: { display: true, text: xTitle, color: textColor, font: { weight: '600' } },
        ticks: { color: textColor },
        grid: { color: gridColor }
      },
      y: {
        beginAtZero: true,
        title: { display: true, text: yTitle, color: textColor, font: { weight: '600' } },
        ticks: { color: textColor },
        grid: { color: gridColor }
      }
    }
  };
}

function renderChart(canvasId, label, labels, values, color, xTitle, yTitle) {
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return;
  if (typeof Chart === 'undefined') {
    drawCanvasFallback(canvasId, label, labels, values, color, xTitle, yTitle, 'line');
    return;
  }
  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{ label, data: values, backgroundColor: color, borderColor: color, fill: false, tension: 0.3 }]
    },
    options: chartOptions(xTitle, yTitle)
  });
  dashboardCharts.push(chart);
}

function renderBarChart(canvasId, label, labels, values, color, xTitle, yTitle) {
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return;
  if (typeof Chart === 'undefined') {
    drawCanvasFallback(canvasId, label, labels, values, color, xTitle, yTitle, 'bar');
    return;
  }
  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label, data: values, backgroundColor: color }]
    },
    options: chartOptions(xTitle, yTitle)
  });
  dashboardCharts.push(chart);
}

function drawCanvasFallback(canvasId, label, labels, values, color, xTitle, yTitle, type) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return;

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(320, Math.floor(rect.width * dpr));
  canvas.height = Math.floor(260 * dpr);
  ctx.scale(dpr, dpr);

  const width = canvas.width / dpr;
  const height = canvas.height / dpr;
  const pad = { left: 54, right: 18, top: 18, bottom: 52 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const maxValue = Math.max(...values, 1);
  const textColor = getChartTextColor();
  const gridColor = getChartGridColor();

  ctx.clearRect(0, 0, width, height);
  ctx.font = '12px Arial';
  ctx.fillStyle = textColor;
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;

  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (plotH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();
    ctx.fillText(String(round(maxValue - (maxValue / 4) * i)), 8, y + 4);
  }

  ctx.strokeStyle = textColor;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, height - pad.bottom);
  ctx.lineTo(width - pad.right, height - pad.bottom);
  ctx.stroke();

  const points = values.map((value, index) => {
    const x = type === 'bar'
      ? pad.left + (plotW / Math.max(labels.length, 1)) * (index + 0.5)
      : pad.left + (plotW / Math.max(labels.length - 1, 1)) * index;
    const y = pad.top + plotH - (value / maxValue) * plotH;
    return { x, y, value };
  });

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  if (type === 'bar') {
    const barW = Math.max(20, plotW / Math.max(labels.length, 1) * 0.55);
    points.forEach(point => {
      ctx.fillRect(point.x - barW / 2, point.y, barW, height - pad.bottom - point.y);
    });
  } else {
    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
    points.forEach(point => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  ctx.fillStyle = textColor;
  labels.forEach((item, index) => {
    const x = type === 'bar'
      ? pad.left + (plotW / Math.max(labels.length, 1)) * (index + 0.5)
      : pad.left + (plotW / Math.max(labels.length - 1, 1)) * index;
    ctx.fillText(String(item).slice(0, 10), Math.min(x, width - 74), height - 28);
  });
  ctx.fillText(xTitle, pad.left + plotW / 2 - 24, height - 8);
  ctx.save();
  ctx.translate(14, pad.top + plotH / 2 + 28);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(yTitle || label, 0, 0);
  ctx.restore();
}
