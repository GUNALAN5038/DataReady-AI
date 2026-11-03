import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  vus: __ENV.K6_VUS ? parseInt(__ENV.K6_VUS, 10) : 100,
  duration: __ENV.K6_DURATION || '1m',
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1500'],
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const SESSION_TOKEN = __ENV.E2E_TEST_SESSION_TOKEN || 'dr_authorized_test_session_token_2026'

export default function () {
  const params = {
    headers: {
      Cookie: `dataready-e2e-session=${SESSION_TOKEN}`,
      'User-Agent': 'DataReady-AI-k6-LoadTest/1.0',
    },
    tags: { name: 'DashboardLoad' },
  }

  // 1. Safe read-only dashboard request
  const res = http.get(`${BASE_URL}/dashboard`, params)

  check(res, {
    'status is 200': (r) => r.status === 200,
    'body contains html': (r) => r.body && r.body.length > 0,
    'latency is acceptable (<1500ms)': (r) => r.timings.duration < 1500,
  })

  sleep(0.5)
}

export function handleSummary(data) {
  return {
    'reports/json/summary.json': JSON.stringify(data, null, 2),
    stdout: `\n[k6 Summary] Completed ${data.metrics.http_reqs ? (data.metrics.http_reqs.values ? data.metrics.http_reqs.values.count : data.metrics.http_reqs.count) : 'N/A'} requests\n`,
  }
}
