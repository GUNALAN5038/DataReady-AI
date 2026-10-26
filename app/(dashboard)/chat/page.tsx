'use client'

import { useChat } from 'ai/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, Bot, User, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useEffect, useRef } from 'react'

export default function ChatPage() {
  const { messages, input, handleInputChange, handleSubmit, error, isLoading } = useChat({
    api: '/api/chat',
  })
  
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)] max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-xs shadow-indigo-500/20">
            <Bot className="h-5 w-5" />
          </div>
          AI Data Assistant
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Ask questions about data science, your uploaded datasets, or get code snippets to clean your data.
        </p>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden rounded-2xl border-border/80 bg-card/70 backdrop-blur-xs shadow-xs">
        <CardHeader className="border-b border-border/60 bg-muted/30 py-3 px-5 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <CardTitle className="text-sm font-semibold text-foreground">Interactive AI Session</CardTitle>
          </div>
          <span className="text-[11px] font-medium text-muted-foreground px-2 py-0.5 rounded-md bg-muted/60">
            Google Gemini Powered
          </span>
        </CardHeader>
        
        <ScrollArea className="flex-1 p-5" ref={scrollRef}>
          {error && (
            <Alert variant="destructive" className="mb-4 rounded-xl border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40">
              <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              <AlertDescription className="text-xs text-rose-700 dark:text-rose-300">
                {error.message === 'AI provider not configured. Please add an API key in Settings.' 
                  ? error.message 
                  : 'An error occurred while communicating with the AI. Please try again.'}
              </AlertDescription>
            </Alert>
          )}

          {messages.length === 0 && !error && (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4 py-16 px-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-blue-600/10 via-indigo-600/10 to-violet-600/10 border border-indigo-200/50 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
                <Bot className="h-8 w-8" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-base font-semibold text-foreground">How can I assist your data workflow today?</p>
                <p className="text-xs text-muted-foreground max-w-md">
                  Get automated recommendations, understand statistical distributions, or generate Python and SQL transformations.
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
              </div>
            </div>
          )}

          <div className="space-y-4 pb-4">
            {messages.map((m: { id: string, role: string, content: string }) => (
              <div key={m.id} className={`flex gap-3 items-start ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white flex-shrink-0 shadow-xs shadow-indigo-500/20 mt-0.5">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                <div className={`rounded-2xl px-4 py-3 max-w-[82%] text-sm leading-relaxed ${
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
        </ScrollArea>

        <CardContent className="p-3 border-t border-border/60 bg-muted/20">
          <form onSubmit={handleSubmit} className="flex gap-2 items-center">
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder="Ask a question about your data..."
              className="flex-1 h-10 rounded-xl bg-background border-border/80 text-sm focus-visible:ring-indigo-500/30"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              className="h-10 w-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs shadow-indigo-500/20 flex-shrink-0"
              disabled={isLoading || !input.trim()}
            >
              <Send className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
