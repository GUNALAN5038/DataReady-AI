/**
 * DataReady AI — Android Appium Excel Report Generator
 */

const ExcelJS = require('exceljs')
const path = require('path')
const fs = require('fs')

async function generateAndroidExcelReport(testResults, summaryData, deviceInfo, outputPath) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'DataReady AI Mobile QA Automation'
  workbook.lastModifiedBy = 'DataReady AI Appium Engine'
  workbook.created = new Date()
  workbook.modified = new Date()

  const headerFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' }, // Slate 900
  }
  const headerFont = {
    name: 'Calibri',
    size: 11,
    bold: true,
    color: { argb: 'FFFFFFFF' },
  }
  const passFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFDCFCE7' }, // Soft green
  }
  const failFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFEE2E2' }, // Soft red
  }
  const blockedFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFEF3C7' }, // Soft amber
  }

  // 1. Executive Summary
  const summarySheet = workbook.addWorksheet('Executive Summary', { views: [{ showGridLines: true }] })
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 35 },
    { header: 'Value', key: 'value', width: 45 },
  ]
  summarySheet.getRow(1).font = headerFont
  summarySheet.getRow(1).fill = headerFill

  const total = summaryData.total || testResults.length
  const passed = summaryData.passed || testResults.filter(t => t.status === 'PASS').length
  const failed = summaryData.failed || testResults.filter(t => t.status === 'FAIL').length
  const skipped = summaryData.skipped || testResults.filter(t => t.status === 'SKIPPED').length
  const blocked = summaryData.blocked || testResults.filter(t => t.status === 'BLOCKED').length
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(2) + '%' : '0.00%'

  const summaryRows = [
    { metric: 'Project Name', value: 'DataReady AI (Android Mobile App E2E)' },
    { metric: 'Target Android Package', value: 'com.datareadyai.mobile' },
    { metric: 'Device Model', value: `${deviceInfo.brand || 'Android'} ${deviceInfo.model || 'Device'}` },
    { metric: 'Device UDID / Serial', value: deviceInfo.serial || 'Detected Device' },
    { metric: 'Android OS Version', value: `Android ${deviceInfo.androidVersion || '14'} (SDK ${deviceInfo.sdk || '34'})` },
    { metric: 'Automation Engine', value: 'Appium 2.x / UiAutomator2 / WebdriverIO' },
    { metric: 'Execution Timestamp', value: new Date().toISOString() },
    { metric: 'Total Tests Executed', value: total },
    { metric: 'Tests Passed', value: passed },
    { metric: 'Tests Failed', value: failed },
    { metric: 'Tests Blocked / Skipped', value: blocked + skipped },
    { metric: 'Pass Rate (%)', value: passRate },
    { metric: 'Total Execution Duration (ms)', value: summaryData.totalDuration || 0 },
  ]

  summaryRows.forEach(r => summarySheet.addRow(r))

  // 2. Test Execution Details
  const resultsSheet = workbook.addWorksheet('Test Results', { views: [{ showGridLines: true }] })
  resultsSheet.columns = [
    { header: 'Test ID', key: 'id', width: 18 },
    { header: 'Module', key: 'module', width: 18 },
    { header: 'Description', key: 'description', width: 55 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Duration (ms)', key: 'duration', width: 16 },
    { header: 'Screenshot / Evidence', key: 'screenshot', width: 45 },
    { header: 'Error Details', key: 'error', width: 35 },
  ]
  resultsSheet.getRow(1).font = headerFont
  resultsSheet.getRow(1).fill = headerFill

  testResults.forEach(t => {
    const row = resultsSheet.addRow({
      id: t.id,
      module: t.module,
      description: t.description,
      status: t.status,
      duration: t.duration,
      screenshot: t.screenshot || 'N/A',
      error: t.error || '',
    })

    const statusCell = row.getCell('status')
    if (t.status === 'PASS') {
      statusCell.fill = passFill
      statusCell.font = { color: { argb: 'FF16A34A' }, bold: true }
    } else if (t.status === 'FAIL') {
      statusCell.fill = failFill
      statusCell.font = { color: { argb: 'FFDC2626' }, bold: true }
    } else if (t.status === 'BLOCKED') {
      statusCell.fill = blockedFill
      statusCell.font = { color: { argb: 'FFD97706' }, bold: true }
    }
  })

  // 3. Module-wise Analysis
  const moduleSheet = workbook.addWorksheet('Module-wise Analysis', { views: [{ showGridLines: true }] })
  moduleSheet.columns = [
    { header: 'Module Name', key: 'module', width: 25 },
    { header: 'Total Tests', key: 'total', width: 15 },
    { header: 'Passed', key: 'passed', width: 12 },
    { header: 'Failed', key: 'failed', width: 12 },
    { header: 'Pass Rate (%)', key: 'passRate', width: 16 },
    { header: 'Total Duration (ms)', key: 'duration', width: 20 },
  ]
  moduleSheet.getRow(1).font = headerFont
  moduleSheet.getRow(1).fill = headerFill

  const modules = {}
  testResults.forEach(t => {
    if (!modules[t.module]) modules[t.module] = { total: 0, passed: 0, failed: 0, duration: 0 }
    modules[t.module].total++
    if (t.status === 'PASS') modules[t.module].passed++
    if (t.status === 'FAIL') modules[t.module].failed++
    modules[t.module].duration += t.duration || 0
  })

  Object.entries(modules).forEach(([modName, stats]) => {
    const rate = stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(1) + '%' : '0%'
    moduleSheet.addRow({
      module: modName,
      total: stats.total,
      passed: stats.passed,
      failed: stats.failed,
      passRate: rate,
      duration: stats.duration,
    })
  })

  // 4. Failed Test Cases
  const failedSheet = workbook.addWorksheet('Failed Test Cases', { views: [{ showGridLines: true }] })
  failedSheet.columns = [
    { header: 'Test ID', key: 'id', width: 15 },
    { header: 'Module', key: 'module', width: 20 },
    { header: 'Description', key: 'description', width: 45 },
    { header: 'Error Details', key: 'error', width: 60 },
  ]
  failedSheet.getRow(1).font = headerFont
  failedSheet.getRow(1).fill = headerFill

  const failedTests = testResults.filter(t => t.status === 'FAIL')
  if (failedTests.length === 0) {
    failedSheet.addRow({
      id: 'NONE',
      module: 'ALL',
      description: 'Zero test failures recorded across Android test execution.',
      error: 'None',
    })
  } else {
    failedTests.forEach(t => {
      failedSheet.addRow({
        id: t.id,
        module: t.module,
        description: t.description,
        error: t.error || 'Failed',
      })
    })
  }

  // 5. Device Information
  const devSheet = workbook.addWorksheet('Device Information', { views: [{ showGridLines: true }] })
  devSheet.columns = [
    { header: 'Property', key: 'property', width: 30 },
    { header: 'Details', key: 'details', width: 45 },
  ]
  devSheet.getRow(1).font = headerFont
  devSheet.getRow(1).fill = headerFill

  devSheet.addRow({ property: 'Device Manufacturer / Brand', details: deviceInfo.brand || 'Android' })
  devSheet.addRow({ property: 'Product Model', details: deviceInfo.model || 'Device' })
  devSheet.addRow({ property: 'Serial Number / UDID', details: deviceInfo.serial || 'Detected Device' })
  devSheet.addRow({ property: 'Android Version', details: deviceInfo.androidVersion || '14' })
  devSheet.addRow({ property: 'API Level (SDK)', details: deviceInfo.sdk || '34' })

  // 6. Execution Performance
  const perfSheet = workbook.addWorksheet('Execution Performance', { views: [{ showGridLines: true }] })
  perfSheet.columns = [
    { header: 'Test ID', key: 'id', width: 15 },
    { header: 'Module', key: 'module', width: 20 },
    { header: 'Operation', key: 'description', width: 45 },
    { header: 'Latency (ms)', key: 'duration', width: 18 },
    { header: 'Performance Tier', key: 'tier', width: 22 },
  ]
  perfSheet.getRow(1).font = headerFont
  perfSheet.getRow(1).fill = headerFill

  testResults.forEach(t => {
    let tier = 'Fast (<1000ms)'
    if (t.duration > 3000) tier = 'Extended (>3000ms)'
    else if (t.duration > 1000) tier = 'Normal (1000-3000ms)'

    perfSheet.addRow({
      id: t.id,
      module: t.module,
      description: t.description,
      duration: t.duration,
      tier,
    })
  })

  // 7. Defect Summary
  const defectSheet = workbook.addWorksheet('Defect Summary', { views: [{ showGridLines: true }] })
  defectSheet.columns = [
    { header: 'Defect ID', key: 'id', width: 15 },
    { header: 'Module', key: 'module', width: 20 },
    { header: 'Severity', key: 'severity', width: 15 },
    { header: 'Description', key: 'desc', width: 45 },
    { header: 'Resolution Status', key: 'status', width: 20 },
  ]
  defectSheet.getRow(1).font = headerFont
  defectSheet.getRow(1).fill = headerFill

  if (failedTests.length === 0) {
    defectSheet.addRow({
      id: 'AND-DEF-000',
      module: 'ALL',
      severity: 'NONE',
      desc: 'Zero defects. All Android acceptance features passed.',
      status: 'VERIFIED CLOSED',
    })
  } else {
    failedTests.forEach((t, i) => {
      defectSheet.addRow({
        id: `AND-DEF-00${i + 1}`,
        module: t.module,
        severity: 'MEDIUM',
        desc: t.error ? t.error.slice(0, 100) : 'Test failure',
        status: 'OPEN',
      })
    })
  }

  const dir = path.dirname(outputPath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  await workbook.xlsx.writeFile(outputPath)
  console.log(`[Android Excel Reporter] Saved Android E2E report to: ${outputPath}`)
}

module.exports = {
  generateAndroidExcelReport,
}
