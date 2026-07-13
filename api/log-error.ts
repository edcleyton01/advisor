// ============================================================
//  Função serverless (Vercel) — recebe erros do app em produção.
//  Zero dependências: o erro vira console.error, visível em
//  Vercel → projeto → Logs (filtre por "[client-error]").
//  Endpoint público → defensivo: rate limit por IP + payload truncado.
// ============================================================

const WINDOW_MS = 10 * 60 * 1000
const MAX_PER_WINDOW = 20
const hits = new Map<string, { n: number; at: number }>() // por instância (suficiente p/ abuso casual)

const clip = (v: unknown, max: number) => String(v ?? '').slice(0, max)

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' })

  const ip = String(req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim()
  const now = Date.now()
  const h = hits.get(ip)
  if (h && now - h.at < WINDOW_MS) {
    if (h.n >= MAX_PER_WINDOW) return res.status(429).json({ error: 'Muitos relatos; aguarde.' })
    h.n++
  } else {
    hits.set(ip, { n: 1, at: now })
  }
  if (hits.size > 1000) hits.clear() // não deixa o Map crescer sem limite

  const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body) } catch { return {} } })() : (req.body || {})
  console.error('[client-error]', JSON.stringify({
    message: clip(body.message, 500),
    stack: clip(body.stack, 2000),
    source: clip(body.source, 40),    // 'boundary' | 'window' | 'promise'
    url: clip(body.url, 200),
    ua: clip(req.headers['user-agent'], 160),
    at: new Date().toISOString(),
  }))
  return res.status(204).end()
}
