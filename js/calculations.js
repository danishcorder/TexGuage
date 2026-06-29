const SampleCount = 10;

// Machine weight ranges configuration - easily extensible
const machineWeightRanges = {
  C1: { hr: 0.59, min: 5.45, max: 5.58 },
  C2: { hr: 0.70, min: 4.54, max: 4.69 },
  C3: { hr: 0.65, min: 5.10, max: 5.25 },
  C4: { hr: 0.72, min: 4.80, max: 4.95 },
  C5: { hr: 0.68, min: 5.20, max: 5.35 },
  C6: { hr: 0.75, min: 4.60, max: 4.75 },
  C7: { hr: 0.62, min: 5.30, max: 5.45 },
  C8: { hr: 0.70, min: 4.90, max: 5.05 },
  C9: { hr: 0.67, min: 5.15, max: 5.30 },
  C10: { hr: 0.73, min: 4.70, max: 4.85 },
  C11: { hr: 0.64, min: 5.25, max: 5.40 },
  C12: { hr: 0.71, min: 4.85, max: 5.00 },
  C13: { hr: 0.69, min: 5.05, max: 5.20 },
  C14: { hr: 0.74, min: 4.65, max: 4.80 },
  C15: { hr: 0.66, min: 5.18, max: 5.33 },
  C16: { hr: 0.70, min: 4.88, max: 5.03 },
  C17: { hr: 0.68, min: 5.12, max: 5.27 },
  C18: { hr: 0.72, min: 4.78, max: 4.93 },
  C19: { hr: 0.65, min: 5.22, max: 5.37 },
  C20: { hr: 0.71, min: 4.82, max: 4.97 },
  B1: { hr: 0.58, min: 5.50, max: 5.65 },
  B2: { hr: 0.69, min: 4.60, max: 4.75 },
  B3: { hr: 0.64, min: 5.15, max: 5.30 },
  B4: { hr: 0.71, min: 4.85, max: 5.00 },
  B5: { hr: 0.67, min: 5.25, max: 5.40 },
  B6: { hr: 0.74, min: 4.65, max: 4.80 },
  B7: { hr: 0.61, min: 5.35, max: 5.50 },
  B8: { hr: 0.69, min: 4.95, max: 5.10 },
  B9: { hr: 0.66, min: 5.20, max: 5.35 },
  B10: { hr: 0.72, min: 4.75, max: 4.90 },
  B11: { hr: 0.63, min: 5.30, max: 5.45 },
  B12: { hr: 0.70, min: 4.90, max: 5.05 },
  B13: { hr: 0.68, min: 5.10, max: 5.25 },
  B14: { hr: 0.73, min: 4.70, max: 4.85 },
  B15: { hr: 0.65, min: 5.22, max: 5.37 },
  B16: { hr: 0.71, min: 4.82, max: 4.97 },
  B17: { hr: 0.67, min: 5.18, max: 5.33 },
  B18: { hr: 0.70, min: 4.88, max: 5.03 },
  B19: { hr: 0.64, min: 5.28, max: 5.43 },
  B20: { hr: 0.72, min: 4.78, max: 4.93 },
  F1: { hr: 0.60, min: 5.48, max: 5.63 },
  F2: { hr: 0.71, min: 4.58, max: 4.73 },
  F3: { hr: 0.66, min: 5.12, max: 5.27 },
  F4: { hr: 0.73, min: 4.78, max: 4.93 },
  F5: { hr: 0.69, min: 5.22, max: 5.37 },
  F6: { hr: 0.76, min: 4.62, max: 4.77 },
  F7: { hr: 0.63, min: 5.32, max: 5.47 },
  F8: { hr: 0.71, min: 4.92, max: 5.07 },
  F9: { hr: 0.68, min: 5.18, max: 5.33 },
  F10: { hr: 0.74, min: 4.72, max: 4.87 },
  F11: { hr: 0.65, min: 5.28, max: 5.43 },
  F12: { hr: 0.72, min: 4.82, max: 4.97 },
  F13: { hr: 0.70, min: 5.08, max: 5.23 },
  F14: { hr: 0.75, min: 4.68, max: 4.83 },
  F15: { hr: 0.67, min: 5.20, max: 5.35 },
  F16: { hr: 0.73, min: 4.80, max: 4.95 },
  F17: { hr: 0.69, min: 5.15, max: 5.30 },
  F18: { hr: 0.72, min: 4.85, max: 5.00 },
  F19: { hr: 0.66, min: 5.25, max: 5.40 },
  F20: { hr: 0.74, min: 4.75, max: 4.90 },
  S1: { hr: 0.55, min: 5.60, max: 5.75 },
  S2: { hr: 0.66, min: 4.65, max: 4.80 },
  S3: { hr: 0.61, min: 5.25, max: 5.40 },
  S4: { hr: 0.68, min: 4.95, max: 5.10 },
  S5: { hr: 0.64, min: 5.35, max: 5.50 },
  S6: { hr: 0.71, min: 4.75, max: 4.90 },
  S7: { hr: 0.58, min: 5.45, max: 5.60 },
  S8: { hr: 0.67, min: 5.05, max: 5.20 },
  S9: { hr: 0.63, min: 5.30, max: 5.45 },
  S10: { hr: 0.70, min: 4.85, max: 5.00 },
  S11: { hr: 0.60, min: 5.40, max: 5.55 },
  S12: { hr: 0.68, min: 5.00, max: 5.15 },
  S13: { hr: 0.65, min: 5.20, max: 5.35 },
  S14: { hr: 0.72, min: 4.80, max: 4.95 },
  S15: { hr: 0.62, min: 5.32, max: 5.47 },
  S16: { hr: 0.69, min: 4.98, max: 5.13 },
  S17: { hr: 0.66, min: 5.18, max: 5.33 },
  S18: { hr: 0.71, min: 4.88, max: 5.03 },
  S19: { hr: 0.63, min: 5.28, max: 5.43 },
  S20: { hr: 0.70, min: 4.90, max: 5.05 }
};

// Get machine weight range
function getMachineWeightRange(machineId) {
  const machine = machineId || '';
  return machineWeightRanges[machine] || { hr: 0, min: 0, max: 0 };
}

// Round to specified decimal places
function round(value, digits = 2) {
  return Number.isFinite(value) ? Number(value.toFixed(digits)) : 0;
}

// Round Mean to 2 decimal places
function roundMean(value) {
  return round(value, 2);
}

// Round Standard Deviation to 3 decimal places
function roundSD(value) {
  return round(value, 3);
}

// Round CV% to 2 decimal places
function roundCV(value) {
  return round(value, 2);
}

// Round G/Y to 2 decimal places
function roundGY(value) {
  return round(value, 2);
}

// Round Hank Roving to 3 decimal places
function roundHank(value) {
  return round(value, 3);
}

// Average (Mean) - 2 decimal places - only includes visible (enabled) samples
function average(values) {
  const valid = values.filter(v => !Number.isNaN(v) && v > 0);
  return valid.length === 0 ? 0 : valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

// Sample Standard Deviation (n-1) - only includes visible (enabled) samples
function standardDeviation(values) {
  const valid = values.filter(v => !Number.isNaN(v) && v > 0);
  const avg = average(valid);

  if (valid.length <= 1) return 0;

  const variance =
    valid.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) /
    (valid.length - 1);

  return Math.sqrt(variance);
}

// CV% = (Sample Standard Deviation / Average) × 100 - only visible samples
function cvPercent(values) {
  const valid = values.filter(v => !Number.isNaN(v) && v > 0);
  const mean = average(valid);
  if (mean === 0 || valid.length === 0) return 0;
  return (standardDeviation(valid) / mean) * 100;
}

// G/Y% = (Average Weight in grams / Sample Length in yards) × 15.432
function gyPercent(actualAverage, sampleLengthYards) {
  if (sampleLengthYards === 0 || actualAverage === 0) return 0;
  return (actualAverage / sampleLengthYards) * 15.432;
}

// G% calculation using G/Y value
function gPercent(actualAverage, targetGrams, sampleLengthYards = 6) {
  const gy = gyPercent(actualAverage, sampleLengthYards);
  if (targetGrams === 0) return 0;
  return (gy / targetGrams) * 100;
}

// Hank Roving = (Length_Yards × 453.6) / (Weight_grams × 840)
function hankRovingValue(averageWeight, lengthYards = 1) {
  if (averageWeight === 0 || lengthYards === 0) return 0;
  return (lengthYards * 453.6) / (averageWeight * 840);
}

// Convert Gram per Metre to Gram per Yard
function gramPerMetreToYard(gramPerMetre) {
  return gramPerMetre / 1.0936;
}

// Convert yards to meters
function yardsToMeters(yards) {
  return yards * 0.9144;
}

function isPositiveNumber(value) {
  return Number.isFinite(value) && value > 0;
}

// Get only visible (enabled) sample inputs
function getVisibleSampleInputs() {
  return ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10']
    .map(id => document.getElementById(id))
    .filter(input => input && !input.disabled);
}

// Get values from visible sample inputs only
function getVisibleSampleValues() {
  return getVisibleSampleInputs()
    .map(input => Number(input.value) || 0)
    .filter(v => v > 0);
}

// Validate sample weight against machine range
function validateSampleWeight(weight, minWeight, maxWeight) {
  const numericWeight = Number(weight);
  const numericMin = Number(minWeight);
  const numericMax = Number(maxWeight);
  
  const isValid = numericWeight >= numericMin && numericWeight <= numericMax;
  
  return {
    valid: isValid,
    message: isValid ? '' : 'Weight is outside the acceptable range for this machine.'
  };
}