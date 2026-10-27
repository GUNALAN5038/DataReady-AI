import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/chat/conversations
 * Returns all chat conversations belonging to the authenticated user.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: conversations, error } = await supabase
      .from('chat_conversations')
      .select('id, user_id, dataset_id, title, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching conversations:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ conversations: conversations || [] })
  } catch (err: unknown) {
    console.error('Conversations GET error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/chat/conversations
 * Creates a new conversation for the authenticated user.
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const title = (body.title && typeof body.title === 'string') 
      ? body.title.trim().slice(0, 100) 
      : 'New Chat'
    const datasetId = body.datasetId || null

    const { data: conversation, error } = await supabase
      .from('chat_conversations')
      .insert({
        user_id: user.id,
        dataset_id: datasetId,
        title: title || 'New Chat',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating conversation:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ conversation }, { status: 201 })
  } catch (err: unknown) {
    console.error('Conversations POST error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
