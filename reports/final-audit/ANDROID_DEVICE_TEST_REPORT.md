# DataReady AI — Physical Android Device Test Report

**Date:** November 2, 2026  
**Auditor:** Antigravity Mobile QA & Engineering  
**Test Hardware:** Physical Android Device  
**Device Serial:** `00092349L001564`  
**Package Under Test:** `com.datareadyai.mobile` (Version `1.0.0`, Version Code `1`)  
**Expo SDK:** 58.0.0 / React Native 0.88.1  
**ADB Tool Location:** `C:\platform-tools\platform-tools\adb.exe`

---

## 1. Test Environment Setup & Connectivity

### Device Verification
The connected Android device was verified via ADB:
```
$ C:\platform-tools\platform-tools\adb.exe devices
List of devices attached
00092349L001564	device
```
Device authorization: **Authorized (`device`)**.

### Port Reverse Configuration
To route local laptop API services directly to the physical device over USB, port reversing was established and confirmed:
```
$ C:\platform-tools\platform-tools\adb.exe reverse tcp:3000 tcp:3000
$ C:\platform-tools\platform-tools\adb.exe reverse tcp:8081 tcp:8081
$ C:\platform-tools\platform-tools\adb.exe reverse --list
UsbFfs tcp:3000 tcp:3000
UsbFfs tcp:8081 tcp:8081
```

### Next.js Dev Server
The backend Next.js server was launched on `0.0.0.0:3000` to serve mobile Bearer API requests:
```
▲ Next.js 16.3.2 (Turbopack)
- Local:   http://localhost:3000
- Network: http://0.0.0.0:3000
✓ Ready in 1619ms
```

---

## 2. Real Physical Device Test Execution

### Test Case 1: Application Launch & Rendering
- **Action:** Launched `com.datareadyai.mobile/.MainActivity` via ADB monkey.
- **Logcat Output:**
  ```
  11-02 19:04:36.418   763   803 I ReactNativeJS: Running "main"
  ```
- **Observed Behavior:** The application launched without crashes. The Welcome screen rendered completely with hero branding, feature cards (Instant ML Readiness, Smart Transformations, AI Insights & Chat), and action buttons.
- **Screenshot Captured:** Saved to `testing/screen_app.png`.
- **Status:** **PASS**

### Test Case 2: Welcome to Sign-In Navigation
- **Action:** Sent tap input at coordinates `[542, 2098]` targeting the "Sign In" button.
- **Observed Behavior:** Smooth transition to `(auth)/login`. The screen rendered:
  - Header: "Welcome Back"
  - Inputs: "Email Address" (`you@example.com`) and "Password"
  - Actions: "Forgot password?", "Sign In", "Sign Up"
- **Status:** **PASS**

### Test Case 3: Live HTTPS Network Connectivity & UnknownHostException Remediation
- **Action:** Entered credentials `test_user@example.com` / `WrongPass123!` and tapped "Sign In".
- **Observed Behavior:**
  - Button state transitioned to `busy` (loading spinner active).
  - Outgoing HTTPS request dispatched to `https://pdkfqkglglqqwamqcian.supabase.co/auth/v1/token?grant_type=password`.
  - Zero DNS errors. No `UnknownHostException` occurred.
  - Supabase Auth responded with HTTP 400.
  - The application displayed an inline error banner:
    ```
    Invalid login credentials
    ```
- **Screenshot Captured:** Saved to `testing/screen_invalid_login.png`.
- **Status:** **PASS**

### Test Case 4: Unconfirmed Email OTP Navigation
- **Action:** Tested authentication with an unconfirmed Supabase user `audit_rc_probe@dataready.ai`.
- **Observed Behavior:**
  - Supabase Auth returned `Error: Email not confirmed`.
  - The login handler caught the error and routed the user to `/(auth)/verify-otp` with parameters `email: audit_rc_probe@dataready.ai` and `type: signup`.
- **Status:** **PASS**

### Test Case 5: Backgrounding and Lifecycle Resume
- **Action:** Minimized application using Android Home keyevent (`KEYCODE_HOME`), waited 10 seconds, then brought `com.datareadyai.mobile` back to foreground using `am start`.
- **Observed Behavior:** The React Native state remained intact; no crash or memory fault observed in logcat.
- **Status:** **PASS**

---

## 3. Google OAuth Physical Device Audit (Problem C)

A thorough audit of Google OAuth was conducted for the mobile platform:
1. **Sign-In UI:** `mobile/app/(auth)/login.tsx` does not currently render a Google Sign-In button.
2. **Supabase Provider Probe:**
   Executing an OAuth probe against Supabase:
   ```js
   s.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: 'dataready://auth/callback' } })
   ```
   Initiated an authorization request to:
   `https://pdkfqkglglqqwamqcian.supabase.co/auth/v1/authorize?provider=google&redirect_to=dataready%3A%2F%2Fauth%2Fcallback`
   The endpoint returned:
   ```json
   {"code":400,"error_code":"validation_failed","msg":"Unsupported provider: provider is not enabled"}
   ```
3. **Verdict:** Google authentication cannot work on mobile or web until the provider is enabled in the Supabase Dashboard.
4. **Status:** **BLOCKED (Documented)**

---

## 4. EAS Cloud Build & Release Candidate Artifact

The mobile build was prepared and submitted to EAS Cloud Build under account `jerryzz`:

- **Expo Account:** `jerryzz`
- **Expo Project:** `@jerryzz/dataready-ai`
- **Project ID:** `d87300b9-783b-435d-a1ac-6d3a14cf50ce`
- **Build Profile:** `preview` (APK distribution for internal testing)
- **EAS Build ID:** `e0d7322d-b36b-4920-aef7-33c3ffd4114e`
- **Build Logs URL:**  
  [https://expo.dev/accounts/jerryzz/projects/dataready-ai/builds/e0d7322d-b36b-4920-aef7-33c3ffd4114e](https://expo.dev/accounts/jerryzz/projects/dataready-ai/builds/e0d7322d-b36b-4920-aef7-33c3ffd4114e)

### Environment Injected into Build
```json
{
  "EXPO_PUBLIC_SUPABASE_URL": "https://pdkfqkglglqqwamqcian.supabase.co",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY": "sb_publishable_z16kwrqp5AQXucIEi-7aBw_7lapxRDk",
  "EXPO_PUBLIC_API_URL": "http://127.0.0.1:3000"
}
```

*Note on Local API URL:* `http://127.0.0.1:3000` is intended for development and preview testing with ADB reverse active. For an external production release, this must point to the production web deployment domain (e.g. `https://dataready.ai`).

