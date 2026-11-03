import { createClient } from '../supabase/server'

export interface MinimalSupabaseClient {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col1: string, val1: string) => {
        eq: (col2: string, val2: string) => {
          limit: (lim: number) => {
            maybeSingle: () => Promise<{ data: { id: string } | null; error?: unknown }>
          }
        }
      }
    }
    insert: (record: Record<string, unknown>) => Promise<{ data?: unknown; error?: unknown }>
  }
}

export interface WelcomeEmailParams {
  to: string
  fullName: string
  userId: string
  supabaseClient?: MinimalSupabaseClient
}

export interface WelcomeEmailResult {
  success: boolean
  skipped?: boolean
  unconfigured?: boolean
  emailId?: string
  error?: string
}

/**
 * Builds the responsive HTML body for the DataReady AI congratulations email.
 */
export function buildWelcomeEmailHtml(fullName: string, dashboardUrl: string, supportEmail: string): string {
  const greetingName = fullName ? fullName.trim() : 'there'
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Congratulations! Welcome to DataReady AI</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #1e293b;
      background-color: #f8fafc;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 32px auto;
      background: #ffffff;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
    }
    .header {
      background: linear-gradient(135deg, #2563eb, #4f46e5, #7c3aed);
      padding: 36px 32px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0 0 8px 0;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 0;
      font-size: 14px;
      opacity: 0.9;
    }
    .content {
      padding: 36px 32px;
    }
    .greeting {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 16px;
      color: #0f172a;
    }
    .feature-card {
      background: #f1f5f9;
      border-radius: 12px;
      padding: 16px 20px;
      margin: 12px 0;
      border-left: 4px solid #4f46e5;
    }
    .feature-card h3 {
      margin: 0 0 4px 0;
      font-size: 15px;
      font-weight: 700;
      color: #1e293b;
    }
    .feature-card p {
      margin: 0;
      font-size: 13px;
      color: #64748b;
    }
    .btn-container {
      text-align: center;
      margin: 32px 0 24px 0;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #2563eb, #4f46e5);
      color: #ffffff !important;
      padding: 14px 32px;
      border-radius: 10px;
      text-decoration: none;
      font-weight: 700;
      font-size: 15px;
      box-shadow: 0 4px 10px rgba(79, 70, 229, 0.3);
    }
    .footer {
      background: #f8fafc;
      padding: 24px 32px;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>DataReady AI</h1>
      <p>Automated Tabular Data Quality & ML Readiness Platform</p>
    </div>
    <div class="content">
      <div class="greeting">Congratulations, ${greetingName}!</div>
      <p>Your email has been successfully verified, and your account is ready. Welcome to <strong>DataReady AI</strong> — your platform for preparing and auditing datasets for machine learning.</p>
      
      <p>Here is what you can do right now:</p>
      
      <div class="feature-card">
        <h3>1. Instant Data Quality Inspection</h3>
        <p>Upload CSV, XLSX, or JSON datasets to detect missing values, duplicates, outliers, and type anomalies.</p>
      </div>

      <div class="feature-card">
        <h3>2. ML Readiness Scoring (0–100)</h3>
        <p>Get a comprehensive evaluation of your dataset's feature quality, validity, and machine learning readiness.</p>
      </div>

      <div class="feature-card">
        <h3>3. Non-Destructive Transformations</h3>
        <p>Clean missing rows, impute values, winsorize outliers, and track immutable dataset versions with full rollback capability.</p>
      </div>

      <div class="feature-card">
        <h3>4. Gemini-Powered Dataset Insights</h3>
        <p>Receive actionable recommendations and domain-specific dataset insights powered by Google Gemini.</p>
      </div>

      <div class="btn-container">
        <a href="${dashboardUrl}" class="btn" target="_blank">Access Your Dashboard</a>
      </div>

      <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
        If the button above does not work, copy and paste this link into your browser:<br>
        <a href="${dashboardUrl}" style="color: #4f46e5;">${dashboardUrl}</a>
      </p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} DataReady AI. All rights reserved.</p>
      <p>Need assistance? Contact our team at <a href="mailto:${supportEmail}" style="color: #64748b;">${supportEmail}</a>.</p>
    </div>
  </div>
</body>
</html>`
}

/**
 * Builds the plain text version of the welcome email.
 */
export function buildWelcomeEmailText(fullName: string, dashboardUrl: string, supportEmail: string): string {
  const greetingName = fullName ? fullName.trim() : 'there'
  
  return `Congratulations, ${greetingName}!

Your email has been successfully verified, and your account is now fully active. Welcome to DataReady AI!

DataReady AI helps you inspect, clean, and optimize your tabular data for machine learning:
1. Instant Data Quality Inspection — detect missing values, duplicates, and outliers.
2. ML Readiness Scoring (0-100) — evaluate completeness, uniqueness, and feature quality.
3. Non-Destructive Transformations — impute, winsorize, and clean with version history.
4. Gemini AI Insights — actionable recommendations powered by Google Gemini.

Access your dashboard here:
${dashboardUrl}

Need assistance? Contact our team at ${supportEmail}.

© ${new Date().getFullYear()} DataReady AI. All rights reserved.
`
}

/**
 * Sends a welcome email idempotently.
 * Checks security_events table to ensure a welcome email is never sent more than once.
 */
export async function sendWelcomeEmail({ to, fullName, userId, supabaseClient }: WelcomeEmailParams): Promise<WelcomeEmailResult> {
  if (!to || !userId) {
    return { success: false, error: 'Missing required recipient or userId' }
  }

  const supabase = (supabaseClient || (await createClient())) as unknown as MinimalSupabaseClient

  // 1. Idempotency Check: verify if welcome_email_sent event already exists for this user
  try {
    const { data: existingEvent } = await supabase
      .from('security_events')
      .select('id')
      .eq('user_id', userId)
      .eq('event_type', 'welcome_email_sent')
      .limit(1)
      .maybeSingle()

    if (existingEvent) {
      // Already sent, skip to prevent duplicates
      return { success: true, skipped: true }
    }
  } catch (checkErr) {
    console.warn('Idempotency check warning:', checkErr)
  }

  const resendApiKey = process.env.RESEND_API_KEY

  // If Resend is not configured, report failure/unconfigured accurately and do NOT record as sent
  if (!resendApiKey || resendApiKey.trim().length === 0) {
    return {
      success: false,
      unconfigured: true,
      error: 'RESEND_API_KEY is not configured. Welcome email was not dispatched.',
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const dashboardUrl = `${appUrl}/dashboard`
  const supportEmail = process.env.SUPPORT_EMAIL || 'support@dataready.ai'
  const fromEmail = process.env.EMAIL_FROM || 'DataReady AI <welcome@dataready.ai>'

  const subject = 'Congratulations! Welcome to DataReady AI'
  const html = buildWelcomeEmailHtml(fullName, dashboardUrl, supportEmail)
  const text = buildWelcomeEmailText(fullName, dashboardUrl, supportEmail)

  let emailId: string | undefined
  let lastError: string | null = null
  const maxAttempts = 2

  // Attempt dispatch with bounded retry for transient network/rate-limit issues
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [to],
          subject,
          html,
          text,
        }),
      })

      if (response.ok) {
        const resData = (await response.json()) as { id?: string }
        emailId = resData?.id
        lastError = null
        break
      }

      const errorText = await response.text()
      lastError = `Resend API rejected request with status ${response.status}: ${errorText}`
      console.error(`Resend delivery attempt ${attempt} failed with status:`, response.status)

      // Only retry on transient 429 or 5xx server errors; do not retry 400/401/403/422 validation errors
      if ((response.status === 429 || response.status >= 500) && attempt < maxAttempts) {
        await new Promise((res) => setTimeout(res, 500))
        continue
      }
      break
    } catch (sendErr) {
      lastError = sendErr instanceof Error ? sendErr.message : 'Unknown email dispatch error'
      console.error(`Failed to dispatch welcome email via Resend on attempt ${attempt}`)
      if (attempt < maxAttempts) {
        await new Promise((res) => setTimeout(res, 500))
        continue
      }
    }
  }

  if (!emailId || lastError) {
    return {
      success: false,
      error: lastError || 'Resend email dispatch failed',
    }
  }

  // 2. Record idempotency event in security_events ONLY AFTER Resend confirms request was accepted
  try {
    await supabase.from('security_events').insert({
      user_id: userId,
      event_type: 'welcome_email_sent',
      metadata: {
        to,
        delivered_at: new Date().toISOString(),
        accepted_at: new Date().toISOString(),
        provider: 'resend',
        resend_id: emailId,
        status: 'request_accepted',
      },
    })
  } catch (recordErr) {
    console.warn('Failed to record welcome_email_sent event:', recordErr)
  }

  return {
    success: true,
    emailId,
  }
}

