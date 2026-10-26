'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  History as HistoryIcon,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  Clock
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export interface TransformationRecord {
  id: string
  dataset_id: string
  transformation_type: string
  configuration: Record<string, unknown> | Array<Record<string, unknown>>
  previous_version: number | null
  new_version: number
  affected_rows: number | null
  affected_columns: number | null
  status: string
  created_at: string
}

interface HistoryTabProps {
  datasetId: string
  currentVersion: number
  datasetCreatedAt: string
  history: TransformationRecord[]
}

export function HistoryTab({
  datasetId,
  currentVersion,
  datasetCreatedAt,
  history
}: HistoryTabProps) {
  const [selectedTargetVersion, setSelectedTargetVersion] = useState<number | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isReverting, setIsReverting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const router = useRouter()

  const handleOpenRevertDialog = (targetVersion: number) => {
    setSelectedTargetVersion(targetVersion)
    setIsDialogOpen(true)
    setErrorMessage(null)
  }

  const handleConfirmRevert = async () => {
    if (selectedTargetVersion === null) return

    setIsReverting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const res = await fetch(`/api/datasets/${datasetId}/revert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          targetVersion: selectedTargetVersion
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to revert dataset.')
      }

      setSuccessMessage(
        `Dataset reverted successfully to Version ${selectedTargetVersion}. Created new Version ${data.newVersion}.`
      )
      setIsDialogOpen(false)
      setSelectedTargetVersion(null)

      // Refresh server components across the page
      router.refresh()
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to restore dataset version.')
    } finally {
      setIsReverting(false)
    }
  }

  const formatTransformationLabel = (type: string, config?: Record<string, unknown> | Array<Record<string, unknown>>) => {
    if (type === 'revert' || type === 'revert_version') {
      const target = typeof config === 'object' && config !== null && 'target_version' in config
        ? String((config as { target_version?: number }).target_version)
        : ''
      return target ? `Reverted to Version ${target}` : 'Reverted Version'
    }
    if (type === 'remove_duplicate_rows' || type === 'drop_duplicates') return 'Removed Duplicates'
    if (type === 'drop_missing_values' || type === 'drop_missing') return 'Dropped Missing Values'
    if (type === 'drop_columns' || type === 'drop_column') return 'Dropped Columns'
    if (type === 'rename_column') return 'Renamed Column'
    if (type === 'fill_missing_values' || type === 'fill_missing') return 'Filled Missing Values'
    return type
  }

  // Build full timeline list (v0 original + all historical records)
  const timeline = [
    ...history.map(h => ({
      version: h.new_version,
      type: h.transformation_type,
      config: h.configuration,
      affectedRows: h.affected_rows,
      affectedCols: h.affected_columns,
      createdAt: h.created_at,
      isOriginal: false
    })),
    {
      version: 0,
      type: 'original_upload',
      config: {},
      affectedRows: null,
      affectedCols: null,
      createdAt: datasetCreatedAt,
      isOriginal: true
    }
  ]

  // Sort descending by version number
  timeline.sort((a, b) => b.version - a.version)

  return (
    <div className="space-y-6">
      {/* Success Notification */}
      {successMessage && (
        <Alert className="border-emerald-500 text-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <AlertTitle className="font-semibold">Rollback Succeeded</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <Alert variant="destructive" className="border-red-500 bg-red-50 dark:bg-red-950/30">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="font-semibold">Rollback Failed</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <HistoryIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                Transformation &amp; Version History
              </CardTitle>
              <CardDescription>
                Track every modification made to this dataset. Revert to any prior version safely without losing audit history.
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-mono text-xs self-start sm:self-auto">
              Current: v{currentVersion}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {timeline.map(item => {
              const isCurrent = item.version === currentVersion

              return (
                <div
                  key={item.version}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all ${
                    isCurrent
                      ? 'border-purple-300 dark:border-purple-900 bg-purple-50/40 dark:bg-purple-950/20 shadow-xs'
                      : 'border-border bg-card/60'
                  }`}
                >
                  <div className="space-y-1.5 flex-1 pr-4">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <Badge
                        variant={isCurrent ? 'default' : 'secondary'}
                        className={`font-mono text-xs ${isCurrent ? 'bg-purple-600 text-white' : ''}`}
                      >
                        v{item.version}
                      </Badge>
                      <span className="font-semibold text-sm text-foreground">
                        {item.isOriginal ? 'Original Dataset (Raw Upload)' : formatTransformationLabel(item.type, item.config)}
                      </span>
                      {isCurrent && (
                        <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-medium">
                          Current Active Version
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{new Date(item.createdAt).toLocaleString()}</span>
                      {!item.isOriginal && item.affectedRows !== null && (
                        <>
                          <span>•</span>
                          <span>{item.affectedRows} rows modified</span>
                        </>
                      )}
                    </p>
                  </div>

                  <div className="mt-3 sm:mt-0 flex items-center gap-2 flex-shrink-0">
                    {isCurrent ? (
                      <Button variant="outline" size="sm" disabled className="text-xs">
                        Active
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenRevertDialog(item.version)}
                        disabled={isReverting}
                        className="text-xs flex items-center gap-1.5 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 dark:hover:bg-purple-950/40"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Revert to v{item.version}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <RotateCcw className="h-5 w-5 text-purple-600" />
              Revert dataset to Version {selectedTargetVersion}?
            </DialogTitle>
            <DialogDescription>
              This will restore the dataset contents from Version {selectedTargetVersion} as the newest version. Your current version will not be deleted or overwritten.
            </DialogDescription>
          </DialogHeader>

          {/* Rollback Details Card */}
          <div className="p-4 rounded-xl border bg-muted/40 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                <FileSpreadsheet className="h-4 w-4 text-blue-500" /> Current Version:
              </span>
              <Badge variant="outline" className="font-mono">Version {currentVersion}</Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-purple-500" /> Target Version:
              </span>
              <Badge variant="secondary" className="font-mono">Version {selectedTargetVersion}</Badge>
            </div>

            <div className="pt-2 border-t flex items-center justify-between">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <ArrowRight className="h-4 w-4 text-emerald-500" /> Resulting Version:
              </span>
              <Badge className="bg-purple-600 hover:bg-purple-700 text-white font-mono font-bold">
                Version {currentVersion + 1}
              </Badge>
            </div>
          </div>

          <DialogFooter className="flex-row justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDialogOpen(false)}
              disabled={isReverting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmRevert}
              disabled={isReverting}
              className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5"
            >
              {isReverting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Reverting dataset...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4" />
                  Revert Dataset
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
