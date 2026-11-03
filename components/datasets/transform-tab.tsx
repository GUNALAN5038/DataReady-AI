'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  Loader2, 
  Trash2, 
  Edit2, 
  Eraser, 
  Scissors, 
  Activity, 
  FileCode2, 
  CheckCircle2, 
  AlertCircle,
  Eye
} from 'lucide-react'
import { DatasetTransformation, TransformationPreviewResult, TargetDataType, FillMissingMethod } from '@/types/transformations'
import { TransformationPreviewDialog } from './transformation-preview'
import { DatasetPreviewTable } from './dataset-preview-table'
import { ExportButton } from './export-button'

interface ColumnMeta {
  name: string
  type?: string
}

interface TransformTabProps {
  datasetId: string
  datasetName?: string
  columns: ColumnMeta[]
  currentVersion?: number
  initialSampleData?: Record<string, unknown>[]
  rowCount?: number
  columnCount?: number
}

export function TransformTab({
  datasetId,
  datasetName,
  columns,
  currentVersion = 0,
  initialSampleData,
  rowCount,
  columnCount,
}: TransformTabProps) {
  const router = useRouter()
  const [isTransforming, setIsTransforming] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Dynamic state tracking dataset changes
  const [activeVersion, setActiveVersion] = useState(currentVersion)
  const [activeColumns, setActiveColumns] = useState<ColumnMeta[]>(columns)
  const [activeSampleData, setActiveSampleData] = useState<Record<string, unknown>[]>(initialSampleData || [])
  const [activeRowCount, setActiveRowCount] = useState<number>(rowCount ?? initialSampleData?.length ?? 0)
  const [activeColumnCount, setActiveColumnCount] = useState<number>(columnCount ?? columns.length)

  useEffect(() => {
    setActiveVersion(currentVersion)
    setActiveColumns(columns)
    if (initialSampleData) setActiveSampleData(initialSampleData)
    if (rowCount !== undefined) setActiveRowCount(rowCount)
    if (columnCount !== undefined) setActiveColumnCount(columnCount)
  }, [currentVersion, columns, initialSampleData, rowCount, columnCount])

  // Preview dialog state
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [previewData, setPreviewData] = useState<TransformationPreviewResult | null>(null)
  const [pendingTransformations, setPendingTransformations] = useState<DatasetTransformation[]>([])
  const [pendingSummary, setPendingSummary] = useState('')

  // 1. Drop columns state
  const [selectedColumnsToDrop, setSelectedColumnsToDrop] = useState<string[]>([])

  // 2. Drop rows state
  const [dropMissingScope, setDropMissingScope] = useState<'all' | string>('all')
  const [rowIndicesToDrop, setRowIndicesToDrop] = useState('')

  // 3. Fill missing state
  const [fillColumn, setFillColumn] = useState('')
  const [fillMethod, setFillMethod] = useState<FillMissingMethod>('mean')
  const [fillCustomValue, setFillCustomValue] = useState('')

  // 4. Outliers state
  const [outlierColumn, setOutlierColumn] = useState('')
  const [outlierMethod, setOutlierMethod] = useState<'remove' | 'cap'>('remove')

  // 5. Rename column state
  const [renameTarget, setRenameTarget] = useState('')
  const [newName, setNewName] = useState('')

  // 6. Change data type state
  const [typeTargetColumn, setTypeTargetColumn] = useState('')
  const [targetType, setTargetType] = useState<TargetDataType>('integer')

  // Helper to open preview before applying
  const handlePreviewAndConfirm = async (transformations: DatasetTransformation[], summary: string) => {
    setError(null)
    setSuccess(null)
    setIsPreviewing(true)
    setPendingTransformations(transformations)
    setPendingSummary(summary)

    try {
      const res = await fetch(`/api/datasets/${datasetId}/transform/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transformations })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate transformation preview.')
      }

      setPreviewData(data)
      setPreviewDialogOpen(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to generate transformation preview.')
    } finally {
      setIsPreviewing(false)
    }
  }

  // Helper to execute confirmed transformation
  const handleExecutePendingTransformation = async () => {
    if (pendingTransformations.length === 0) return

    setIsTransforming(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/datasets/${datasetId}/transform`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transformations: pendingTransformations })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Transformation execution failed.')
      }

      setSuccess(
        `Transformation applied successfully! Created Version ${data.newVersion}. Modified ${data.affectedRows} rows, ${data.affectedColumns} columns.`
      )
      setPreviewDialogOpen(false)
      setPendingTransformations([])
      setPreviewData(null)

      // Sync active state immediately with transformed dataset
      if (data.dataset) {
        if (data.dataset.current_version !== undefined) setActiveVersion(data.dataset.current_version)
        if (data.dataset.column_metadata) setActiveColumns(data.dataset.column_metadata)
        if (data.dataset.sample_data) setActiveSampleData(data.dataset.sample_data)
        if (data.dataset.row_count !== undefined) setActiveRowCount(data.dataset.row_count)
        if (data.dataset.column_count !== undefined) setActiveColumnCount(data.dataset.column_count)
      } else if (data.newVersion !== undefined) {
        setActiveVersion(data.newVersion)
        if (data.rowsAfter !== undefined) setActiveRowCount(data.rowsAfter)
      }

      // Reset form states
      setSelectedColumnsToDrop([])
      setRowIndicesToDrop('')
      setNewName('')

      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Transformation execution failed.')
    } finally {
      setIsTransforming(false)
    }
  }

  // --- Handlers for each transformation card ---

  const onDropColumnsSubmit = () => {
    if (selectedColumnsToDrop.length === 0) {
      setError('Please select at least one column to drop.')
      return
    }
    if (selectedColumnsToDrop.length >= activeColumns.length) {
      setError('Cannot drop all columns. At least one column must remain in the dataset.')
      return
    }
    handlePreviewAndConfirm(
      [{ action: 'drop_column', columns: selectedColumnsToDrop }],
      `Remove ${selectedColumnsToDrop.length} column(s): ${selectedColumnsToDrop.join(', ')}`
    )
  }

  const onDropDuplicatesSubmit = () => {
    handlePreviewAndConfirm(
      [{ action: 'drop_duplicates' }],
      'Remove all duplicate rows across the entire dataset'
    )
  }

  const onDropMissingSubmit = () => {
    const summary = dropMissingScope === 'all'
      ? 'Drop all rows containing any missing or null value'
      : `Drop rows containing missing values in column "${dropMissingScope}"`

    handlePreviewAndConfirm(
      [{ action: 'drop_missing', columns: dropMissingScope === 'all' ? 'all' : [dropMissingScope] }],
      summary
    )
  }

  const onDropRowIndicesSubmit = () => {
    if (!rowIndicesToDrop.trim()) {
      setError('Please provide row indices to remove (e.g. 0, 5, 12).')
      return
    }

    const indices = rowIndicesToDrop
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => Number(s))

    if (indices.some(isNaN) || indices.some(n => !Number.isInteger(n) || n < 0)) {
      setError('Invalid row indices. Please provide a comma-separated list of positive integers (e.g. 0, 1, 4).')
      return
    }

    handlePreviewAndConfirm(
      [{ action: 'drop_rows_indices', indices }],
      `Remove ${indices.length} specific row(s) at indices: ${indices.join(', ')}`
    )
  }

  const onFillMissingSubmit = () => {
    if (!fillColumn) {
      setError('Please choose a column to impute missing values.')
      return
    }

    let summary = `Fill missing values in "${fillColumn}" using ${fillMethod.toUpperCase()}`
    if (fillMethod === 'custom') {
      if (fillCustomValue === '') {
        setError('Please provide a custom replacement value.')
        return
      }
      summary = `Fill missing values in "${fillColumn}" with custom value: "${fillCustomValue}"`
    } else if (fillMethod === 'drop_row') {
      summary = `Drop all rows where "${fillColumn}" is missing`
    }

    handlePreviewAndConfirm(
      [{
        action: 'fill_missing',
        column: fillColumn,
        method: fillMethod,
        customValue: fillMethod === 'custom' ? fillCustomValue : undefined
      }],
      summary
    )
  }

  const onOutlierHandlingSubmit = () => {
    if (!outlierColumn) {
      setError('Please select a numerical column for outlier handling.')
      return
    }

    const summary = outlierMethod === 'remove'
      ? `Remove outlier rows in column "${outlierColumn}" using standard IQR bounds (Q1 - 1.5*IQR to Q3 + 1.5*IQR)`
      : `Cap/Winsorize outliers in column "${outlierColumn}" to IQR lower and upper bounds`

    handlePreviewAndConfirm(
      [{
        action: 'handle_outliers',
        column: outlierColumn,
        method: outlierMethod
      }],
      summary
    )
  }

  const onRenameColumnSubmit = () => {
    const trimmed = newName.trim()
    if (!renameTarget) {
      setError('Please select a column to rename.')
      return
    }
    if (!trimmed) {
      setError('Please enter a valid new column name.')
      return
    }
    if (trimmed !== renameTarget && activeColumns.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
      setError(`A column named "${trimmed}" already exists. Column names must be unique.`)
      return
    }

    handlePreviewAndConfirm(
      [{
        action: 'rename_column',
        column: renameTarget,
        newName: trimmed
      }],
      `Rename column "${renameTarget}" to "${trimmed}"`
    )
  }

  const onChangeDataTypeSubmit = () => {
    if (!typeTargetColumn) {
      setError('Please select a column to convert.')
      return
    }

    handlePreviewAndConfirm(
      [{
        action: 'convert_type',
        column: typeTargetColumn,
        targetType
      }],
      `Cast column "${typeTargetColumn}" data type to ${targetType.toUpperCase()}`
    )
  }

  const isBusy = isTransforming || isPreviewing

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {error && (
        <Alert variant="destructive" className="border-rose-500/40 bg-rose-50/80 dark:bg-rose-950/30 rounded-xl">
          <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
          <AlertTitle className="font-semibold text-sm">Error</AlertTitle>
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="border-emerald-500/40 text-emerald-800 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/30 rounded-xl">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <AlertTitle className="font-semibold text-sm">Success</AlertTitle>
          <AlertDescription className="text-xs">{success}</AlertDescription>
        </Alert>
      )}

      {/* 1. Current Transformed Dataset Live Preview & Export Toolbar */}
      <Card className="rounded-2xl border-border/80 shadow-xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                  <Activity className="w-4 h-4 text-indigo-500" />
                  Transformed Dataset Preview
                </CardTitle>
                <Badge className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-mono text-xs font-semibold px-2 py-0.5 rounded-full shadow-2xs">
                  Active: Version {activeVersion}
                </Badge>
              </div>
              <CardDescription className="text-xs mt-1">
                Live view of dataset changes after transformations. Export this version directly or apply further transformations below.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <ExportButton
                datasetId={datasetId}
                datasetName={datasetName}
                currentVersion={activeVersion}
                label={`Export v${activeVersion}`}
                size="sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <DatasetPreviewTable
            columns={activeColumns}
            data={activeSampleData}
            totalRows={activeRowCount}
            totalColumns={activeColumnCount}
            currentVersion={activeVersion}
            maxHeight="380px"
            caption={`Current active transformed version (v${activeVersion})`}
            emptyMessage="No dataset records available to preview for this version."
          />
        </CardContent>
      </Card>

      {/* Grid of Transformation Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* 1. Remove Duplicates */}
        <Card className="rounded-2xl border-border/80 shadow-xs card-hover-lift">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <div className="h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Scissors className="w-3.5 h-3.5" />
              </div>
              Remove Duplicate Rows
            </CardTitle>
            <CardDescription className="text-xs">
              Automatically identify and delete duplicate rows across all columns.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-1">
            <p className="text-xs text-muted-foreground">
              Preserves the first occurrence of each unique record.
            </p>
            <Button
              onClick={onDropDuplicatesSubmit}
              disabled={isBusy}
              className="w-full flex items-center justify-center gap-2 rounded-xl text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs shadow-indigo-500/20"
              size="sm"
            >
              {isPreviewing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
              Preview &amp; Remove Duplicates
            </Button>
          </CardContent>
        </Card>

        {/* 2. Drop Missing Rows */}
        <Card className="rounded-2xl border-border/80 shadow-xs card-hover-lift">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <div className="h-7 w-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Eraser className="w-3.5 h-3.5" />
              </div>
              Drop Missing Value Rows
            </CardTitle>
            <CardDescription className="text-xs">
              Remove rows with empty or null cells.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Scope</Label>
              <Select value={dropMissingScope} onValueChange={(val: string | null) => setDropMissingScope(val || 'all')}>
                <SelectTrigger className="h-9 text-xs rounded-xl">
                  <SelectValue placeholder="Select scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Column (All Columns)</SelectItem>
                  {activeColumns.map(c => (
                    <SelectItem key={c.name} value={c.name}>Only if &quot;{c.name}&quot; is missing</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={onDropMissingSubmit}
              disabled={isBusy}
              variant="outline"
              className="w-full flex items-center justify-center gap-2 rounded-xl text-xs border-border/80 hover:bg-muted"
              size="sm"
            >
              {isPreviewing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
              Preview &amp; Drop Missing Rows
            </Button>
          </CardContent>
        </Card>

        {/* 3. Drop Specific Rows by Index */}
        <Card className="rounded-2xl border-border/80 shadow-xs card-hover-lift">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <div className="h-7 w-7 rounded-lg bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <Trash2 className="w-3.5 h-3.5" />
              </div>
              Drop Specific Rows
            </CardTitle>
            <CardDescription className="text-xs">
              Remove rows by 0-indexed row numbers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Row Indices (comma-separated)</Label>
              <Input
                value={rowIndicesToDrop}
                onChange={e => setRowIndicesToDrop(e.target.value)}
                placeholder="e.g. 0, 5, 23"
                className="h-9 text-xs font-mono rounded-xl"
              />
            </div>
            <Button
              onClick={onDropRowIndicesSubmit}
              disabled={isBusy || !rowIndicesToDrop.trim()}
              variant="outline"
              className="w-full flex items-center justify-center gap-2 text-xs rounded-xl border-border/80 hover:bg-muted"
              size="sm"
            >
              {isPreviewing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
              Preview &amp; Drop Indices
            </Button>
          </CardContent>
        </Card>

        {/* 4. Missing Value Imputation */}
        <Card className="rounded-2xl border-border/80 shadow-xs card-hover-lift">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <div className="h-7 w-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Edit2 className="w-3.5 h-3.5" />
              </div>
              Impute / Fill Missing Values
            </CardTitle>
            <CardDescription className="text-xs">
              Fill empty cells with statistical or custom replacements.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Target Column</Label>
                <Select value={fillColumn} onValueChange={(val: string | null) => setFillColumn(val || '')}>
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue placeholder="Choose column" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeColumns.map(c => (
                      <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Strategy</Label>
                <Select value={fillMethod} onValueChange={(val: FillMissingMethod | null) => val && setFillMethod(val)}>
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mean">Mean (Numeric)</SelectItem>
                    <SelectItem value="median">Median (Numeric)</SelectItem>
                    <SelectItem value="mode">Mode (Most Frequent)</SelectItem>
                    <SelectItem value="custom">Custom Value</SelectItem>
                    <SelectItem value="drop_row">Drop Rows With Missing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {fillMethod === 'custom' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Custom Replacement Value</Label>
                <Input
                  value={fillCustomValue}
                  onChange={e => setFillCustomValue(e.target.value)}
                  placeholder="Enter replacement string or number..."
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            )}

            <Button
              onClick={onFillMissingSubmit}
              disabled={isBusy || !fillColumn}
              className="w-full flex items-center justify-center gap-2 rounded-xl text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs shadow-indigo-500/20"
              size="sm"
            >
              {isPreviewing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
              Preview &amp; Fill Values
            </Button>
          </CardContent>
        </Card>

        {/* 5. Outlier Handling (IQR) */}
        <Card className="rounded-2xl border-border/80 shadow-xs card-hover-lift">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <div className="h-7 w-7 rounded-lg bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Activity className="w-3.5 h-3.5" />
              </div>
              Handle Outliers (IQR Method)
            </CardTitle>
            <CardDescription className="text-xs">
              Detect and treat statistical outliers (Q1 - 1.5*IQR to Q3 + 1.5*IQR).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Numerical Column</Label>
                <Select value={outlierColumn} onValueChange={(val: string | null) => setOutlierColumn(val || '')}>
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue placeholder="Choose column" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeColumns.map(c => (
                      <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Method</Label>
                <Select value={outlierMethod} onValueChange={(val: 'remove' | 'cap' | null) => val && setOutlierMethod(val)}>
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="remove">Remove Outlier Rows</SelectItem>
                    <SelectItem value="cap">Cap / Winsorize (Clamp to Bounds)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={onOutlierHandlingSubmit}
              disabled={isBusy || !outlierColumn}
              variant="outline"
              className="w-full flex items-center justify-center gap-2 text-xs rounded-xl border-border/80 hover:bg-muted"
              size="sm"
            >
              {isPreviewing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
              Preview &amp; Handle Outliers
            </Button>
          </CardContent>
        </Card>

        {/* 6. Rename Column */}
        <Card className="rounded-2xl border-border/80 shadow-xs card-hover-lift">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <div className="h-7 w-7 rounded-lg bg-violet-50 dark:bg-violet-950/50 flex items-center justify-center text-violet-600 dark:text-violet-400">
                <Edit2 className="w-3.5 h-3.5" />
              </div>
              Rename Column
            </CardTitle>
            <CardDescription className="text-xs">
              Safely update a column header without altering contents.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Original Column</Label>
                <Select value={renameTarget} onValueChange={(val: string | null) => setRenameTarget(val || '')}>
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue placeholder="Choose column" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeColumns.map(c => (
                      <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">New Column Name</Label>
                <Input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. user_age"
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>

            <Button
              onClick={onRenameColumnSubmit}
              disabled={isBusy || !renameTarget || !newName.trim()}
              variant="outline"
              className="w-full flex items-center justify-center gap-2 text-xs rounded-xl border-border/80 hover:bg-muted"
              size="sm"
            >
              {isPreviewing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
              Preview &amp; Rename Column
            </Button>
          </CardContent>
        </Card>

        {/* 7. Change Data Types */}
        <Card className="md:col-span-2 rounded-2xl border-border/80 shadow-xs card-hover-lift">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <div className="h-7 w-7 rounded-lg bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center text-teal-600 dark:text-teal-400">
                <FileCode2 className="w-3.5 h-3.5" />
              </div>
              Convert Column Data Type
            </CardTitle>
            <CardDescription className="text-xs">
              Cast column values to a standard type with safety validation against silent data loss.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Column</Label>
                <Select value={typeTargetColumn} onValueChange={(val: string | null) => setTypeTargetColumn(val || '')}>
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue placeholder="Choose column" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeColumns.map(c => (
                      <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Target Type</Label>
                <Select value={targetType} onValueChange={(val: TargetDataType | null) => val && setTargetType(val)}>
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="string">String (Text)</SelectItem>
                    <SelectItem value="integer">Integer (Whole numbers)</SelectItem>
                    <SelectItem value="float">Float (Decimals)</SelectItem>
                    <SelectItem value="boolean">Boolean (True/False)</SelectItem>
                    <SelectItem value="date">Date (ISO Timestamp)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={onChangeDataTypeSubmit}
              disabled={isBusy || !typeTargetColumn}
              className="w-full flex items-center justify-center gap-2 rounded-xl text-xs bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-xs shadow-teal-500/20"
              size="sm"
            >
              {isPreviewing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
              Preview &amp; Convert Data Type
            </Button>
          </CardContent>
        </Card>

        {/* 8. Drop Selected Columns */}
        <Card className="md:col-span-2 rounded-2xl border-border/80 shadow-xs card-hover-lift">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <div className="h-7 w-7 rounded-lg bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </div>
                  Drop Columns
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Select one or more columns to remove permanently from the new dataset version.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-mono border-border/80 bg-background/60">
                {selectedColumnsToDrop.length} of {activeColumns.length} selected
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2.5 border border-border/80 rounded-xl bg-muted/20">
              {activeColumns.map(c => {
                const isChecked = selectedColumnsToDrop.includes(c.name)
                return (
                  <label
                    key={c.name}
                    htmlFor={`drop-${c.name}`}
                    className={`flex items-center space-x-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                      isChecked ? 'border-rose-400 bg-rose-50/60 dark:bg-rose-950/30 dark:border-rose-800' : 'border-border/60 hover:bg-muted/60'
                    }`}
                  >
                    <Checkbox
                      id={`drop-${c.name}`}
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedColumnsToDrop([...selectedColumnsToDrop, c.name])
                        } else {
                          setSelectedColumnsToDrop(selectedColumnsToDrop.filter(name => name !== c.name))
                        }
                      }}
                    />
                    <span className="truncate font-medium">{c.name}</span>
                  </label>
                )
              })}
            </div>

            <div className="flex justify-between items-center pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedColumnsToDrop([])}
                disabled={selectedColumnsToDrop.length === 0 || isBusy}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear selection
              </Button>

              <Button
                variant="destructive"
                onClick={onDropColumnsSubmit}
                disabled={isBusy || selectedColumnsToDrop.length === 0}
                size="sm"
                className="flex items-center gap-2 rounded-xl text-xs bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
              >
                {isPreviewing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                Preview &amp; Drop Selected ({selectedColumnsToDrop.length})
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Preview Confirmation Dialog */}
      <TransformationPreviewDialog
        isOpen={previewDialogOpen}
        onClose={() => {
          setPreviewDialogOpen(false)
          setPreviewData(null)
          setPendingTransformations([])
        }}
        onConfirm={handleExecutePendingTransformation}
        isApplying={isTransforming}
        previewData={previewData}
        currentVersion={activeVersion}
        transformationSummary={pendingSummary}
      />
    </div>
  )
}
