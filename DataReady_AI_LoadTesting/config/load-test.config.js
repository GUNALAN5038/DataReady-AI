/**
 * DataReady AI — k6 Load Testing Configuration
 */

module.exports = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  vus: parseInt(process.env.K6_VUS || '100', 10),
  duration: process.env.K6_DURATION || '1m',
  testSessionToken: process.env.E2E_TEST_SESSION_TOKEN || 'dr_authorized_test_session_token_2026',
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1500'],
  },
}
