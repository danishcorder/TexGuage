const SampleCount = 6;

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

// Average (Mean) - 2 decimal places
function average(values) {
  const valid = values.filter(v => !Number.isNaN(v) && v > 0);
  return valid.length === 0 ? 0 : valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

// Population Standard Deviation - 3 decimal places
function standardDeviation(values) {
  const valid = values.filter(v => !Number.isNaN(v) && v > 0);
  const mean = average(valid);
  if (valid.length === 0) return 0;
  const variance = valid.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / valid.length;
  return Math.sqrt(variance);
}

// CV% = (Standard Deviation / Mean) × 100
function cvPercent(values) {
  const valid = values.filter(v => !Number.isNaN(v) && v > 0);
  const mean = average(valid);
  if (mean === 0 || valid.length === 0) return 0;
  return (standardDeviation(valid) / mean) * 100;
}

// G/Y (%) = (Weight_grams × 15.432) / 8
function gyPercent(actualAverage, targetGrams) {
  if (targetGrams === 0) return 0;
  return (actualAverage * 15.432) / 6;
}

// G/Y (%) using target weight - backward compatible
function gPercent(actualAverage, targetGrams) {
  return gyPercent(actualAverage, targetGrams);
}

// Hank Roving = (Length_Yards × 453.6) / (Weight_grams × 840)
function hankRovingValue(averageWeight, lengthYards = 1) {
  if (averageWeight === 0 || lengthYards === 0) return 0;
  return (lengthYards * 453.6) / (averageWeight * 840);
}

function isPositiveNumber(value) {
  return Number.isFinite(value) && value > 0;
}

function parseSamplesFromInputs(inputs) {
  return inputs
    .map(input => Number(input.value || input.getAttribute('data-value') || 0))
    .map(value => Number.isFinite(value) ? value : 0);
}