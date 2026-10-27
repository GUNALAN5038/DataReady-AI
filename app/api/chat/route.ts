import { createClient } from '@/lib/supabase/server'
import { getAIProvider } from '@/lib/ai/provider'
import { isOffTopicOrRestricted, buildSecureSystemPrompt, SCOPE_RESTRICTION_MESSAGE } from '@/lib/ai/guardrails'
import { streamText } from 'ai'
import { NextResponse } from 'next/server'

export const maxDuration = 45

function createDirectStreamResponse(text: string, conversationId: string) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text))
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Conversation-Id': conversationId,
    },
  })
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Please log in to use AI Chat.' }, { status: 401 })
    }

    const { messages, datasetId, conversationId: requestedConvId } = await req.json().catch(() => ({}))

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Invalid messages array.' }, { status: 400 })
    }

    const latestUserMessage = messages[messages.length - 1]
    const userPrompt = latestUserMessage?.content || ''

    // 1. Resolve or create conversation
    let activeConversationId = requestedConvId as string | undefined

    if (activeConversationId) {
      // Verify conversation belongs to current user
      const { data: existingConv } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('id', activeConversationId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (!existingConv) {
        activeConversationId = undefined
      }
    }

    if (!activeConversationId) {
      // Auto-generate title from the first message
      let generatedTitle = userPrompt.trim().replace(/[\r\n]+/g, ' ')
      if (generatedTitle.length > 45) {
        generatedTitle = generatedTitle.slice(0, 42).trim() + '...'
      }
      if (!generatedTitle) {
        generatedTitle = 'New Analysis Session'
      }

      const { data: newConv, error: newConvError } = await supabase
        .from('chat_conversations')
        .insert({
          user_id: user.id,
          dataset_id: datasetId || null,
          title: generatedTitle,
        })
        .select('id')
        .single()

      if (!newConvError && newConv) {
        activeConversationId = newConv.id
      }
    }

    // 2. Persist the user's message
    if (activeConversationId && latestUserMessage && latestUserMessage.role === 'user') {
      try {
        await supabase.from('chat_messages').insert({
          conversation_id: activeConversationId,
          user_id: user.id,
          role: 'user',
          content: userPrompt,
        })
      } catch (saveErr) {
        console.warn('Failed to save incoming user message:', saveErr)
      }
    }

    // 3. Server-side Guardrail & Scope Validation
    if (isOffTopicOrRestricted(userPrompt)) {
      // Persist the canned rejection response as an assistant message
      if (activeConversationId) {
        try {
          await supabase.from('chat_messages').insert({
            conversation_id: activeConversationId,
            user_id: user.id,
            role: 'assistant',
            content: SCOPE_RESTRICTION_MESSAGE,
          })
          await supabase
            .from('chat_conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', activeConversationId)
        } catch (saveErr) {
          console.warn('Failed to save guardrail assistant message:', saveErr)
        }
      }

      return createDirectStreamResponse(SCOPE_RESTRICTION_MESSAGE, activeConversationId || '')
    }

    // 4. Retrieve Active Dataset Context if datasetId provided
    let datasetContextString: string | undefined = undefined

    if (datasetId) {
      const { data: dataset } = await supabase
        .from('datasets')
        .select('*')
        .eq('id', datasetId)
        .eq('user_id', user.id)
        .single()

      if (dataset) {
        const currentVersion = dataset.current_version ?? 0

        const { data: currentAnalysis } = await supabase
          .from('analyses')
          .select('*')
          .eq('dataset_id', datasetId)
          .eq('analysis_type', 'full_analysis')
          .order('dataset_version', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        const { data: initialAnalysis } = await supabase
          .from('analyses')
          .select('*')
          .eq('dataset_id', datasetId)
          .eq('analysis_type', 'full_analysis')
          .eq('dataset_version', 0)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()

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

        datasetContextString = JSON.stringify(contextPayload, null, 2)
      }
    }

    const systemPrompt = buildSecureSystemPrompt(datasetContextString)

    // 5. Initialize AI Model (Google Gemini via user key or system env key)
    let model
    try {
      model = await getAIProvider(user.id)
    } catch (providerError: unknown) {
      return NextResponse.json(
        { error: providerError instanceof Error ? providerError.message : 'AI provider not configured.' },
        { status: 503 }
      )
    }

    // 6. Stream completion with persistence on finish
    const savedConvId = activeConversationId
    const result = await streamText({
      model,
      messages,
      system: systemPrompt,
      onFinish: async (event) => {
        try {
          if (event.text && savedConvId) {
            await supabase.from('chat_messages').insert({
              conversation_id: savedConvId,
              user_id: user.id,
              role: 'assistant',
              content: event.text,
            })
            await supabase
              .from('chat_conversations')
              .update({ updated_at: new Date().toISOString() })
              .eq('id', savedConvId)
          }
        } catch (saveErr) {
          console.error('Error saving assistant message:', saveErr)
        }
      },
    })

    const streamResponse = result.toTextStreamResponse()
    if (savedConvId) {
      streamResponse.headers.set('X-Conversation-Id', savedConvId)
    }
    return streamResponse

  } catch (error: unknown) {
    console.error('Chat endpoint error:', error)

    let statusCode = 500
    let userMessage = 'An error occurred while communicating with the AI. Please verify your credentials and try again.'

    if (error instanceof Error) {
      const msg = error.message
      const lower = msg.toLowerCase()

      if (lower.includes('ai provider not configured') || lower.includes('failed to decrypt saved api key')) {
        statusCode = 503
        userMessage = msg
      } else if (lower.includes('api key not valid') || lower.includes('api_key_invalid') || lower.includes('unauthenticated')) {
        statusCode = 401
        userMessage = 'Your Google Gemini API key is invalid. Please verify and re-enter your key in Settings.'
      } else if (lower.includes('resource_exhausted') || lower.includes('quota') || lower.includes('rate limit')) {
        statusCode = 429
        userMessage = 'Google Gemini API rate limit or quota exceeded. Please wait a moment and try again.'
      } else if (lower.includes('not found') || lower.includes('models/')) {
        statusCode = 502
        userMessage = 'The requested Gemini model is currently unavailable or misconfigured. Please try again.'
      } else {
        // Sanitize any potential internal URLs or query params
        userMessage = msg.replace(/https?:\/\/[^\s]+/g, '').trim() || userMessage
      }
    }

    return NextResponse.json({ error: userMessage }, { status: statusCode })
  }
}
