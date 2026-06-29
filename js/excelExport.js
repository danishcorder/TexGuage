// ============================================================
// TEXGAUGE IQ - PROFESSIONAL EXCEL EXPORT
// Styled worksheets with proper formatting, freeze panes,
// conditional formatting, and summary section
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

function freezePane(sheet, row) {
  sheet['!freeze'] = { x: 0, y: row };
}

const STYLE = {
  headerFill: '1a1d29',
  headerFont: 'FFFFFF',
  headerAlign: { horizontal: 'center', vertical: 'center', wrapText: true },
  titleFill: '2d6cdf',
  titleFont: 'FFFFFF',
  dataAlign: { horizontal: 'center', vertical: 'center' },
  acceptedFill: '2f9c4d',
  acceptedFont: 'FFFFFF',
  rejectedFill: 'd23f3f',
  rejectedFont: 'FFFFFF',
  evenRow: 'f0f4ff',
  summaryLabel: 'e8ecf1',
  summaryValue: '2d6cdf',
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
    ? ['Date', 'Shift', 'Machine', 'Operator', 'HR Group', 'HR', 'Samples', 'Length', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'Mean', 'SD', 'CV%', 'Hank', 'HR%', 'Status']
    : ['Date', 'Shift', 'Machine', 'Operator', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'Mean', 'SD', 'CV%', 'G/Y%', 'Status'];

  const lastCol = cols.length - 1;

  // Set column widths
  const widths = isSimplex
    ? [14, 10, 10, 20, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12]
    : [14, 10, 10, 20, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12];
  setColWidths(sheet, widths);

  // ==================== ROW 0: System Title ====================
  const sysTitle = makeCell('TexGauge IQ — Digital Sliver Quality Monitoring System', {
    bold: true, fontSize: 14, fill: STYLE.titleFill, fontColor: STYLE.titleFont,
    alignment: { horizontal: 'center', vertical: 'center' }
  });
  sheet[XLSX.utils.encode_cell({ r: row, c: 0 })] = sysTitle;
  addMerge(sheet, { r: row, c: 0 }, { r: row, c: lastCol });
  row++;

  // ==================== ROW 1: Department Report Title ====================
  const deptTitle = makeCell(`${department.toUpperCase()} — Quality Report`, {
    bold: true, fontSize: 12, fontColor: '2d6cdf',
    alignment: { horizontal: 'center', vertical: 'center' }
  });
  sheet[XLSX.utils.encode_cell({ r: row, c: 0 })] = deptTitle;
  addMerge(sheet, { r: row, c: 0 }, { r: row, c: lastCol });
  row++;

  // ==================== ROW 2: Empty spacer ====================
  row++;

  // ==================== ROW 3: Report Information ====================
  const latest = records.length > 0 ? records[0] : null;
  const reportDate = latest ? latest.date : new Date().toISOString().slice(0, 10);

  // Build info array with key-value pairs aligned in columns
  const infoPairs = [
    ['Department:', department],
    ['Report Date:', reportDate],
    ['Generated:', new Date().toLocaleString()],
    ['Total Records:', String(records.length)]
  ];

  infoPairs.forEach((pair, idx) => {
    const colOffset = idx < 2 ? 0 : Math.ceil((lastCol + 1) / 2);
    const localIdx = idx % 2;

    // Label
    const labelCell = makeCell(pair[0], {
      bold: true, fontSize: 10,
      alignment: { horizontal: 'right', vertical: 'center' },
      fill: STYLE.summaryLabel
    });
    sheet[XLSX.utils.encode_cell({ r: row, c: colOffset + (localIdx * 2) })] = labelCell;

    // Value
    const valCell = makeCell(pair[1], {
      fontSize: 10,
      alignment: { horizontal: 'left', vertical: 'center' }
    });
    sheet[XLSX.utils.encode_cell({ r: row, c: colOffset + (localIdx * 2) + 1 })] = valCell;
  });
  // Merge the info row area if needed
  row++;

  // ==================== ROW 4: Column Headers (FREEZE HERE) ====================
  cols.forEach((colName, idx) => {
    const cell = makeCell(colName, {
      bold: true, fontSize: 10, fill: STYLE.headerFill, fontColor: STYLE.headerFont,
      alignment: STYLE.headerAlign, border: STYLE.thickBorder
    });
    sheet[XLSX.utils.encode_cell({ r: row, c: idx })] = cell;
  });

  // Freeze header row
  freezePane(sheet, row + 1);
  row++;

  // ==================== DATA ROWS ====================
  if (records.length === 0) {
    const emptyCell = makeCell('No records found. Please save some records first.', {
      alignment: STYLE.dataAlign, border: STYLE.border, fontSize: 10
    });
    sheet[XLSX.utils.encode_cell({ r: row, c: 0 })] = emptyCell;
    addMerge(sheet, { r: row, c: 0 }, { r: row, c: lastCol });
    row++;
  } else {
    records.forEach((record, idx) => {
      const isEven = idx % 2 === 0;
      const rowFill = isEven ? STYLE.evenRow : undefined;

      const s = Array.isArray(record.samples) ? record.samples : [];
      const samples = [];
      for (let i = 0; i < 6; i++) {
        samples.push(s[i] !== undefined ? s[i] : '');
      }

      const isAccepted = record.status === 'ACCEPTED';

      const rowData = isSimplex ? [
        record.date || '', record.shift || '', record.machine || '', record.operator || '',
        record.hrGroup || '', Number(record.hr) || 0,
        record.sampleCount || '', record.sampleLength || '',
        samples[0], samples[1], samples[2], samples[3], samples[4], samples[5],
        Number(record.average) || 0, Number(record.sd) || 0, Number(record.cv) || 0, Number(record.g) || 0,
        Number(record.hrValue) || 0, record.status || ''
      ] : [
        record.date || '', record.shift || '', record.machine || '', record.operator || '',
        samples[0], samples[1], samples[2], samples[3], samples[4], samples[5],
        Number(record.average) || 0, Number(record.sd) || 0, Number(record.cv) || 0, Number(record.g) || 0, record.status || ''
      ];

      rowData.forEach((val, cIdx) => {
        const isNum = typeof val === 'number' && !isNaN(val);
        const cell = makeCell(val, {
          alignment: STYLE.dataAlign,
          border: STYLE.border,
          fill: rowFill,
          numFmt: isNum ? '0.00' : undefined
        });

        // Conditional formatting for Status column
        if (cIdx === lastCol) {
          cell.s.font = { bold: true, color: { rgb: isAccepted ? STYLE.acceptedFont : STYLE.rejectedFont } };
          cell.s.fill = { fgColor: { rgb: isAccepted ? STYLE.acceptedFill : STYLE.rejectedFill } };
        }

        // Numeric values in data columns should be right-aligned
        if (isNum && cIdx >= 5 && cIdx <= 13) {
          cell.s.alignment = { horizontal: 'right', vertical: 'center' };
        }

        sheet[XLSX.utils.encode_cell({ r: row, c: cIdx })] = cell;
      });
      row++;
    });
  }

  // ==================== SUMMARY SECTION ====================
  if (records.length > 0) {
    row++; // empty row separator

    // Summary header
    const summaryHeader = makeCell('📊 REPORT SUMMARY', {
      bold: true, fontSize: 11, fontColor: '2d6cdf',
      alignment: { horizontal: 'left', vertical: 'center' }
    });
    sheet[XLSX.utils.encode_cell({ r: row, c: 0 })] = summaryHeader;
    addMerge(sheet, { r: row, c: 0 }, { r: row, c: lastCol });
    row++;

    // Calculate summary values
    const totalRecords = records.length;
    const acceptedRecords = records.filter(r => r.status === 'ACCEPTED').length;
    const rejectedRecords = records.filter(r => r.status === 'REJECTED').length;
    const avgG = records.reduce((s, r) => s + Number(r.g || 0), 0) / totalRecords;
    const avgCv = records.reduce((s, r) => s + Number(r.cv || 0), 0) / totalRecords;
    const passRate = totalRecords > 0 ? ((acceptedRecords / totalRecords) * 100) : 0;

    const summaryData = [
      ['Total Records', totalRecords],
      ['Accepted (PASS)', acceptedRecords],
      ['Rejected (FAIL)', rejectedRecords],
      ['Pass Rate', `${passRate.toFixed(1)}%`],
      ['Average G/Y%', avgG.toFixed(2)],
      ['Average CV%', `${avgCv.toFixed(2)}%`]
    ];

    summaryData.forEach((item, idx) => {
      const c = idx < 3 ? 0 : Math.ceil((lastCol + 1) / 2);
      const localIdx = idx % 3;

      // Label cell
      const labelCell = makeCell(item[0], {
        bold: true, fontSize: 10,
        alignment: { horizontal: 'right', vertical: 'center' },
        border: STYLE.border,
        fill: STYLE.summaryLabel
      });
      sheet[XLSX.utils.encode_cell({ r: row, c: c + (localIdx * 2) })] = labelCell;

      // Value cell — color code pass/fail
      const valColor = item[0] === 'Rejected (FAIL)' && item[1] > 0 ? 'd23f3f' :
                       item[0] === 'Pass Rate' && passRate >= 80 ? '2f9c4d' :
                       item[0] === 'Pass Rate' && passRate < 80 ? 'd23f3f' :
                       '1a1d29';
      const valCell = makeCell(item[1], {
        fontSize: 10, bold: true,
        alignment: { horizontal: 'center', vertical: 'center' },
        border: STYLE.border,
        fontColor: valColor
      });
      sheet[XLSX.utils.encode_cell({ r: row, c: c + (localIdx * 2) + 1 })] = valCell;
    });
    row++;

    // ==================== FOOTER ====================
    row++;
    const footerCell = makeCell('© TexGauge IQ — Industrial Textile Quality Monitoring & Intelligence System', {
      fontSize: 9, fontColor: '8a8fa8',
      alignment: { horizontal: 'center', vertical: 'center' }
    });
    sheet[XLSX.utils.encode_cell({ r: row, c: 0 })] = footerCell;
    addMerge(sheet, { r: row, c: 0 }, { r: row, c: lastCol });
  } else {
    // Footer without data
    row++;
    const footerCell = makeCell('© TexGauge IQ — Industrial Textile Quality Monitoring & Intelligence System', {
      fontSize: 9, fontColor: '8a8fa8',
      alignment: { horizontal: 'center' }
    });
    sheet[XLSX.utils.encode_cell({ r: row, c: 0 })] = footerCell;
    addMerge(sheet, { r: row, c: 0 }, { r: row, c: lastCol });
  }

  // Set row heights
  const rowHeights = [
    { hpt: 30 },  // System title
    { hpt: 24 },  // Department title
    { hpt: 8 },   // Spacer
    { hpt: 22 },  // Info
    { hpt: 26 }   // Headers
  ];
  records.forEach(() => rowHeights.push({ hpt: 22 }));
  if (records.length === 0) rowHeights.push({ hpt: 22 });
  // Summary rows
  if (records.length > 0) {
    rowHeights.push({ hpt: 8 });  // spacer before summary
    rowHeights.push({ hpt: 24 }); // summary header
    const summaryRows = Math.ceil(6 / 3); // 6 items in 3 columns
    for (let i = 0; i < summaryRows; i++) rowHeights.push({ hpt: 22 });
    rowHeights.push({ hpt: 8 });  // spacer before footer
  }
  rowHeights.push({ hpt: 18 }); // footer
  sheet['!rows'] = rowHeights;

  // Set the sheet reference range
  const lastDataRow = row;
  sheet['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: lastDataRow, c: lastCol } });

  return sheet;
}

function exportDepartmentToExcel(department, records) {
  const isSimplex = department === 'Simplex';
  const sheet = buildStyledSheet(department, records, isSimplex);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, department.substring(0, 31));
  XLSX.writeFile(wb, `TexGauge_${department}_Report.xlsx`);
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
  XLSX.writeFile(workbook, 'TexGauge_Complete_Report.xlsx');
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