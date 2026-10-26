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
            
            const columns = Object.keys(json[0] as Record<string, unknown> || {})
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
            const columns = Object.keys(json[0] || {})
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
    return <FileText className="h-10 w-10 text-blue-500 mb-4" />
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Upload Dataset</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">Upload your data for instant quality analysis and ML readiness scoring.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select File</CardTitle>
          <CardDescription>Supported formats: CSV, XLSX, JSON</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {!file ? (
            <div 
              className="border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-lg p-12 text-center hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer"
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
                {getFileIcon()}
                <p className="text-lg font-medium">Click or drag file to this area to upload</p>
                <p className="text-sm text-gray-500 mt-1">Maximum file sizes: CSV (50MB), Excel (25MB), JSON (50MB)</p>
              </div>
            </div>
          ) : (
            <div className="border rounded-lg p-6 flex items-center justify-between bg-gray-50 dark:bg-zinc-900/50">
              <div className="flex items-center space-x-4">
                {getFileIcon()}
                <div>
                  <h3 className="font-medium text-lg">{file.name}</h3>
                  <p className="text-sm text-gray-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
              </div>
              {!isUploading && (
                <Button variant="ghost" size="icon" onClick={() => setFile(null)}>
                  <X className="h-5 w-5" />
                </Button>
              )}
            </div>
          )}

          {isUploading && (
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span>Processing & Uploading...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-zinc-800 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end space-x-4">
          <Button variant="outline" onClick={() => router.push('/dashboard')} disabled={isUploading}>Cancel</Button>
          <Button onClick={handleUpload} disabled={!file || isUploading}>
            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isUploading ? 'Uploading...' : 'Upload & Analyze'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
