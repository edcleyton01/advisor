import { useEffect, useState } from 'react'
import {
  ADVISOR, CURRENT_MONTH, monthFull, shiftMonth, fmtDate, todayIso, upcomingCalls, gcalCallUrl,
  type Store, type Api, type ScheduledCall,
} from './data'
import { Avatar } from './avatar'
import { loadGoogleEvents, type GEvent } from './gcal'

// quem conduz a call (mesma semântica do histórico de sessions)
const callWho = (store: Store, withId?: string) =>
  !withId || withId === 'advisor'
    ? { label: 'Mentor', name: ADVISOR.name.split(' ')[0] }
    : { label: 'Guardião', name: store.team.find(t => t.id === withId)?.name.split(' ')[0] ?? 'Equipe' }

const menteeFirst = (store: Store, id: string) =>
  store.mentees.find(m => m.id === id)?.name.split(' ')[0] ?? '?'

// ---------- Linha de call (lista de próximas) ----------
function CallRow({ c, store, api, onOpenMentee }: {
  c: ScheduledCall; store: Store; api: Api; onOpenMentee?: (id: string) => void
}) {
  const who = callWho(store, c.withId)
  const m = store.mentees.find(x => x.id === c.menteeId)
  const isToday = c.date === todayIso()
  const register = () => {
    api.upCall({ ...c, status: 'done' })
    api.open({ kind: 'session', menteeId: c.menteeId })
  }
  return (
    <div className="call-row">
      <div className="call-when">
        <div className={`call-date ${isToday ? 'today' : ''}`}>{isToday ? 'hoje' : fmtDate(c.date)}</div>
        <div className="call-time mono">{c.time}</div>
      </div>
      <button style={{ background: 'none', border: 'none', padding: 0, cursor: onOpenMentee ? 'pointer' : 'default' }}
        title={m?.name} onClick={() => onOpenMentee?.(c.menteeId)}>
        {m ? <Avatar m={m} size={34} fontSize={12} />
           : <div className="avatar" style={{ width: 34, height: 34, fontSize: 12 }}>?</div>}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="call-topic">{c.topic}</div>
        <div className="muted-3" style={{ fontSize: 11.5, marginTop: 2 }}>
          {menteeFirst(store, c.menteeId)} · {who.label} {who.name}
        </div>
      </div>
      <div className="call-actions">
        <button className="icon-btn" style={{ opacity: 1 }} title="Adicionar ao Google Agenda"
          onClick={() => window.open(gcalCallUrl(c, {
            title: `Mentoria · ${menteeFirst(store, c.menteeId)} — ${c.topic}`,
            details: `${who.label}: ${who.name} · ADVISOR OS`,
          }), '_blank', 'noopener')}>📅</button>
        <button className="btn ghost" style={{ padding: '6px 12px', fontSize: 12 }} title="Marcar como realizada e registrar a call"
          onClick={register}>✓ Registrar</button>
        <button className="icon-btn" title="Editar" onClick={() => api.open({ kind: 'call', call: c })}>✎</button>
        <button className="icon-btn danger" title="Cancelar call"
          onClick={() => confirm(`Cancelar a call com ${menteeFirst(store, c.menteeId)} em ${fmtDate(c.date)}?`) && api.upCall({ ...c, status: 'canceled' })}>✕</button>
      </div>
    </div>
  )
}

// ---------- Linha de evento vindo do Google Agenda (leitura) ----------
function GoogleRow({ e }: { e: GEvent }) {
  const isToday = e.date === todayIso()
  return (
    <div className="call-row" style={{ opacity: 0.92 }}>
      <div className="call-when">
        <div className={`call-date ${isToday ? 'today' : ''}`}>{isToday ? 'hoje' : fmtDate(e.date)}</div>
        <div className="call-time mono">{e.time ?? 'dia todo'}</div>
      </div>
      <div className="avatar" style={{ width: 34, height: 34, fontSize: 13, borderRadius: 10 }} title="Evento do Google Agenda">🗓</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="call-topic">{e.title}</div>
        <div className="muted-3" style={{ fontSize: 11.5, marginTop: 2 }}>Google Agenda · edite por lá</div>
      </div>
    </div>
  )
}

// ---------- Calendário do mês ----------
function MonthCalendar({ month, calls, gevents, store, api }: { month: string; calls: ScheduledCall[]; gevents: GEvent[]; store: Store; api: Api }) {
  const [y, mo] = month.split('-').map(Number)
  const first = new Date(y, mo - 1, 1)
  const daysInMonth = new Date(y, mo, 0).getDate()
  const lead = (first.getDay() + 6) % 7 // semana começa na segunda
  const t = todayIso()
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  const byDay = (d: number) => calls.filter(c => c.date === `${month}-${String(d).padStart(2, '0')}`)
  const gByDay = (d: number) => gevents.filter(e => e.date === `${month}-${String(d).padStart(2, '0')}`)
  return (
    <div className="card" style={{ padding: 18 }}>
      <div className="cal-grid cal-head-row">
        {['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'].map(d => <div key={d} className="cal-dow">{d}</div>)}
      </div>
      <div className="cal-grid">
        {cells.map((d, i) => {
          if (d === null) return <div key={`x${i}`} className="cal-day empty" />
          const iso = `${month}-${String(d).padStart(2, '0')}`
          const dayCalls = byDay(d)
          return (
            <div key={d} className={`cal-day ${iso === t ? 'today' : ''}`}>
              <div className="cal-num mono">{d}</div>
              {dayCalls.map(c => (
                <button key={c.id} className={`cal-call ${c.status}`} title={`${c.time} · ${c.topic} (${menteeFirst(store, c.menteeId)})`}
                  onClick={() => c.status === 'scheduled' && api.open({ kind: 'call', call: c })}>
                  <span className="mono" style={{ fontSize: 9.5 }}>{c.time}</span> {menteeFirst(store, c.menteeId)}
                </button>
              ))}
              {gByDay(d).map(e => (
                <div key={e.id} className="cal-call gcal" title={`${e.time ?? 'dia todo'} · ${e.title} (Google Agenda)`}>
                  <span className="mono" style={{ fontSize: 9.5 }}>{e.time ?? '•'}</span> {e.title}
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------- View do advisor ----------
export function AgendaView({ store, api, onOpenMentee }: { store: Store; api: Api; onOpenMentee: (id: string) => void }) {
  const [month, setMonth] = useState(CURRENT_MONTH)
  const [gevents, setGevents] = useState<GEvent[]>([])
  useEffect(() => { loadGoogleEvents(setGevents) }, []) // cache instantâneo + atualização em background
  const inMonth = store.calls.filter(c => c.date.startsWith(month) && c.status !== 'canceled')
  const gInMonth = gevents.filter(e => e.date.startsWith(month))
  const upcoming = upcomingCalls(store.calls)
  const gUpcoming = gevents.filter(e => e.date >= todayIso())
  const doneCount = store.calls.filter(c => c.date.startsWith(month) && c.status === 'done').length
  // lista mesclada por data/hora: calls do app + eventos do Google
  const merged: ({ kind: 'call'; c: (typeof upcoming)[number] } | { kind: 'g'; e: GEvent })[] = [
    ...upcoming.map(c => ({ kind: 'call' as const, c })),
    ...gUpcoming.map(e => ({ kind: 'g' as const, e })),
  ].sort((a, b) => {
    const ka = a.kind === 'call' ? a.c.date + a.c.time : a.e.date + (a.e.time ?? '00:00')
    const kb = b.kind === 'call' ? b.c.date + b.c.time : b.e.date + (b.e.time ?? '00:00')
    return ka.localeCompare(kb)
  })
  return (
    <>
      <div className="topbar"><h1>Agenda de calls</h1>
        <div className="topbar-right">
          <span className="chip">{upcoming.length} agendada{upcoming.length === 1 ? '' : 's'}</span>
        </div>
      </div>
      <div className="content page-enter">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div className="eyebrow">Ritmo de mentorias</div>
            <div className="display" style={{ marginTop: 8 }}>Quem você encontra, e quando.</div>
          </div>
          <button className="btn" onClick={() => api.open({ kind: 'call' })}>＋ Agendar call</button>
        </div>

        <div className="section">
          <div className="section-head">
            <div className="h2" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className="icon-btn" style={{ opacity: 1 }} onClick={() => setMonth(m => shiftMonth(m, -1))}>←</button>
              {monthFull(month)}
              <button className="icon-btn" style={{ opacity: 1 }} onClick={() => setMonth(m => shiftMonth(m, 1))}>→</button>
            </div>
            <span className="muted-3" style={{ fontSize: 12 }}>{inMonth.length} no mês · {doneCount} realizadas</span>
          </div>
          <MonthCalendar month={month} calls={inMonth} gevents={gInMonth} store={store} api={api} />
        </div>

        <div className="section">
          <div className="section-head">
            <div className="h2">Próximas calls</div>
            {gevents.length > 0 && <span className="muted-3" style={{ fontSize: 12 }}>🗓 {gUpcoming.length} do Google Agenda</span>}
          </div>
          <div className="card" style={{ padding: 10 }}>
            {merged.length
              ? merged.slice(0, 30).map(it => it.kind === 'call'
                  ? <CallRow key={it.c.id} c={it.c} store={store} api={api} onOpenMentee={onOpenMentee} />
                  : <GoogleRow key={it.e.id} e={it.e} />)
              : <div className="empty">Nenhuma call agendada. Agende a primeira.</div>}
          </div>
        </div>
      </div>
    </>
  )
}

// ---------- Card do mentorado: próxima call ----------
export function NextCallCard({ store, menteeId }: { store: Store; menteeId: string }) {
  const [g, setG] = useState<GEvent | null>(null)
  useEffect(() => {
    loadGoogleEvents(evs => {
      const next = evs.filter(e => e.date >= todayIso() && e.time).sort((a, b) => (a.date + a.time!).localeCompare(b.date + b.time!))[0]
      setG(next ?? null)
    })
  }, [])
  const appNext = upcomingCalls(store.calls, menteeId)[0]
  // ganha o que vier primeiro (app × Google)
  const useG = g && (!appNext || (g.date + (g.time ?? '')) < (appNext.date + appNext.time))
  const next = useG
    ? { id: g!.id, menteeId, date: g!.date, time: g!.time!, topic: g!.title, status: 'scheduled' as const }
    : appNext
  if (!next) return null
  const who = useG ? { label: 'Google Agenda', name: '' } : callWho(store, next.withId)
  const isToday = next.date === todayIso()
  return (
    <div className="card next-call">
      <div className="eyebrow" style={{ color: 'var(--accent)' }}>◷ {isToday ? 'Sua call é hoje' : 'Próxima call'}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
        <span className="display" style={{ fontSize: 22 }}>{isToday ? 'Hoje' : fmtDate(next.date)} · {next.time}</span>
        <span className="tag">{who.label}{who.name ? ` · ${who.name}` : ''}</span>
      </div>
      <div className="muted" style={{ marginTop: 8, fontSize: 13.5 }}>{next.topic}</div>
      <a className="btn ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 14, padding: '7px 14px', fontSize: 12 }}
        href={gcalCallUrl(next, { title: `Mentoria — ${next.topic}`, details: `${who.label}: ${who.name} · Programa ADVISOR` })}
        target="_blank" rel="noopener noreferrer">📅 Adicionar à minha agenda</a>
    </div>
  )
}
