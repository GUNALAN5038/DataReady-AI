/**
 * DataReady AI — Selenium HTML Report Generator
 * Generates an interactive, modern dashboard HTML report
 */

const fs = require('fs')
const path = require('path')

function generateWebHtmlReport(testResults, summaryData, outputPath) {
  const total = summaryData.total || testResults.length
  const passed = summaryData.passed || testResults.filter(t => t.status === 'PASS').length
  const failed = summaryData.failed || testResults.filter(t => t.status === 'FAIL').length
  const skipped = summaryData.skipped || testResults.filter(t => t.status === 'SKIPPED').length
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0'

  const modules = {}
  testResults.forEach(t => {
    if (!modules[t.module]) modules[t.module] = { total: 0, passed: 0, failed: 0 }
    modules[t.module].total++
    if (t.status === 'PASS') modules[t.module].passed++
    if (t.status === 'FAIL') modules[t.module].failed++
  })

  const moduleRowsHtml = Object.entries(modules)
    .map(([mod, stats]) => {
      const rate = ((stats.passed / stats.total) * 100).toFixed(1)
      return `
      <tr>
        <td class="font-medium">${mod}</td>
        <td>${stats.total}</td>
        <td class="text-green-400 font-semibold">${stats.passed}</td>
        <td class="${stats.failed > 0 ? 'text-red-400 font-semibold' : 'text-slate-400'}">${stats.failed}</td>
        <td>
          <div class="flex items-center gap-2">
            <div class="w-24 bg-slate-700 rounded-full h-2">
              <div class="bg-emerald-500 h-2 rounded-full" style="width: ${rate}%"></div>
            </div>
            <span class="text-xs text-slate-300">${rate}%</span>
          </div>
        </td>
      </tr>`
    })
    .join('')

  const testRowsHtml = testResults
    .map(t => {
      const isPass = t.status === 'PASS'
      const statusBadge = isPass
        ? '<span class="px-2 py-1 text-xs rounded bg-emerald-950 text-emerald-400 border border-emerald-800">PASS</span>'
        : '<span class="px-2 py-1 text-xs rounded bg-red-950 text-red-400 border border-red-800">FAIL</span>'

      const screenshotLink = t.screenshot
        ? `<a href="../../${t.screenshot}" target="_blank" class="text-cyan-400 hover:underline text-xs">View Evidence</a>`
        : '<span class="text-slate-500 text-xs">—</span>'

      return `
      <tr class="border-b border-slate-800 hover:bg-slate-800/40">
        <td class="py-3 px-4 font-mono text-xs text-slate-400">${t.id}</td>
        <td class="py-3 px-4 text-xs font-semibold text-slate-300">${t.module}</td>
        <td class="py-3 px-4 text-sm text-slate-200">${t.description}</td>
        <td class="py-3 px-4">${statusBadge}</td>
        <td class="py-3 px-4 font-mono text-xs text-slate-400">${t.duration || 0}ms</td>
        <td class="py-3 px-4">${screenshotLink}</td>
      </tr>`
    })
    .join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DataReady AI — Web E2E Automation Report</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen p-8 font-sans">
  <div class="max-w-7xl mx-auto space-y-8">
    <!-- Header -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-6 gap-4">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <span class="p-2 bg-indigo-600 rounded-lg text-white">🚀</span>
          DataReady AI — Web E2E Automation Report
        </h1>
        <p class="text-slate-400 mt-1">Selenium WebDriver + Headless Chrome Execution Results</p>
      </div>
      <div class="text-right text-xs text-slate-400 font-mono">
        <div>Target: <span class="text-indigo-400">${summaryData.baseUrl || 'http://localhost:3000'}</span></div>
        <div>Date: ${new Date().toISOString()}</div>
      </div>
    </div>

    <!-- Summary Metrics Cards -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div class="text-xs text-slate-400 font-medium">Total Tests</div>
        <div class="text-2xl font-bold text-white mt-1">${total}</div>
      </div>
      <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div class="text-xs text-slate-400 font-medium">Passed</div>
        <div class="text-2xl font-bold text-emerald-400 mt-1">${passed}</div>
      </div>
      <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div class="text-xs text-slate-400 font-medium">Failed</div>
        <div class="text-2xl font-bold ${failed > 0 ? 'text-red-400' : 'text-slate-400'} mt-1">${failed}</div>
      </div>
      <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div class="text-xs text-slate-400 font-medium">Skipped</div>
        <div class="text-2xl font-bold text-slate-400 mt-1">${skipped}</div>
      </div>
      <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div class="text-xs text-slate-400 font-medium">Pass Rate</div>
        <div class="text-2xl font-bold text-emerald-400 mt-1">${passRate}%</div>
      </div>
      <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div class="text-xs text-slate-400 font-medium">Duration</div>
        <div class="text-2xl font-bold text-cyan-400 mt-1">${(summaryData.totalDuration / 1000).toFixed(1)}s</div>
      </div>
    </div>

    <!-- Module Analysis -->
    <div class="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <h2 class="text-lg font-semibold text-white mb-4">Module-wise Breakdown</h2>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-slate-300">
          <thead class="text-xs uppercase bg-slate-800/60 text-slate-400 border-b border-slate-700">
            <tr>
              <th class="py-3 px-4">Module</th>
              <th class="py-3 px-4">Total</th>
              <th class="py-3 px-4">Passed</th>
              <th class="py-3 px-4">Failed</th>
              <th class="py-3 px-4">Pass Rate</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800">
            ${moduleRowsHtml}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Test Results Table -->
    <div class="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <h2 class="text-lg font-semibold text-white mb-4">Detailed Test Executions</h2>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="text-xs uppercase bg-slate-800/60 text-slate-400 border-b border-slate-700">
            <tr>
              <th class="py-3 px-4">ID</th>
              <th class="py-3 px-4">Module</th>
              <th class="py-3 px-4">Description</th>
              <th class="py-3 px-4">Status</th>
              <th class="py-3 px-4">Duration</th>
              <th class="py-3 px-4">Evidence</th>
            </tr>
          </thead>
          <tbody>
            ${testRowsHtml}
          </tbody>
        </table>
      </div>
    </div>
  </div>
</body>
</html>`

  const dir = path.dirname(outputPath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(outputPath, html, 'utf8')
  console.log(`[HTML Reporter] Successfully saved Web E2E HTML report to: ${outputPath}`)
}

module.exports = {
  generateWebHtmlReport,
}
