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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Wand2 className="h-5 w-5 text-purple-600" />
            Preview &amp; Confirm Transformation
          </DialogTitle>
          <DialogDescription>
            {transformationSummary}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 my-2">
          {/* Version Notice */}
          <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 rounded-lg flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="text-purple-700 dark:text-purple-300 font-medium">Resulting Dataset Version:</span>
              <Badge className="bg-purple-600 text-white font-mono font-bold">Version {targetVersion}</Badge>
            </div>
            <span className="text-xs text-muted-foreground">Original dataset remains recoverable</span>
          </div>

          {/* Before vs After Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Rows */}
            <div className="p-3 rounded-lg border bg-card text-center space-y-1">
              <div className="text-xs text-muted-foreground uppercase font-semibold">Total Rows</div>
              <div className="flex items-center justify-center gap-1.5 font-bold text-sm">
                <span>{previewData.rowsBefore.toLocaleString()}</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                <span className={previewData.rowsAfter < previewData.rowsBefore ? 'text-amber-600' : 'text-foreground'}>
                  {previewData.rowsAfter.toLocaleString()}
                </span>
              </div>
              {previewData.rowsBefore !== previewData.rowsAfter && (
                <div className="text-[11px] text-muted-foreground">
                  {previewData.rowsAfter - previewData.rowsBefore > 0 ? '+' : ''}
                  {previewData.rowsAfter - previewData.rowsBefore} rows
                </div>
              )}
            </div>

            {/* Columns */}
            <div className="p-3 rounded-lg border bg-card text-center space-y-1">
              <div className="text-xs text-muted-foreground uppercase font-semibold">Columns</div>
              <div className="flex items-center justify-center gap-1.5 font-bold text-sm">
                <span>{previewData.columnsBefore}</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                <span className={previewData.columnsAfter < previewData.columnsBefore ? 'text-amber-600' : 'text-foreground'}>
                  {previewData.columnsAfter}
                </span>
              </div>
              {previewData.columnsBefore !== previewData.columnsAfter && (
                <div className="text-[11px] text-muted-foreground">
                  {previewData.columnsAfter - previewData.columnsBefore > 0 ? '+' : ''}
                  {previewData.columnsAfter - previewData.columnsBefore} cols
                </div>
              )}
            </div>

            {/* Missing Values */}
            <div className="p-3 rounded-lg border bg-card text-center space-y-1">
              <div className="text-xs text-muted-foreground uppercase font-semibold">Missing Cells</div>
              <div className="flex items-center justify-center gap-1.5 font-bold text-sm">
                <span>{previewData.missingValuesBefore}</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                <span className={previewData.missingValuesAfter < previewData.missingValuesBefore ? 'text-emerald-600' : 'text-foreground'}>
                  {previewData.missingValuesAfter}
                </span>
              </div>
              {previewData.missingValuesBefore !== previewData.missingValuesAfter && (
                <div className="text-[11px] text-emerald-600 font-medium">
                  {previewData.missingValuesAfter - previewData.missingValuesBefore} cells
                </div>
              )}
            </div>

            {/* Duplicates */}
            <div className="p-3 rounded-lg border bg-card text-center space-y-1">
              <div className="text-xs text-muted-foreground uppercase font-semibold">Duplicates</div>
              <div className="flex items-center justify-center gap-1.5 font-bold text-sm">
                <span>{previewData.duplicatesBefore}</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                <span className={previewData.duplicatesAfter < previewData.duplicatesBefore ? 'text-emerald-600' : 'text-foreground'}>
                  {previewData.duplicatesAfter}
                </span>
              </div>
              {previewData.duplicatesBefore !== previewData.duplicatesAfter && (
                <div className="text-[11px] text-emerald-600 font-medium">
                  {previewData.duplicatesAfter - previewData.duplicatesBefore} rows
                </div>
              )}
            </div>
          </div>

          {/* Sample Data Table Preview */}
          {previewData.samplePreview && previewData.samplePreview.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase">Sample Output (First {previewData.samplePreview.length} rows)</div>
              <div className="border rounded-lg overflow-x-auto max-h-48">
                <table className="w-full text-xs text-left text-muted-foreground border-collapse">
                  <thead className="bg-muted text-foreground sticky top-0">
                    <tr>
                      {previewData.columns.slice(0, 8).map((col) => (
                        <th key={col} className="px-3 py-2 border-b font-semibold whitespace-nowrap">{col}</th>
                      ))}
                      {previewData.columns.length > 8 && (
                        <th className="px-3 py-2 border-b text-muted-foreground">+{previewData.columns.length - 8} more</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.samplePreview.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                        {previewData.columns.slice(0, 8).map((col) => (
                          <td key={col} className="px-3 py-1.5 whitespace-nowrap max-w-[150px] truncate">
                            {row[col] === null || row[col] === undefined ? (
                              <span className="text-red-400 italic">null</span>
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
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Destructive Transformation</p>
                <p>This action removes data ({previewData.affectedRows} rows or {previewData.affectedColumns} columns modified). A new version will be created without altering your raw uploaded dataset.</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isApplying}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={isApplying}
            className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5"
          >
            {isApplying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Applying transformation...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Apply Transformation (Create v{targetVersion})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
