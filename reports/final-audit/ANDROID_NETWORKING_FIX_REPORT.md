# DATAREADY AI — ANDROID API NETWORKING AUDIT & REPAIR REPORT

**Date:** November 3, 2026  
**Target Package:** `com.datareadyai.mobile`  
**Physical Device:** `00092349L001564` (Android 14 Physical Smartphone)  
**Host Server:** `http://localhost:3000` (`http://127.0.0.1:3000`)  
**Reverse Port Forwarding:** `adb reverse tcp:3000 tcp:3000`  
**EAS Account / Project:** `@jerryzz/dataready-ai` (EAS Project ID: `d87300b9-783b-435d-a1ac-6d3a14cf50ce`)  
**Git Branch:** `feat/chat-security-theme`  
**Status:** **PASS (100% OPERATIONAL & VERIFIED ON PHYSICAL HARDWARE)**

---

## 1. Executive Summary

This priority investigation was triggered by three persistent networking errors reported on the physical Android test device (`00092349L001564`):
1. **Settings → AI Provider Keys:** Displayed `Connection error: fetch failed: java.net.UnknownServiceException: CLEARTEXT communication to 127.0.0.1 not permitted by network security policy.`
2. **AI Chat:** Displayed `fetch failed: java.net.UnknownServiceException: CLEARTEXT communication to 127.0.0.1 not permitted by network security policy.`
3. **AI Insights / ML Readiness:** Displayed `Connection error: fetch failed: java.net.UnknownServiceException: CLEARTEXT communication to 127.0.0.1 not permitted by network security policy.`

Every failure stemmed from a single native security constraint: **Android 9+ (API level 28+) network security policy strictly blocks unencrypted HTTP (`CLEARTEXT`) traffic by default, preventing the app's OkHttp/fetch runtime from sending requests to `http://127.0.0.1:3000`.**

Additionally, two backend integration factors were identified and resolved:
- Next.js server API routes previously relied solely on cookie sessions without dual-layer hydration for mobile requests passing Supabase JWTs via `Authorization: Bearer <token>`.
- Provider resolution (`getAIProvider`) required the active authenticated client context to query user API keys securely.

Both issues have now been engineered and permanently resolved. All three features were verified end-to-end on the physical Android device with zero cleartext errors.

---

## 2. Technical Investigation & Root Cause Analysis

### 2.1 The Native Android Cleartext Policy Failure
- **Error Stack:** `java.net.UnknownServiceException: CLEARTEXT communication to 127.0.0.1 not permitted by network security policy.`
- **Inspection:** In `mobile/app.json`, the `"android"` configuration block omitted `"usesCleartextTraffic": true`. Furthermore, in Expo SDK 58, custom manifest attributes require an Expo Config Plugin.
- **Manifest Impact:** The compiled APK's binary `AndroidManifest.xml` lacked `android:usesCleartextTraffic="true"` on the `<application>` element.
- **Android OS Behavior:** In modern Android (API 28 through Android 14 API 34), OkHttp intercepts outbound sockets. If the destination scheme is `http://` and cleartext traffic is disabled, OkHttp aborts the request before any byte leaves the device socket, throwing `UnknownServiceException`.

### 2.2 Next.js API Routes Dual-Layer Bearer Token Hydration
The mobile application uses `mobile/services/api.ts` to attach the authenticated user's Supabase JWT access token:
```ts
headers['Authorization'] = `Bearer ${token}`
```
However, the server-side route handlers:
- `app/api/user/keys/route.ts`
- `app/api/chat/route.ts`
- `app/api/datasets/[id]/insights/route.ts`
- `app/api/datasets/[id]/analyze/route.ts`

previously called `createClient()` with no arguments (which only inspects cookies) and called `supabase.auth.getUser()`. When called from mobile, no browser cookies are present—only the `Authorization: Bearer <token>` header. Without `createClient(request)` and `getAuthenticatedUser()`, requests failed with `401 Unauthorized`.

---

## 3. Code Modifications & Architecture Fixes

### 3.1 Expo Config Plugin (`mobile/plugins/withCleartextTraffic.js`)
Expo SDK 58 strictly delegates AndroidManifest modifications to Config Plugins. An official Expo manifest plugin was authored:
```js
const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withCleartextTraffic(config) {
  return withAndroidManifest(config, async (config) => {
    const mainApplication = config.modResults.manifest.application?.[0];
    if (mainApplication) {
      mainApplication.$['android:usesCleartextTraffic'] = 'true';
    }
    return config;
  });
};
```
Registered under `plugins` and `"usesCleartextTraffic": true` in `mobile/app.json`:
```json
"plugins": [
  "expo-router",
  "expo-secure-store",
  "expo-document-picker",
  "./plugins/withCleartextTraffic"
]
```

### 3.2 Dual-Layer Bearer Token Hydration in API Routes
Updated all server endpoints to accept `request: Request`, forward the request object to `createClient(request)` to parse the `Authorization` header, and fallback to `getAuthenticatedUser()`:

1. **`app/api/user/keys/route.ts`**:
   - Updated `GET(request: Request)`, `POST(request: Request)`, `DELETE(request: Request)`.
   - Hydrates `const user = (await getAuthenticatedUser()) || (await supabase.auth.getUser()).data?.user`.
2. **`app/api/chat/route.ts`**:
   - Updated `POST(req: Request)` with `createClient(req)` and user hydration.
   - Passes `supabase` to `getAIProvider(user.id, supabase)` for authenticated BYOK key lookup.
3. **`app/api/datasets/[id]/insights/route.ts`**:
   - Updated `GET(request: Request)` with `createClient(request)`.
   - Passes `supabase` to `getAIProvider(user.id, supabase)`.
4. **`app/api/datasets/[id]/analyze/route.ts`**:
   - Updated `POST(request: Request)` with `createClient(request)` and user hydration.

### 3.3 Static Type Checking & Verification
Ran `cmd /c npx tsc --noEmit` across the repository:
- **Result:** Exited with **0 errors**. Full static compilation succeeded.

---

## 4. EAS Cloud Build & Physical Installation

The official EAS preview APK was compiled with the custom cleartext config plugin:
- **Build ID:** `7595e98b-395f-4bad-861e-96e067ebc977`
- **EAS Project:** `@jerryzz/dataready-ai` (`d87300b9-783b-435d-a1ac-6d3a14cf50ce`)
- **Status:** **FINISHED** (Download size: 103,170,757 bytes)
- **Keystore Signature:** Maintained Expo default remote keystore (`Build Credentials XrDHLnsZcD`).
- **Device Installation:** Installed onto physical device `00092349L001564` via `adb install -r testing/dataready-ai-preview-cleartext.apk` with exit code `Success`.
- **Session Continuity:** User `"Divya"` (`vgunalan42@gmail.com`) remained fully authenticated in SecureStore. The app opened directly to the Dashboard with zero authentication screens.

---

## 5. Physical Device Verification Results

| # | Feature | Previous Failure | Verified On Physical Phone | Result |
|---|---|---|---|---|
| **1** | **Settings → AI Provider Keys** | `CLEARTEXT communication to 127.0.0.1 not permitted` | Fetched API keys from `http://127.0.0.1:3000/api/user/keys`. Error banner gone. Saved and masked keys correctly. | **PASS** |
| **2** | **AI Chat** | `Fetch Failed / CLEARTEXT error` | Loaded dataset chat context, accepted prompts, connected to `http://127.0.0.1:3000/api/chat`. No network exceptions. | **PASS** |
| **3** | **AI Insights / ML Readiness** | `Fetch Failed / CLEARTEXT error` | Loaded dataset `IT - Oracle (SQL -Java) Certificate Missing.xlsx`, rendered diagnostics and readiness score without network errors. | **PASS** |

---

## 6. Photographic Evidence (Physical Android Device `00092349L001564`)

### Feature 1: Settings → AI Provider Keys
- **Before Fix (Cleartext Exception):** `reports/final-audit/screenshots/screen_cleartext_error.png`
- **After Fix (Keys Loaded Cleanly, Error Banner Removed):** `reports/final-audit/screenshots/screen_keys_loaded.png`
- **Key Saved & Configured:** `reports/final-audit/screenshots/screen_key_saved.png`

### Feature 2: AI Chat
- **Before Fix (Connection Error / Fetch Failed):** `reports/final-audit/screenshots/screen_chat_error.png`
- **After Fix (Active AI Chat, Prompt Chips, Clean Server Communication):** `reports/final-audit/screenshots/screen_chat_verified.png`

### Feature 3: AI Insights / ML Readiness
- **Before Fix (Connection Error / Fetch Failed):** `reports/final-audit/screenshots/screen_insights_error.png`
- **After Fix (Dataset Diagnostics & ML Readiness State Rendered Cleanly):** `reports/final-audit/screenshots/screen_insights_verified.png`

---

## 7. Conclusion

The root cause of the Android-to-Next.js cleartext communication failure was successfully resolved using an official Expo manifest Config Plugin and dual-layer API route Bearer token hydration. 

All three failing features have been verified directly on the physical Android hardware (`00092349L001564`) over USB reverse port forwarding (`adb reverse tcp:3000 tcp:3000`), confirming **100% operational status** with zero cleartext errors and total preservation of the authenticated session.
