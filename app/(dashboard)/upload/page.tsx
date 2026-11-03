'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Upload as UploadIcon, FileSpreadsheet, FileJson, FileText, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Alert, AlertDescription } from '@/components/ui/alert'
import * as Papa from 'papaparse'
import * as XLSX from 'xlsx'

const MAX_CSV_SIZE = 50 * 1024 * 1024 // 50MB
const MAX_EXCEL_SIZE = 25 * 1024 * 1024 // 25MB
const MAX_JSON_SIZE = 50 * 1024 * 1024 // 50MB

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0]
      validateAndSetFile(selected)
    }
  }

  const validateAndSetFile = (selected: File) => {
    setError(null)
    if (!selected || selected.size === 0) {
      setError('The selected file is empty (0 bytes). Please upload a valid dataset.')
      return
    }

    const ext = selected.name.split('.').pop()?.toLowerCase()
    
    if (!['csv', 'xlsx', 'xls', 'json'].includes(ext || '')) {
      setError('Unsupported file type. Please upload a CSV, XLSX, XLS, or JSON file.')
      return
    }

    if (ext === 'csv' && selected.size > MAX_CSV_SIZE) {
      setError('CSV file exceeds 50MB limit.')
      return
    }
    if ((ext === 'xlsx' || ext === 'xls') && selected.size > MAX_EXCEL_SIZE) {
      setError('Excel file exceeds 25MB limit.')
      return
    }
    if (ext === 'json' && selected.size > MAX_JSON_SIZE) {
      setError('JSON file exceeds 50MB limit.')
      return
    }

    setFile(selected)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0])
    }
  }

  const parseFileMetadata = async (file: File): Promise<{ rowCount: number, colCount: number, sampleData: Record<string, unknown>[], columns: { name: string, type: string }[] }> => {
    return new Promise((resolve, reject) => {
      const ext = file.name.split('.').pop()?.toLowerCase()
      
      if (ext === 'csv') {
        Papa.parse(file, {
          header: true,
          preview: 100, // sample 100 rows
          skipEmptyLines: true,
          complete: (results) => {
            if (results.errors.length > 0 && results.data.length === 0) {
              reject(new Error('Failed to parse CSV'))
            } else {
              const columns = results.meta.fields || []
              if (columns.length === 0 && results.data.length === 0) {
                reject(new Error('The CSV file contains no columns or data rows.'))
                return
              }
              resolve({
                rowCount: 0, // PapaParse preview doesn't give total count, we'll calculate it or just set 0 and update later
                colCount: columns.length,
                sampleData: results.data as Record<string, unknown>[],
                columns: columns.map(c => ({ name: c, type: 'unknown' }))
              })
            }
          },
          error: (err) => reject(err)
        })
      } else if (ext === 'xlsx' || ext === 'xls') {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer)
            const workbook = XLSX.read(data, { type: 'array' })
            const firstSheetName = workbook.SheetNames[0]
            const worksheet = workbook.Sheets[firstSheetName]
            const json = XLSX.utils.sheet_to_json(worksheet)
            
            if (!json || json.length === 0) {
              reject(new Error('The Excel sheet contains no data rows.'))
              return
            }

            const columns = Object.keys(json[0] as Record<string, unknown> || {})
            if (columns.length === 0) {
              reject(new Error('The Excel sheet contains no columns.'))
              return
            }

            resolve({
              rowCount: json.length,
              colCount: columns.length,
              sampleData: json.slice(0, 100) as Record<string, unknown>[],
              columns: columns.map(c => ({ name: c, type: 'unknown' }))
            })
          } catch {
            reject(new Error('Failed to parse Excel file'))
          }
        }
        reader.onerror = () => reject(new Error('File read error'))
        reader.readAsArrayBuffer(file)
      } else if (ext === 'json') {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const json = JSON.parse(e.target?.result as string)
            if (!Array.isArray(json)) {
              reject(new Error('JSON must be an array of objects'))
              return
            }
            if (json.length === 0) {
              reject(new Error('JSON array is empty.'))
              return
            }
            const columns = Object.keys(json[0] || {})
            if (columns.length === 0) {
              reject(new Error('JSON objects contain no properties.'))
              return
            }
            resolve({
              rowCount: json.length,
              colCount: columns.length,
              sampleData: json.slice(0, 100) as Record<string, unknown>[],
              columns: columns.map(c => ({ name: c, type: 'unknown' }))
            })
          } catch {
            reject(new Error('Invalid JSON format'))
          }
        }
        reader.onerror = () => reject(new Error('File read error'))
        reader.readAsText(file)
      } else {
        reject(new Error('Unsupported format'))
      }
    })
  }

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)
    setError(null)
    setProgress(10)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      setProgress(30)
      
      // Parse file for metadata
      let metadata;
      try {
        metadata = await parseFileMetadata(file)
      } catch (err: unknown) {
        throw new Error(`Parsing Error: ${err instanceof Error ? err.message : String(err)}`)
      }
      setProgress(50)

      // Create dataset record first to get ID
      const { data: dataset, error: dbError } = await supabase
        .from('datasets')
        .insert({
          user_id: user.id,
          name: file.name,
          file_name: file.name,
          original_file_path: 'pending',
          current_file_path: 'pending',
          current_version: 0,
          file_type: file.type || file.name.split('.').pop(),
          file_size: file.size,
          row_count: metadata.rowCount,
          column_count: metadata.colCount,
          column_metadata: metadata.columns,
          sample_data: metadata.sampleData,
          status: 'uploading'
        })
        .select()
        .single()

      if (dbError || !dataset) throw new Error(`Database Error: ${dbError?.message}`)

      setProgress(70)

      // Upload file to storage
      const filePath = `${user.id}/${dataset.id}/${file.name}`
      const { error: storageError } = await supabase.storage
        .from('datasets')
        .upload(filePath, file)

      if (storageError) {
        // Rollback dataset record if storage fails
        await supabase.from('datasets').delete().eq('id', dataset.id)
        throw new Error(`Storage Error: ${storageError.message}`)
      }

      setProgress(85)

      // Update dataset record with file path and status
      await supabase
        .from('datasets')
        .update({
          original_file_path: filePath,
          current_file_path: filePath,
          current_version: 0,
          status: 'uploaded'
        })
        .eq('id', dataset.id)

      setProgress(95)

      // Trigger server-side analysis
      const res = await fetch(`/api/datasets/${dataset.id}/analyze`, {
        method: 'POST'
      })

      if (!res.ok) {
        // We won't throw here, just mark as failed analysis and continue to dataset page
        console.error('Analysis trigger failed')
      }

      setProgress(100)
      router.push(`/datasets/${dataset.id}`)

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
      setIsUploading(false)
      setProgress(0)
    }
  }

  const getFileIcon = () => {
    if (!file) return <UploadIcon className="h-10 w-10 text-gray-400 mb-4" />
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext === 'csv') return <FileText className="h-10 w-10 text-blue-500 mb-4" />
    if (ext === 'xlsx' || ext === 'xls') return <FileSpreadsheet className="h-10 w-10 text-green-500 mb-4" />
    if (ext === 'json') return <FileJson className="h-10 w-10 text-yellow-500 mb-4" />
    return <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Upload Dataset</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Upload your tabular data for instant quality inspection, automated profiling, and ML readiness scoring.
        </p>
      </div>

      <Card className="border-border/80 shadow-xs overflow-hidden">
        <CardHeader className="bg-muted/15 border-b border-border/60 pb-4">
          <CardTitle className="text-base font-semibold">Select or Drop Data File</CardTitle>
          <CardDescription className="text-xs">
            Supports structured formats: CSV, Excel (.xlsx, .xls), and JSON arrays
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {error && (
            <Alert variant="destructive" className="mb-5">
              <AlertDescription className="text-sm font-medium">{error}</AlertDescription>
            </Alert>
          )}
          
          {!file ? (
            <div 
              className="border-2 border-dashed border-indigo-200/90 dark:border-indigo-900/60 rounded-2xl p-10 sm:p-14 text-center bg-gradient-to-b from-indigo-50/25 via-background to-background dark:from-indigo-950/20 hover:border-indigo-500/70 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/40 transition-all cursor-pointer group"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".csv,.xlsx,.xls,.json"
              />
              <div className="flex flex-col items-center">
                <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-105 group-hover:bg-indigo-500/15 transition-all shadow-xs">
                  <UploadIcon className="h-8 w-8" />
                </div>
                <p className="text-base font-semibold text-foreground">Click to browse or drag &amp; drop your dataset file</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Files are securely stored in your private workspace and processed with client/server validation.
                </p>
                <div className="flex flex-wrap gap-2 justify-center mt-5">
                  <span className="text-[11px] font-mono font-medium px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200/50">CSV ≤ 50MB</span>
                  <span className="text-[11px] font-mono font-medium px-2.5 py-1 rounded-md bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 border border-teal-200/50">Excel ≤ 25MB</span>
                  <span className="text-[11px] font-mono font-medium px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200/50">JSON ≤ 50MB</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-border/80 rounded-xl p-5 flex items-center justify-between bg-muted/30">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  {getFileIcon()}
                </div>
                <div>
                  <h3 className="font-semibold text-base text-foreground">{file.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                    <span>•</span>
                    <span className="uppercase font-mono">{file.name.split('.').pop()}</span>
                  </div>
                </div>
              </div>
              {!isUploading && (
                <Button variant="ghost" size="icon" onClick={() => setFile(null)} className="text-muted-foreground hover:text-destructive">
                  <X className="h-5 w-5" />
                </Button>
              )}
            </div>
          )}

          {isUploading && (
            <div className="mt-6 space-y-2 p-4 bg-indigo-50/30 dark:bg-indigo-950/30 rounded-xl border border-indigo-200/40 dark:border-indigo-900/40">
              <div className="flex justify-between text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Processing schema &amp; uploading...
                </span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-muted dark:bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-500 h-2.5 rounded-full transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end gap-3 bg-muted/15 border-t border-border/60 py-4">
          <Button variant="outline" onClick={() => router.push('/dashboard')} disabled={isUploading} className="text-xs font-medium">
            Cancel
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={!file || isUploading}
            className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white shadow-sm hover:shadow-md transition-all text-xs font-semibold"
          >
            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isUploading ? 'Uploading & Analyzing...' : 'Upload & Analyze Dataset'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
