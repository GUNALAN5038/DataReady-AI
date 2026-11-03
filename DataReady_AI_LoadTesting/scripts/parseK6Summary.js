/**
 * DataReady AI — Defensive k6 Summary Parser
 * Supports both metric.values[key] and metric[key] across k6 schema variations
 */

const fs = require('fs')
const path = require('path')

function extractMetricVal(metric, key, fallback = 0) {
  if (!metric) return fallback
  if (metric.values && metric.values[key] !== undefined) return metric.values[key]
  if (metric[key] !== undefined) return metric[key]
  return fallback
}

function parseK6Summary(jsonFilePath) {
  if (!fs.existsSync(jsonFilePath)) {
    throw new Error(`k6 summary file not found at: ${jsonFilePath}`)
  }

  const raw = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'))
  const metrics = raw.metrics || {}

  const reqMetric = metrics.http_reqs || {}
  const durationMetric = metrics.http_req_duration || {}
  const failedMetric = metrics.http_req_failed || {}
  const checksMetric = metrics.checks || {}
  const vusMetric = metrics.vus || {}

  const totalRequests = extractMetricVal(reqMetric, 'count', 0)
  const rps = extractMetricVal(reqMetric, 'rate', 0)

  const avgLatency = extractMetricVal(durationMetric, 'avg', 0)
  const minLatency = extractMetricVal(durationMetric, 'min', 0)
  const maxLatency = extractMetricVal(durationMetric, 'max', 0)
  const medLatency = extractMetricVal(durationMetric, 'med', 0)
  const p90Latency = extractMetricVal(durationMetric, 'p(90)', extractMetricVal(durationMetric, 'p90', 0))
  const p95Latency = extractMetricVal(durationMetric, 'p(95)', extractMetricVal(durationMetric, 'p95', 0))
  const p99Latency = extractMetricVal(durationMetric, 'p(99)', extractMetricVal(durationMetric, 'p99', 0))

  const failedRate = extractMetricVal(failedMetric, 'rate', 0)
  const checksPasses = extractMetricVal(checksMetric, 'passes', 0)
  const checksFails = extractMetricVal(checksMetric, 'fails', 0)
  const totalChecks = checksPasses + checksFails
  const checksPassRate = totalChecks > 0 ? (checksPasses / totalChecks) * 100 : 100

  const virtualUsers = extractMetricVal(vusMetric, 'value', extractMetricVal(vusMetric, 'max', 100))

  return {
    raw,
    totalRequests,
    requestsPerSecond: rps,
    avgLatency,
    minLatency,
    maxLatency,
    medLatency,
    p90Latency,
    p95Latency,
    p99Latency,
    failedRate,
    checksPassRate,
    virtualUsers,
  }
}

module.exports = {
  parseK6Summary,
  extractMetricVal,
}
