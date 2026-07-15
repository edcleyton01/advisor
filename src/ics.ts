// ============================================================
//  Parser de ICS (Google Calendar) — puro, sem dependências.
//  Cobre o que o feed real usa: DTSTART em UTC ("Z"), com TZID,
//  ou VALUE=DATE (dia inteiro); RRULE DAILY/WEEKLY/MONTHLY/YEARLY
//  com INTERVAL, UNTIL, COUNT, BYDAY (incl. "2TH"/"-1TH") e EXDATE.
//  Saída sempre no fuso de São Paulo.
// ============================================================

export interface GEvent {
  id: string
  date: string        // YYYY-MM-DD (America/Sao_Paulo)
  time: string | null // HH:MM, ou null para dia inteiro
  title: string
  allDay: boolean
}

const OUT_TZ = 'America/Sao_Paulo'
const DAY = 86400000
const WD = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']

// partes de data/hora de um epoch, no fuso pedido
function wallParts(epoch: number, tz: string) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
  const p: Record<string, string> = {}
  for (const part of fmt.formatToParts(epoch)) p[part.type] = part.value
  return { y: +p.year, m: +p.month, d: +p.day, hh: +p.hour % 24, mm: +p.minute }
}

// hora "de parede" num fuso → epoch (inversão via dupla correção)
function zonedToEpoch(y: number, m: number, d: number, hh: number, mm: number, tz: string): number {
  let guess = Date.UTC(y, m - 1, d, hh, mm)
  for (let i = 0; i < 2; i++) {
    const w = wallParts(guess, tz)
    guess += Date.UTC(y, m - 1, d, hh, mm) - Date.UTC(w.y, w.m - 1, w.d, w.hh, w.mm)
  }
  return guess
}

interface Wall { y: number; m: number; d: number; hh: number; mm: number; allDay: boolean; tz: string }

function parseDt(value: string, params: string): Wall | null {
  const tzid = /TZID=([^;:]+)/.exec(params)?.[1]
  if (/VALUE=DATE(;|$)/.test(params) || /^\d{8}$/.test(value)) {
    const m = /^(\d{4})(\d{2})(\d{2})$/.exec(value)
    if (!m) return null
    return { y: +m[1], m: +m[2], d: +m[3], hh: 0, mm: 0, allDay: true, tz: OUT_TZ }
  }
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/.exec(value)
  if (!m) return null
  const [, y, mo, d, hh, mi, , z] = m
  return { y: +y, m: +mo, d: +d, hh: +hh, mm: +mi, allDay: false, tz: z ? 'UTC' : (tzid ?? OUT_TZ) }
}

const wallKey = (w: { y: number; m: number; d: number; hh: number; mm: number }) =>
  `${w.y}${String(w.m).padStart(2, '0')}${String(w.d).padStart(2, '0')}T${String(w.hh).padStart(2, '0')}${String(w.mm).padStart(2, '0')}`

// ocorrência (parede no tz do evento) → GEvent no fuso de SP
function toEvent(uid: string, title: string, w: Wall): GEvent {
  const pad = (n: number) => String(n).padStart(2, '0')
  if (w.allDay) {
    return { id: `${uid}-${wallKey(w)}`, date: `${w.y}-${pad(w.m)}-${pad(w.d)}`, time: null, title, allDay: true }
  }
  const sp = wallParts(zonedToEpoch(w.y, w.m, w.d, w.hh, w.mm, w.tz), OUT_TZ)
  return {
    id: `${uid}-${wallKey(w)}`,
    date: `${sp.y}-${pad(sp.m)}-${pad(sp.d)}`,
    time: `${pad(sp.hh)}:${pad(sp.mm)}`,
    title, allDay: false,
  }
}

const unesc = (s: string) => s.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim()

// dia da semana (0=domingo) de uma data "de parede"
const dow = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d)).getUTCDay()
const shiftWall = (w: Wall, days: number): Wall => {
  const dt = new Date(Date.UTC(w.y, w.m - 1, w.d + days))
  return { ...w, y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() }
}

// n-ésimo dia-da-semana do mês (n<0 = a partir do fim); null se não existe
function nthWeekday(y: number, m: number, weekday: number, n: number): number | null {
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  if (n > 0) {
    const first = dow(y, m, 1)
    const d = 1 + ((weekday - first + 7) % 7) + (n - 1) * 7
    return d <= last ? d : null
  }
  const lastDow = dow(y, m, last)
  const d = last - ((lastDow - weekday + 7) % 7) + (n + 1) * 7
  return d >= 1 ? d : null
}

function expandRrule(rrule: string, start: Wall, winStart: number, winEnd: number, exdates: Set<string>): Wall[] {
  const get = (k: string) => new RegExp(`(?:^|;)${k}=([^;]+)`).exec(rrule)?.[1]
  const freq = get('FREQ')
  const interval = Math.max(1, +(get('INTERVAL') ?? 1))
  const count = get('COUNT') ? +get('COUNT')! : Infinity
  const untilRaw = get('UNTIL')
  let until = Infinity
  if (untilRaw) {
    const u = parseDt(untilRaw, untilRaw.endsWith('Z') ? '' : 'VALUE=DATE')
    if (u) until = zonedToEpoch(u.y, u.m, u.d, u.allDay ? 23 : u.hh, u.allDay ? 59 : u.mm, u.tz)
  }
  const inWindow = (w: Wall) => {
    const t = zonedToEpoch(w.y, w.m, w.d, w.hh, w.mm, w.tz)
    return t <= until && t >= winStart && t <= winEnd
  }
  const notBefore = (w: Wall) => zonedToEpoch(w.y, w.m, w.d, w.hh, w.mm, w.tz) <= Math.min(until, winEnd)
  const out: Wall[] = []
  const push = (w: Wall) => { if (inWindow(w) && !exdates.has(wallKey(w))) out.push(w) }

  if (freq === 'DAILY' || freq === 'WEEKLY') {
    const stepDays = freq === 'DAILY' ? interval : 7 * interval
    // BYDAY (semanal): vários dias dentro da mesma semana-base
    const bydays = freq === 'WEEKLY' && get('BYDAY')
      ? get('BYDAY')!.split(',').map(s => WD.indexOf(s.trim())).filter(i => i >= 0)
      : [dow(start.y, start.m, start.d)]
    let n = 0
    for (let i = 0; n < count && i < 500; i++) {
      const weekBase = shiftWall(start, i * stepDays)
      if (!notBefore(weekBase) && i > 0) break
      for (const wd of bydays.sort()) {
        const delta = freq === 'WEEKLY' ? (wd - dow(weekBase.y, weekBase.m, weekBase.d)) : 0
        if (freq === 'WEEKLY' && delta < 0) continue // só dias da própria semana, a partir do início
        const occ = shiftWall(weekBase, delta)
        if (zonedToEpoch(occ.y, occ.m, occ.d, occ.hh, occ.mm, occ.tz)
          < zonedToEpoch(start.y, start.m, start.d, start.hh, start.mm, start.tz)) continue
        if (n >= count) break
        n++
        push(occ)
      }
    }
  } else if (freq === 'MONTHLY') {
    const byday = get('BYDAY')
    const bymd = get('BYMONTHDAY')
    let n = 0
    for (let i = 0; n < count && i < 200; i += interval) {
      const y = start.y + Math.floor((start.m - 1 + i) / 12)
      const m = ((start.m - 1 + i) % 12) + 1
      let d: number | null = start.d
      if (byday) {
        const bm = /^(-?\d+)([A-Z]{2})$/.exec(byday)
        d = bm ? nthWeekday(y, m, WD.indexOf(bm[2]), +bm[1]) : null
      } else if (bymd) {
        d = +bymd
      }
      if (d && d <= new Date(Date.UTC(y, m, 0)).getUTCDate()) {
        const occ: Wall = { ...start, y, m, d }
        if (zonedToEpoch(occ.y, occ.m, occ.d, occ.hh, occ.mm, occ.tz)
          >= zonedToEpoch(start.y, start.m, start.d, start.hh, start.mm, start.tz)) {
          n++
          push(occ)
        }
      }
      if (zonedToEpoch(y, m, 28, 23, 59, OUT_TZ) > Math.min(until, winEnd)) break
    }
  } else if (freq === 'YEARLY') {
    let n = 0
    for (let i = 0; n < count && i < 20; i += interval) {
      const occ: Wall = { ...start, y: start.y + i }
      n++
      push(occ)
      if (zonedToEpoch(occ.y, 12, 31, 23, 59, OUT_TZ) > Math.min(until, winEnd)) break
    }
  } else {
    push(start) // FREQ desconhecida → só a ocorrência original
  }
  return out
}

export function parseIcs(text: string, opts?: { windowStart?: number; windowEnd?: number }): GEvent[] {
  const now = Date.now()
  const winStart = opts?.windowStart ?? now - 35 * DAY
  const winEnd = opts?.windowEnd ?? now + 120 * DAY

  // unfold (linhas continuadas começam com espaço/tab)
  const lines = text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '').split('\n')
  const out: GEvent[] = []
  let ev: Record<string, { params: string; value: string }[]> | null = null

  const prop = (name: string) => ev?.[name]?.[0]

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { ev = {}; continue }
    if (line === 'END:VEVENT') {
      if (ev) {
        const dt = prop('DTSTART')
        const status = prop('STATUS')?.value
        const summary = unesc(prop('SUMMARY')?.value ?? '(sem título)')
        const uid = prop('UID')?.value ?? Math.random().toString(36).slice(2)
        const start = dt ? parseDt(dt.value, dt.params) : null
        if (start && status !== 'CANCELLED') {
          const exdates = new Set<string>()
          for (const ex of ev['EXDATE'] ?? []) {
            for (const v of ex.value.split(',')) {
              const w = parseDt(v.trim(), ex.params)
              if (w) exdates.add(wallKey(w))
            }
          }
          const rrule = prop('RRULE')?.value
          const occs = rrule
            ? expandRrule(rrule, start, winStart, winEnd, exdates)
            : (() => {
                const t = zonedToEpoch(start.y, start.m, start.d, start.hh, start.mm, start.tz)
                return t >= winStart && t <= winEnd ? [start] : []
              })()
          for (const w of occs) out.push(toEvent(uid, summary, w))
        }
      }
      ev = null; continue
    }
    if (!ev) continue
    const m = /^([A-Z-]+)((?:;[^:]*)?):(.*)$/.exec(line)
    if (!m) continue
    const [, name, params, value] = m
    ;(ev[name] ??= []).push({ params, value })
  }
  return out.sort((a, b) => (a.date + (a.time ?? '')).localeCompare(b.date + (b.time ?? '')))
}
