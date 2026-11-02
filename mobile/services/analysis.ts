import { supabase } from '../lib/supabase'
import { apiRequest } from './api'
import type { AnalysisRecord } from '../types/analysis'

export async function triggerAnalysis(datasetId: string): Promise<{ success: boolean; error?: string }> {
  const res = await apiRequest<{ success: boolean }>(`/api/datasets/${datasetId}/analyze`, {
    method: 'POST',
  })

  if (res.error) {
    return { success: false, error: res.error }
  }
  return { success: true }
}

export async function fetchAnalysis(
  datasetId: string,
  version: number = 0
): Promise<{ analysis: AnalysisRecord | null; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { analysis: null, error: 'Unauthorized' }
    }

    // 1. Try to fetch analysis for this version
    const { data, error } = await supabase
      .from('analyses')
      .select('*')
      .eq('dataset_id', datasetId)
      .eq('user_id', user.id)
      .eq('dataset_version', version)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      return { analysis: null, error: error.message }
    }

    if (data) {
      return { analysis: data as AnalysisRecord }
    }

    // 2. Fallback: query without version filter if specific version not found
    const { data: fallbackData } = await supabase
      .from('analyses')
      .select('*')
      .eq('dataset_id', datasetId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return { analysis: (fallbackData as AnalysisRecord) || null }
  } catch (err: unknown) {
    return { analysis: null, error: err instanceof Error ? err.message : 'Failed to fetch analysis' }
  }
}

export interface AIInsightsResponse {
  summary: string
  keyFindings: string[]
  anomalies: string[]
  mlReadinessInsight: string
  recommendations: string[]
}

export async function fetchAIInsights(
  datasetId: string,
  refresh: boolean = false
): Promise<{ insights: AIInsightsResponse | null; error?: string; code?: string }> {
  const query = refresh ? '?refresh=true' : ''
  const res = await apiRequest<AIInsightsResponse>(`/api/datasets/${datasetId}/insights${query}`, {
    method: 'GET',
  })

  if (res.error) {
    return { insights: null, error: res.error }
  }
  return { insights: res.data || null }
}
