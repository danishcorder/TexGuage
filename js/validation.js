function evaluateRange(value, min, max) {
  const numericValue = Number(value);
  const numericMin = Number(min);
  const numericMax = Number(max);
  const withinRange = numericValue >= numericMin && numericValue <= numericMax;
  return {
    accepted: withinRange,
    status: withinRange ? 'ACCEPTED' : 'REJECTED',
    color: withinRange ? '#2f9c4d' : '#d23f3f',
    message: withinRange ? '✅ Sample is within target range.' : '❌ Sample Out Of Control. Please Recheck Sample.'
  };
}

function validateEntryFields(values) {
  // Check that date, shift, machine, operator are filled
  const requiredFields = ['date', 'shift', 'machine', 'operator'];
  for (const field of requiredFields) {
    const val = values[field];
    if (val === undefined || val === null || val === '') {
      return false;
    }
  }

  // Check samples - filter out zeros and count valid entries
  if (!values.samples || !Array.isArray(values.samples)) return false;
  
  const validSamples = values.samples.filter(s => Number(s) > 0);
  const minRequired = values.minSamples || 2;
  
  if (validSamples.length < minRequired) return false;

  return true;
}

function formatStatusBadge(statusObj) {
  return `<span class="status-badge" style="background:${statusObj.color};">${statusObj.status}</span>`;
}