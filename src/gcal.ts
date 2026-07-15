// ============================================================
//  Cliente do feed do Google Agenda (via /api/calendar-feed).
//  Silencioso: sem nuvem, sem login ou com erro → lista vazia.
// ============================================================
import { supabase } from './supabase'
import type { GEvent } from './ics'

export type { GEvent }

let cached: { at: number; events: GEvent[] } | null = null

export async function fetchGoogleEvents(): Promise<GEvent[]> {
  if (!supabase) return []
  if (cached && Date.now() - cached.at < 2 * 60 * 1000) return cached.events
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return []
    const r = await fetch('/api/calendar-feed', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (!r.ok) return cached?.events ?? []
    const j = await r.json()
    cached = { at: Date.now(), events: (j.events ?? []) as GEvent[] }
    return cached.events
  } catch {
    return cached?.events ?? []
  }
}
