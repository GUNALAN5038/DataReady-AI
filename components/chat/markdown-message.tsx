'use client'

import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import { Check, Copy, ExternalLink } from 'lucide-react'

interface MarkdownMessageProps {
  content: string
  className?: string
}

function extractText(node: React.ReactNode): string {
  if (node === null || node === undefined) return ''
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (React.isValidElement(node) && node.props && 'children' in (node.props as { children?: React.ReactNode })) {
    return extractText((node.props as { children?: React.ReactNode }).children)
  }
  return ''
}

function isSafeUrl(url: string | undefined): boolean {
  if (!url) return false
  const trimmed = url.trim().toLowerCase()
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('vbscript:') ||
    trimmed.startsWith('data:')
  ) {
    return false
  }
  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('#')
  )
}

function CodeBlock({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  const [copied, setCopied] = useState(false)
  const codeString = extractText(children)
  const match = /language-(\w+)/.exec(className || '')
  const language = match ? match[1] : 'code'

  const copyToClipboard = async () => {
    if (!codeString || typeof navigator === 'undefined') return
    try {
      await navigator.clipboard.writeText(codeString)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy code snippet to clipboard:', err)
    }
  }

  return (
    <div className="relative my-3 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 overflow-hidden shadow-xs">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-900/90 border-b border-slate-800 text-[11px] font-mono text-slate-400 select-none">
        <span className="font-medium text-slate-300">{language}</span>
        <button
          type="button"
          onClick={copyToClipboard}
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          title="Copy code to clipboard"
          aria-label="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-3.5 overflow-x-auto text-xs font-mono leading-relaxed text-slate-100">
        <pre className="m-0 font-mono">
          <code className={className}>{children}</code>
        </pre>
      </div>
    </div>
  )
}

export function MarkdownMessage({ content, className }: MarkdownMessageProps) {
  if (!content) return null

  return (
    <div className={cn("markdown-content text-sm leading-relaxed text-foreground", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground mt-4 mb-2 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base sm:text-lg font-semibold tracking-tight text-foreground mt-3.5 mb-1.5 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm sm:text-base font-semibold tracking-tight text-foreground mt-3 mb-1 first:mt-0">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-xs sm:text-sm font-semibold text-foreground mt-2.5 mb-1 first:mt-0">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="text-sm leading-relaxed mb-2.5 last:mb-0 break-words">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic">
              {children}
            </em>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-outside pl-5 my-2 space-y-1 text-sm">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside pl-5 my-2 space-y-1 text-sm">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed pl-0.5">
              {children}
            </li>
          ),
          hr: () => (
            <hr className="my-3 border-t border-border/70" />
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-indigo-500/70 pl-3 my-2 text-muted-foreground italic text-sm">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="my-3 w-full overflow-x-auto rounded-xl border border-border/80 shadow-2xs">
              <table className="w-full text-xs border-collapse">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/70 border-b border-border text-foreground font-semibold">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-border/60">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-muted/30 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left font-semibold text-foreground whitespace-nowrap">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-foreground/90 align-top">
              {children}
            </td>
          ),
          a: ({ href, children }) => {
            if (!isSafeUrl(href)) {
              return <span className="text-muted-foreground">{children}</span>
            }
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 dark:text-indigo-400 font-medium underline underline-offset-2 hover:opacity-85 break-all transition-opacity inline-flex items-center gap-0.5"
              >
                {children}
                <ExternalLink className="h-3 w-3 inline-block flex-shrink-0 opacity-70" />
              </a>
            )
          },
          pre: ({ children }) => {
            return <>{children}</>
          },
          code: ({ className, children }) => {
            const match = /language-(\w+)/.exec(className || '')
            const isBlock = match || String(children).includes('\n')

            if (isBlock) {
              return (
                <CodeBlock className={className}>
                  {children}
                </CodeBlock>
              )
            }

            return (
              <code className="font-mono text-[12px] px-1.5 py-0.5 rounded-md bg-muted/80 text-foreground border border-border/60 break-all font-semibold">
                {children}
              </code>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
