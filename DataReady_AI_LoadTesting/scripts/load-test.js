import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  vus: __ENV.K6_VUS ? parseInt(__ENV.K6_VUS, 10) : 100,
  duration: __ENV.K6_DURATION || '1m',
  thresholds: {
    http_req_failed: ['rate<0.01'], // SLA Target: below 1% failures
    http_req_duration: ['p(95)<2000'], // SLA Target: p95 latency under 2000ms
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const SESSION_TOKEN = __ENV.E2E_TEST_SESSION_TOKEN || ''

export default function () {
  const params = {
    headers: {
      ...(SESSION_TOKEN ? { Cookie: `dataready-e2e-session=${SESSION_TOKEN}` } : {}),
      'User-Agent': 'DataReady-AI-k6-LoadTest/1.0',
      Accept: 'application/json, text/html',
    },
    tags: { name: 'DataReadyLoad' },
  }

  // 1. Dashboard UI Request
  const dashRes = http.get(`${BASE_URL}/dashboard`, params)
  check(dashRes, {
    'dashboard status is 200': (r) => r.status === 200,
    'dashboard body contains Dashboard landmark': (r) => typeof r.body === 'string' && (r.body.includes('Dashboard') || r.body.includes('Workspace')),
    'dashboard latency < 2000ms': (r) => r.timings.duration < 2000,
  })

  // 2. Notifications API Route
  const notifRes = http.get(`${BASE_URL}/api/notifications`, params)
  check(notifRes, {
    'notifications status is 200': (r) => r.status === 200,
    'notifications returns valid JSON payload': (r) => {
      try {
        const json = r.json()
        return Array.isArray(json.notifications)
      } catch {
        return false
      }
    },
    'notifications latency < 2000ms': (r) => r.timings.duration < 2000,
  })

  // 3. User Keys API Route
  const keysRes = http.get(`${BASE_URL}/api/user/keys`, params)
  check(keysRes, {
    'keys status is 200': (r) => r.status === 200,
    'keys returns valid JSON payload': (r) => {
      try {
        const json = r.json()
        return Array.isArray(json.keys)
      } catch {
        return false
      }
    },
    'keys latency < 2000ms': (r) => r.timings.duration < 2000,
  })

  sleep(0.5)
}

export function handleSummary(data) {
  const reqs = data.metrics.http_reqs ? (data.metrics.http_reqs.values ? data.metrics.http_reqs.values.count : data.metrics.http_reqs.count) : 'N/A'
  return {
    'reports/json/summary.json': JSON.stringify(data, null, 2),
    stdout: `\n[k6 Summary] Completed ${reqs} requests across Dashboard and API endpoints\n`,
  }
}
