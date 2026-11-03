# DataReady AI — Mobile Android Application (Expo Go & React Native)

The official mobile client for **DataReady AI** — an automated ML dataset quality, readiness analysis, and transformation platform.

Built with **React Native**, **Expo SDK 54**, **TypeScript**, and **Expo Router**, securely integrated with the existing Next.js backend and Supabase infrastructure.

---

## 1. System Requirements

- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **Package Manager**: `npm` v10+
- **Mobile Runtime**: **Expo Go** app installed from Google Play Store on your Android device (or Android Emulator)
- **Expo SDK Version**: `^54.0.0`
- **React Native Version**: `0.81.5`
- **Network Requirement**: During local physical-device testing with Expo Go, your computer and Android phone must be on the **same Wi-Fi network**, or connected via USB cable with `adb reverse tcp:8081 tcp:8081` and `adb reverse tcp:3000 tcp:3000`.

---

## 2. Environment Variables Configuration

Copy `.env.example` to `.env` inside `mobile/`:

```bash
cd mobile
cp .env.example .env
```

Configure the following variables in `mobile/.env`:

```env
# Public Supabase URL (from your Supabase project dashboard)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

# Public Supabase Anonymous Key (safe for client bundles)
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...

# DataReady AI Backend API URL
# For local dev on physical Android device: Use your computer's LAN IP (e.g., http://192.168.1.100:3000)
# For Android emulator: Use http://10.0.2.2:3000
# For production backend (Vercel): Use https://dataready-ai.vercel.app
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000
```

> [!IMPORTANT]
> **Zero Secret Leakage Guarantee**:
> Never place server secrets (`GEMINI_API_KEY`, `API_KEY_ENCRYPTION_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) in the mobile environment or bundle. All AI requests, file transformations, and AES-256-GCM key operations execute exclusively on the server. The mobile app communicates using user Bearer tokens (`Authorization: Bearer <session.access_token>`).

---

## 3. Installation & Verification

From the `mobile/` directory:

```bash
# 1. Install dependencies
npm install

# 2. Run TypeScript typecheck
npm run typecheck   # or: npx tsc --noEmit

# 3. Run unit tests
npm test            # 11 unit & security tests

# 4. Verify Expo dependency compatibility
npx expo-doctor     # Checks for 20/20 compatible dependencies
```

---

## 4. Starting the Application in Expo Go

### Option A: LAN Connection (Same Wi-Fi)

1. Ensure your Next.js backend is running from the root project:
   ```bash
   # From root DataReady_AI:
   npm run dev
   ```
2. Start the Expo development server:
   ```bash
   # From DataReady_AI/mobile:
   npx expo start
   ```
3. Open the **Expo Go** app on your Android device.
4. Scan the QR code displayed in your terminal or browser dashboard.

### Option B: USB Cable Connection (Most Reliable)

1. Connect your Android phone via USB and enable **USB Debugging** in Developer Options.
2. Forward the Metro and Backend ports:
   ```bash
   adb reverse tcp:8081 tcp:8081
   adb reverse tcp:3000 tcp:3000
   ```
3. Set `EXPO_PUBLIC_API_URL=http://localhost:3000` in `mobile/.env`.
4. Run `npx expo start --localhost` and press `a` or scan the QR code.

### Option C: Tunneling (Different Networks / Firewalls)

If you are on a restricted cellular or public Wi-Fi network:

```bash
npx expo start --tunnel
```

---

## 5. Supabase Authentication Setup

The mobile app shares the exact same user database, tables, and RLS policies as the web application.

1. **Email/Password Sign In**: Authenticates directly with `supabase.auth.signInWithPassword`.
2. **Sign Up with OTP**: Sends 6-digit verification code. User enters code in `mobile/app/(auth)/verify-otp.tsx` which calls `supabase.auth.verifyOtp({ email, token, type: 'signup' })`.
3. **Session Persistence**: Sessions are securely stored on the device using `expo-secure-store` (hardware-backed Android Keystore) with automatic fallback to `@react-native-async-storage/async-storage`.
4. **Deep Linking Scheme**: Configured with scheme `dataready://` in `app.json`. In the Supabase dashboard (Authentication -> URL Configuration -> Redirect URLs), add:
   ```
   dataready://auth/callback
   ```

---

## 6. Architecture & Folder Structure

```text
mobile/
├── app/                              # Expo Router file-based navigation
│   ├── (auth)/                       # Authentication Stack
│   │   ├── _layout.tsx
│   │   ├── welcome.tsx               # Product introduction & CTA
│   │   ├── login.tsx                 # Sign In with unverified account detection
│   │   ├── signup.tsx                # Account creation with password strength meter
│   │   ├── forgot-password.tsx       # Password recovery request
│   │   ├── reset-password.tsx        # Set new password
│   │   └── verify-otp.tsx            # 6-digit OTP verification screen
│   ├── (tabs)/                       # Main Tab Navigator
│   │   ├── _layout.tsx               # Bottom tabs with badges & icons
│   │   ├── index.tsx                 # Dashboard (Quality scores, metrics, activity)
│   │   ├── datasets.tsx              # Dataset repository with search & filter
│   │   ├── upload.tsx                # CSV/XLSX file picker & upload progress
│   │   ├── chat.tsx                  # AI chat conversation list & creation
│   │   └── settings.tsx              # Account, AI keys, theme & security info
│   ├── datasets/
│   │   └── [id].tsx                  # Dataset detail (preview table, column stats)
│   ├── analysis/
│   │   └── [id].tsx                  # Quality analysis & ML readiness audit
│   ├── transformations/
│   │   └── [id].tsx                  # Cleaning engine (duplicates, missing, impute)
│   ├── chat/
│   │   └── [id].tsx                  # Conversational AI assistant for datasets
│   ├── settings/
│   │   ├── keys.tsx                  # Gemini API key configuration (AES-256-GCM)
│   │   ├── profile.tsx               # User profile display name editor
│   │   └── notifications.tsx         # Notification center with read state
│   ├── _layout.tsx                   # Root layout with AuthProvider & Stack
│   └── index.tsx                     # Smart splash redirector
├── components/                       # Reusable UI component library
│   ├── Badge.tsx                     # Status tags (Pending, Completed, etc.)
│   ├── Button.tsx                    # Primary, secondary, outline, danger buttons
│   ├── Card.tsx                      # Styled container cards with borders & shadows
│   ├── EmptyState.tsx                # Informative empty states with action buttons
│   ├── Header.tsx                    # Screen headers with back navigation
│   ├── Input.tsx                     # Form inputs with error labels & secure toggles
│   ├── LoadingSpinner.tsx            # Branded activity indicator
│   └── MetricCard.tsx                # Analytics metric card with trends
├── constants/
│   └── colors.ts                     # Indigo/blue theme design tokens
├── hooks/
│   └── useAuth.tsx                   # Supabase Auth context provider
├── lib/
│   ├── config.ts                     # Environment variable loader & validator
│   ├── secure-store.ts               # Resilient SecureStore / AsyncStorage adapter
│   └── supabase.ts                   # Supabase client with token extraction helpers
├── services/                         # Centralized backend API client
│   ├── api.ts                        # Fetch wrapper with Bearer token injection
│   ├── datasets.ts                   # Datasets CRUD & multipart file uploads
│   ├── analysis.ts                   # Analysis trigger, polling & AI insights
│   ├── transformations.ts            # Transformation preview, apply & rollback
│   ├── chat.ts                       # Conversations & streaming parser
│   └── settings.ts                   # Profile, notifications & key management
├── types/                            # Strict TypeScript definitions
├── tests/
│   └── mobile-unit.test.js           # 11 unit & architecture validation tests
├── app.json                          # Expo project configuration
├── package.json                      # Dependencies & NPM scripts
└── tsconfig.json                     # Strict TypeScript configuration
```

---

## 7. Troubleshooting Common Issues

### "Network request failed" or API calls hang
- **Cause**: The Android device cannot reach `localhost:3000`.
- **Solution**: Replace `localhost` with your computer's LAN IP address (e.g., `http://192.168.1.15:3000`) in `mobile/.env`, or run `adb reverse tcp:3000 tcp:3000`. Ensure your computer firewall allows incoming connections on port 3000.

### Expo Go displays "Project is incompatible with this version of Expo Go"
- **Cause**: Expo Go app version does not match Expo SDK 54.
- **Solution**: Update Expo Go from Google Play Store, or reinstall the corresponding SDK version with `npx expo install --fix`.

### DocumentPicker does not show CSV files
- **Cause**: Android MIME type filtering can vary across file managers.
- **Solution**: The app uses `['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', '*/*']` to ensure compatibility across all Android file pickers.

---

## 8. Development Build vs. Expo Go

The entire mobile application is 100% functional inside **Expo Go** using Expo SDK standard modules:
- File selection: `expo-document-picker`
- File export & sharing: `expo-file-system` and `expo-sharing`
- Token storage: `expo-secure-store`
- Icons: `@expo/vector-icons`

### When is a Development Build or Standalone APK required?
- **Appium Automated E2E Testing**: Appium requires a standalone `.apk` signed with test credentials (Expo Go cannot be easily automated in cloud device farms due to dynamic Metro bundle loading).
- **Custom Native Background Tasks**: If continuous background synchronization or push notification native handlers are added later.

---

## 9. Future Standalone Android Build (EAS Build / Appium APK)

To build a standalone debug APK suitable for physical installation or **Appium E2E testing**:

1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   ```
2. Log in to your Expo account:
   ```bash
   eas login
   ```
3. Configure EAS Build:
   ```bash
   eas build:configure
   ```
4. Build a debug APK for Android testing:
   ```bash
   eas build --platform android --profile preview --local
   # Or via cloud builders:
   eas build --platform android --profile preview
   ```
5. The output `.apk` file can be directly installed via `adb install <file>.apk` and targeted by Appium automation drivers.
