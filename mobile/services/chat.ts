import { supabase } from '../lib/supabase'
import { Config } from '../lib/config'
import { getAccessToken } from '../lib/supabase'
import type { ChatConversation, ChatMessage } from '../types/chat'

export async function fetchConversations(
  datasetId?: string
): Promise<{ conversations: ChatConversation[]; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { conversations: [], error: 'Unauthorized' }
    }

    let query = supabase
      .from('chat_conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (datasetId) {
      query = query.eq('dataset_id', datasetId)
    }

    const { data, error } = await query

    if (error) {
      return { conversations: [], error: error.message }
    }
    return { conversations: (data as ChatConversation[]) || [] }
  } catch (err: unknown) {
    return { conversations: [], error: err instanceof Error ? err.message : 'Failed to fetch conversations' }
  }
}

export async function fetchMessages(
  conversationId: string
): Promise<{ messages: ChatMessage[]; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { messages: [], error: 'Unauthorized' }
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (error) {
      return { messages: [], error: error.message }
    }
    return { messages: (data as ChatMessage[]) || [] }
  } catch (err: unknown) {
    return { messages: [], error: err instanceof Error ? err.message : 'Failed to fetch messages' }
  }
}

export async function createConversation(
  title: string,
  datasetId?: string
): Promise<{ conversation: ChatConversation | null; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { conversation: null, error: 'Unauthorized' }

    const { data, error } = await supabase
      .from('chat_conversations')
      .insert({
        user_id: user.id,
        dataset_id: datasetId || null,
        title,
      })
      .select()
      .single()

    if (error) return { conversation: null, error: error.message }
    return { conversation: data as ChatConversation }
  } catch (err: unknown) {
    return { conversation: null, error: err instanceof Error ? err.message : 'Failed to create conversation' }
  }
}

/**
 * Sends messages to server-side AI chat endpoint with Bearer authentication.
 * Parses the AI data-stream format (0:"chunk\n") and accumulates the complete assistant response.
 */
export async function sendChatMessage(params: {
  messages: { role: 'user' | 'assistant'; content: string }[]
  datasetId?: string
  conversationId?: string
  onChunk?: (accumulatedText: string) => void
}): Promise<{ text: string; conversationId?: string; error?: string }> {
  const token = await getAccessToken()
  const url = `${Config.apiUrl}/api/chat`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token || ''}`,
      },
      body: JSON.stringify({
        messages: params.messages,
        datasetId: params.datasetId,
        conversationId: params.conversationId,
      }),
    })

    const headerConvId = res.headers.get('X-Conversation-Id') || params.conversationId

    if (!res.ok) {
      const errJson = await res.json().catch(() => null)
      const errorMsg =
        errJson?.error ||
        (res.status === 429
          ? 'AI Rate limit or quota exceeded (429). Please try again shortly.'
          : res.status === 503
          ? 'AI Provider not configured on server. Please add your Gemini key in Settings > AI Keys.'
          : `Chat request failed with status ${res.status}`)
      return { text: '', error: errorMsg }
    }

    const rawStreamText = await res.text()

    // Parse AI SDK stream protocol (chunks formatted as `0:"text\n"`)
    let accumulated = ''
    const regex = /0:"((?:[^"\\]|\\.)*)"/g
    let match

    while ((match = regex.exec(rawStreamText)) !== null) {
      try {
        const decoded = JSON.parse(`"${match[1]}"`)
        accumulated += decoded
        params.onChunk?.(accumulated)
      } catch {
        accumulated += match[1]
        params.onChunk?.(accumulated)
      }
    }

    // If stream parser didn't match 0:"..." chunks (e.g. standard text/plain response)
    if (!accumulated && rawStreamText) {
      accumulated = rawStreamText
    }

    return {
      text: accumulated.trim(),
      conversationId: headerConvId,
    }
  } catch (err: unknown) {
    return {
      text: '',
      error: err instanceof Error ? err.message : 'Failed to communicate with AI chat service',
    }
  }
}
