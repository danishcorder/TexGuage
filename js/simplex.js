/**
 * TexGauge IQ - Simplex (Roving) Quality Monitoring Module
 * 
 * HR Group selection, dynamic machines, weight validation,
 * and all Simplex-specific business logic.
 */

// ==================== CONFIGURATION ====================

const SIMPLEX_CONFIG = {
  groups: {
    hr059: {
      label: 'Group 1',
      hr: 0.59,
      machines: [
        { id: 'S1', minWeight: 5.45, maxWeight: 5.58 },
        { id: 'S2', minWeight: 5.45, maxWeight: 5.58 },
        { id: 'S5', minWeight: 5.45, maxWeight: 5.58 },
        { id: 'S6', minWeight: 5.45, maxWeight: 5.58 },
        { id: 'S9', minWeight: 5.45, maxWeight: 5.58 },
        { id: 'S10', minWeight: 5.45, maxWeight: 5.58 },
        { id: 'S13', minWeight: 5.45, maxWeight: 5.58 },
        { id: 'S14', minWeight: 5.45, maxWeight: 5.58 },
        { id: 'S17', minWeight: 5.45, maxWeight: 5.58 },
        { id: 'S18', minWeight: 5.45, maxWeight: 5.58 }
      ]
    },
    hr070: {
      label: 'Group 2',
      hr: 0.70,
      machines: [
        { id: 'S3', minWeight: 4.54, maxWeight: 4.69 },
        { id: 'S4', minWeight: 4.54, maxWeight: 4.69 },
        { id: 'S7', minWeight: 4.54, maxWeight: 4.69 },
        { id: 'S8', minWeight: 4.54, maxWeight: 4.69 },
        { id: 'S11', minWeight: 4.54, maxWeight: 4.69 },
        { id: 'S12', minWeight: 4.54, maxWeight: 4.69 },
        { id: 'S15', minWeight: 4.54, maxWeight: 4.69 },
        { id: 'S16', minWeight: 4.54, maxWeight: 4.69 },
        { id: 'S19', minWeight: 4.54, maxWeight: 4.69 },
        { id: 'S20', minWeight: 4.54, maxWeight: 4.69 }
      ]
    }
  },
  maxSamples: 6,
  sampleLengthOptions: [1, 2, 3, 4, 5, 6],
  storageKey: 'spinning_mill_simplex'
};

// ==================== STATE ====================

const SimplexState = {
  selectedGroup: null,
  selectedMachine: null,
  records: [],
  hrValue: 0,
  minWeight: 0,
  maxWeight: 0,
  sampleCount: 6,
  sampleLength: 6
};

// ==================== DOM REFS ====================

function getEl(id) { return document.getElementById(id); }

// ==================== INITIALIZATION ====================

function initSimplexPage() {
  reportState.department = 'Simplex';
  reportState.isSimplex = true;
  
  setThemeToggle();
  setMobileToggle();
  setDefaultDate(getEl('date'));
  
  buildHRGroupTabs();
  populateMachineDropdown();
  setupEventListeners();
  
  // Initial state
  updateMachineWeightRange();
  updateSampleVisibility();
  updateLengthDisplay();
  
  SimplexState.records = loadRecords('Simplex');
  refreshCalculations();
  updateReportTable();
}

// ==================== HR GROUP TABS ====================

function buildHRGroupTabs() {
  const container = getEl('hrGroupContainer');
  if (!container) return;
  
  const groupKeys = Object.keys(SIMPLEX_CONFIG.groups);
  const firstKey = groupKeys[0];
  SimplexState.selectedGroup = firstKey;
  
  container.innerHTML = groupKeys.map(key => {
    const g = SIMPLEX_CONFIG.groups[key];
    const isActive = key === firstKey;
    return `<button class="${isActive ? 'primary' : 'secondary'}" data-group="${key}" style="width:100%;min-height:42px;padding:6px 16px;font-size:0.85rem;">${g.label} (HR = ${g.hr})</button>`;
  }).join('');
  
  // Add click listeners
  container.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', function() {
      const key = this.dataset.group;
      if (key === SimplexState.selectedGroup) return;
      
      // Update active state
      container.querySelectorAll('button').forEach(b => {
        b.className = b.dataset.group === key ? 'primary' : 'secondary';
      });
      
      SimplexState.selectedGroup = key;
      const group = SIMPLEX_CONFIG.groups[key];
      SimplexState.hrValue = group.hr;
      
      // Update HR display
      const hrDisplay = getEl('hrDisplay');
      if (hrDisplay) hrDisplay.textContent = group.hr.toFixed(2);
      
      populateMachineDropdown();
      updateMachineWeightRange();
      refreshCalculations();
    });
  });
  
  // Set initial HR display
  const firstGroup = SIMPLEX_CONFIG.groups[firstKey];
  const hrDisplay = getEl('hrDisplay');
  if (hrDisplay) hrDisplay.textContent = firstGroup.hr.toFixed(2);
}

// ==================== MACHINE DROPDOWN ====================

function populateMachineDropdown() {
  const machineSelect = getEl('machine');
  if (!machineSelect) return;
  
  const group = SIMPLEX_CONFIG.groups[SimplexState.selectedGroup];
  if (!group) return;
  
  machineSelect.innerHTML = group.machines.map(m => 
    `<option value="${m.id}">${m.id}</option>`
  ).join('');
  
  // Trigger machine change
  if (machineSelect.onchange) {
    machineSelect.onchange();
  } else {
    updateMachineWeightRange();
  }
}

// ==================== MACHINE WEIGHT RANGE ====================

function updateMachineWeightRange() {
  const machineSelect = getEl('machine');
  const minWeightInput = getEl('minWeight');
  const maxWeightInput = getEl('maxWeight');
  const minWeightDisplay = getEl('minWeightDisplay');
  const maxWeightDisplay = getEl('maxWeightDisplay');
  const hrDisplay = getEl('hrDisplay');
  
  if (!machineSelect) return;
  
  const group = SIMPLEX_CONFIG.groups[SimplexState.selectedGroup];
  if (!group) return;
  
  const machineId = machineSelect.value;
  const machine = group.machines.find(m => m.id === machineId);
  
  if (machine) {
    SimplexState.minWeight = machine.minWeight;
    SimplexState.maxWeight = machine.maxWeight;
    SimplexState.selectedMachine = machineId;
    
    if (minWeightInput) minWeightInput.value = machine.minWeight.toFixed(2);
    if (maxWeightInput) maxWeightInput.value = machine.maxWeight.toFixed(2);
    if (minWeightDisplay) minWeightDisplay.textContent = machine.minWeight.toFixed(2);
    if (maxWeightDisplay) maxWeightDisplay.textContent = machine.maxWeight.toFixed(2);
    if (hrDisplay) hrDisplay.textContent = group.hr.toFixed(2);
    
    SimplexState.hrValue = group.hr;
  }
  
  validateAllSamples();
}

// ==================== EVENT LISTENERS ====================

function setupEventListeners() {
  // No of Samples
  const noOfSamples = getEl('noOfSamples');
  if (noOfSamples) {
    noOfSamples.addEventListener('change', function() {
      SimplexState.sampleCount = parseInt(this.value);
      updateSampleVisibility();
      refreshCalculations();
    });
  }
  
  // Sample Length
  const sampleLength = getEl('sampleLength');
  if (sampleLength) {
    sampleLength.addEventListener('change', function() {
      SimplexState.sampleLength = parseInt(this.value);
      updateLengthDisplay();
      refreshCalculations();
    });
  }
  
  // Machine
  const machineSelect = getEl('machine');
  if (machineSelect) {
    machineSelect.addEventListener('change', function() {
      updateMachineWeightRange();
      refreshCalculations();
    });
  }
  
  // Sample inputs
  const sampleInputs = getAllSampleInputs();
  sampleInputs.forEach(input => {
    if (input) {
      input.addEventListener('input', function() {
        validateSampleInput(this);
        refreshCalculations();
      });
      input.addEventListener('blur', function() {
        validateSampleInput(this);
      });
    }
  });
  
  // Shift for calculations refresh
  ['shift'].forEach(id => {
    const el = getEl(id);
    if (el) {
      el.addEventListener('change', refreshCalculations);
      el.addEventListener('input', refreshCalculations);
    }
  });
  
  // Save button
  getEl('saveBtn')?.addEventListener('click', () => saveSimplexRecord());
  
  // Export button
  getEl('excelBtn')?.addEventListener('click', () => exportDepartmentToExcel('Simplex', loadRecords('Simplex')));
  
  // Filters
  ['searchText', 'filterDate', 'filterShift'].forEach(id => {
    const el = getEl(id);
    if (el) {
      el.addEventListener(id === 'searchText' ? 'input' : 'change', function() {
        const keyMap = { searchText: 'text', filterDate: 'date', filterShift: 'shift' };
        reportState.filters[keyMap[id]] = this.value;
        updateReportTable();
      });
    }
  });
  
  // Initialize with defaults
  SimplexState.sampleCount = parseInt(getEl('noOfSamples')?.value || 6);
  SimplexState.sampleLength = parseInt(getEl('sampleLength')?.value || 6);
}

// ==================== SAMPLE VISIBILITY ====================

function updateSampleVisibility() {
  updateSimplexSampleVisibility();
}

function updateSimplexSampleVisibility() {
  const count = SimplexState.sampleCount;
  for (let i = 1; i <= SIMPLEX_CONFIG.maxSamples; i++) {
    const input = getEl('s' + i);
    if (!input) continue;
    const label = input.closest('label');
    if (i <= count) {
      input.disabled = false;
      if (label) label.style.display = '';
    } else {
      input.disabled = true;
      input.value = '';
      input.classList.remove('validation-error');
      const err = label?.querySelector('.validation-error-message');
      if (err) err.remove();
      if (label) label.style.display = 'none';
    }
  }
}

// ==================== LENGTH DISPLAY ====================

function updateLengthDisplay() {
  const yards = SimplexState.sampleLength;
  const meters = yards * 0.9144;
  
  const display1 = getEl('lengthDisplay');
  const display2 = getEl('lengthDisplayMeter');
  
  if (display1) display1.textContent = `${yards} yd / ${meters.toFixed(4)} m`;
  if (display2) display2.textContent = `${meters.toFixed(4)} m / ${yards.toFixed(4)} yd`;
}

// ==================== SAMPLE VALIDATION ====================

function validateSampleInput(input) {
  input.classList.remove('validation-error');
  const existingError = input.parentElement?.querySelector('.validation-error-message');
  if (existingError) existingError.remove();
  
  if (!input.value || input.disabled) return true;
  
  const value = parseFloat(input.value);
  if (isNaN(value) || value <= 0) return true;
  
  if (value < SimplexState.minWeight || value > SimplexState.maxWeight) {
    input.classList.add('validation-error');
    const errorMsg = document.createElement('span');
    errorMsg.className = 'validation-error-message';
    errorMsg.textContent = `Expected: ${SimplexState.minWeight} - ${SimplexState.maxWeight} g`;
    input.parentElement?.appendChild(errorMsg);
    return false;
  }
  return true;
}

function validateAllSamples() {
  let allValid = true;
  for (let i = 1; i <= SIMPLEX_CONFIG.maxSamples; i++) {
    const input = getEl('s' + i);
    if (input && !input.disabled && input.value) {
      if (!validateSampleInput(input)) allValid = false;
    }
  }
  return allValid;
}

function hasAnyValidationErrors() {
  for (let i = 1; i <= SIMPLEX_CONFIG.maxSamples; i++) {
    const input = getEl('s' + i);
    if (input && input.classList.contains('validation-error')) return true;
  }
  return false;
}

// ==================== GET VISIBLE SAMPLES ====================

function getVisibleSampleValues() {
  const values = [];
  for (let i = 1; i <= SIMPLEX_CONFIG.maxSamples; i++) {
    const input = getEl('s' + i);
    if (input && !input.disabled && input.value) {
      const val = parseFloat(input.value);
      if (!isNaN(val) && val > 0) values.push(val);
    }
  }
  return values;
}

// ==================== CALCULATIONS ====================

function refreshCalculations() {
  const sampleValues = getVisibleSampleValues();
  const sampleCount = sampleValues.length;
  
  const meanValue = sampleCount > 0 ? average(sampleValues) : 0;
  const meanDisplay = roundMean(meanValue);
  const sdValue = (sampleCount > 1) ? standardDeviation(sampleValues) : 0;
  const sdDisplay = roundSD(sdValue);
  const cvValue = sampleCount > 0 ? cvPercent(sampleValues) : 0;
  const cvDisplay = roundCV(cvValue);
  
  // Hank Roving uses the selected sample length
  const hankValue = hankRovingValue(meanValue, SimplexState.sampleLength);
  const hankDisplay = roundHank(hankValue);
  
  // HR% based on Hank Roving and machine HR
  const hrValue = (hankValue / (SimplexState.hrValue || 0.59)) * 100;
  
  // Use the HR value and check against a standard range (95-105%)
  const status = evaluateRange(hrValue, 95, 105);
  
  // Check fields
  const allFieldsFilled = ['date', 'shift', 'machine', 'operator'].every(id => getEl(id)?.value);
  const hasEnoughSamples = sampleValues.filter(s => s > 0).length >= 2;
  const hasErrors = hasAnyValidationErrors();
  
  // Update display
  const avgEl = getEl('avgWeight');
  if (avgEl) avgEl.textContent = meanDisplay;
  
  const sdEl = getEl('sdValue');
  if (sdEl) sdEl.textContent = sdDisplay;
  
  const cvEl = getEl('cvValue');
  if (cvEl) cvEl.textContent = cvDisplay;
  
  const gEl = getEl('gValue');
  if (gEl) gEl.textContent = hankDisplay;
  
  // Status message
  const statusMessage = getEl('statusMessage');
  if (statusMessage) {
    if (sampleCount < 2) {
      statusMessage.innerHTML = `ℹ️ Enter at least 2 samples (currently ${sampleCount})`;
      statusMessage.style.color = '#888';
      statusMessage.dataset.status = '';
    } else if (hasErrors) {
      statusMessage.innerHTML = `⚠️ Some samples are outside machine weight range.`;
      statusMessage.style.color = 'var(--danger)';
      statusMessage.dataset.status = '';
    } else {
      const emoji = status.status === 'ACCEPTED' ? '🟢' : '🔴';
      statusMessage.innerHTML = `${emoji} ${status.status}: ${status.message} (${sampleCount} samples)`;
      statusMessage.style.color = status.color;
      statusMessage.dataset.status = allFieldsFilled && hasEnoughSamples && !hasErrors ? status.status : '';
    }
  }
  
  // Save button
  const saveBtn = getEl('saveBtn');
  if (saveBtn) saveBtn.disabled = !allFieldsFilled || !hasEnoughSamples;
}

// ==================== SAVE RECORD ====================

function saveSimplexRecord() {
  const sampleValues = getVisibleSampleValues();
  const sampleCount = sampleValues.length;
  const meanValue = sampleCount > 0 ? average(sampleValues) : 0;
  const sdValue = (sampleCount > 1) ? standardDeviation(sampleValues) : 0;
  const cvValue = sampleCount > 0 ? cvPercent(sampleValues) : 0;
  
  const hankValue = hankRovingValue(meanValue, SimplexState.sampleLength);
  const hrValue = (hankValue / (SimplexState.hrValue || 0.59)) * 100;
  
  // Determine status based on weight validation
  let recordStatus = 'ACCEPTED';
  const hasOutOfRange = sampleValues.some(s => s > 0 && (s < SimplexState.minWeight || s > SimplexState.maxWeight));
  if (hasOutOfRange) recordStatus = 'REJECTED';
  
  // Also check HR% range (95-105%)
  const hrStatus = evaluateRange(hrValue, 95, 105);
  if (hrStatus.status === 'REJECTED') recordStatus = 'REJECTED';
  
  const record = {
    date: getEl('date')?.value,
    shift: getEl('shift')?.value,
    machine: getEl('machine')?.value,
    operator: getEl('operator')?.value,
    hrGroup: SimplexState.selectedGroup,
    hr: SimplexState.hrValue,
    sampleLength: SimplexState.sampleLength,
    sampleCount: SimplexState.sampleCount,
    samples: sampleValues,
    average: roundMean(meanValue),
    sd: roundSD(sdValue),
    cv: roundCV(cvValue),
    g: roundHank(hankValue),
    hrValue: round(hrValue, 2),
    status: recordStatus
  };
  
  const records = loadRecords('Simplex');
  records.unshift(record);
  saveRecords('Simplex', records);
  SimplexState.records = records;
  
  updateReportTable();
  
  // Clear only sample inputs, operator and date stay
  clearInputs(true);
  refreshCalculations();
  
  // Evaluate alert
  AlertSystem.evaluate(record, 'Simplex');
  updateAlertPanel();
}

// ==================== REPORT TABLE ====================

function updateReportTable() {
  const tbody = document.querySelector('#reportTable tbody');
  if (!tbody) return;
  
  const filtered = (reportState.records || []).filter(record => {
    const text = reportState.filters?.text?.toLowerCase() || '';
    const matchText = !text || [record.operator, record.machine, record.shift, record.date].some(f => String(f).toLowerCase().includes(text));
    const matchDate = !reportState.filters?.date || record.date === reportState.filters.date;
    const matchShift = !reportState.filters?.shift || record.shift === reportState.filters.shift;
    return matchText && matchDate && matchShift;
  });
  
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr class="empty-state"><td colspan="10">No records saved yet. Enter data above and click <strong>Save Record</strong> to begin.</td></tr>';
    return;
  }
  
  tbody.innerHTML = filtered.map((record, idx) => {
    const statusColor = record.status === 'ACCEPTED' ? '#2f9c4d' : '#d23f3f';
    return `<tr>
      <td>${record.date}</td>
      <td>${record.shift}</td>
      <td>${record.machine}</td>
      <td>${record.operator}</td>
      <td>${record.sampleCount || ''}</td>
      <td>${record.average}</td>
      <td>${record.cv}</td>
      <td>${record.g}</td>
      <td><span class="status-badge" style="background:${statusColor};">${record.status}</span></td>
      <td><button class="secondary" style="padding:4px 10px;font-size:0.75rem;background:var(--danger-light);color:var(--danger);border-color:var(--danger);" onclick="deleteSimplexRecord(${idx})">🗑</button></td>
    </tr>`;
  }).join('');
}

// ==================== DELETE INDIVIDUAL RECORD ====================

function deleteSimplexRecord(index) {
  if (!confirm('Delete this record? This action cannot be undone.')) return;
  
  const records = loadRecords('Simplex');
  if (index >= 0 && index < records.length) {
    records.splice(index, 1);
    saveRecords('Simplex', records);
    SimplexState.records = records;
    reportState.records = records;
    updateReportTable();
  }
}

// ==================== OVERRIDE GLOBAL FUNCTIONS FOR SIMPLEX ====================

const simplexUpdateReportTable = updateReportTable;
const simplexRefreshCalculations = refreshCalculations;
const simplexUpdateMachineWeightRange = updateMachineWeightRange;
const simplexUpdateLengthDisplay = updateLengthDisplay;
const simplexValidateSampleInput = validateSampleInput;
const simplexValidateAllSamples = validateAllSamples;
const simplexGetVisibleSampleValues = getVisibleSampleValues;

function simplexGetAllSampleInputs() {
  return ['s1', 's2', 's3', 's4', 's5', 's6'].map(id => document.getElementById(id));
}

// Override the global report table update for simplex context
const origUpdateReportTable = window.updateReportTable;
window.updateReportTable = function() {
  if (reportState.isSimplex) {
    return simplexUpdateReportTable();
  }
  if (origUpdateReportTable) origUpdateReportTable();
};

// Override refreshCalculations for simplex  
const origRefreshCalculations = window.refreshCalculations;
window.refreshCalculations = function() {
  if (reportState.isSimplex) {
    return simplexRefreshCalculations();
  }
  if (origRefreshCalculations) origRefreshCalculations();
};

// Override updateMachineWeightRange for simplex
const origUpdateMachineWeightRange = window.updateMachineWeightRange;
window.updateMachineWeightRange = function() {
  if (reportState.isSimplex) {
    return simplexUpdateMachineWeightRange();
  }
  if (origUpdateMachineWeightRange) origUpdateMachineWeightRange();
};

// Override updateSampleVisibility for simplex
const origUpdateSampleVisibility = window.updateSampleVisibility;
window.updateSampleVisibility = function() {
  if (reportState.isSimplex) {
    updateSimplexSampleVisibility();
    return;
  }
  if (origUpdateSampleVisibility) origUpdateSampleVisibility();
};

// Override updateLengthDisplay for simplex
const origUpdateLengthDisplay = window.updateLengthDisplay;
window.updateLengthDisplay = function() {
  if (reportState.isSimplex) {
    return simplexUpdateLengthDisplay();
  }
  if (origUpdateLengthDisplay) origUpdateLengthDisplay();
};

// Override validateSampleInput for simplex
const origValidateSampleInput = window.validateSampleInput;
window.validateSampleInput = function(input) {
  if (reportState.isSimplex) {
    return simplexValidateSampleInput(input);
  }
  if (origValidateSampleInput) origValidateSampleInput(input);
};

// Override validateAllSamples for simplex
const origValidateAllSamples = window.validateAllSamples;
window.validateAllSamples = function() {
  if (reportState.isSimplex) {
    return simplexValidateAllSamples();
  }
  if (origValidateAllSamples) return origValidateAllSamples();
  return true;
};

// Override getAllSampleInputs to respect max 6 for simplex
const origGetAllSampleInputs = window.getAllSampleInputs;
window.getAllSampleInputs = function() {
  if (reportState.isSimplex) {
    return simplexGetAllSampleInputs();
  }
  if (origGetAllSampleInputs) return origGetAllSampleInputs();
  return [];
};

// Override getVisibleSampleValues for simplex
const origGetVisibleSampleValues = window.getVisibleSampleValues;
window.getVisibleSampleValues = function() {
  if (reportState.isSimplex) {
    return simplexGetVisibleSampleValues();
  }
  if (origGetVisibleSampleValues) return origGetVisibleSampleValues();
  return [];
};
