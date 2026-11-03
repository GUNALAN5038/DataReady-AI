# DataReady AI — Android Appium Automation Suite

This directory contains the Appium / UiAutomator2 test automation framework for testing the DataReady AI Android mobile application on a physical device or emulator.

## Directory Structure
```text
DataReady_AI_Appium/
├── package.json
├── package-lock.json
├── wdio.conf.js
├── config/
│   └── capabilities.js
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
│   ├── navigation/
│   └── end_to_end/
├── utils/
│   ├── excelReporter.js
│   ├── htmlReporter.js
│   ├── testHelpers.js
│   └── testData.js
├── scripts/
│   ├── run-android-tests.js
│   └── install-apk.js
├── reports/
│   ├── excel/
│   ├── html/
│   ├── screenshots/
│   └── logs/
└── README.md
```

## Running Android Tests
Ensure the device is connected via ADB (`00092349L001564`) and ports `3000` / `8081` are reversed:
```bash
node scripts/run-android-tests.js
```
or
```bash
npm test
```
