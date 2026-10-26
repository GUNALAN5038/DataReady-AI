import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: profile?.full_name || user.user_metadata?.full_name || '',
        created_at: user.created_at
      }
    })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load profile.' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => null)
    const { fullName } = body || {}

    if (typeof fullName !== 'string' || !fullName.trim()) {
      return NextResponse.json({ error: 'Full name cannot be empty.' }, { status: 400 })
    }

    const trimmedName = fullName.trim()

    // 1. Update profiles table
    await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: trimmedName,
        updated_at: new Date().toISOString()
      })

    // 2. Update user metadata in auth
    await supabase.auth.updateUser({
      data: { full_name: trimmedName }
    })

    return NextResponse.json({
      success: true,
      full_name: trimmedName
    })
  } catch (err: unknown) {
    console.error('Update profile error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update profile.' },
      { status: 500 }
    )
  }
}
