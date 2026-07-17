// ============================================================
//  Cliente do feed do Google Agenda (via /api/calendar-feed).
//
//  Estratégia anti-delay (stale-while-revalidate):
//  1) entrega NA HORA o cache da última visita (memória → localStorage);
//  2) busca a versão fresca em background e entrega de novo se mudou.
//  O cache é atrelado ao usuário logado — num navegador compartilhado,
//  o cache do staff nunca aparece para um mentorado (e vice-versa).
// ============================================================
import { supabase } from './supabase'
import type { GEvent } from './ics'

export type { GEvent }

const LS_KEY = 'advisor-os-gcal-cache'
const TTL = 2 * 60 * 1000

interface CacheEntry { uid: string; at: number; events: GEvent[] }

let mem: CacheEntry | null = null

function readLs(): CacheEntry | null {
  try {
    const j = JSON.parse(localStorage.getItem(LS_KEY) ?? 'null')
    return j && j.uid && Array.isArray(j.events) ? j : null
  } catch { return null }
}
function save(entry: CacheEntry) {
  mem = entry
  try { localStorage.setItem(LS_KEY, JSON.stringify(entry)) } catch { /* quota */ }
}

// Carrega eventos: chama onEvents com o cache imediatamente (se houver,
// do mesmo usuário) e de novo com os dados frescos quando chegarem.
export function loadGoogleEvents(onEvents: (evs: GEvent[]) => void): void {
  if (!supabase) return
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (!session) return
    const uid = session.user.id

    const cached = (mem?.uid === uid ? mem : null) ?? (() => { const c = readLs(); return c?.uid === uid ? c : null })()
    if (cached) {
      mem = cached
      onEvents(cached.events)                      // pinta na hora
      if (Date.now() - cached.at < TTL) return     // fresco o bastante — sem rede
    }

    fetch('/api/calendar-feed', { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(j => {
        const events = (j.events ?? []) as GEvent[]
        save({ uid, at: Date.now(), events })
        onEvents(events)
      })
      .catch(() => { /* mantém o cache que já entregamos */ })
  })
}

// Aquecimento na abertura do app: memória + localStorage + instância da função
export function prefetchGoogleEvents(): void {
  loadGoogleEvents(() => {})
}
