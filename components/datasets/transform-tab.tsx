'use client'

import { useState } from 'react'
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

interface ColumnMeta {
  name: string
  type?: string
}

interface TransformTabProps {
  datasetId: string
  columns: ColumnMeta[]
  currentVersion?: number
}

export function TransformTab({ datasetId, columns, currentVersion = 0 }: TransformTabProps) {
  const router = useRouter()
  const [isTransforming, setIsTransforming] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

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
    if (selectedColumnsToDrop.length >= columns.length) {
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
    if (trimmed !== renameTarget && columns.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
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
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="border-emerald-500 text-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Grid of Transformation Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* 1. Remove Duplicates */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Scissors className="w-4 h-4 text-purple-600" />
              Remove Duplicate Rows
            </CardTitle>
            <CardDescription className="text-xs">
              Automatically identify and delete duplicate rows across all columns.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Preserves the first occurrence of each unique record.
            </p>
            <Button
              onClick={onDropDuplicatesSubmit}
              disabled={isBusy}
              className="w-full flex items-center justify-center gap-2"
              size="sm"
            >
              {isPreviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              Preview &amp; Remove Duplicates
            </Button>
          </CardContent>
        </Card>

        {/* 2. Drop Missing Rows */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Eraser className="w-4 h-4 text-blue-600" />
              Drop Missing Value Rows
            </CardTitle>
            <CardDescription className="text-xs">
              Remove rows with empty or null cells.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Scope</Label>
              <Select value={dropMissingScope} onValueChange={(val: string | null) => setDropMissingScope(val || 'all')}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Column (All Columns)</SelectItem>
                  {columns.map(c => (
                    <SelectItem key={c.name} value={c.name}>Only if &quot;{c.name}&quot; is missing</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={onDropMissingSubmit}
              disabled={isBusy}
              variant="secondary"
              className="w-full flex items-center justify-center gap-2"
              size="sm"
            >
              {isPreviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              Preview &amp; Drop Missing Rows
            </Button>
          </CardContent>
        </Card>

        {/* 3. Drop Specific Rows by Index */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-600" />
              Drop Specific Rows
            </CardTitle>
            <CardDescription className="text-xs">
              Remove rows by 0-indexed row numbers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Row Indices (comma-separated)</Label>
              <Input
                value={rowIndicesToDrop}
                onChange={e => setRowIndicesToDrop(e.target.value)}
                placeholder="e.g. 0, 5, 23"
                className="h-8 text-xs font-mono"
              />
            </div>
            <Button
              onClick={onDropRowIndicesSubmit}
              disabled={isBusy || !rowIndicesToDrop.trim()}
              variant="outline"
              className="w-full flex items-center justify-center gap-2 text-xs"
              size="sm"
            >
              {isPreviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              Preview &amp; Drop Indices
            </Button>
          </CardContent>
        </Card>

        {/* 4. Missing Value Imputation */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-emerald-600" />
              Impute / Fill Missing Values
            </CardTitle>
            <CardDescription className="text-xs">
              Fill empty cells with statistical or custom replacements.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Target Column</Label>
                <Select value={fillColumn} onValueChange={(val: string | null) => setFillColumn(val || '')}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Choose column" />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map(c => (
                      <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Strategy</Label>
                <Select value={fillMethod} onValueChange={(val: FillMissingMethod | null) => val && setFillMethod(val)}>
                  <SelectTrigger className="h-8 text-xs">
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
                <Label className="text-xs">Custom Replacement Value</Label>
                <Input
                  value={fillCustomValue}
                  onChange={e => setFillCustomValue(e.target.value)}
                  placeholder="Enter replacement string or number..."
                  className="h-8 text-xs"
                />
              </div>
            )}

            <Button
              onClick={onFillMissingSubmit}
              disabled={isBusy || !fillColumn}
              className="w-full flex items-center justify-center gap-2"
              size="sm"
            >
              {isPreviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              Preview &amp; Fill Values
            </Button>
          </CardContent>
        </Card>

        {/* 5. Outlier Handling (IQR) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-orange-600" />
              Handle Outliers (IQR Method)
            </CardTitle>
            <CardDescription className="text-xs">
              Detect and treat statistical outliers (Q1 - 1.5*IQR to Q3 + 1.5*IQR).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Numerical Column</Label>
                <Select value={outlierColumn} onValueChange={(val: string | null) => setOutlierColumn(val || '')}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Choose column" />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map(c => (
                      <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Method</Label>
                <Select value={outlierMethod} onValueChange={(val: 'remove' | 'cap' | null) => val && setOutlierMethod(val)}>
                  <SelectTrigger className="h-8 text-xs">
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
              className="w-full flex items-center justify-center gap-2 text-xs"
              size="sm"
            >
              {isPreviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              Preview &amp; Handle Outliers
            </Button>
          </CardContent>
        </Card>

        {/* 6. Rename Column */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-indigo-600" />
              Rename Column
            </CardTitle>
            <CardDescription className="text-xs">
              Safely update a column header without altering contents.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Original Column</Label>
                <Select value={renameTarget} onValueChange={(val: string | null) => setRenameTarget(val || '')}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Choose column" />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map(c => (
                      <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">New Column Name</Label>
                <Input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. user_age"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <Button
              onClick={onRenameColumnSubmit}
              disabled={isBusy || !renameTarget || !newName.trim()}
              variant="outline"
              className="w-full flex items-center justify-center gap-2 text-xs"
              size="sm"
            >
              {isPreviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              Preview &amp; Rename Column
            </Button>
          </CardContent>
        </Card>

        {/* 7. Change Data Types */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-teal-600" />
              Convert Column Data Type
            </CardTitle>
            <CardDescription className="text-xs">
              Cast column values to a standard type with safety validation against silent data loss.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Column</Label>
                <Select value={typeTargetColumn} onValueChange={(val: string | null) => setTypeTargetColumn(val || '')}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Choose column" />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map(c => (
                      <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Target Type</Label>
                <Select value={targetType} onValueChange={(val: TargetDataType | null) => val && setTargetType(val)}>
                  <SelectTrigger className="h-8 text-xs">
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
              className="w-full flex items-center justify-center gap-2"
              size="sm"
            >
              {isPreviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              Preview &amp; Convert Data Type
            </Button>
          </CardContent>
        </Card>

        {/* 8. Drop Selected Columns */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-red-600" />
                  Drop Columns
                </CardTitle>
                <CardDescription className="text-xs">
                  Select one or more columns to remove permanently from the new dataset version.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                {selectedColumnsToDrop.length} of {columns.length} selected
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
              {columns.map(c => {
                const isChecked = selectedColumnsToDrop.includes(c.name)
                return (
                  <label
                    key={c.name}
                    htmlFor={`drop-${c.name}`}
                    className={`flex items-center space-x-2 p-2 rounded-md border text-xs cursor-pointer transition-colors ${
                      isChecked ? 'border-red-400 bg-red-50/50 dark:bg-red-950/30' : 'hover:bg-muted/50'
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

            <div className="flex justify-between items-center pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedColumnsToDrop([])}
                disabled={selectedColumnsToDrop.length === 0 || isBusy}
                className="text-xs"
              >
                Clear selection
              </Button>

              <Button
                variant="destructive"
                onClick={onDropColumnsSubmit}
                disabled={isBusy || selectedColumnsToDrop.length === 0}
                size="sm"
                className="flex items-center gap-2"
              >
                {isPreviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
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
        currentVersion={currentVersion}
        transformationSummary={pendingSummary}
      />
    </div>
  )
}
