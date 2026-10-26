import { createGoogleGenerativeAI } from '@ai-sdk/google'

export function getGeminiModel(customApiKey?: string) {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) {
    throw new Error('AI provider not configured. Please add an API key in Settings.')
  }
  const google = createGoogleGenerativeAI({
    apiKey,
  })
  return google('gemini-1.5-pro-latest')
}
