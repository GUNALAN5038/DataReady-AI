'use client'

import { useChat } from 'ai/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, Bot, User, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useEffect, useRef } from 'react'

export function DatasetChat({ datasetId }: { datasetId?: string }) {
  const { messages, input, handleInputChange, handleSubmit, error, isLoading } = useChat({
    api: '/api/chat',
    body: { datasetId }
  })
  
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  return (
    <Card className="flex flex-col h-[600px] max-h-[70vh] overflow-hidden border border-border/80 rounded-2xl bg-card/70 backdrop-blur-xs shadow-sm">
      <CardHeader className="border-b border-border/60 bg-muted/30 py-3 px-5 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            AI Dataset Assistant
          </CardTitle>
        </div>
        <span className="text-[11px] font-medium text-muted-foreground px-2 py-0.5 rounded-md bg-muted/60">
          Interactive Analysis
        </span>
      </CardHeader>
      
      <ScrollArea className="flex-1 p-5" ref={scrollRef}>
        {error && (
          <Alert variant="destructive" className="mb-4 rounded-xl border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40">
            <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            <AlertDescription className="text-xs text-rose-700 dark:text-rose-300">
              {error.message.includes('AI provider not configured') 
                ? 'AI provider not configured. Please add an API key in Settings.' 
                : 'An error occurred while communicating with the AI. Please try again.'}
            </AlertDescription>
          </Alert>
        )}

        {messages.length === 0 && !error && (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4 py-12 px-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-blue-600/10 via-indigo-600/10 to-violet-600/10 border border-indigo-200/50 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
              <Bot className="h-7 w-7" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-foreground">How can I help you analyze this dataset?</p>
              <p className="text-xs text-muted-foreground max-w-sm">Ask about data distributions, anomalies, missing fields, or ML modeling recommendations.</p>
            </div>
            <div className="flex gap-2 flex-wrap justify-center mt-3 max-w-md">
              <Button
                variant="outline"
                size="sm"
                className="text-xs rounded-full border-border/80 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-colors"
                onClick={() => handleInputChange({ target: { value: 'How many rows and columns are in this dataset?' } } as unknown as React.ChangeEvent<HTMLInputElement>)}
              >
                📊 Dataset dimensions?
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs rounded-full border-border/80 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-colors"
                onClick={() => handleInputChange({ target: { value: 'Are there missing values or outliers in any column?' } } as unknown as React.ChangeEvent<HTMLInputElement>)}
              >
                🔍 Missing values & outliers?
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs rounded-full border-border/80 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-colors"
                onClick={() => handleInputChange({ target: { value: 'Summarize key insights and ML readiness recommendations.' } } as unknown as React.ChangeEvent<HTMLInputElement>)}
              >
                💡 Summarize insights
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
            placeholder="Ask a question about this dataset..."
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
  )
}
