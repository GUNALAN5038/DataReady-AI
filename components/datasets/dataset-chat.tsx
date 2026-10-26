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
    <Card className="flex flex-col h-[600px] max-h-[70vh] overflow-hidden border-0 shadow-none">
      <CardHeader className="border-b bg-gray-50/50 dark:bg-zinc-900/50 py-3 hidden">
        <CardTitle className="text-lg">Chat</CardTitle>
      </CardHeader>
      
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error.message.includes('AI provider not configured') 
                ? 'AI provider not configured. Please add an API key in Settings.' 
                : 'An error occurred while communicating with the AI. Please try again.'}
            </AlertDescription>
          </Alert>
        )}

        {messages.length === 0 && !error && (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-4 pt-10">
            <Bot className="h-12 w-12 text-gray-300" />
            <p className="text-center max-w-sm">How can I help you with this dataset?</p>
            <div className="flex gap-2 flex-wrap justify-center mt-4">
              <Button variant="outline" size="sm" onClick={() => handleInputChange({ target: { value: 'How many rows are in this dataset?' } } as unknown as React.ChangeEvent<HTMLInputElement>)}>How many rows?</Button>
              <Button variant="outline" size="sm" onClick={() => handleInputChange({ target: { value: 'Are there missing values?' } } as unknown as React.ChangeEvent<HTMLInputElement>)}>Missing values?</Button>
              <Button variant="outline" size="sm" onClick={() => handleInputChange({ target: { value: 'Summarize this dataset.' } } as unknown as React.ChangeEvent<HTMLInputElement>)}>Summarize dataset</Button>
            </div>
          </div>
        )}

        <div className="space-y-4 pb-4">
          {messages.map((m: { id: string, role: string, content: string }) => (
            <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'assistant' && (
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-5 w-5 text-blue-600" />
                </div>
              )}
              <div className={`rounded-lg px-4 py-3 max-w-[80%] ${
                m.role === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-gray-200'
              }`}>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</p>
              </div>
              {m.role === 'user' && (
                <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                </div>
              )}
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex gap-3 justify-start">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Bot className="h-5 w-5 text-blue-600" />
              </div>
              <div className="rounded-lg px-4 py-3 bg-gray-100 dark:bg-zinc-800 flex items-center">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <CardContent className="p-3 border-t">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask a question about this dataset..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
