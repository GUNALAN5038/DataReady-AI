# DataReady AI — Automated Testing Infrastructure

A comprehensive, isolated, multi-stream testing infrastructure covering:
1. **Web E2E Automation**: Selenium WebDriver (Chrome Headless)
2. **Mobile Android Automation**: Appium 3.9.0 / UiAutomator2
3. **API Performance & Load Testing**: k6 (100 Virtual Users for 1 minute)
4. **Security, RLS & Secret Exposure Testing**: Multi-tenant authorization, AES-256-GCM, zero secret leakage, and dependency vulnerability audits
5. **Excel & HTML Reporting**: Separate styled `.xlsx` workbooks and responsive HTML dashboards for every testing stream, plus a consolidated master workbook and dashboard.

---

## 1. Directory Structure

```text
testing/
├── web-selenium/                 # Web E2E Test Suite (Selenium WebDriver)
│   ├── config/
│   │   └── selenium.config.js    # Chrome headless options, timeouts, base URL
│   ├── pages/
│   │   ├── BasePage.js           # Explicit waits, selector helpers, screenshots
│   │   └── PageObjects.js        # Login, Signup, Dashboard, Datasets, Chat, Settings POMs
│   ├── tests/
│   │   └── run-all-tests.js      # E2E test runner, assertions & reporter integration
│   ├── package.json              # Selenium WebDriver & ExcelJS dependencies
│   └── README.md
│
├── mobile-appium/                # Mobile Android E2E Suite (Appium / UiAutomator2)
│   ├── config/
│   │   └── appium.config.js      # Android UiAutomator2 capabilities & timeouts
│   ├── pages/
│   │   └── MobileScreenObjects.js# Mobile screen objects (Welcome, Auth, Dashboard, Chat)
│   ├── tests/
│   │   └── run-all-tests.js      # Appium runner with honest environmental diagnostics
│   ├── package.json              # WebdriverIO & ExcelJS dependencies
│   └── README.md
│
├── api-load-testing/             # Load & Stress Testing (k6)
│   ├── scripts/
│   │   ├── k6-script.js          # 100 VUs constant load scenario (1m duration)
│   │   └── run-load-test.js      # Server orchestrator, k6 runner & metric parser
│   └── README.md
│
├── security-testing/             # Security, RLS & Secret Auditing
│   ├── scripts/
│   │   └── run-security-test.js  # Auth token verification, IDOR, RLS, static secret scan
│   └── README.md
│
├── shared/                       # Shared Report Generators & Utilities
│   ├── excel-generator/
│   │   └── excel-builder.js      # ExcelJS workbook builder with custom styles & formulas
│   ├── html-generator/
│   │   └── html-builder.js       # Responsive HTML report builder with KPI cards
│   └── report-utils/
│       └── consolidate-reports.js# Consolidates all stream JSONs into Master report
│
├── package.json                  # Root testing package configuration
└── README.md

reports/                          # All Generated Test Reports & Artifacts
├── index.html                    # Unified Quality Assurance Hub landing page
├── web/
│   ├── selenium-results.xlsx     # Styled Excel workbook for Selenium
│   ├── selenium-report.html      # Responsive HTML report for Selenium
│   ├── selenium-results.json     # Machine-readable test execution output
│   └── screenshots/              # Failure screenshots directory
├── mobile/
│   ├── appium-results.xlsx       # Styled Excel workbook for Appium
│   ├── appium-report.html        # Responsive HTML report for Appium
│   └── appium-results.json       # Precondition diagnostics & test statuses
├── performance/
│   ├── k6-performance-results.xlsx # Styled Excel workbook for k6 load test
│   ├── k6-performance-report.html  # Responsive HTML report with latency distributions
│   ├── k6-summary.json           # Aggregated k6 metrics (RPS, p95, avg)
│   └── raw-k6-summary.json       # Raw k6 engine output
├── security/
│   ├── security-results.xlsx     # Styled Excel workbook with Classified Findings
│   ├── security-report.html      # Responsive HTML security dashboard
│   └── security-findings.json    # Detailed security audit report
└── final/
    ├── DataReady_AI_Final_Test_Report.xlsx # Consolidated Multi-Sheet Master Workbook
    ├── final-testing-report.html           # Consolidated Master HTML Dashboard
    └── DataReady_AI_FINAL_TESTING_REPORT.md# Executive Markdown Quality Gate Report
```

---

## 2. Quick Execution Guide

All test suites can be executed directly from the project root:

```bash
# 1. Run Selenium Web E2E Suite
npm run test:web

# 2. Run k6 Performance Load Suite (100 VUs, 1 minute)
npm run test:performance

# 3. Run Security & RLS Suite
npm run test:security

# 4. Run Appium Android Mobile Suite
npm run test:mobile

# 5. Generate / Consolidate Master Reports
npm run reports:generate

# 6. Execute Full Pipeline
npm run test:all
```

---

## 3. Testing Streams Overview

### A. Selenium Web E2E
- **Target**: Next.js App Router web application (`http://localhost:3000`).
- **Browser**: Google Chrome in headless mode (`--headless=new`).
- **Driver**: Automatic resolution via Selenium Manager (`selenium-webdriver 4.27`).
- **Features Tested**: Form field loading, invalid credential rejection, signup page navigation, password recovery request flow, unauthenticated protected route guards (`/dashboard`, `/datasets`, `/chat`, `/upload`, `/settings`), and theme switcher accessibility.

### B. Appium Android Mobile E2E
- **Target**: React Native Expo standalone Android application (`com.datareadyai.mobile`).
- **Framework**: Appium 3.9.0 with UiAutomator2 driver.
- **Precondition & Transparency Standard**: Per project rules, environmental blockers (absence of local ADB/connected device and unauthenticated EAS cloud build session) are honestly documented as `BLOCKED` rather than fabricating fake passes. Complete screen objects and test suites are fully implemented.

### C. k6 Backend Performance Testing
- **Target**: Non-destructive read endpoints (`/login`) on local Next.js production server.
- **Load Profile**: Constant 100 Virtual Users (VUs) for 1 minute (60s).
- **Engine**: k6 v2.3.0 (Grafana Labs).
- **Metrics Tracked**: Total requests, throughput (RPS), avg/min/med/p90/p95/p99 latency, failure rate, and HTTP status distributions.

### D. Security, Authorization & Secret Exposure Testing
- **Auth Security**: Server-side Bearer token verification using `auth.getUser(token)`; rejection of forged claims; password complexity policy.
- **Multi-Tenant RLS**: Verification that all dataset endpoints strictly filter by `eq("user_id", user.id)` and prevent IDOR cross-tenant access.
- **Storage Isolation**: Verification that upload paths enforce `datasets/${user.id}/` namespace.
- **Encryption**: Verification of AES-256-GCM cipher with 16-byte authenticated tags and unique IVs.
- **Secret Scan**: Static code analysis verifying zero client-side exposure of `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, or database credentials in `mobile/` or build artifacts.
- **Dependency Audit**: `npm audit` vulnerability baseline tracking.
