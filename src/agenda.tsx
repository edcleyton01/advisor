import { useState } from 'react'
import {
  ADVISOR, CURRENT_MONTH, monthFull, shiftMonth, fmtDate, todayIso, upcomingCalls,
  type Store, type Api, type ScheduledCall,
} from './data'
import { Avatar } from './avatar'

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
        <button className="btn ghost" style={{ padding: '6px 12px', fontSize: 12 }} title="Marcar como realizada e registrar a call"
          onClick={register}>✓ Registrar</button>
        <button className="icon-btn" title="Editar" onClick={() => api.open({ kind: 'call', call: c })}>✎</button>
        <button className="icon-btn danger" title="Cancelar call"
          onClick={() => confirm(`Cancelar a call com ${menteeFirst(store, c.menteeId)} em ${fmtDate(c.date)}?`) && api.upCall({ ...c, status: 'canceled' })}>✕</button>
      </div>
    </div>
  )
}

// ---------- Calendário do mês ----------
function MonthCalendar({ month, calls, store, api }: { month: string; calls: ScheduledCall[]; store: Store; api: Api }) {
  const [y, mo] = month.split('-').map(Number)
  const first = new Date(y, mo - 1, 1)
  const daysInMonth = new Date(y, mo, 0).getDate()
  const lead = (first.getDay() + 6) % 7 // semana começa na segunda
  const t = todayIso()
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  const byDay = (d: number) => calls.filter(c => c.date === `${month}-${String(d).padStart(2, '0')}`)
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
  const inMonth = store.calls.filter(c => c.date.startsWith(month) && c.status !== 'canceled')
  const upcoming = upcomingCalls(store.calls)
  const doneCount = store.calls.filter(c => c.date.startsWith(month) && c.status === 'done').length
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
          <MonthCalendar month={month} calls={inMonth} store={store} api={api} />
        </div>

        <div className="section">
          <div className="section-head"><div className="h2">Próximas calls</div></div>
          <div className="card" style={{ padding: 10 }}>
            {upcoming.length
              ? upcoming.map(c => <CallRow key={c.id} c={c} store={store} api={api} onOpenMentee={onOpenMentee} />)
              : <div className="empty">Nenhuma call agendada. Agende a primeira.</div>}
          </div>
        </div>
      </div>
    </>
  )
}

// ---------- Card do mentorado: próxima call ----------
export function NextCallCard({ store, menteeId }: { store: Store; menteeId: string }) {
  const next = upcomingCalls(store.calls, menteeId)[0]
  if (!next) return null
  const who = callWho(store, next.withId)
  const isToday = next.date === todayIso()
  return (
    <div className="card next-call">
      <div className="eyebrow" style={{ color: 'var(--accent)' }}>◷ {isToday ? 'Sua call é hoje' : 'Próxima call'}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
        <span className="display" style={{ fontSize: 22 }}>{isToday ? 'Hoje' : fmtDate(next.date)} · {next.time}</span>
        <span className="tag">{who.label} · {who.name}</span>
      </div>
      <div className="muted" style={{ marginTop: 8, fontSize: 13.5 }}>{next.topic}</div>
    </div>
  )
}
