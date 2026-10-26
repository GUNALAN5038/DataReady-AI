import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => null)
    const { newPassword, confirmPassword } = body || {}

    if (!newPassword || !confirmPassword) {
      return NextResponse.json({ error: 'Please provide both password fields.' }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 })
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 })
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'Password updated successfully.' })
  } catch (err: unknown) {
    console.error('Password update error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update password.' },
      { status: 500 }
    )
  }
}
