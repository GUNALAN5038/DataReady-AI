'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { FileSpreadsheet, Info, Hash, Layers } from 'lucide-react'

export interface ColumnDefinition {
  name: string
  type?: string
}

export interface DatasetPreviewTableProps {
  columns: (string | ColumnDefinition)[]
  data: Record<string, unknown>[]
  totalRows?: number
  totalColumns?: number
  maxHeight?: string
  caption?: string
  emptyMessage?: string
  showRowNumbers?: boolean
  currentVersion?: number
  className?: string
  compact?: boolean
}

function normalizeColumns(rawColumns: (string | ColumnDefinition)[]): ColumnDefinition[] {
  return rawColumns.map((c) => {
    if (typeof c === 'string') {
      return { name: c, type: undefined }
    }
    return c
  })
}

function getTypeBadge(type?: string) {
  if (!type) return null
  const lower = type.toLowerCase()
  let label = type
  let color = 'bg-muted text-muted-foreground border-border/70'

  if (lower.includes('int') || lower.includes('float') || lower.includes('num')) {
    label = lower.includes('int') ? 'INT' : 'NUM'
    color = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25'
  } else if (lower.includes('bool')) {
    label = 'BOOL'
    color = 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/25'
  } else if (lower.includes('date') || lower.includes('time')) {
    label = 'DATE'
    color = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25'
  } else if (lower.includes('str') || lower.includes('text') || lower.includes('cat')) {
    label = 'TXT'
    color = 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25'
  }

  return (
    <span className={cn('text-[9px] font-mono px-1 py-0.2 rounded border font-semibold select-none shrink-0', color)}>
      {label}
    </span>
  )
}

export function DatasetPreviewTable({
  columns: rawColumns,
  data,
  totalRows,
  totalColumns,
  maxHeight = '460px',
  caption,
  emptyMessage = 'No preview data available for this version.',
  showRowNumbers = true,
  currentVersion,
  className,
  compact = false,
}: DatasetPreviewTableProps) {
  const columns = normalizeColumns(rawColumns)
  const effectiveTotalRows = totalRows ?? data.length
  const effectiveTotalCols = totalColumns ?? columns.length
  const isSample = effectiveTotalRows > data.length

  if (!columns || columns.length === 0 || !data || data.length === 0) {
    return (
      <div className={cn('border border-border/80 rounded-2xl p-10 text-center bg-card/60 backdrop-blur-xs', className)}>
        <div className="h-12 w-12 mx-auto rounded-2xl bg-muted/80 flex items-center justify-center text-muted-foreground mb-3">
          <FileSpreadsheet className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold text-foreground">{emptyMessage}</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          Upload records or apply a transformation to populate the dataset preview.
        </p>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col border border-border/80 rounded-2xl overflow-hidden bg-card/60 backdrop-blur-xs shadow-xs', className)}>
      {/* Table Metadata Header Bar */}
      <div className="px-4 py-2.5 bg-muted/40 border-b border-border/70 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          {currentVersion !== undefined && (
            <Badge variant="outline" className="bg-background text-foreground font-mono font-semibold text-[11px] border-border/80">
              Version {currentVersion}
            </Badge>
          )}
          <span className="font-medium text-foreground flex items-center gap-1">
            <Layers className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>{effectiveTotalRows.toLocaleString()} rows</span>
            <span className="text-muted-foreground">•</span>
            <span>{effectiveTotalCols} columns</span>
          </span>
          {isSample && (
            <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-medium">
              Showing first {data.length} sample rows
            </Badge>
          )}
        </div>

        {caption && (
          <span className="text-[11px] text-muted-foreground italic truncate max-w-md">
            {caption}
          </span>
        )}
      </div>

      {/* Responsive Scrollable Table Container */}
      <div
        className="w-full overflow-x-auto overflow-y-auto"
        style={{ maxHeight }}
        tabIndex={0}
        aria-label="Dataset preview table"
      >
        <table className="w-full min-w-max text-xs text-left border-collapse font-sans">
          {/* Sticky Header Row */}
          <thead className="bg-muted/95 dark:bg-zinc-900/95 text-foreground sticky top-0 z-10 backdrop-blur-xs border-b border-border/80 shadow-2xs">
            <tr>
              {showRowNumbers && (
                <th
                  scope="col"
                  className={cn(
                    'px-3 border-r border-border/60 text-muted-foreground font-mono font-semibold text-[11px] text-center w-12 sticky left-0 z-20 bg-muted/95 dark:bg-zinc-900/95',
                    compact ? 'py-1.5' : 'py-2.5'
                  )}
                >
                  <Hash className="h-3 w-3 mx-auto opacity-70" />
                </th>
              )}
              {columns.map((col, idx) => (
                <th
                  key={`${col.name}-${idx}`}
                  scope="col"
                  className={cn(
                    'px-3.5 border-r border-border/60 last:border-r-0 whitespace-nowrap font-semibold text-foreground tracking-tight select-none',
                    compact ? 'py-2 text-[11px]' : 'py-2.5 text-xs'
                  )}
                >
                  <div className="flex items-center gap-1.5 justify-between">
                    <span className="truncate max-w-[200px]" title={col.name}>
                      {col.name}
                    </span>
                    {getTypeBadge(col.type)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body with alternating row stripes */}
          <tbody className="divide-y divide-border/50 font-mono">
            {data.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className="even:bg-muted/20 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/25 transition-colors duration-100"
              >
                {showRowNumbers && (
                  <td
                    className={cn(
                      'px-3 border-r border-border/50 text-muted-foreground/80 font-mono text-[10px] text-center sticky left-0 bg-card/90 dark:bg-zinc-950/90 z-5 select-none',
                      compact ? 'py-1.5' : 'py-2'
                    )}
                  >
                    {rowIdx + 1}
                  </td>
                )}
                {columns.map((col, colIdx) => {
                  const val = row[col.name]
                  const isNullOrUndefined = val === null || val === undefined
                  const isEmptyString = typeof val === 'string' && val === ''

                  return (
                    <td
                      key={`${col.name}-${colIdx}`}
                      className={cn(
                        'px-3.5 border-r border-border/40 last:border-r-0 whitespace-nowrap text-xs text-foreground/90 max-w-[260px] truncate',
                        compact ? 'py-1.5' : 'py-2'
                      )}
                      title={!isNullOrUndefined ? String(val) : 'null'}
                    >
                      {isNullOrUndefined ? (
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-sans font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 select-none">
                          null
                        </span>
                      ) : isEmptyString ? (
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-sans font-medium bg-muted text-muted-foreground/80 border border-border/70 select-none">
                          empty
                        </span>
                      ) : (
                        <span>{String(val)}</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Info / Sampling Disclaimer */}
      {isSample && (
        <div className="px-4 py-2 bg-muted/30 border-t border-border/60 flex items-center gap-2 text-[11px] text-muted-foreground">
          <Info className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
          <span>
            Displaying sample of first <strong>{data.length}</strong> rows of{' '}
            <strong>{effectiveTotalRows.toLocaleString()}</strong> total rows. Full dataset is preserved and exported.
          </span>
        </div>
      )}
    </div>
  )
}
