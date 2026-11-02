'use client'

import { useState } from 'react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Download, ChevronDown, Loader2, FileSpreadsheet, FileText } from 'lucide-react'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'

interface ExportButtonProps {
  datasetId: string
  currentVersion?: number
  datasetName?: string
  className?: string
  label?: string
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
}

function parseFilename(contentDisposition: string | null, fallback: string): string {
  if (!contentDisposition) return fallback

  // Check RFC 5987 filename*
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match && utf8Match[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim())
    } catch {}
  }

  // Check standard filename=""
  const standardMatch = contentDisposition.match(/filename="?([^";]+)"?/i)
  if (standardMatch && standardMatch[1]) {
    try {
      return decodeURIComponent(standardMatch[1].trim().replace(/^["']|["']$/g, ''))
    } catch {
      return standardMatch[1].trim()
    }
  }

  return fallback
}

export function ExportButton({
  datasetId,
  currentVersion = 0,
  datasetName,
  className,
  label = 'Export',
  variant = 'outline',
  size = 'sm',
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async (type: 'current' | 'original', format: 'csv' | 'xlsx') => {
    try {
      setIsExporting(true)
      const versionQuery = type === 'current' ? `&version=${currentVersion}` : ''
      const res = await fetch(`/api/datasets/${datasetId}/export?type=${type}&format=${format}${versionQuery}`)
      
      if (!res.ok) {
        let errMsg = 'Export request failed.'
        try {
          const errJson = await res.json()
          if (errJson?.error) errMsg = errJson.error
        } catch {
          // fallback
        }
        throw new Error(errMsg)
      }

      // Download the streamed blob
      const blob = await res.blob()
      const contentDisposition = res.headers.get('Content-Disposition')
      const sanitizedBaseName = (datasetName || 'dataset')
        .replace(/[/\\?%*:|"<>]/g, '_')
        .replace(/\.[^/.]+$/, '')
        .trim() || 'dataset'

      const versionSuffix = type === 'current' ? `_v${currentVersion}` : '_original'
      const fallbackFilename = `${sanitizedBaseName}${versionSuffix}.${format}`
      const filename = parseFilename(contentDisposition, fallbackFilename)

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      
      // Delay revoke to ensure browser starts download
      setTimeout(() => {
        window.URL.revokeObjectURL(url)
        if (a.parentNode) {
          a.parentNode.removeChild(a)
        }
      }, 200)
    } catch (err: unknown) {
      console.error('Export error:', err)
      alert(err instanceof Error ? err.message : 'Failed to export dataset. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant, size }),
          'flex items-center gap-1.5 cursor-pointer rounded-xl font-semibold border-border/80 shadow-xs select-none',
          size === 'sm' && 'h-9 text-xs',
          className
        )}
        disabled={isExporting}
      >
        {isExporting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
        )}
        <span>{label}</span>
        <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 rounded-xl border-border/80 shadow-lg p-1.5 z-50 bg-popover/95 backdrop-blur-xs">
        <DropdownMenuLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1.5">
          Current Transformed (v{currentVersion})
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => handleExport('current', 'csv')}
          disabled={isExporting}
          className="flex items-center gap-2.5 cursor-pointer rounded-lg text-xs py-2 px-2.5 hover:bg-accent"
        >
          <FileText className="h-4 w-4 text-blue-500" />
          <span>Download as CSV</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport('current', 'xlsx')}
          disabled={isExporting}
          className="flex items-center gap-2.5 cursor-pointer rounded-lg text-xs py-2 px-2.5 hover:bg-accent"
        >
          <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
          <span>Download as Excel (.xlsx)</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1 border-border/60" />

        <DropdownMenuLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1.5">
          Original Raw Upload
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => handleExport('original', 'csv')}
          disabled={isExporting}
          className="flex items-center gap-2.5 cursor-pointer rounded-lg text-xs py-2 px-2.5 hover:bg-accent"
        >
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span>Original File as CSV</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport('original', 'xlsx')}
          disabled={isExporting}
          className="flex items-center gap-2.5 cursor-pointer rounded-lg text-xs py-2 px-2.5 hover:bg-accent"
        >
          <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          <span>Original File as Excel (.xlsx)</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
