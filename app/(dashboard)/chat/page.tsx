'use client'

import { useChat } from 'ai/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Send, 
  Bot, 
  User, 
  AlertCircle, 
  Plus, 
  Trash2, 
  MessageSquare, 
  Clock, 
  PanelLeftClose, 
  PanelLeftOpen, 
  Loader2, 
  Sparkles,
  ExternalLink
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useEffect, useRef, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface ConversationItem {
  id: string
  title: string
  dataset_id: string | null
  created_at: string
  updated_at: string
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return 'Recent'
  }
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [isLoadingConversations, setIsLoadingConversations] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null)
  const [conversationsError, setConversationsError] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const fetchConversations = useCallback(async () => {
    try {
      setConversationsError(null)
      const res = await fetch('/api/chat/conversations')
      if (!res.ok) {
        throw new Error('Failed to load conversations')
      }
      const data = await res.json()
      setConversations(data.conversations || [])
    } catch (err: unknown) {
      console.error('Failed to load conversations:', err)
      setConversationsError(err instanceof Error ? err.message : 'Error loading conversations')
    } finally {
      setIsLoadingConversations(false)
    }
  }, [])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  const {
    messages,
    setMessages,
    input,
    handleInputChange,
    handleSubmit,
    error,
    isLoading,
  } = useChat({
    api: '/api/chat',
    body: {
      conversationId: activeConversationId,
    },
    onResponse: (response) => {
      const convId = response.headers.get('X-Conversation-Id')
      if (convId && convId !== activeConversationId) {
        setActiveConversationId(convId)
        fetchConversations()
      }
    },
    onFinish: () => {
      fetchConversations()
    },
  })

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleNewChat = () => {
    setActiveConversationId(null)
    setMessages([])
    setIsMobileOpen(false)
  }

  const handleSelectConversation = async (convId: string) => {
    if (convId === activeConversationId || isLoadingMessages) return
    setIsLoadingMessages(true)
    setActiveConversationId(convId)
    setIsMobileOpen(false)

    try {
      const res = await fetch(`/api/chat/conversations/${convId}`)
      if (res.ok) {
        const data = await res.json()
        const loadedMessages = (data.messages || []).map((m: { id: string; role: string; content: string }) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }))
        setMessages(loadedMessages)
      } else {
        console.error('Failed to fetch conversation messages.')
      }
    } catch (err) {
      console.error('Error fetching conversation messages:', err)
    } finally {
      setIsLoadingMessages(false)
    }
  }

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this conversation? This will permanently remove all associated messages.')) {
      return
    }

    setIsDeletingId(convId)
    try {
      const res = await fetch(`/api/chat/conversations/${convId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== convId))
        if (activeConversationId === convId) {
          handleNewChat()
        }
      } else {
        alert('Failed to delete conversation. Please try again.')
      }
    } catch (err) {
      console.error('Error deleting conversation:', err)
      alert('Network error while deleting conversation.')
    } finally {
      setIsDeletingId(null)
    }
  }

  const activeConversation = conversations.find((c) => c.id === activeConversationId)

  // Conversation sidebar content
  const sidebarContent = (
    <div className="flex flex-col h-full bg-card/60 backdrop-blur-xs">
      {/* Sidebar Header */}
      <div className="p-3 border-b border-border/70 flex items-center justify-between gap-2">
        <Button
          onClick={handleNewChat}
          size="sm"
          className="flex-1 h-9 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-medium text-xs shadow-xs shadow-indigo-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>New Chat</span>
        </Button>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoadingConversations ? (
          <div className="p-4 space-y-2.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-muted/60 animate-pulse" />
            ))}
          </div>
        ) : conversationsError ? (
          <div className="p-4 text-center space-y-2">
            <p className="text-xs text-rose-500 font-medium">{conversationsError}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchConversations}
              className="text-xs h-7 rounded-lg"
            >
              Retry
            </Button>
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground space-y-2">
            <div className="h-10 w-10 mx-auto rounded-xl bg-muted/80 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-muted-foreground/60" />
            </div>
            <p className="text-xs font-semibold text-foreground">No Chat History</p>
            <p className="text-[11px] text-muted-foreground leading-normal">
              Ask your first question to start a persistent conversation.
            </p>
          </div>
        ) : (
          conversations.map((conv) => {
            const isActive = conv.id === activeConversationId
            const isDeleting = isDeletingId === conv.id

            return (
              <div
                key={conv.id}
                onClick={() => handleSelectConversation(conv.id)}
                className={cn(
                  "group relative flex items-center justify-between rounded-xl px-3 py-2.5 text-xs transition-all duration-150 cursor-pointer border",
                  isActive
                    ? "bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-violet-500/5 text-foreground border-indigo-500/30 font-medium shadow-2xs"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground border-transparent"
                )}
              >
                <div className="flex items-start gap-2.5 min-w-0 pr-1">
                  <MessageSquare className={cn(
                    "h-3.5 w-3.5 mt-0.5 flex-shrink-0 transition-colors",
                    isActive ? "text-indigo-600 dark:text-indigo-400" : "text-muted-foreground/60 group-hover:text-foreground"
                  )} />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground text-xs leading-snug">
                      {conv.title || 'Untitled Session'}
                    </p>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {formatRelativeTime(conv.updated_at || conv.created_at)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => handleDeleteConversation(conv.id, e)}
                  disabled={isDeleting}
                  className="opacity-0 group-hover:opacity-100 hover:text-rose-600 text-muted-foreground p-1 rounded-md transition-opacity duration-150 flex-shrink-0"
                  title="Delete conversation"
                  aria-label="Delete conversation"
                >
                  {isDeleting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-500" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            )
          })
        )}
      </div>

      <div className="p-2.5 border-t border-border/70 text-[11px] text-muted-foreground text-center">
        <span>Persistent &amp; RLS Protected</span>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)] max-w-7xl mx-auto space-y-3">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-xs shadow-indigo-500/20">
              <Bot className="h-5 w-5" />
            </div>
            AI Data Assistant
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Get expert guidance on dataset quality, ML Readiness metrics, and data preparation workflows.
          </p>
        </div>

        {/* Mobile History Drawer Toggle */}
        <div className="flex items-center gap-2 md:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="text-xs rounded-xl flex items-center gap-1.5 border-border/80"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>History</span>
          </Button>
          <Button
            onClick={handleNewChat}
            size="sm"
            className="text-xs rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            New
          </Button>
        </div>
      </div>

      {/* Main Container: Split History Sidebar + Chat */}
      <div className="flex-1 flex gap-3 overflow-hidden">
        {/* Desktop History Sidebar */}
        <div className={cn(
          "hidden md:flex flex-col border border-border/80 rounded-2xl overflow-hidden transition-all duration-200",
          isSidebarOpen ? "w-72 lg:w-80" : "w-0 border-none hidden"
        )}>
          {sidebarContent}
        </div>

        {/* Mobile History Backdrop Overlay */}
        {isMobileOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs md:hidden"
            onClick={() => setIsMobileOpen(false)}
          >
            <div
              className="absolute left-0 top-0 bottom-0 w-4/5 max-w-xs bg-background shadow-2xl border-r border-border"
              onClick={(e) => e.stopPropagation()}
            >
              {sidebarContent}
            </div>
          </div>
        )}

        {/* Active Chat Card */}
        <Card className="flex-1 flex flex-col overflow-hidden rounded-2xl border-border/80 bg-card/70 backdrop-blur-xs shadow-xs">
          {/* Chat Header */}
          <CardHeader className="border-b border-border/60 bg-muted/30 py-3 px-4 sm:px-5 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="hidden md:flex h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                title={isSidebarOpen ? "Collapse conversation history" : "Expand conversation history"}
              >
                {isSidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
              </Button>
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
              <div className="min-w-0">
                <CardTitle className="text-sm font-semibold text-foreground truncate max-w-xs sm:max-w-md">
                  {activeConversation ? activeConversation.title : 'New Interactive Session'}
                </CardTitle>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[11px] font-medium text-muted-foreground px-2 py-0.5 rounded-md bg-muted/60 hidden sm:inline-block">
                Google Gemini
              </span>
              {activeConversation && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNewChat}
                  className="h-7 text-xs rounded-lg hidden sm:flex items-center gap-1 border-border/80"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Chat
                </Button>
              )}
            </div>
          </CardHeader>
          
          {/* Messages Scroll Area */}
          <ScrollArea className="flex-1 p-4 sm:p-5" ref={scrollRef}>
            {error && (
              <Alert variant="destructive" className="mb-4 rounded-xl border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40">
                <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                <AlertDescription className="text-xs text-rose-700 dark:text-rose-300">
                  {error.message === 'AI provider not configured. Please add an API key in Settings.' ? (
                    <span>
                      AI provider not configured. Please{' '}
                      <Link href="/settings?tab=keys" className="font-semibold underline inline-flex items-center gap-0.5">
                        add your Google Gemini API key in Settings <ExternalLink className="h-3 w-3" />
                      </Link>
                    </span>
                  ) : (
                    'An error occurred while communicating with the AI. Please verify your credentials and try again.'
                  )}
                </AlertDescription>
              </Alert>
            )}

            {isLoadingMessages ? (
              <div className="h-full flex flex-col items-center justify-center py-20 space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                <p className="text-xs text-muted-foreground">Loading conversation messages...</p>
              </div>
            ) : messages.length === 0 && !error ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4 py-12 px-4">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-blue-600/10 via-indigo-600/10 to-violet-600/10 border border-indigo-200/50 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
                  <Bot className="h-8 w-8" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-base font-semibold text-foreground">How can I assist your data workflow today?</p>
                  <p className="text-xs text-muted-foreground max-w-md">
                    Ask about data quality issues, understand statistical distributions, or learn how to prepare datasets for Machine Learning models.
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap justify-center mt-3 max-w-lg">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs rounded-full border-border/80 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-colors"
                    onClick={() => handleInputChange({ target: { value: 'How do I handle missing values in a machine learning dataset?' } } as unknown as React.ChangeEvent<HTMLInputElement>)}
                  >
                    💡 Handling missing values
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs rounded-full border-border/80 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-colors"
                    onClick={() => handleInputChange({ target: { value: 'Write Python code to drop outliers using the standard IQR method.' } } as unknown as React.ChangeEvent<HTMLInputElement>)}
                  >
                    🐍 Python IQR outliers code
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs rounded-full border-border/80 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-colors"
                    onClick={() => handleInputChange({ target: { value: 'Explain the 5 core components of the ML Readiness Score formula.' } } as unknown as React.ChangeEvent<HTMLInputElement>)}
                  >
                    📊 Explain ML Readiness formula
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs rounded-full border-border/80 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-colors"
                    onClick={() => handleInputChange({ target: { value: 'What dataset formats and upload limits are supported by DataReady AI?' } } as unknown as React.ChangeEvent<HTMLInputElement>)}
                  >
                    📁 Upload formats & limits
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pb-4">
                {messages.map((m: { id: string; role: string; content: string }) => (
                  <div key={m.id} className={`flex gap-3 items-start ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {m.role === 'assistant' && (
                      <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white flex-shrink-0 shadow-xs shadow-indigo-500/20 mt-0.5">
                        <Bot className="h-4 w-4" />
                      </div>
                    )}
                    <div className={`rounded-2xl px-4 py-3 max-w-[85%] text-sm leading-relaxed ${
                      m.role === 'user' 
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs shadow-indigo-500/15 rounded-br-xs' 
                        : 'bg-card border border-border/80 text-foreground shadow-xs rounded-bl-xs'
                    }`}>
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    </div>
                    {m.role === 'user' && (
                      <div className="h-8 w-8 rounded-xl bg-muted/80 border border-border/80 flex items-center justify-center text-muted-foreground flex-shrink-0 mt-0.5">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                  <div className="flex gap-3 justify-start items-center">
                    <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white flex-shrink-0 shadow-xs shadow-indigo-500/20">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="rounded-2xl px-4 py-3 bg-card border border-border/80 rounded-bl-xs shadow-xs flex items-center">
                      <div className="flex space-x-1.5 items-center">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.15s]"></div>
                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.3s]"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Prompt Input Form */}
          <CardContent className="p-3 border-t border-border/60 bg-muted/20">
            <form onSubmit={handleSubmit} className="flex gap-2 items-center">
              <Input
                value={input}
                onChange={handleInputChange}
                placeholder="Ask about dataset quality, ML Readiness, or transformations..."
                className="flex-1 h-10 rounded-xl bg-background border-border/80 text-sm focus-visible:ring-indigo-500/30"
                disabled={isLoading}
              />
              <Button
                type="submit"
                size="icon"
                className="h-10 w-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs shadow-indigo-500/20 flex-shrink-0 cursor-pointer"
                disabled={isLoading || !input.trim()}
              >
                <Send className="h-4 w-4" />
                <span className="sr-only">Send</span>
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
