// ============================================================
//  Função serverless (Vercel) — lê a agenda do Google (ICS secreto)
//  e devolve os eventos como JSON. A URL fica SÓ no servidor
//  (env CALENDAR_ICS_URL, sem prefixo VITE_).
//
//  Acesso: exige login. Staff vê todos os eventos; mentorado só
//  os que trazem o primeiro nome dele no título (convenção:
//  "Checkpoint … | Nome" / "Mentoria · Nome — pauta").
// ============================================================
import { createClient } from '@supabase/supabase-js'
import { parseIcs, type GEvent } from '../src/ics.js'

let cache: { at: number; events: GEvent[] } | null = null
const TTL = 5 * 60 * 1000

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' })

  const icsUrl = process.env.CALENDAR_ICS_URL
  if (!icsUrl) return res.status(200).json({ configured: false, events: [] })

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return res.status(500).json({ error: 'Serviço não configurado.' })

  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: 'Sem autenticação.' })

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: caller, error: cErr } = await admin.auth.getUser(token)
  if (cErr || !caller?.user) return res.status(401).json({ error: 'Sessão inválida.' })
  const { data: prof } = await admin.from('profiles').select('role, mentee_id').eq('user_id', caller.user.id).maybeSingle()
  if (!prof) return res.status(403).json({ error: 'Sem perfil.' })

  // busca + parse com cache (por instância)
  if (!cache || Date.now() - cache.at > TTL) {
    try {
      const r = await fetch(icsUrl)
      if (!r.ok) throw new Error(`ICS ${r.status}`)
      cache = { at: Date.now(), events: parseIcs(await r.text()) }
    } catch (e: any) {
      console.error('[calendar-feed]', e?.message)
      if (!cache) return res.status(502).json({ error: 'Não foi possível ler a agenda do Google.' })
      // cache velho é melhor que nada
    }
  }

  let events = cache.events
  if (!['advisor', 'team'].includes(prof.role)) {
    // mentorado: só eventos com o primeiro nome dele no título
    const { data: row } = await admin.from('mentees').select('data').eq('id', prof.mentee_id ?? '').maybeSingle()
    const first = norm(String((row?.data as any)?.mentee?.name ?? '').split(' ')[0] || '')
    events = first.length >= 3 ? events.filter(e => norm(e.title).includes(first)) : []
  }

  res.setHeader('Cache-Control', 'private, max-age=120')
  return res.status(200).json({ configured: true, events })
}
