// ============================================================
// TexGauge IQ - Professional PDF & Print Report System
// Generates industrial-grade formatted reports for all departments
// Supports: Daily, Shift-wise, Weekly, Monthly periods
// ============================================================

// ============================================================
// GET DEPARTMENT-SPECIFIC RECORDS
// ============================================================
function getDepartmentRecords(department) {
  return JSON.parse(localStorage.getItem('spinning_mill_' + department.toLowerCase()) || '[]');
}

// ============================================================
// FILTER RECORDS BY PERIOD
// ============================================================
function filterRecordsByPeriod(records, period, periodValue, periodShift) {
  if (!records || records.length === 0) return [];
  if (!period || period === 'all') return records;

  const filtered = records.filter(r => {
    if (!r.date) return false;

    switch (period) {
      case 'daily':
        return r.date === periodValue;

      case 'shift':
        return r.date === periodValue && (!periodShift || r.shift === periodShift);

      case 'weekly': {
        if (!periodValue) return true;
        const recordDate = new Date(r.date);
        const weekStart = new Date(periodValue);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        return recordDate >= weekStart && recordDate <= weekEnd;
      }

      case 'monthly': {
        // periodValue format: YYYY-MM
        const recordMonth = r.date.substring(0, 7);
        return recordMonth === periodValue;
      }

      default:
        return true;
    }
  });

  return filtered;
}

// ============================================================
// CALCULATE SUMMARY STATISTICS
// ============================================================
function calcSummaryStats(records, isSimplex) {
  const totalRecords = records.length;
  const acceptedRecords = records.filter(r => r.status === 'ACCEPTED').length;
  const rejectedRecords = records.filter(r => r.status === 'REJECTED').length;
  const avgG = totalRecords > 0 ? records.reduce((s, r) => s + Number(r.g || 0), 0) / totalRecords : 0;
  const avgCv = totalRecords > 0 ? records.reduce((s, r) => s + Number(r.cv || 0), 0) / totalRecords : 0;
  const passRate = totalRecords > 0 ? ((acceptedRecords / totalRecords) * 100) : 0;

  return { totalRecords, acceptedRecords, rejectedRecords, avgG, avgCv, passRate };
}

// ============================================================
// BUILD HTML REPORT CONTENT
// ============================================================
function buildReportHTML(department, records, title, isSimplex) {
  const stats = calcSummaryStats(records, isSimplex);
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB');
  const timeStr = now.toLocaleTimeString('en-GB');

  // Start building HTML
  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${department} Report - TexGauge IQ</title>
  <style>
    @page { margin: 15mm 12mm; size: A4 landscape; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      color: #1a1d29;
      padding: 20px;
      font-size: 10px;
    }
    .report-header {
      text-align: center;
      padding: 14px 0 10px;
      border-bottom: 3px solid #2d6cdf;
      margin-bottom: 14px;
    }
    .report-header h1 {
      font-size: 18px;
      color: #1a1d29;
      letter-spacing: 0.5px;
    }
    .report-header h1 span { color: #2d6cdf; }
    .report-header .subtitle {
      font-size: 11px;
      color: #5a6072;
      margin-top: 4px;
    }
    .report-header .dept-name {
      font-size: 14px;
      font-weight: 700;
      color: #2d6cdf;
      margin-top: 6px;
    }
    .report-info {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #5a6072;
      margin-bottom: 14px;
      padding: 8px 12px;
      background: #f0f2f5;
      border-radius: 4px;
    }
    .report-info strong { color: #1a1d29; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9px;
    }
    thead th {
      background: #1a1d29;
      color: #ffffff;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      padding: 8px 6px;
      border: 1px solid #333;
      text-align: center;
      font-size: 8px;
    }
    tbody td {
      padding: 6px 6px;
      border: 1px solid #e4e6ed;
      text-align: center;
      color: #1a1d29;
    }
    tbody tr:nth-child(even) {
      background: #f8f9fa;
    }
    tbody tr.status-accepted td:last-child {
      color: #2f9c4d;
      font-weight: 700;
    }
    tbody tr.status-rejected td:last-child {
      color: #d23f3f;
      font-weight: 700;
    }
    .summary-section {
      margin-top: 18px;
      border-top: 2px solid #2d6cdf;
      padding-top: 12px;
    }
    .summary-section h3 {
      font-size: 12px;
      color: #2d6cdf;
      margin-bottom: 10px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }
    .summary-item {
      padding: 8px 12px;
      background: #f0f2f5;
      border-radius: 4px;
      border-left: 3px solid #2d6cdf;
    }
    .summary-item .label {
      font-size: 8px;
      text-transform: uppercase;
      color: #5a6072;
      font-weight: 600;
      letter-spacing: 0.3px;
    }
    .summary-item .value {
      font-size: 14px;
      font-weight: 800;
      color: #1a1d29;
      margin-top: 2px;
    }
    .summary-item .value.green { color: #2f9c4d; }
    .summary-item .value.red { color: #d23f3f; }
    .summary-item .value.blue { color: #2d6cdf; }
    .footer {
      margin-top: 20px;
      text-align: center;
      font-size: 8px;
      color: #8a8fa8;
      border-top: 1px solid #e4e6ed;
      padding-top: 10px;
    }
    .no-data {
      text-align: center;
      padding: 40px;
      color: #8a8fa8;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="report-header">
    <h1>TexGauge<span>IQ</span></h1>
    <div class="subtitle">Industrial Textile Quality Monitoring & Intelligence System</div>
    <div class="dept-name">${department.toUpperCase()} — ${title}</div>
  </div>

  <div class="report-info">
    <span><strong>Generated:</strong> ${dateStr} ${timeStr}</span>
    <span><strong>Total Records:</strong> ${records.length}</span>
    <span><strong>Period:</strong> ${title}</span>
  </div>
`;

  if (records.length === 0) {
    html += `<div class="no-data">📋 No records found for the selected period.</div>`;
  } else {
    // Build table
    html += `<table><thead><tr>`;

    if (isSimplex) {
      html += `
        <th>Date</th>
        <th>Shift</th>
        <th>Machine</th>
        <th>Operator</th>
        <th>Samples</th>
        <th>Mean</th>
        <th>CV%</th>
        <th>Hank</th>
        <th>Status</th>`;
    } else {
      html += `
        <th>Date</th>
        <th>Shift</th>
        <th>Machine</th>
        <th>Operator</th>
        <th>Samples (Values)</th>
        <th>Mean</th>
        <th>SD</th>
        <th>CV%</th>
        <th>G/Y%</th>
        <th>Status</th>`;
    }

    html += `</tr></thead><tbody>`;

    records.forEach(r => {
      const statusClass = r.status === 'ACCEPTED' ? 'status-accepted' : 'status-rejected';
      html += `<tr class="${statusClass}">`;

      if (isSimplex) {
        const sampleStr = Array.isArray(r.samples) ? r.samples.filter(s => s > 0).join(', ') : '';
        html += `
          <td>${r.date || ''}</td>
          <td>${r.shift || ''}</td>
          <td>${r.machine || ''}</td>
          <td>${r.operator || ''}</td>
          <td style="font-size:8px;">${sampleStr}</td>
          <td>${r.average || '0.00'}</td>
          <td>${r.cv || '0.00'}</td>
          <td>${r.g || '0.000'}</td>
          <td>${r.status || ''}</td>`;
      } else {
        const sampleStr = Array.isArray(r.samples) ? r.samples.filter(s => s > 0).join(', ') : '';
        html += `
          <td>${r.date || ''}</td>
          <td>${r.shift || ''}</td>
          <td>${r.machine || ''}</td>
          <td>${r.operator || ''}</td>
          <td style="font-size:8px;">${sampleStr}</td>
          <td>${r.average || '0.00'}</td>
          <td>${r.sd || '0.000'}</td>
          <td>${r.cv || '0.00'}</td>
          <td>${r.g || '0.00'}</td>
          <td>${r.status || ''}</td>`;
      }

      html += `</tr>`;
    });

    html += `</tbody></table>`;

    // Summary Section
    const valueLabel = isSimplex ? 'Avg Hank' : 'Avg G/Y%';
    html += `
    <div class="summary-section">
      <h3>📊 REPORT SUMMARY</h3>
      <div class="summary-grid">
        <div class="summary-item">
          <div class="label">Total Records</div>
          <div class="value blue">${stats.totalRecords}</div>
        </div>
        <div class="summary-item">
          <div class="label">Accepted (PASS)</div>
          <div class="value green">${stats.acceptedRecords}</div>
        </div>
        <div class="summary-item">
          <div class="label">Rejected (FAIL)</div>
          <div class="value red">${stats.rejectedRecords}</div>
        </div>
        <div class="summary-item">
          <div class="label">Pass Rate</div>
          <div class="value ${stats.passRate >= 80 ? 'green' : 'red'}">${stats.passRate.toFixed(1)}%</div>
        </div>
        <div class="summary-item">
          <div class="label">${valueLabel}</div>
          <div class="value blue">${stats.avgG.toFixed(2)}</div>
        </div>
        <div class="summary-item">
          <div class="label">Average CV%</div>
          <div class="value blue">${stats.avgCv.toFixed(2)}%</div>
        </div>
      </div>
    </div>`;
  }

  html += `
  <div class="footer">
    © TexGauge IQ — Industrial Textile Quality Monitoring & Intelligence System<br>
    ${dateStr} ${timeStr} | This is a system-generated report
  </div>
</body>
</html>`;

  return html;
}

// ============================================================
// GENERATE PDF REPORT (downloads as .pdf file)
// ============================================================
function generateDepartmentPDF(department) {
  const records = getDepartmentRecords(department);
  const isSimplex = department === 'Simplex';
  const html = buildReportHTML(department, records, 'Complete Report', isSimplex);
  downloadPDF(html, department + '_Complete_Report');
}

// ============================================================
// GENERATE FILTERED PDF BY PERIOD
// ============================================================
function generateFilteredPDF(department) {
  const period = document.getElementById('reportPeriod')?.value || 'all';
  const periodDate = document.getElementById('periodDate')?.value || '';
  const periodWeek = document.getElementById('periodWeekStart')?.value || '';
  const periodShift = document.getElementById('filterShift')?.value || '';
  const allRecords = getDepartmentRecords(department);
  const isSimplex = department === 'Simplex';

  let periodValue = periodDate || periodWeek || '';
  let title = 'Complete Report';

  switch (period) {
    case 'daily':
      title = 'Daily Report — ' + (periodValue || 'Selected Date');
      break;
    case 'shift':
      title = 'Shift-wise Report — ' + (periodValue || 'Selected Date') + ' (' + (periodShift || 'All Shifts') + ')';
      break;
    case 'weekly':
      title = 'Weekly Report — Starting ' + (periodValue || 'Selected Week');
      break;
    case 'monthly':
      title = 'Monthly Report — ' + (periodValue || 'Selected Month');
      break;
    default:
      title = 'Complete Report';
  }

  const filtered = filterRecordsByPeriod(allRecords, period, periodValue, periodShift);
  const html = buildReportHTML(department, filtered, title, isSimplex);
  downloadPDF(html, department + '_' + period + '_Report');
}

// ============================================================
// DOWNLOAD AS PDF FILE
// Automatically generates and downloads PDF using html2pdf.js
// ============================================================
function downloadPDF(html, filename) {
  // Check if html2pdf is available
  if (typeof html2pdf === 'undefined') {
    alert('PDF library is loading. Please try again in a moment.');
    return;
  }
  
  // Create a temporary container for the report - make it visible but positioned
  const container = document.createElement('div');
  container.innerHTML = html;
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.zIndex = '9999';
  container.style.background = 'white';
  container.style.padding = '20px';
  container.style.maxWidth = '297mm';  // A4 landscape width
  container.style.minHeight = '210mm'; // A4 landscape height
  container.style.overflow = 'visible';
  document.body.appendChild(container);
  
  // Configure PDF options for A4 Landscape
  const opt = {
    margin:       [10, 10, 10, 10], // top, left, bottom, right in mm
    filename:     filename + '.pdf',
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { 
      scale: 2,
      useCORS: true,
      letterRendering: true,
      width: 297,  // A4 landscape width in mm
      height: 210  // A4 landscape height in mm
    },
    jsPDF:        { 
      unit: 'mm', 
      format: 'a4', 
      orientation: 'landscape',
      compress: true
    },
    pagebreak:    { 
      mode: ['avoid-all', 'css', 'legacy'],
      before: '.page-break-before',
      after: '.page-break-after',
      avoid: ['tr', 'td', 'th', 'table', '.summary-item', '.metric-card']
    }
  };
  
  // Generate and download PDF
  html2pdf().set(opt).from(container).save().then(() => {
    // Clean up temporary container
    document.body.removeChild(container);
  }).catch(err => {
    console.error('PDF generation error:', err);
    document.body.removeChild(container);
    alert('Error generating PDF. Please try again.');
  });
}

// ============================================================
// PRINT REPORT (opens print dialog)
// ============================================================
function printDepartmentReport(department) {
  const records = getDepartmentRecords(department);
  const isSimplex = department === 'Simplex';
  const html = buildReportHTML(department, records, 'Complete Report', isSimplex);
  const win = openReportWindow(html, department, true);
  if (win) {
    win.onload = function() {
      setTimeout(() => { win.print(); }, 500);
    };
  }
}

// ============================================================
// PRINT FILTERED REPORT
// ============================================================
function printFilteredReport(department) {
  const period = document.getElementById('reportPeriod')?.value || 'all';
  const periodDate = document.getElementById('periodDate')?.value || '';
  const periodWeek = document.getElementById('periodWeekStart')?.value || '';
  const periodShift = document.getElementById('filterShift')?.value || '';
  const allRecords = getDepartmentRecords(department);
  const isSimplex = department === 'Simplex';

  let periodValue = periodDate || periodWeek || '';
  let title = 'Complete Report';

  switch (period) {
    case 'daily': title = 'Daily Report — ' + (periodValue || 'Selected Date'); break;
    case 'shift': title = 'Shift-wise Report — ' + (periodValue || 'Selected Date') + ' (' + (periodShift || 'All Shifts') + ')'; break;
    case 'weekly': title = 'Weekly Report — Starting ' + (periodValue || 'Selected Week'); break;
    case 'monthly': title = 'Monthly Report — ' + (periodValue || 'Selected Month'); break;
  }

  const filtered = filterRecordsByPeriod(allRecords, period, periodValue, periodShift);
  const html = buildReportHTML(department, filtered, title, isSimplex);
  const win = openReportWindow(html, department + '_' + period, true);
  if (win) {
    win.onload = function() {
      setTimeout(() => { win.print(); }, 500);
    };
  }
}

// ============================================================
// OPEN REPORT IN NEW WINDOW
// ============================================================
function openReportWindow(html, title, forPrint) {
  const win = window.open('', '_blank');
  if (!win) {
    alert('Please allow pop-ups to view the report.');
    return null;
  }
  win.document.write(html);
  win.document.title = 'TexGauge IQ - ' + title + ' Report';
  win.document.close();
  return win;
}

// ============================================================
// EXPORT TO EXCEL (kept for dashboard use)
// Original exportDepartmentToExcel is maintained in excelExport.js
// ============================================================