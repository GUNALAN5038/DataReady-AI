export interface ChatConversation {
  id: string
  user_id: string
  dataset_id?: string | null
  title: string
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  conversation_id: string
  user_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata?: Record<string, unknown> | null
  created_at: string
}
