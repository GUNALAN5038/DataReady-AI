# DataReady AI — Selenium Web Application E2E Automation

This directory houses the comprehensive Selenium WebDriver end-to-end testing suite for the DataReady AI Web Application.

## Structure
```text
DataReady_AI_Selenium/
├── package.json
├── package-lock.json
├── run-all-web-tests.js
├── config/
│   └── selenium.config.js
├── tests/
│   ├── authentication/
│   ├── dashboard/
│   ├── datasets/
│   ├── analysis/
│   ├── transformations/
│   ├── export/
│   ├── ai_insights/
│   ├── ai_chat/
│   ├── settings/
│   ├── notifications/
│   ├── security/
│   ├── accessibility/
│   └── end_to_end/
├── utils/
│   ├── excelReporter.js
│   ├── htmlReporter.js
│   ├── testData.js
│   └── testHelpers.js
└── reports/
    ├── excel/
    ├── html/
    └── screenshots/
```

## Running the Suite

Ensure the Next.js server is active at `http://localhost:3000`, then run:
```bash
node run-all-web-tests.js
```
or
```bash
npm test
```

## Reports Generated
- **Excel:** `reports/excel/DataReadyAI_Web_E2E_Report.xlsx`
- **HTML:** `reports/html/index.html`
- **Screenshots:** `reports/screenshots/` (Captured on PASS)
