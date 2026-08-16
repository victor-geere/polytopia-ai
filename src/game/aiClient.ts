/**
 * LLM provider clients for AI turns (Grok / xAI, DeepSeek).
 */
import type { AiConfig, AiProvider } from './aiCompact'
import { AI_SYSTEM_PROMPT, buildAiUserPrompt } from './aiCompact'
import type { GameState, TribeId } from './types'

export type AiAction =
  | { op: 'move'; id: string; to: [number, number] }
  | { op: 'attack'; id: string; to: [number, number] }
  | { op: 'research'; tech: string }
  | { op: 'end' }

interface ProviderEndpoint {
  url: string
  model: string
}

function endpointFor(provider: AiProvider): ProviderEndpoint | null {
  switch (provider) {
    case 'grok':
      return {
        url: 'https://api.x.ai/v1/chat/completions',
        model: 'grok-4.6',
      }
    case 'deepseek':
      return {
        url: 'https://api.deepseek.com/chat/completions',
        model: 'deepseek-chat',
      }
    default:
      return null
  }
}

/** Extract a JSON array from model text (handles prose wrappers). */
export function parseActionsFromText(text: string): AiAction[] {
  const trimmed = text.trim()
  // Prefer first [...] block
  const start = trimmed.indexOf('[')
  const end = trimmed.lastIndexOf(']')
  if (start >= 0 && end > start) {
    try {
      const parsed = JSON.parse(trimmed.slice(start, end + 1))
      if (Array.isArray(parsed)) return normalizeActions(parsed)
    } catch {
      /* fall through */
    }
  }
  // Or { "actions": [...] }
  try {
    const obj = JSON.parse(trimmed)
    if (Array.isArray(obj)) return normalizeActions(obj)
    if (obj && Array.isArray(obj.actions)) return normalizeActions(obj.actions)
  } catch {
    /* ignore */
  }
  return [{ op: 'end' }]
}

function normalizeActions(raw: unknown[]): AiAction[] {
  const out: AiAction[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const op = o.op
    if (op === 'end') {
      out.push({ op: 'end' })
      continue
    }
    if (op === 'research' && typeof o.tech === 'string') {
      out.push({ op: 'research', tech: o.tech })
      continue
    }
    if ((op === 'move' || op === 'attack') && typeof o.id === 'string') {
      let to = o.to
      if (Array.isArray(to) && to.length >= 2) {
        out.push({
          op,
          id: o.id,
          to: [Number(to[0]), Number(to[1])],
        })
      }
    }
  }
  if (out.length === 0) out.push({ op: 'end' })
  return out.slice(0, 8)
}

export async function requestAiActions(
  state: GameState,
  aiTribe: TribeId,
  config: AiConfig,
  signal?: AbortSignal
): Promise<AiAction[]> {
  const ep = endpointFor(config.provider)
  if (!ep) {
    throw new Error(`Provider ${config.provider} is not available yet`)
  }

  const userContent = buildAiUserPrompt(state, aiTribe)

  const res = await fetch(ep.url, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: ep.model,
      temperature: 0.3,
      messages: [
        { role: 'system', content: AI_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`AI API ${res.status}: ${body.slice(0, 200) || res.statusText}`)
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const content = data.choices?.[0]?.message?.content ?? ''
  return parseActionsFromText(content)
}
