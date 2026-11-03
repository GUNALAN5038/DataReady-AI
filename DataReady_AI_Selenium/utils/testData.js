/**
 * DataReady AI — Selenium Test Data Fixtures
 */

const SAMPLE_CSV_CONTENT = `employee_id,full_name,department,salary,experience_years,status,notes
EMP001,John Smith,Engineering,85000,5,active,Experienced frontend
EMP002,Jane Doe,Marketing,62000,3,active,Campaign manager
EMP003,Robert Taylor,Engineering,120000,10,active,Lead architect
EMP004,Emily Brown,Sales,,2,active,Needs salary review
EMP005,Michael Johnson,Engineering,95000,7,active,Backend specialist
EMP005,Michael Johnson,Engineering,95000,7,active,Backend specialist
EMP006,David Wilson,Product,999999,6,active,Executive compensation outlier
EMP007,Sarah Davis,Sales,58000,1,inactive,Probationary
EMP008,James Anderson,Support,45000,4,active,Senior tech support
EMP009,Jessica Martinez,Marketing,71000,5,active,SEO manager
EMP010,William Thomas,Design,68000,,active,Portfolio pending
`

const TEST_CREDENTIALS = {
  valid: {
    email: 'authorized_test_user@dataready.ai',
    sessionToken: process.env.E2E_TEST_SESSION_TOKEN || 'dr_authorized_test_session_token_2026',
    userId: process.env.TEST_USER_ID || '118030e0-857d-49ae-ad68-7730ec58d45a',
    displayName: 'Authorized Test User',
  },
  invalid: {
    email: 'unregistered_invalid_user@dataready.ai',
    password: 'InvalidPassword123!',
  },
  malformed: {
    email: 'not-an-email',
    password: 'short',
  },
}

const TEST_DATASETS = [
  {
    name: 'Selenium E2E Enterprise HR Dataset',
    rowCount: 11,
    colCount: 7,
    columns: ['employee_id', 'full_name', 'department', 'salary', 'experience_years', 'status', 'notes'],
  },
]

module.exports = {
  SAMPLE_CSV_CONTENT,
  TEST_CREDENTIALS,
  TEST_DATASETS,
}
