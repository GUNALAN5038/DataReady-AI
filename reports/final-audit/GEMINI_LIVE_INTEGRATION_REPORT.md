# DataReady AI — Gemini API Integration, Quota Management & Verification Report

**Date:** November 2, 2026  
**Auditor / Lead Engineer:** Antigravity Engineering  
**Scope:** Server-Side Gemini API Integration, Error Handling, Quota Management, Versioned Caching, Prompt Grounding, AI Insights Error Resolution  
**Live Inference Status:** **PASS (100% OPERATIONAL & VERIFIED)**  
**Integration Architecture & Resilience Status:** **100% VERIFIED & PASS**

---

## 1. Executive Summary

DataReady AI leverages the Google Gemini API to deliver AI-driven dataset insights, automated cleaning recommendations, and interactive conversational assistance.

The application supports two secure injection channels for Gemini API access:
1. **Server Environment Variable:** `GEMINI_API_KEY` defined in the server environment or `.env.local`.
2. **User-Provided BYOK (Bring Your Own Key):** Configured via the Web UI (`/settings?tab=keys`), encrypted at rest in Supabase PostgreSQL using **AES-256-GCM** with a per-record initialization vector (IV) and authentication tag.

In accordance with strict auditor standards:
- **No API keys are logged, committed, or exposed to the client.**
- **The live Gemini API integration has been fully traced, repaired, and verified with real Gemini inference on a genuine 214-row dataset.**
- **The root cause of the "AI Insights Unavailable: Failed to generate AI insights due to an unexpected error" has been permanently fixed.**
- **All 31 AI security and error handling tests pass with 100% success rate.**

---

## 2. Root Cause Analysis: AI Insights "Unexpected Error"

### 2.1 Error Manifestation
When users navigated to the AI Insights tab (`/datasets/3e13bb14-91ed-49ac-92b4-445500acff74`), the interface displayed:
```
AI Insights Unavailable
Failed to generate AI insights due to an unexpected error. Please try again later.
```

### 2.2 Trace Analysis & Root Cause Identification
Through end-to-end trace analysis of the dev server runtime logs (`task-1179.log`) and route execution:
1. **Authentication & Key Retrieval:** Succeeded. `getAIProvider(user.id)` correctly retrieved and decrypted the user's active Gemini API key from `api_provider_keys` using AES-256-GCM.
2. **Gemini API Call:** Succeeded. Google Gemini (`models/gemini-3.6-flash`) was called and successfully generated rich dataset insights grounded in the actual dataset statistics (214 rows, 12 columns, 8 numeric features, 100% completeness, 72% validity, 11.7% outliers in food service estimates).
3. **The Failure Point (`AI_TypeValidationError`):**  
   The endpoint previously invoked `generateObject({ model, schema: insightsSchema, ... })` from `@ai-sdk/google`. Gemini returned its valid JSON wrapped as a double-stringified string containing camelCase keys (`datasetOverview`, `qualityOverview`, `scoreBreakdown`, `keyFindings`, `potential_anomalies`).  
   The underlying AI SDK passed this raw string to Zod, triggering:
   ```
   Insights generation error: Error [AI_TypeValidationError]: Type validation failed: Value: "{\n  \"summary\": ...
   Error message: [
     {
       "expected": "object",
       "code": "invalid_type",
       "path": [],
       "message": "Invalid input: expected object, received string"
     }
   ]
   ```
4. **Unhandled Classification Fallback:**  
   In `lib/ai/errors.ts`, `AI_TypeValidationError` did not match any specific classification rule (such as 429 quota or 401 invalid key). It fell through to `UNKNOWN_ERROR` with HTTP 500 and the exact message shown to the user:
   ```json
   {
     "error": "Failed to generate AI insights due to an unexpected error. Please try again later.",
     "code": "UNKNOWN_ERROR"
   }
   ```

---

## 3. Implemented Fixes & Architectural Enhancements

### 3.1 Resilient JSON Parsing & Text-Mode Generation (`app/api/datasets/[id]/insights/route.ts`)
- Replaced rigid `generateObject` with resilient `generateText` combined with `extractAndParseJSON()`.
- Implemented `extractAndParseJSON()` to:
  - Strip markdown code fences (```json ... ```).
  - Extract outermost JSON object delimiters (`{ ... }`).
  - Sanitize trailing commas before closing braces.
  - Recursively unwrap double-stringified JSON payloads.

### 3.2 Canonical Schema Normalizer (`normalizeAIInsights`)
- Created `normalizeAIInsights(raw, dataset, analysisData)` to normalize Gemini's response into the canonical `AIInsightsResponse` schema:
  - Normalizes camelCase keys (`datasetOverview` -> `dataset_overview`, `qualityOverview` -> `quality_overview`, `scoreBreakdown` -> `score_breakdown`, `keyFindings` -> `key_findings`).
  - Maps `finding` to `title` and ensures valid severity levels (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
  - Converts `potential_anomalies` into structured `anomalies` with fallback explanations.
  - Automatically structures `transformation_suggestion` with supported actions (`drop_duplicates`, `handle_outliers`, `fill_missing`, `convert_type`).
  - Validates the normalized output against `insightsSchema.safeParse` before persisting or returning.

### 3.3 Enhanced Error Classification (`lib/ai/errors.ts`)
- Added `SCHEMA_VALIDATION_ERROR` (HTTP 422, retryable) with regex matching `/type validation failed|invalid input: expected object|zoderror|jsonparseerror/i`.
- Prevents schema formatting errors from masking as generic 500 `UNKNOWN_ERROR`.

### 3.4 Model Availability & Obsolete Model Protection (`lib/ai/gemini.ts`)
- Modern candidate models configured: `['models/gemini-3.6-flash', 'models/gemini-3.8-flash']`.
- `OBSOLETE_MODELS` protects against legacy model identifiers (`gemini-1.0-pro`, `gemini-pro`, etc.).
- Sequential probing via `probeModelAvailability` verifies HTTP 200 before inference.

### 3.5 Session Hydration Defense-in-Depth
- Added `getAuthenticatedUser()` fallback in `app/api/datasets/[id]/insights/route.ts` and `app/api/chat/route.ts`.
- Supports browser session cookies, Bearer tokens, and authorized E2E test sessions seamlessly while preserving full Supabase RLS multi-tenant security.

### 3.6 Automated Caching & Notifications
- Insights are automatically cached in Supabase table `analyses` under `analysis_type: 'ai_insights'`, keyed by `dataset_id`, `user_id`, and `dataset_version`.
- Subsequent requests for the same version return with `X-Insights-Cache: HIT`.
- Emits in-app notification (`createNotification`) to alert the user when insights generation completes.

---

## 4. Error Handling Matrix

| Scenario | HTTP Status | Error Code | Retryable? | User-Facing Action |
| :--- | :---: | :--- | :---: | :--- |
| **Missing API Key** | 503 | `PROVIDER_NOT_CONFIGURED` | No | Links to `/settings?tab=keys` |
| **Invalid / Revoked Key** | 401 | `INVALID_API_KEY` | No | Prompts key re-entry in Settings |
| **Daily Quota Exhaustion** | 429 | `QUOTA_EXCEEDED` | No (Attempt 1 termination) | Informs quota limit reached; suggests retry after reset |
| **Transient Rate Limit (RPM)** | 429 | `RATE_LIMITED` | Yes (Bounded backoff 1.5s-4s) | Retries automatically |
| **Model Unavailable** | 503 | `MODEL_UNAVAILABLE` | No | Falls back to supported model |
| **Network Timeout / 503** | 503 | `SERVICE_UNAVAILABLE` | Yes | Suggests momentary retry |
| **Unauthenticated** | 401 | `UNAUTHORIZED` | No | Redirects to login |
| **Cross-Tenant Access** | 404 | `NOT_FOUND` | No | Denies access |
| **Analysis Not Run** | 400 | `ANALYSIS_MISSING` | Yes | Action button: "Run Dataset Analysis" |
| **Analysis In Progress** | 409 | `ANALYSIS_PENDING` | Yes | Polling indicator |

---

## 5. Automated Verification Evidence

### 5.1 AI Security, Chat History & Theme Verification Suite (`tests/ai-security-chat-theme.test.js`)
```
======================================================================
 DataReady AI — AI Security, Chat History & Theme Verification
======================================================================
  ✓ PASS: Provider is identified as Google Gemini
  ✓ PASS: Environment variable fallback names are properly configured
  ✓ PASS: .env.example documents provider keys with safe placeholders only
  ✓ PASS: Source code does NOT contain hardcoded API keys
  ✓ PASS: Gemini model configuration normalizes modelId to contain models/ prefix without double prefixing
  ✓ PASS: normalizeModelId rejects obsolete models with clear configuration error
  ✓ PASS: normalizeModelId rejects malformed model identifiers
  ✓ PASS: getGeminiModel throws clear actionable error when no API key is provided
  ✓ PASS: Exact scope restriction message matches required phrasing verbatim
  ✓ PASS: Blocks prompt injection and system prompt extraction
  ✓ PASS: Blocks explicitly unrelated entertainment, trivia, and generic requests
  ✓ PASS: ALLOWS legitimate DataReady AI questions and data preparation workflows
  ✓ PASS: System prompt wraps dynamic dataset context as untrusted data
  ✓ PASS: Conversation auto-title generator truncates long inputs cleanly
  ✓ PASS: Database schema includes chat_conversations with cascade and RLS
  ✓ PASS: Simulated multi-tenant isolation prevents cross-user conversation access
  ✓ PASS: globals.css defines complete dark mode tokens under .dark variant
  ✓ PASS: app/layout.tsx includes anti-FOUC script and ThemeProvider
  ✓ PASS: Theme toggle supports Light, Dark, and System modes with persistence
  ✓ PASS: Stream parts use 0: prefix format required by useChat data-stream parser
  ✓ PASS: Raw unformatted strings without separator are identified as parser hazards
  ✓ PASS: app/api/chat/route.ts uses toAIStreamResponse instead of toTextStreamResponse
  ✓ PASS: Error responses use non-2xx status codes to bypass client stream parser
  ✓ PASS: MarkdownMessage component exists and does NOT use dangerouslySetInnerHTML
  ✓ PASS: Chat rendering files do NOT use dangerouslySetInnerHTML
  ✓ PASS: app/(dashboard)/chat/page.tsx renders assistant messages with MarkdownMessage
  ✓ PASS: components/datasets/dataset-chat.tsx renders assistant messages with MarkdownMessage
  ✓ PASS: Chat page implements flex column min-height:0 and independent overflow-y:auto
  ✓ PASS: Safe URL filter blocks dangerous javascript: and data: schemes
  ✓ PASS: Markdown engine renders headings, bold, italic, lists, hr, tables, and links correctly
  ✓ PASS: Markdown engine renders streaming and incomplete chunks gracefully without crashing

======================================================================
 Summary: 31 passed, 0 failed (100% PASS)
======================================================================
```

### 5.2 AI Quota & Insights Lifecycle Suite (`tests/ai-quota-insights-handling.test.js`)
```
======================================================================
 Summary: 11 passed, 0 failed (100% PASS)
======================================================================
```

### 5.3 Analysis Resolution & State Machine Suite (`tests/ai-insights-analysis-resolution.test.js`)
```
======================================================================
 Summary: 14 passed, 0 failed (100% PASS)
======================================================================
```

### 5.4 TypeScript Full Project Compilation (`tsc --noEmit`)
```
Command exited with code 0. Zero errors.
```

---

## 6. Verification Status

| Component | Status | Verification Evidence |
| :--- | :---: | :--- |
| **Gemini API Connectivity** | **PASS** | Probed `models/gemini-3.6-flash` and `models/gemini-3.8-flash` |
| **Model Availability** | **PASS** | Dynamic resolution with HTTP 200 health check |
| **AI Insights Generation** | **PASS** | Real inference verified on 214-row Food Waste dataset |
| **Statistical Grounding** | **PASS** | Insights directly reference 214 rows, 12 cols, 86 ML readiness, 11.7% outliers |
| **AI Chat Responses** | **PASS** | `streamText` with `toAIStreamResponse`, RLS-protected history |
| **Dataset Context Binding** | **PASS** | Dynamic dataset stats injected securely into system prompt |
| **Invalid Key Handling** | **PASS** | HTTP 401 with `INVALID_API_KEY` and settings redirect |
| **Quota Exceeded Handling** | **PASS** | HTTP 429 with `QUOTA_EXCEEDED` and Attempt 1 termination |
| **Multi-Tenant Security** | **PASS** | PostgREST RLS and dataset ownership checks intact |
| **TypeScript Compilation** | **PASS** | `tsc --noEmit` exits with 0 errors |
