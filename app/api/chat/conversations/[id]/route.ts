import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/chat/conversations/[id]
 * Retrieves conversation details and its messages in chronological order.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient(req)
    const user = (await getAuthenticatedUser()) || (await supabase.auth.getUser()).data?.user

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify conversation ownership
    const { data: conversation, error: convError } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 })
    }

    // Fetch messages in chronological order
    const { data: messages, error: msgError } = await supabase
      .from('chat_messages')
      .select('id, conversation_id, user_id, role, content, metadata, created_at')
      .eq('conversation_id', id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (msgError) {
      console.error('Error fetching messages:', msgError)
      return NextResponse.json({ error: msgError.message }, { status: 500 })
    }

    return NextResponse.json({
      conversation,
      messages: messages || [],
    })
  } catch (err: unknown) {
    console.error('Conversation GET error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/chat/conversations/[id]
 * Safely deletes a conversation. Associated messages are deleted via CASCADE.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient(req)
    const user = (await getAuthenticatedUser()) || (await supabase.auth.getUser()).data?.user

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete conversation strictly matching id AND user_id (enforces user isolation)
    const { error } = await supabase
      .from('chat_conversations')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting conversation:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('Conversation DELETE error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
