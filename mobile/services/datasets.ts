import { supabase } from '../lib/supabase'
import { apiRequest } from './api'
import type { Dataset, DatasetSummary } from '../types/datasets'

export async function fetchDatasets(): Promise<{ datasets: Dataset[]; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { datasets: [], error: 'Please sign in to view your datasets.' }
    }

    const { data, error } = await supabase
      .from('datasets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return { datasets: [], error: error.message }
    }
    return { datasets: (data as Dataset[]) || [] }
  } catch (err: unknown) {
    return { datasets: [], error: err instanceof Error ? err.message : 'Failed to fetch datasets' }
  }
}

export async function fetchDatasetById(id: string): Promise<{ dataset: Dataset | null; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { dataset: null, error: 'Please sign in to view dataset.' }
    }

    const { data, error } = await supabase
      .from('datasets')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      return { dataset: null, error: error.message }
    }
    return { dataset: data as Dataset }
  } catch (err: unknown) {
    return { dataset: null, error: err instanceof Error ? err.message : 'Failed to fetch dataset' }
  }
}

export interface UploadFileParam {
  uri: string
  name: string
  type: string
  size: number
  content?: string
}

export async function uploadDataset(
  file: UploadFileParam,
  onProgress?: (progress: number) => void
): Promise<{ dataset?: Dataset; error?: string }> {
  try {
    onProgress?.(10)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { error: 'Authentication required to upload dataset' }
    }

    onProgress?.(25)

    // Parse simple CSV row/col count if text content is available
    let rowCount = 0
    let colCount = 0
    let sampleData: Record<string, unknown>[] = []
    let columnMetadata: { name: string; type: string }[] = []

    if (file.content) {
      const lines = file.content.split(/\r?\n/).filter(line => line.trim().length > 0)
      if (lines.length > 0) {
        const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''))
        colCount = headers.length
        rowCount = Math.max(0, lines.length - 1)
        columnMetadata = headers.map(name => ({ name, type: 'unknown' }))

        sampleData = lines.slice(1, Math.min(20, lines.length)).map(line => {
          const vals = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''))
          const row: Record<string, unknown> = {}
          headers.forEach((h, i) => {
            row[h] = vals[i] ?? null
          })
          return row
        })
      }
    }

    onProgress?.(45)

    // 1. Create dataset record first
    const { data: newDataset, error: dbError } = await supabase
      .from('datasets')
      .insert({
        user_id: user.id,
        name: file.name,
        file_name: file.name,
        original_file_path: 'pending',
        current_file_path: 'pending',
        current_version: 0,
        file_type: file.type || file.name.split('.').pop() || 'csv',
        file_size: file.size,
        row_count: rowCount,
        column_count: colCount,
        column_metadata: columnMetadata,
        sample_data: sampleData,
        status: 'uploading',
      })
      .select()
      .single()

    if (dbError || !newDataset) {
      return { error: `Database error: ${dbError?.message || 'Failed to create dataset record'}` }
    }

    onProgress?.(65)

    // 2. Upload file content to Supabase Storage
    const storagePath = `${user.id}/${newDataset.id}/${file.name}`
    let uploadPayload: Blob | ArrayBuffer | string = file.content || ''

    if (!file.content) {
      // Fetch file blob from local URI (mobile FileSystem / DocumentPicker)
      const res = await fetch(file.uri)
      uploadPayload = await res.blob()
    }

    const { error: storageError } = await supabase.storage
      .from('datasets')
      .upload(storagePath, uploadPayload, {
        contentType: file.type || 'text/csv',
        upsert: true,
      })

    if (storageError) {
      // Rollback database record
      await supabase.from('datasets').delete().eq('id', newDataset.id)
      return { error: `Storage upload error: ${storageError.message}` }
    }

    onProgress?.(85)

    // 3. Update dataset status and paths
    const { data: updatedDataset, error: updateError } = await supabase
      .from('datasets')
      .update({
        original_file_path: storagePath,
        current_file_path: storagePath,
        current_version: 0,
        status: 'uploaded',
      })
      .eq('id', newDataset.id)
      .select()
      .single()

    if (updateError) {
      return { error: `Update error: ${updateError.message}` }
    }

    onProgress?.(95)

    // 4. Trigger server-side analysis via Bearer authenticated Next.js endpoint
    await apiRequest(`/api/datasets/${newDataset.id}/analyze`, { method: 'POST' }).catch(() => {
      // Non-fatal if server is offline during initial upload
    })

    onProgress?.(100)
    return { dataset: updatedDataset as Dataset }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Unexpected upload error' }
  }
}

export async function deleteDataset(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const { error } = await supabase
      .from('datasets')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to delete dataset' }
  }
}

export async function fetchDatasetSummary(): Promise<DatasetSummary> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { totalDatasets: 0, analyzedDatasets: 0, totalRows: 0 }
    }

    const { data: datasets } = await supabase
      .from('datasets')
      .select('id, row_count, status')
      .eq('user_id', user.id)

    const totalDatasets = datasets?.length || 0
    const analyzedDatasets = datasets?.filter(d => d.status === 'analyzed').length || 0
    const totalRows = datasets?.reduce((sum, d) => sum + (d.row_count || 0), 0) || 0

    // Fetch average ML readiness score for user's analyses
    const { data: scores } = await supabase
      .from('analyses')
      .select('ml_readiness_score')
      .eq('user_id', user.id)
      .not('ml_readiness_score', 'is', null)

    let avgMlReadiness: number | undefined
    if (scores && scores.length > 0) {
      const sum = scores.reduce((acc, curr) => acc + (curr.ml_readiness_score || 0), 0)
      avgMlReadiness = Math.round(sum / scores.length)
    }

    return {
      totalDatasets,
      analyzedDatasets,
      totalRows,
      avgMlReadiness,
      avgQualityScore: avgMlReadiness ? Math.min(100, Math.round(avgMlReadiness * 1.05)) : undefined,
    }
  } catch {
    return { totalDatasets: 0, analyzedDatasets: 0, totalRows: 0 }
  }
}
