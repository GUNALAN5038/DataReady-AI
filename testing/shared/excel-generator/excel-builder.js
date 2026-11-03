const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

/**
 * Creates and formats a professional Excel workbook for test reporting
 */
class ExcelReportBuilder {
  constructor(reportTitle, categoryName) {
    this.reportTitle = reportTitle;
    this.categoryName = categoryName;
    this.workbook = new ExcelJS.Workbook();
    this.workbook.creator = 'DataReady AI Automated Test Suite';
    this.workbook.lastModifiedBy = 'DataReady AI Testing Infrastructure';
    this.workbook.created = new Date();
    this.workbook.modified = new Date();
  }

  /**
   * Helper to format headers and summary blocks
   */
  addSummarySheet(summaryData) {
    const sheet = this.workbook.addWorksheet('Summary', {
      views: [{ showGridLines: true }]
    });

    // Title banner
    sheet.mergeCells('A1:G1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `DataReady AI — ${this.reportTitle}`;
    titleCell.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' } // Deep Blue
    };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(1).height = 40;

    // Subtitle / metadata
    sheet.mergeCells('A2:G2');
    const subCell = sheet.getCell('A2');
    subCell.value = `Category: ${this.categoryName}  |  Generated: ${new Date().toISOString()}  |  Environment: ${summaryData.environment || 'Local / Staging'}`;
    subCell.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FF475569' } };
    subCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(2).height = 24;

    sheet.addRow([]);

    // KPI Summary Table
    sheet.addRow(['Metric', 'Value']);
    const kpiHeader = sheet.getRow(4);
    kpiHeader.font = { name: 'Segoe UI', bold: true, color: { argb: 'FFFFFFFF' } };
    kpiHeader.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    });

    const metrics = [
      ['Total Tests / Checks', summaryData.total || 0],
      ['Passed', summaryData.passed || 0],
      ['Failed', summaryData.failed || 0],
      ['Blocked / Not Executed', summaryData.blocked || 0],
      ['Skipped', summaryData.skipped || 0],
      ['Pass Rate (%)', summaryData.passRate !== undefined ? `${summaryData.passRate}%` : 'N/A'],
      ['Execution Duration (ms)', summaryData.durationMs || 0]
    ];

    metrics.forEach(([label, val]) => {
      const row = sheet.addRow([label, val]);
      row.font = { name: 'Segoe UI', size: 10 };
      if (label === 'Passed') row.getCell(2).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF16A34A' } };
      if (label === 'Failed' && val > 0) row.getCell(2).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFDC2626' } };
      if (label === 'Blocked / Not Executed' && val > 0) row.getCell(2).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFD97706' } };
    });

    // Auto fit widths
    sheet.getColumn(1).width = 30;
    sheet.getColumn(2).width = 25;

    return sheet;
  }

  /**
   * Adds a detailed tabular sheet for test cases
   */
  addDetailSheet(sheetName, columns, rows) {
    const sheet = this.workbook.addWorksheet(sheetName, {
      views: [{ state: 'frozen', ySplit: 1, showGridLines: true }]
    });

    sheet.columns = columns.map(col => ({
      header: col.header,
      key: col.key,
      width: col.width || 20
    }));

    // Header styling
    const headerRow = sheet.getRow(1);
    headerRow.height = 28;
    headerRow.font = { name: 'Segoe UI', bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    headerRow.eachCell(cell => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' } // Slate 800
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        bottom: { style: 'medium', color: { argb: 'FF0F172A' } }
      };
    });

    // Add rows and format status cells
    rows.forEach(item => {
      const row = sheet.addRow(item);
      row.height = 22;
      row.font = { name: 'Segoe UI', size: 10 };

      // Search for status cell
      const statusIdx = columns.findIndex(c => c.key === 'status');
      if (statusIdx !== -1) {
        const cell = row.getCell(statusIdx + 1);
        const val = String(cell.value || '').toUpperCase();
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.font = { name: 'Segoe UI', bold: true, size: 10 };

        if (val === 'PASS' || val === 'PASSED') {
          cell.font.color = { argb: 'FF15803D' };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }; // Light Green
        } else if (val === 'FAIL' || val === 'FAILED') {
          cell.font.color = { argb: 'FFB91C1C' };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }; // Light Red
        } else if (val === 'BLOCKED' || val === 'NOT EXECUTED') {
          cell.font.color = { argb: 'FFB45309' };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }; // Light Amber
        } else if (val === 'SKIPPED') {
          cell.font.color = { argb: 'FF475569' };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }; // Slate Gray
        } else {
          cell.font.color = { argb: 'FF475569' };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
        }

      }

      // Add light borders
      row.eachCell(c => {
        c.border = {
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
      });
    });

    // Enable auto filter
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columns.length }
    };

    return sheet;
  }

  async saveToFile(outputPath) {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    await this.workbook.xlsx.writeFile(outputPath);
    return outputPath;
  }
}

module.exports = { ExcelReportBuilder };
