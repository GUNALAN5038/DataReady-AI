import { supabase } from '../lib/supabase'
import { apiRequest } from './api'
import { Config } from '../lib/config'
import { getAccessToken } from '../lib/supabase'
import type { TransformationConfig, TransformationRecord } from '../types/transformations'

export interface PreviewResult {
  sample: Record<string, unknown>[]
  totalRows: number
  totalColumns: number
  columns: string[]
}

export async function previewTransformation(
  datasetId: string,
  transformations: TransformationConfig[]
): Promise<{ preview?: PreviewResult; error?: string }> {
  const res = await apiRequest<{
    previewSample: Record<string, unknown>[]
    rowCount: number
    colCount: number
    columns: string[]
  }>(`/api/datasets/${datasetId}/transform/preview`, {
    method: 'POST',
    body: JSON.stringify({ transformations }),
  })

  if (res.error) {
    return { error: res.error }
  }

  return {
    preview: {
      sample: res.data?.previewSample || [],
      totalRows: res.data?.rowCount || 0,
      totalColumns: res.data?.colCount || 0,
      columns: res.data?.columns || [],
    },
  }
}

export async function applyTransformation(
  datasetId: string,
  transformations: TransformationConfig[]
): Promise<{ success: boolean; newVersion?: number; error?: string }> {
  const res = await apiRequest<{
    success: boolean
    newVersion: number
  }>(`/api/datasets/${datasetId}/transform`, {
    method: 'POST',
    body: JSON.stringify({ transformations }),
  })

  if (res.error) {
    return { success: false, error: res.error }
  }

  return { success: true, newVersion: res.data?.newVersion }
}

export async function fetchTransformationHistory(
  datasetId: string
): Promise<{ history: TransformationRecord[]; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { history: [], error: 'Unauthorized' }
    }

    const { data, error } = await supabase
      .from('dataset_transformations')
      .select('*')
      .eq('dataset_id', datasetId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return { history: [], error: error.message }
    }
    return { history: (data as TransformationRecord[]) || [] }
  } catch (err: unknown) {
    return { history: [], error: err instanceof Error ? err.message : 'Failed to fetch transformation history' }
  }
}

export async function revertTransformation(
  datasetId: string,
  targetVersion: number
): Promise<{ success: boolean; error?: string }> {
  const res = await apiRequest<{ success: boolean }>(`/api/datasets/${datasetId}/revert`, {
    method: 'POST',
    body: JSON.stringify({ targetVersion }),
  })

  if (res.error) {
    return { success: false, error: res.error }
  }
  return { success: true }
}

export async function downloadExportFile(
  datasetId: string,
  format: 'csv' | 'xlsx' = 'csv',
  version?: number
): Promise<{ content?: string; filename?: string; error?: string }> {
  const token = await getAccessToken()
  const versionParam = version !== undefined ? `&version=${version}` : ''
  const url = `${Config.apiUrl}/api/datasets/${datasetId}/export?format=${format}${versionParam}`

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token || ''}`,
      },
    })

    if (!res.ok) {
      const errJson = await res.json().catch(() => null)
      return { error: errJson?.error || `Export failed with status ${res.status}` }
    }

    const disposition = res.headers.get('content-disposition') || ''
    const match = disposition.match(/filename="([^"]+)"/)
    const filename = match ? match[1] : `dataset_export.${format}`

    const text = await res.text()
    return { content: text, filename }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Failed to download export file' }
  }
}
