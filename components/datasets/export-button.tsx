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
}

export function ExportButton({ datasetId, currentVersion = 0 }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async (type: 'current' | 'original', format: 'csv' | 'xlsx') => {
    try {
      setIsExporting(true)
      const res = await fetch(`/api/datasets/${datasetId}/export?type=${type}&format=${format}`)
      
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.error || 'Export request failed.')
      }

      // Download the streamed blob
      const blob = await res.blob()
      const contentDisposition = res.headers.get('Content-Disposition')
      let filename = `dataset_${type}_v${currentVersion}.${format}`
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/)
        if (filenameMatch && filenameMatch[1]) {
          filename = decodeURIComponent(filenameMatch[1])
        }
      }

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
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
        className={cn(buttonVariants({ variant: 'outline' }), 'flex items-center gap-2 cursor-pointer rounded-xl h-9 text-xs font-semibold border-border/80 shadow-xs')}
        disabled={isExporting}
      >
        {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />}
        <span>Export</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 rounded-xl border-border/80 shadow-lg p-1.5">
        <DropdownMenuLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1.5">
          Current Transformed (v{currentVersion})
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={() => handleExport('current', 'csv')} disabled={isExporting} className="flex items-center gap-2.5 cursor-pointer rounded-lg text-xs py-2 px-2.5">
          <FileText className="h-4 w-4 text-blue-500" />
          <span>Download as CSV</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('current', 'xlsx')} disabled={isExporting} className="flex items-center gap-2.5 cursor-pointer rounded-lg text-xs py-2 px-2.5">
          <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
          <span>Download as Excel (.xlsx)</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1 border-border/60" />

        <DropdownMenuLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1.5">
          Original Raw Upload
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={() => handleExport('original', 'csv')} disabled={isExporting} className="flex items-center gap-2.5 cursor-pointer rounded-lg text-xs py-2 px-2.5">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span>Original File as CSV</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('original', 'xlsx')} disabled={isExporting} className="flex items-center gap-2.5 cursor-pointer rounded-lg text-xs py-2 px-2.5">
          <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          <span>Original File as Excel (.xlsx)</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
