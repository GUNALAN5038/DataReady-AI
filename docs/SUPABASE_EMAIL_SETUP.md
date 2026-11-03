# Supabase Email & OTP Configuration Readiness Guide

> [!IMPORTANT]
> **Manual Hosted Dashboard Access Required**
> Settings described in this document reside in your Supabase project dashboard (`https://supabase.com/dashboard/project/<your-project-id>`). Hosted Supabase settings cannot be modified programmatically via client code or repository commits. Follow the step-by-step instructions below.

---

## 1. Why `{{ .Token }}` is Required for 6-Digit OTP Verification

By default, Supabase email templates use `{{ .ConfirmationURL }}` or `{{ .RedirectTo }}`, which generate clickable confirmation links. 

DataReady AI implements an in-app **6-digit verification code (OTP)** experience:
- When a user signs up, Supabase sends an email containing a 6-digit one-time passcode.
- The user inputs the code directly into DataReady AI's OTP verification card (`verifyOtp` API with `type: 'signup'`).
- Upon verification, the session cookie is immediately established and the user is redirected to `/dashboard`.
- If your Supabase email template still uses `{{ .ConfirmationURL }}` instead of `{{ .Token }}`, the user will receive a link instead of a 6-digit numeric code, preventing them from completing in-app OTP entry.

---

## 2. Supabase Dashboard Navigation

1. Open your browser and navigate to the [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your DataReady AI project.
3. In the left-hand sidebar, navigate to:
   **Authentication** &rarr; **Email Templates**.

---

## 3. Template 1: Confirm Signup (Email Verification OTP)

In **Authentication** &rarr; **Email Templates**, select **Confirm signup**.

### Email Subject
```text
Your DataReady AI Verification Code: {{ .Token }}
```

### HTML Body
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Confirm Your DataReady AI Account</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 36px 32px; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05); }
    .header { text-align: center; margin-bottom: 24px; }
    .logo { font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }
    .logo-accent { color: #4f46e5; }
    .otp-box { background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin: 28px 0; }
    .otp-code { font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #4f46e5; font-family: monospace; }
    .info { font-size: 14px; line-height: 1.6; color: #475569; }
    .footer { font-size: 12px; color: #94a3b8; text-align: center; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo">DataReady <span class="logo-accent">AI</span></div>
      <p style="font-size: 13px; color: #64748b; margin-top: 4px;">Automated Tabular Data Quality & ML Readiness Platform</p>
    </div>
    
    <p class="info">Hello,</p>
    <p class="info">Thank you for registering with DataReady AI. Use the verification code below to verify your email address and activate your account:</p>
    
    <div class="otp-box">
      <div class="otp-code">{{ .Token }}</div>
    </div>
    
    <p class="info" style="font-size: 13px; color: #64748b;">
      This verification code expires in 1 hour. If you did not create a DataReady AI account, you can safely disregard this email.
    </p>
    
    <div class="footer">
      &copy; DataReady AI. All rights reserved.
    </div>
  </div>
</body>
</html>
```

---

## 4. Template 2: Reset Password (Recovery OTP)

In **Authentication** &rarr; **Email Templates**, select **Reset password**.

> [!WARNING]
> **Root Cause of "Page Cannot Be Reached"**:
> The default Supabase template includes `<a href="{{ .ConfirmationURL }}">Reset password</a>`. When clicked, Supabase redirects to its configured `Site URL`. If `Site URL` in Supabase is unconfigured, pointing to a different port, or not whitelisted in redirect URLs, the browser will fail to reach the target page.
>
> In DataReady AI, password recovery is designed around an in-app **6-digit recovery code (OTP)**. Replace the entire default template with the code below to remove the misleading button and display `{{ .Token }}` instead.

### Email Subject
```text
Reset your DataReady AI password
```

### HTML Body (Recommended: 6-Digit In-App Recovery OTP)
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset your DataReady AI password</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 36px 32px; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05); }
    .header { text-align: center; margin-bottom: 24px; }
    .logo { font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }
    .logo-accent { color: #4f46e5; }
    .otp-box { background: #fef2f2; border: 2px dashed #fca5a5; border-radius: 12px; padding: 20px; text-align: center; margin: 28px 0; }
    .otp-code { font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #dc2626; font-family: monospace; }
    .info { font-size: 14px; line-height: 1.6; color: #475569; }
    .footer { font-size: 12px; color: #94a3b8; text-align: center; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo">DataReady <span class="logo-accent">AI</span></div>
      <p style="font-size: 13px; color: #64748b; margin-top: 4px;">Security & Password Recovery</p>
    </div>
    
    <p class="info">Hello,</p>
    <p class="info">We received a request to reset the password for your DataReady AI account. Enter the 6-digit recovery code below on the password reset screen:</p>
    
    <div class="otp-box">
      <div class="otp-code">{{ .Token }}</div>
    </div>
    
    <p class="info" style="font-size: 13px; color: #64748b;">
      For your security, this code expires in 1 hour. Enter this code directly into DataReady AI to set your new password. If you did not request a password reset, you can safely ignore this email — your account remains secure.
    </p>
    
    <div class="footer">
      &copy; DataReady AI. All rights reserved.
    </div>
  </div>
</body>
</html>
```

### Optional Hybrid Template (Displays 6-Digit Code AND Clickable Fallback Button)
If your team wants to support both the in-app OTP and a direct clickable button:
```html
<p>Your 6-digit recovery code is:</p>
<div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; font-family: monospace; color: #dc2626; text-align: center; margin: 16px 0; background: #fef2f2; padding: 16px; border-radius: 8px;">
  {{ .Token }}
</div>
<p style="text-align: center; margin: 20px 0;">
  <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: #4f46e5; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
    Direct Password Reset Link &rarr;
  </a>
</p>
```
*(Ensure `Site URL` is configured in Step 5 before using the clickable button).*


---

## 5. URL Configuration (Redirects & Origins)

To ensure secure redirects and prevent open-redirect vulnerabilities:

1. In the Supabase Dashboard, navigate to:
   **Authentication** &rarr; **URL Configuration**.
2. **Site URL**:
   - For local development: `http://localhost:3000`
   - For production deployment: `https://your-production-domain.com`
3. **Redirect URLs**:
   Add the following patterns:
   - `http://localhost:3000/**`
   - `http://localhost:3000/auth/callback`
   - `https://your-production-domain.com/**`
   - `https://your-production-domain.com/auth/callback`
4. Click **Save Changes**.

---

## 6. Email Rate Limits & Supabase Built-in SMTP

Supabase provides a shared built-in email service with strict default rate limits (e.g. 3–4 emails per hour).
- In development, if you trigger multiple signups or resends quickly, you may receive a rate-limit error: `"over_email_send_rate_limit"`.
- For production, configure custom SMTP in:
  **Authentication** &rarr; **SMTP Settings** (using Resend SMTP credentials or AWS SES/SendGrid).
