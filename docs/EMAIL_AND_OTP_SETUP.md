# DataReady AI — External Setup Guide for Email & OTP Authentication

This beginner-friendly guide walks you through setting up Supabase Email OTP authentication and the Resend automated welcome email service.

> [!NOTE]
> Every step requiring manual action in a web dashboard is clearly marked with the **[Manual Dashboard Action]** or **[Domain Registrar Action]** badge.

---

## Quick Setup Checklist

- [ ] **Step 1:** Configure Supabase "Confirm signup" Email Template with `{{ .Token }}` **[Manual Dashboard Action]**
- [ ] **Step 2:** Configure Supabase "Reset password" Email Template with `{{ .Token }}` **[Manual Dashboard Action]**
- [ ] **Step 3:** Configure Supabase Site URL and Redirect URLs **[Manual Dashboard Action]**
- [ ] **Step 4:** Create a Resend account & generate an API key **[Manual Dashboard Action]**
- [ ] **Step 5:** Add and verify your custom sender domain in Resend **[Domain Registrar Action]**
- [ ] **Step 6:** Add environment variables to `.env.local` safely
- [ ] **Step 7:** Restart the local development server (`npm run dev`)
- [ ] **Step 8:** Test end-to-end signup, OTP verification, welcome email, login, and password recovery
- [ ] **Step 9:** Review troubleshooting tips for rate limits and delivery issues

---

## Step 1: Supabase "Confirm signup" Email Template **[Manual Dashboard Action]**

1. Log in to [Supabase](https://supabase.com/dashboard) and select your DataReady AI project.
2. In the left sidebar, click **Authentication** &rarr; **Email Templates**.
3. Under the **Email Templates** tab, click **Confirm signup**.
4. Set the **Subject** line to:
   ```text
   Your DataReady AI Verification Code: {{ .Token }}
   ```
5. Replace the template body with the following HTML to display the 6-digit verification code:
   ```html
   <h2>Welcome to DataReady AI</h2>
   <p>Thank you for signing up. Please enter the following 6-digit verification code to activate your account:</p>
   <div style="background: #f1f5f9; padding: 18px 24px; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 6px; font-family: monospace; color: #4f46e5; text-align: center; margin: 20px 0;">
     {{ .Token }}
   </div>
   <p style="color: #64748b; font-size: 13px;">This code will expire in 60 minutes. If you did not create this account, please ignore this email.</p>
   ```
6. Click **Save** at the bottom of the editor.

> [!IMPORTANT]
> Ensure you use `{{ .Token }}` instead of `{{ .ConfirmationURL }}`. DataReady AI prompts users for a 6-digit code on the website.

---

## Step 2: Supabase "Reset password" Email Template **[Manual Dashboard Action]**

1. Still in **Authentication** &rarr; **Email Templates**, click **Reset password**.
2. Set the **Subject** line to:
   ```text
   Reset your DataReady AI password
   ```
3. Replace the entire template body (removing the default "Reset password" button which causes "page cannot be reached" errors) with the following HTML:
   ```html
   <h2>Reset Your DataReady AI Password</h2>
   <p>We received a request to reset your password. Enter the 6-digit recovery code below on the password reset screen:</p>
   <div style="background: #fef2f2; padding: 18px 24px; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 6px; font-family: monospace; color: #dc2626; text-align: center; margin: 20px 0;">
     {{ .Token }}
   </div>
   <p style="color: #64748b; font-size: 13px;">This code will expire in 60 minutes. Enter it directly into DataReady AI. If you did not request a password reset, your account remains secure and you can disregard this email.</p>
   ```
4. Click **Save**.

---

## Step 3: Supabase URL Configuration **[Manual Dashboard Action]**

1. In the Supabase Dashboard, navigate to **Authentication** &rarr; **URL Configuration**.
2. Under **Site URL**:
   - For local development: `http://localhost:3000`
   - For production deployment: `https://your-production-domain.com`
3. Under **Redirect URLs**, click **Add URL** and add the following wildcard patterns:
   - `http://localhost:3000/**`
   - `http://localhost:3000/auth/callback`
   - `https://your-production-domain.com/**`
   - `https://your-production-domain.com/auth/callback`
4. Click **Save**.

---

## Step 4: Resend Account & API Key Creation **[Manual Dashboard Action]**

1. Go to [Resend.com](https://resend.com) and create an account or sign in.
2. In the Resend Dashboard sidebar, click **API Keys**.
3. Click **Create API Key**.
4. Name the key (e.g., `DataReady AI Production` or `DataReady AI Dev`).
5. Choose **Full Access** permission and click **Add**.
6. Copy the generated key immediately (starts with `re_...`). Store it safely.

---

## Step 5: Sender Domain Verification & DNS Records **[Domain Registrar Action]**

To reliably deliver welcome emails to user inboxes:

1. In the Resend Dashboard, click **Domains** &rarr; **Add Domain**.
2. Enter your domain (e.g. `yourdomain.com`).
3. Resend will provide DNS records:
   - **DKIM** (TXT record)
   - **SPF** (TXT record)
   - **MX / Return-Path** (MX record)
4. Log into your DNS provider (Cloudflare, Namecheap, GoDaddy, Route 53, etc.) and add these records.
5. In Resend, click **Verify DNS Records**. Status will change to **Verified** once DNS propagates (typically 1–15 minutes).

> [!TIP]
> **Testing Without a Verified Domain Yet?**
> Resend provides a sandbox sender: `onboarding@resend.dev`.
> Note: Emails sent from `onboarding@resend.dev` can **only** be delivered to the single email address registered with your Resend account. To deliver to other users, domain verification is required.

---

## Step 6: Safe Environment-Variable Configuration

In your project root, open your local `.env.local` file (do NOT commit this file to git). Add or update the following values:

```bash
# Resend API Key created in Step 4
RESEND_API_KEY=re_your_api_key_here

# Sender address (must match verified domain from Step 5, or onboarding@resend.dev for personal testing)
EMAIL_FROM="DataReady AI <welcome@yourdomain.com>"

# Public application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Support contact address displayed in emails
SUPPORT_EMAIL=support@yourdomain.com
```

> [!CAUTION]
> - Never commit `.env.local` to git.
> - `.env.example` has safe placeholders committed for repository documentation.
> - Never hardcode API keys or passwords in source code.

---

## Step 7: Restart the Local Development Server

Next.js only reads newly added environment variables when the development server starts up.

1. In your terminal, stop any running dev server (`Ctrl + C`).
2. Start the dev server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:3000` in your browser.

---

## Step 8: End-to-End Verification Workflow

Follow this sequence to test your complete authentication experience:

### A. Sign Up & OTP Verification
1. Navigate to `http://localhost:3000/signup`.
2. Enter your Full Name, Email, and Password (notice the real-time password strength meter).
3. Click **Create Account**.
4. The page smoothly transitions to the 6-Digit OTP verification card.
5. Check your email inbox for the verification email with your 6-digit code.
6. Enter the 6 digits (supports typing, auto-focus next, backspace, and copy-paste).
7. Upon entering the 6th digit, the code automatically validates with Supabase `type: 'signup'`.
8. DataReady AI establishes your session, records your profile, triggers the welcome email via Resend, and redirects you directly to `/dashboard`.

### B. Welcome Email Delivery
1. Check your email inbox.
2. Confirm receipt of the welcome email: **"Congratulations! Welcome to DataReady AI"**.
3. Verify that the email contains your name, links to your dashboard, and feature summaries for Data Quality Inspection, ML Readiness Scoring, Transformations, and Gemini Insights.

### C. Sign In Flow & Unverified Protection
1. Log out via the user menu in the dashboard header.
2. Go to `http://localhost:3000/login`.
3. Enter your verified email and password &rarr; you should log in immediately and arrive at `/dashboard`.
4. If an unverified user attempts to sign in, the login page displays a clear alert banner with a direct link to **Enter Verification Code**.

### D. Password Recovery & Reset Flow
1. Go to `http://localhost:3000/forgot-password`.
2. Enter your email and submit &rarr; observe the safe generic confirmation message (preventing email enumeration).
3. The page transitions to recovery code entry.
4. Check your inbox for the password recovery email with your 6-digit recovery code.
5. Enter the 6-digit recovery code &rarr; upon verification with `type: 'recovery'`, you are redirected to `/reset-password`.
6. Enter your new password & confirm it &rarr; click **Update Password**.
7. You are redirected to `/login?reset=success` with a green confirmation banner: *"Password updated successfully. Please sign in with your new password."*

---

## Step 9: Troubleshooting & FAQ

### Issue: "No email received with verification code"
- **Cause 1**: Default Supabase shared email rate limits exceeded (3–4 emails/hr). Check your terminal console or Supabase logs in **Authentication** &rarr; **Logs**.
- **Cause 2**: Email landed in Spam / Junk folder. Check your spam folder.
- **Cause 3**: Email template still contains `{{ .ConfirmationURL }}` rather than `{{ .Token }}`. Recheck Step 1.

### Issue: "Resend returns 403 Forbidden"
- **Cause**: Trying to send from an unverified domain or sending from `onboarding@resend.dev` to an email address other than your Resend account email. Verify your domain in Resend or send test emails to your registered Resend account email.

### Issue: "Too many failed verification attempts"
- **Cause**: DataReady AI includes built-in brute-force defense that locks verification after 5 incorrect OTP attempts. Click **Resend Code** or wait for the cooldown timer to request a fresh OTP.

### Issue: "Welcome email was not delivered in local development"
- **Cause**: If `RESEND_API_KEY` is not present in `.env.local`, DataReady AI logs a graceful fallback notice in the server console: `[Welcome Email] Ready for delivery ... (Provider RESEND_API_KEY not configured)`. The user signup and dashboard redirection continue without disruption.
