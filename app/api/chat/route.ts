import { createClient } from '@/lib/supabase/server'
import { getAIProvider } from '@/lib/ai/provider'
import { streamText } from 'ai'
import { NextResponse } from 'next/server'

export const maxDuration = 45

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Please log in to use AI Chat.' }, { status: 401 })
    }

    const { messages, datasetId } = await req.json().catch(() => ({}))

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages array.' }, { status: 400 })
    }

    let systemPrompt = `You are DataReady AI, an expert, objective data cleaning and Machine Learning preparation assistant.
Your goal is to help users understand their dataset quality, diagnostic findings, transformation history, and preparation steps for machine learning.
Base your explanations strictly on real dataset statistics and metrics provided below. Do not make up non-existent column names or fake numbers.`

    if (datasetId) {
      // 1. Fetch dataset
      const { data: dataset } = await supabase
        .from('datasets')
        .select('*')
        .eq('id', datasetId)
        .eq('user_id', user.id)
        .single()

      if (dataset) {
        const currentVersion = dataset.current_version ?? 0

        // 2. Fetch current full analysis
        const { data: currentAnalysis } = await supabase
          .from('analyses')
          .select('*')
          .eq('dataset_id', datasetId)
          .eq('analysis_type', 'full_analysis')
          .order('dataset_version', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        // 3. Fetch initial analysis (v0)
        const { data: initialAnalysis } = await supabase
          .from('analyses')
          .select('*')
          .eq('dataset_id', datasetId)
          .eq('analysis_type', 'full_analysis')
          .eq('dataset_version', 0)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()

        // 4. Fetch transformation history
        const { data: transformations } = await supabase
          .from('dataset_transformations')
          .select('*')
          .eq('dataset_id', datasetId)
          .order('new_version', { ascending: true })

        const currResults = currentAnalysis?.results || {}
        const initResults = initialAnalysis?.results || {}

        const historySummary = (transformations || []).map((t) => {
          return `• Version ${t.new_version} (${t.transformation_type}): affected ${t.affected_rows ?? 0} rows, ${t.affected_columns ?? 0} columns`
        }).join('\n')

        // Build structured context
        const contextPayload = {
          datasetInfo: {
            name: dataset.name,
            currentVersion: currentVersion,
            fileType: dataset.file_type,
            rowCount: dataset.row_count,
            columnCount: dataset.column_count,
            columns: (dataset.column_metadata || []).map((c: { name: string; type?: string }) => `${c.name} (${currResults.types?.[c.name] || c.type || 'unknown'})`),
          },
          currentMetrics: {
            mlReadinessScore: currentAnalysis?.ml_readiness_score ?? currResults.mlReadiness?.overallScore ?? 'N/A',
            mlComponents: currResults.mlReadiness?.components,
            missingValues: currResults.missingValues,
            duplicates: currResults.duplicates,
            outliers: currResults.outliers,
            recommendations: currentAnalysis?.recommendations || []
          },
          initialMetrics: initialAnalysis ? {
            mlReadinessScore: initialAnalysis.ml_readiness_score ?? initResults.mlReadiness?.overallScore ?? 'N/A',
            mlComponents: initResults.mlReadiness?.components,
            missingValues: initResults.missingValues,
            duplicates: initResults.duplicates,
            outliers: initResults.outliers
          } : null,
          transformationHistory: historySummary || 'No transformations applied yet (currently at original Version 0).'
        }

        systemPrompt += `\n\n==================================================
ACTIVE DATASET CONTEXT
==================================================
${JSON.stringify(contextPayload, null, 2)}

GUIDANCE FOR ANSWERS:
- If the user asks what they just transformed or what changes were made, refer directly to the transformation history and metric deltas between Initial and Current metrics.
- If the user asks whether the dataset improved, compare the initial ML readiness (${initialAnalysis?.ml_readiness_score ?? 'N/A'}) with the current score (${currentAnalysis?.ml_readiness_score ?? 'N/A'}) and cite specific reductions in missing values or duplicate rows.
- If the user asks what to do next, suggest specific actions from the recommendations or transformation tools (e.g. imputing missing values, removing duplicates, or capping outliers).`
      }
    }

    // Pass user.id to getAIProvider so user's encrypted key is prioritized
    let model
    try {
      model = await getAIProvider(user.id)
    } catch (providerError: unknown) {
      return NextResponse.json(
        { error: providerError instanceof Error ? providerError.message : 'AI provider not configured.' },
        { status: 503 }
      )
    }

    const result = await streamText({
      model,
      messages,
      system: systemPrompt,
    })

    return result.toTextStreamResponse()

  } catch (error: unknown) {
    console.error('Chat endpoint error:', error)
    if (error instanceof Error && error.message?.includes('AI provider not configured')) {
      return NextResponse.json(
        { error: 'AI provider not configured. Please add an API key in Settings.' },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred during AI chat.' },
      { status: 500 }
    )
  }
}
