# DataReady AI — k6 API Baseline & Load Testing

This directory contains the performance, concurrency, and baseline load testing suite for DataReady AI using k6.

## Structure
```text
DataReady_AI_LoadTesting/
├── package.json
├── scripts/
│   ├── load-test.js
│   ├── parseK6Summary.js
│   ├── generateExcelReport.js
│   └── run-load-test.js
├── config/
│   └── load-test.config.js
├── reports/
│   ├── excel/
│   ├── json/
│   └── html/
└── README.md
```

## Running the Load Test
Ensure the server is running on `http://localhost:3000` and `k6` is installed:
```bash
node scripts/run-load-test.js
```
or
```bash
npm test
```

## Configuration & Thresholds
- **Virtual Users:** 100 VUs
- **Duration:** 1 Minute (60s)
- **Thresholds:**
  - `http_req_failed < 5%`
  - `http_req_duration p(95) < 1500ms`
