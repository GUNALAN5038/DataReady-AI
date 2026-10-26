import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { encryptCredential, maskApiKey } from '@/lib/crypto'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: keys, error } = await supabase
      .from('api_provider_keys')
      .select('id, provider, key_preview, is_active, created_at, last_used_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ keys: keys || [] })
  } catch (err: unknown) {
    console.error('Fetch API keys error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to retrieve API keys.' },
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
    const { provider = 'gemini', apiKey } = body || {}

    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 8) {
      return NextResponse.json(
        { error: 'Please enter a valid API key (at least 8 characters).' },
        { status: 400 }
      )
    }

    const trimmedKey = apiKey.trim()
    const encryptedKey = encryptCredential(trimmedKey)
    const keyPreview = maskApiKey(trimmedKey)

    // Remove or deactivate previous keys for this provider for this user
    await supabase
      .from('api_provider_keys')
      .delete()
      .eq('user_id', user.id)
      .eq('provider', provider)

    // Insert new encrypted key
    const { data: inserted, error: insertError } = await supabase
      .from('api_provider_keys')
      .insert({
        user_id: user.id,
        provider,
        encrypted_key: encryptedKey,
        key_preview: keyPreview,
        is_active: true
      })
      .select('id, provider, key_preview, is_active, created_at')
      .single()

    if (insertError || !inserted) {
      throw insertError || new Error('Failed to save API key.')
    }

    return NextResponse.json({
      success: true,
      key: inserted
    })
  } catch (err: unknown) {
    console.error('Save API key error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save API key.' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider') || 'gemini'

    const { error } = await supabase
      .from('api_provider_keys')
      .delete()
      .eq('user_id', user.id)
      .eq('provider', provider)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('Delete API key error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to remove API key.' },
      { status: 500 }
    )
  }
}
