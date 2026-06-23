// ============================================================
// SMART SPINNING MILL - PROFESSIONAL EXCEL EXPORT
// Styled worksheets with proper formatting
// ============================================================

function makeCell(value, opts = {}) {
  const cell = { t: 's', v: String(value), s: {} };
  if (opts.bold) cell.s.font = { bold: true, sz: opts.fontSize || 11, color: opts.fontColor ? { rgb: opts.fontColor } : undefined };
  if (opts.fontSize) cell.s.font = { ...cell.s.font, sz: opts.fontSize };
  if (opts.alignment) cell.s.alignment = opts.alignment;
  if (opts.fill) cell.s.fill = { fgColor: { rgb: opts.fill } };
  if (opts.border) cell.s.border = opts.border;
  if (typeof value === 'number' && !isNaN(value)) {
    cell.t = 'n';
    cell.v = value;
    if (opts.numFmt) cell.z = opts.numFmt;
  }
  return cell;
}

function addMerge(sheet, s, e) {
  if (!sheet['!merges']) sheet['!merges'] = [];
  sheet['!merges'].push({ s, e });
}

function setColWidths(sheet, widths) {
  sheet['!cols'] = widths.map(w => ({ wch: w }));
}

const STYLE = {
  headerFill: '1a1d29',
  headerFont: 'FFFFFF',
  headerAlign: { horizontal: 'center', vertical: 'center', wrapText: true },
  titleFill: '2d6cdf',
  titleFont: 'FFFFFF',
  dataAlign: { horizontal: 'center', vertical: 'center' },
  acceptedFill: '2f9c4d',
  rejectedFill: 'd23f3f',
  evenRow: 'f0f4ff',
  border: {
    top: { style: 'thin', color: { rgb: 'cccccc' } },
    bottom: { style: 'thin', color: { rgb: 'cccccc' } },
    left: { style: 'thin', color: { rgb: 'cccccc' } },
    right: { style: 'thin', color: { rgb: 'cccccc' } }
  },
  thickBorder: {
    top: { style: 'medium', color: { rgb: '999999' } },
    bottom: { style: 'medium', color: { rgb: '999999' } },
    left: { style: 'medium', color: { rgb: '999999' } },
    right: { style: 'medium', color: { rgb: '999999' } }
  }
};

function buildStyledSheet(department, records, isSimplex = false) {
  const sheet = {};
  let row = 0;

  const cols = isSimplex
    ? ['Date', 'Shift', 'Machine', 'Operator', 'Count', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'Mean', 'CV%', 'Hank Roving', 'Status']
    : ['Date', 'Shift', 'Machine', 'Operator', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'Mean', 'SD', 'CV%', 'G/Y%', 'Status'];

  const lastCol = cols.length - 1;
  const totalRows = 4 + records.length + 2; // title + empty + info + header + data + footer
  const lastRow = totalRows - 1;

  // Set column widths
  const widths = isSimplex
    ? [12, 10, 10, 18, 10, 10, 10, 10, 10, 10, 10, 10, 10, 14, 10]
    : [12, 10, 10, 18, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10];
  setColWidths(sheet, widths);

  // ROW 0: Department Title
  const titleCell = makeCell(`${department.toUpperCase()} - QUALITY REPORT`, {
    bold: true, fontSize: 16, fill: STYLE.titleFill, fontColor: STYLE.titleFont,
    alignment: { horizontal: 'center', vertical: 'center' }
  });
  sheet[XLSX.utils.encode_cell({ r: row, c: 0 })] = titleCell;
  addMerge(sheet, { r: row, c: 0 }, { r: row, c: lastCol });
  row++;

  // ROW 1: Empty spacer
  row++;

  // ROW 2: Info Section
  const latest = records.length > 0 ? records[0] : null;
  const reportDate = latest ? latest.date : new Date().toISOString().slice(0, 10);
  const totalRecords = records.length;

  const infoLabels = [
    `Department: ${department}`,
    `Report Date: ${reportDate}`,
    `Total Records: ${totalRecords}`,
    `Generated: ${new Date().toLocaleString()}`
  ];

  infoLabels.forEach((label, idx) => {
    const cell = makeCell(label, {
      bold: true, fontSize: 11,
      alignment: { horizontal: 'left', vertical: 'center' }
    });
    sheet[XLSX.utils.encode_cell({ r: row, c: idx })] = cell;
  });
  addMerge(sheet, { r: row, c: 0 }, { r: row, c: Math.min(3, lastCol) });
  row++;

  // ROW 3: Column Headers
  cols.forEach((colName, idx) => {
    const cell = makeCell(colName, {
      bold: true, fontSize: 11, fill: STYLE.headerFill, fontColor: STYLE.headerFont,
      alignment: STYLE.headerAlign, border: STYLE.thickBorder
    });
    sheet[XLSX.utils.encode_cell({ r: row, c: idx })] = cell;
  });
  row++;

  // ROWS 4+: Data Rows
  if (records.length === 0) {
    const emptyCell = makeCell('No records found. Please save some records first.', {
      alignment: STYLE.dataAlign, border: STYLE.border
    });
    sheet[XLSX.utils.encode_cell({ r: row, c: 0 })] = emptyCell;
    addMerge(sheet, { r: row, c: 0 }, { r: row, c: lastCol });
    row++;
  } else {
    records.forEach((record, idx) => {
      const isEven = idx % 2 === 0;
      const rowFill = isEven ? STYLE.evenRow : undefined;
      const statusColor = record.status === 'ACCEPTED' ? STYLE.acceptedFill : STYLE.rejectedFill;

      const s = Array.isArray(record.samples) ? record.samples : [];
      const samples = [];
      for (let i = 0; i < 6; i++) {
        samples.push(s[i] !== undefined ? s[i] : '');
      }

      const rowData = isSimplex ? [
        record.date || '', record.shift || '', record.machine || '', record.operator || '',
        record.count !== undefined ? record.count : '',
        samples[0], samples[1], samples[2], samples[3], samples[4], samples[5],
        record.average || 0, record.cv || 0, record.g || 0, record.status || ''
      ] : [
        record.date || '', record.shift || '', record.machine || '', record.operator || '',
        samples[0], samples[1], samples[2], samples[3], samples[4], samples[5],
        record.average || 0, record.sd || 0, record.cv || 0, record.g || 0, record.status || ''
      ];

      rowData.forEach((val, cIdx) => {
        const isNum = typeof val === 'number' && !isNaN(val);
        const cell = makeCell(val, {
          alignment: STYLE.dataAlign,
          border: STYLE.border,
          fill: rowFill,
          numFmt: '0.00'
        });
        if (cIdx === lastCol) {
          cell.s.font = { bold: true, color: { rgb: 'FFFFFF' } };
          cell.s.fill = { fgColor: { rgb: statusColor } };
        }
        sheet[XLSX.utils.encode_cell({ r: row, c: cIdx })] = cell;
      });
      row++;
    });
  }

  // Footer
  row++;
  const footerCell = makeCell('© TexGauge - Textile Quality Monitoring System', {
    fontSize: 9, alignment: { horizontal: 'center' }
  });
  sheet[XLSX.utils.encode_cell({ r: row, c: 0 })] = footerCell;
  addMerge(sheet, { r: row, c: 0 }, { r: row, c: lastCol });

  // Set row heights
  sheet['!rows'] = [
    { hpt: 36 },
    { hpt: 8 },
    { hpt: 20 },
    { hpt: 24 }
  ];
  records.forEach(() => {
    sheet['!rows'].push({ hpt: 22 });
  });
  if (records.length === 0) sheet['!rows'].push({ hpt: 22 });
  sheet['!rows'].push({ hpt: 18 });

  // !!! CRITICAL: Set the sheet reference range !!!
  sheet['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: lastRow, c: lastCol } });

  return sheet;
}

function exportDepartmentToExcel(department, records) {
  const isSimplex = department === 'Simplex';
  const sheet = buildStyledSheet(department, records, isSimplex);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, department.substring(0, 31));
  XLSX.writeFile(wb, `Spinning_Mill_${department}_Report.xlsx`);
}

function exportAllDepartmentsToExcel() {
  const departments = ['Carding', 'Breaker', 'Finisher', 'Simplex'];
  const workbook = XLSX.utils.book_new();
  departments.forEach(department => {
    const records = JSON.parse(localStorage.getItem(`spinning_mill_${department.toLowerCase()}`) || '[]');
    const isSimplex = department === 'Simplex';
    const sheet = buildStyledSheet(department, records, isSimplex);
    XLSX.utils.book_append_sheet(workbook, sheet, department.substring(0, 31));
  });
  XLSX.writeFile(workbook, 'Smart_Spinning_Mill_Complete_Report.xlsx');
}

// Fallback simple export if styled version fails
function createSheetRows(department, records) {
  return records.map(record => {
    const row = {
      Department: department,
      Date: record.date,
      Shift: record.shift,
      Machine: record.machine,
      Operator: record.operator,
      S1: Array.isArray(record.samples) ? record.samples[0] || '' : '',
      S2: Array.isArray(record.samples) ? record.samples[1] || '' : '',
      S3: Array.isArray(record.samples) ? record.samples[2] || '' : '',
      S4: Array.isArray(record.samples) ? record.samples[3] || '' : '',
      S5: Array.isArray(record.samples) ? record.samples[4] || '' : '',
      S6: Array.isArray(record.samples) ? record.samples[5] || '' : '',
      Mean: record.average,
      SD: record.sd !== undefined ? record.sd : '',
      CV: record.cv,
      'G/Y%': record.g,
      Status: record.status
    };
    if (record.count !== undefined) row.Count = record.count;
    return row;
  });
}