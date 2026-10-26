'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TransformationPreviewResult } from '@/types/transformations'
import { Loader2, ArrowRight, CheckCircle2, AlertTriangle, Wand2 } from 'lucide-react'

interface TransformationPreviewDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isApplying: boolean
  previewData: TransformationPreviewResult | null
  currentVersion: number
  transformationSummary: string
}

export function TransformationPreviewDialog({
  isOpen,
  onClose,
  onConfirm,
  isApplying,
  previewData,
  currentVersion,
  transformationSummary,
}: TransformationPreviewDialogProps) {
  if (!previewData) return null

  const targetVersion = currentVersion + 1
  const isDestructive = previewData.rowsAfter < previewData.rowsBefore || previewData.columnsAfter < previewData.columnsBefore

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isApplying && !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border-border/80 bg-card/95 backdrop-blur-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-foreground">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs shadow-indigo-500/20">
              <Wand2 className="h-4 w-4" />
            </div>
            Preview &amp; Confirm Transformation
          </DialogTitle>
          <DialogDescription className="text-xs">
            {transformationSummary}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 my-2">
          {/* Version Notice */}
          <div className="p-3.5 bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-teal-50/30 dark:from-indigo-950/30 dark:to-teal-950/20 border border-indigo-200/70 dark:border-indigo-900/50 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-foreground font-semibold">Resulting Dataset Version:</span>
              <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-mono font-bold text-xs shadow-xs shadow-indigo-500/20">
                Version {targetVersion}
              </Badge>
            </div>
            <span className="text-[11px] text-muted-foreground">Original dataset remains recoverable</span>
          </div>

          {/* Before vs After Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Rows */}
            <div className="p-3.5 rounded-xl border border-border/80 bg-card text-center space-y-1 shadow-xs">
              <div className="text-[11px] text-muted-foreground uppercase font-semibold">Total Rows</div>
              <div className="flex items-center justify-center gap-1.5 font-bold text-sm">
                <span className="font-mono">{previewData.rowsBefore.toLocaleString()}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className={`font-mono ${previewData.rowsAfter < previewData.rowsBefore ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
                  {previewData.rowsAfter.toLocaleString()}
                </span>
              </div>
              {previewData.rowsBefore !== previewData.rowsAfter && (
                <div className="text-[10px] text-muted-foreground font-mono">
                  {previewData.rowsAfter - previewData.rowsBefore > 0 ? '+' : ''}
                  {previewData.rowsAfter - previewData.rowsBefore} rows
                </div>
              )}
            </div>

            {/* Columns */}
            <div className="p-3.5 rounded-xl border border-border/80 bg-card text-center space-y-1 shadow-xs">
              <div className="text-[11px] text-muted-foreground uppercase font-semibold">Columns</div>
              <div className="flex items-center justify-center gap-1.5 font-bold text-sm">
                <span className="font-mono">{previewData.columnsBefore}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className={`font-mono ${previewData.columnsAfter < previewData.columnsBefore ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
                  {previewData.columnsAfter}
                </span>
              </div>
              {previewData.columnsBefore !== previewData.columnsAfter && (
                <div className="text-[10px] text-muted-foreground font-mono">
                  {previewData.columnsAfter - previewData.columnsBefore > 0 ? '+' : ''}
                  {previewData.columnsAfter - previewData.columnsBefore} cols
                </div>
              )}
            </div>

            {/* Missing Values */}
            <div className="p-3.5 rounded-xl border border-border/80 bg-card text-center space-y-1 shadow-xs">
              <div className="text-[11px] text-muted-foreground uppercase font-semibold">Missing Cells</div>
              <div className="flex items-center justify-center gap-1.5 font-bold text-sm">
                <span className="font-mono">{previewData.missingValuesBefore}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className={`font-mono ${previewData.missingValuesAfter < previewData.missingValuesBefore ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                  {previewData.missingValuesAfter}
                </span>
              </div>
              {previewData.missingValuesBefore !== previewData.missingValuesAfter && (
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                  {previewData.missingValuesAfter - previewData.missingValuesBefore} cells
                </div>
              )}
            </div>

            {/* Duplicates */}
            <div className="p-3.5 rounded-xl border border-border/80 bg-card text-center space-y-1 shadow-xs">
              <div className="text-[11px] text-muted-foreground uppercase font-semibold">Duplicates</div>
              <div className="flex items-center justify-center gap-1.5 font-bold text-sm">
                <span className="font-mono">{previewData.duplicatesBefore}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className={`font-mono ${previewData.duplicatesAfter < previewData.duplicatesBefore ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                  {previewData.duplicatesAfter}
                </span>
              </div>
              {previewData.duplicatesBefore !== previewData.duplicatesAfter && (
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                  {previewData.duplicatesAfter - previewData.duplicatesBefore} rows
                </div>
              )}
            </div>
          </div>

          {/* Sample Data Table Preview */}
          {previewData.samplePreview && previewData.samplePreview.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Sample Output (First {previewData.samplePreview.length} rows)
              </div>
              <div className="border border-border/80 rounded-xl overflow-x-auto max-h-48 bg-muted/20">
                <table className="w-full text-xs text-left text-muted-foreground border-collapse">
                  <thead className="bg-muted/70 text-foreground sticky top-0 backdrop-blur-xs">
                    <tr>
                      {previewData.columns.slice(0, 8).map((col) => (
                        <th key={col} className="px-3 py-2 border-b border-border/70 font-semibold whitespace-nowrap text-xs">{col}</th>
                      ))}
                      {previewData.columns.length > 8 && (
                        <th className="px-3 py-2 border-b border-border/70 text-muted-foreground font-medium">+{previewData.columns.length - 8} more</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-mono">
                    {previewData.samplePreview.slice(0, 5).map((row, i) => (
                      <tr key={i} className="hover:bg-muted/40 transition-colors">
                        {previewData.columns.slice(0, 8).map((col) => (
                          <td key={col} className="px-3 py-1.5 whitespace-nowrap max-w-[150px] truncate text-xs">
                            {row[col] === null || row[col] === undefined ? (
                              <span className="text-rose-500 italic">null</span>
                            ) : (
                              String(row[col])
                            )}
                          </td>
                        ))}
                        {previewData.columns.length > 8 && <td className="px-3 py-1.5 text-muted-foreground">...</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {isDestructive && (
            <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-xs">Destructive Transformation</p>
                <p className="text-[11px] mt-0.5 leading-relaxed">This action removes data ({previewData.affectedRows} rows or {previewData.affectedColumns} columns modified). A new version will be created without altering your raw uploaded dataset.</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isApplying} className="rounded-xl text-xs">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={isApplying}
            className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:via-indigo-700 hover:to-violet-700 text-white flex items-center gap-1.5 rounded-xl text-xs shadow-xs shadow-indigo-500/20"
          >
            {isApplying ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Applying transformation...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Apply Transformation (Create v{targetVersion})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
