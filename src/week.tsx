import { useState } from 'react'
import {
  activeBlocks, todayIso, weekKey, shiftWeek, effectiveStreak, actionXp, overallProgress,
  levelForXp, spentXp, pillarById, pcolor, fmtDate, accessInfo,
  type Mentee, type Store, type Api, type Action, type ActionBlock, type CheckIn,
} from './data'
import { Attachments } from './attachments'

const uid = () => Math.random().toString(36).slice(2, 10)

// ---------- Check-in semanal ----------

export function CheckInCard({ m, store, api }: { m: Mentee; store: Store; api: Api }) {
  const wk = weekKey()
  const sent = store.checkins.find(c => c.menteeId === m.id && c.week === wk)
  const streak = effectiveStreak(m, store.checkins)
  const [f, setF] = useState({ wins: '', blockers: '', focus: '' })
  const ok = f.wins.trim().length > 2 && f.focus.trim().length > 2

  if (sent) {
    return (
      <div className="card checkin done-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span className="tag good">✓ Check-in desta semana enviado</span>
          <span className="tag">⟳ {streak} semana{streak === 1 ? '' : 's'} seguidas</span>
          <span className="mono muted-3" style={{ fontSize: 11, marginLeft: 'auto' }}>{fmtDate(sent.date)}</span>
        </div>
        <div className="ck-grid">
          <div><div className="stat-label">O que avancei</div><div className="ck-text">{sent.wins}</div></div>
          <div><div className="stat-label">Onde travei</div><div className="ck-text">{sent.blockers || '—'}</div></div>
          <div><div className="stat-label">Foco da semana</div><div className="ck-text" style={{ color: 'var(--accent)' }}>{sent.focus}</div></div>
        </div>
      </div>
    )
  }

  const submit = () => {
    const c: CheckIn = { id: uid(), menteeId: m.id, week: wk, date: todayIso(), ...f }
    api.upCheckIn(c)
  }
  return (
    <div className="card checkin">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <div className="h2">Check-in da semana</div>
        <span className="muted-3" style={{ fontSize: 12 }}>2 minutos que mantêm seu ritmo — e seu streak ⟳ {streak}</span>
      </div>
      <div className="ck-grid" style={{ marginTop: 16 }}>
        <label className="field">
          <span>O que avancei esta semana</span>
          <textarea className="in" rows={3} value={f.wins} onChange={e => setF(p => ({ ...p, wins: e.target.value }))} placeholder="Entregas, resultados, vitórias..." />
        </label>
        <label className="field">
          <span>Onde travei</span>
          <textarea className="in" rows={3} value={f.blockers} onChange={e => setF(p => ({ ...p, blockers: e.target.value }))} placeholder="Bloqueios, dúvidas (o mentor vê isso)" />
        </label>
        <label className="field">
          <span>Foco da próxima semana</span>
          <textarea className="in" rows={3} value={f.focus} onChange={e => setF(p => ({ ...p, focus: e.target.value }))} placeholder="Uma prioridade clara" />
        </label>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
        <button className="btn" disabled={!ok} onClick={submit}>Enviar check-in ✓</button>
      </div>
    </div>
  )
}

// ---------- Minha semana (lista priorizada) ----------

interface WeekItem { a: Action; b: ActionBlock }

function WeekRow({ it, m, api, overdue }: { it: WeekItem; m: Mentee; api: Api; overdue?: boolean }) {
  const p = pillarById(it.b.pillar)
  const a = it.a
  const nComments = a.comments?.length ?? 0
  const locked = a.status === 'done'
  return (
    <div className="action-wrap">
    <div className={`action ${a.status}`}>
      <button className={`check ${a.status}`}
        onClick={() => !locked && api.toggleAction(m.id, a.id, 'mentee')}
        title={locked ? 'Aprovada pelo mentor' : a.status === 'review' ? 'Aguardando aprovação — clique para voltar a executar' : 'Alterar status'}
        style={{ cursor: locked ? 'default' : 'pointer' }}>
        {a.status === 'done' ? '✓' : a.status === 'review' ? '!' : a.status === 'doing' ? '·' : ''}
      </button>
      <div style={{ minWidth: 0 }}>
        <div className="action-title">{a.title}</div>
        <div className="week-sub"><span className="pillar-dot" style={{ background: pcolor(p.hue), width: 7, height: 7 }} />{it.b.title}</div>
      </div>
      <div className="action-meta">
        <button className="icon-btn" style={{ opacity: 1 }} title="Comentários"
          onClick={() => api.open({ kind: 'comments', menteeId: m.id, blockId: it.b.id, actionId: a.id })}>
          💬{nComments ? <span className="c-count">{nComments}</span> : null}
        </button>
        <span className="due" style={overdue ? { color: '#f27979', fontWeight: 700 } : undefined}>{fmtDate(a.due)}</span>
        <span className="xp-chip">+{a.xp}</span>
      </div>
    </div>
    <Attachments menteeId={m.id} blockId={it.b.id} action={a} api={api} canEdit />
    </div>
  )
}

function TaskGroup({ title, hint, items, m, api, overdue }: {
  title: string; hint?: string; items: WeekItem[]; m: Mentee; api: Api; overdue?: boolean
}) {
  if (!items.length) return null
  return (
    <div className="card" style={{ marginTop: 16, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '4px 8px 10px' }}>
        <div style={{ fontSize: 14, fontWeight: 650 }}>{title}</div>
        <span className="mono" style={{ fontSize: 11, color: overdue ? '#f27979' : 'var(--text-3)' }}>{items.length}</span>
        {hint && <span className="muted-3" style={{ fontSize: 11.5, marginLeft: 'auto' }}>{hint}</span>}
      </div>
      {items.map(it => <WeekRow key={it.a.id} it={it} m={m} api={api} overdue={overdue} />)}
    </div>
  )
}

// Chip discreto de tempo de acesso (topbar do mentorado)
export function AccessChip({ m }: { m: Mentee }) {
  const a = accessInfo(m)
  if (!a) return null
  const tone = a.expired ? 'exp' : a.daysLeft <= 15 ? 'warn' : ''
  return (
    <span className={`chip access-chip ${tone}`}
      title={a.expired ? `Acesso encerrado em ${fmtDate(a.endDate)}` : `Acesso ao programa até ${fmtDate(a.endDate)}`}>
      ⌛ {a.expired ? 'expirado' : `${a.daysLeft} dias`}
    </span>
  )
}

export function MyWeek({ m, store, api, onLogout }: { m: Mentee; store: Store; api: Api; onLogout: () => void }) {
  const t = todayIso()
  const weekEnd = shiftWeek(weekKey(), 1) // próxima segunda
  const items: WeekItem[] = activeBlocks(m).flatMap(b => b.actions.map(a => ({ a, b })))
  const open = (a: Action) => a.status === 'todo' || a.status === 'doing'
  const overdue = items.filter(x => open(x.a) && x.a.due < t)
  const thisWeek = items.filter(x => open(x.a) && x.a.due >= t && x.a.due < weekEnd)
  const upcoming = items.filter(x => open(x.a) && x.a.due >= weekEnd).sort((x, y) => x.a.due.localeCompare(y.a.due))
  const inReview = items.filter(x => x.a.status === 'review')
  const doneCount = items.filter(x => x.a.status === 'done').length
  const prog = overallProgress(m)

  return (
    <>
      <div className="topbar"><h1>Minha semana</h1>
        <div className="topbar-right">
          <AccessChip m={m} />
          <span className="chip">{doneCount}/{items.length} ações · {Math.round(prog.pct * 100)}%</span>
          <div className="avatar" style={{ width: 34, height: 34, fontSize: 12 }}>{m.initials}</div>
          <button className="btn ghost" style={{ padding: '7px 12px', fontSize: 12 }} onClick={onLogout}>Trocar perfil</button>
        </div>
      </div>
      <div className="content page-enter">
        <div className="eyebrow">Semana de {fmtDate(weekKey())}</div>
        <div className="display" style={{ marginTop: 8, fontSize: 26 }}>O que importa agora, {m.name.split(' ')[0]}.</div>

        <div style={{ marginTop: 22 }}>
          <CheckInCard m={m} store={store} api={api} />
        </div>

        <TaskGroup title="⚠ Atrasadas" items={overdue} m={m} api={api} overdue
          hint="reagende com o mentor ou execute hoje" />
        <TaskGroup title="Esta semana" items={thisWeek} m={m} api={api} />
        <TaskGroup title="Aguardando aprovação" items={inReview} m={m} api={api}
          hint="o mentor/guardião valida e o XP entra" />
        <TaskGroup title="Próximas" items={upcoming} m={m} api={api} />

        {!items.length && (
          <div className="empty" style={{ marginTop: 30 }}>
            Seu plano de ação ainda não tem blocos neste ciclo. Fale com seu mentor.
          </div>
        )}
      </div>
    </>
  )
}

// ---------- Loja de recompensas ----------

export function RewardsSection({ m, store, api, canRedeem, canManage }: {
  m: Mentee; store: Store; api: Api; canRedeem: boolean; canManage: boolean
}) {
  const earned = actionXp(m)
  const spent = spentXp(m.id, store.redemptions, store.rewards)
  const saldo = Math.max(0, earned - spent)
  const mine = store.redemptions.filter(r => r.menteeId === m.id)
  return (
    <div className="section">
      <div className="section-head">
        <div className="h2">{canRedeem ? 'Loja de recompensas' : 'Recompensas'}</div>
        <span className="level-pill"><span className="lv">Saldo</span>{saldo} XP</span>
      </div>
      <div className="grid g-3 stagger">
        {store.rewards.map(r => {
          const affordable = saldo >= r.costXp
          return (
            <div key={r.id} className="card reward-card">
              <div className="glyph" style={{ margin: 0 }}>{r.icon}</div>
              <div style={{ fontWeight: 600, fontSize: 13.5, marginTop: 10 }}>{r.label}</div>
              <div className="muted-3" style={{ fontSize: 12, marginTop: 4, lineHeight: 1.45, flex: 1 }}>{r.description}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
                <span className="xp-chip">{r.costXp} XP</span>
                {canRedeem && (
                  <button className="btn ghost" style={{ marginLeft: 'auto', padding: '6px 12px', fontSize: 12 }}
                    disabled={!affordable}
                    onClick={() => confirm(`Resgatar "${r.label}" por ${r.costXp} XP?`) && api.redeem(m.id, r.id)}>
                    {affordable ? 'Resgatar' : 'XP insuficiente'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {mine.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="stat-label" style={{ marginBottom: 10 }}>Resgates</div>
          {mine.map(r => {
            const item = store.rewards.find(c => c.id === r.rewardId)
            return (
              <div key={r.id} className="redeem-row">
                <span>{item?.icon} {item?.label}</span>
                <span className="mono muted-3" style={{ fontSize: 11.5 }}>{fmtDate(r.date)}</span>
                <span className={`tag ${r.status === 'delivered' ? 'good' : 'warn'}`} style={{ marginLeft: 'auto' }}>
                  {r.status === 'delivered' ? '✓ entregue' : 'a entregar'}
                </span>
                {canManage && r.status === 'pending' && (
                  <button className="btn ghost" style={{ padding: '5px 10px', fontSize: 11.5 }}
                    onClick={() => api.setRedemption(r.id, 'delivered')}>Marcar entregue</button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------- Ranking do programa ----------

export function RankingCard({ store, highlightId }: { store: Store; highlightId?: string }) {
  const rows = store.mentees
    .map(m => ({ m, xp: actionXp(m), pct: overallProgress(m).pct, streak: effectiveStreak(m, store.checkins) }))
    .sort((a, b) => b.xp - a.xp)
  const medal = (i: number) => (i === 0 ? '◆' : i === 1 ? '◇' : i === 2 ? '·' : '')
  return (
    <div className="card">
      <div className="section-head" style={{ marginBottom: 12 }}>
        <div className="h2" style={{ fontSize: 16 }}>Ranking do programa</div>
        <span className="muted-3" style={{ fontSize: 11.5 }}>XP do ciclo</span>
      </div>
      {rows.map((r, i) => {
        const lv = levelForXp(r.xp)
        return (
          <div key={r.m.id} className={`rank-row ${r.m.id === highlightId ? 'me' : ''}`}>
            <span className="rank-pos mono">{i + 1}º <span style={{ color: 'var(--accent)' }}>{medal(i)}</span></span>
            <div className="avatar" style={{ width: 32, height: 32, fontSize: 11 }}>{r.m.initials}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{r.m.name.split(' ')[0]}{r.m.id === highlightId ? ' (você)' : ''}</div>
              <div className="muted-3" style={{ fontSize: 11 }}>Nv {lv.current.n} · {lv.current.name} · ⟳{r.streak}</div>
            </div>
            <span className="mono" style={{ fontSize: 12.5, color: 'var(--accent)', fontWeight: 650 }}>{r.xp} XP</span>
            <span className="mono muted-3" style={{ fontSize: 11.5, width: 42, textAlign: 'right' }}>{Math.round(r.pct * 100)}%</span>
          </div>
        )
      })}
    </div>
  )
}
