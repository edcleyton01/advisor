import { useState } from 'react'
import {
  PILLARS, ADVISOR, DEAL_STAGES, pillarById, pcolor, fmtBRL, fmtDate, monthLabel, monthFull,
  CURRENT_MONTH, buildAgenda, insightsFor, computeBadges, actionXp, overallProgress, levelForXp,
  effectiveStreak, salesSummary, campaignCalc, funnelById, monthActuals, buildAlerts, alertMeta,
  type Mentee, type Store, type Api, type Deal, type DealStage,
} from './data'

// ---------- Playbooks (biblioteca da metodologia) ----------

export function PlaybooksView({ store, api }: { store: Store; api: Api }) {
  return (
    <>
      <div className="topbar"><h1>Playbooks <span className="crumb">· metodologia replicável</span></h1>
        <div className="topbar-right"><span className="chip">{store.playbooks.length} templates</span></div>
      </div>
      <div className="content page-enter">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div className="eyebrow">Sua metodologia em templates</div>
            <div className="display" style={{ marginTop: 8 }}>Blocos prontos para aplicar</div>
            <div className="muted" style={{ marginTop: 8, fontSize: 13.5, maxWidth: 560 }}>
              Cada playbook vira um bloco de ações no plano do mentorado, com prazos e XP calculados automaticamente.
              Aplique pelo perfil do mentorado, em “Plano de ação”.
            </div>
          </div>
          <button className="btn" onClick={() => api.open({ kind: 'playbook' })}>＋ Novo playbook</button>
        </div>

        <div className="mentee-grid stagger" style={{ marginTop: 26 }}>
          {store.playbooks.map(p => {
            const pi = pillarById(p.pillar)
            const totalXp = p.actions.reduce((s, a) => s + a.xp, 0) + p.rewardXp
            return (
              <div key={p.id} className="card hover">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="funnel-chip"><span className="fd" style={{ background: pcolor(pi.hue) }} />{pi.short}</span>
                  <span className="mono muted-3" style={{ fontSize: 11 }}>{p.period}</span>
                  <span className="row-tools" style={{ marginLeft: 'auto', opacity: 1 }}>
                    <button className="icon-btn" onClick={() => api.open({ kind: 'playbook', playbook: p })}>✎</button>
                    <button className="icon-btn danger"
                      onClick={() => confirm(`Excluir o playbook "${p.title}"?`) && api.delPlaybook(p.id)}>✕</button>
                  </span>
                </div>
                <div style={{ fontWeight: 650, fontSize: 15.5, marginTop: 12, letterSpacing: '-0.01em' }}>{p.title}</div>
                <div className="muted-3" style={{ fontSize: 12.5, marginTop: 6, lineHeight: 1.5 }}>{p.description}</div>
                <div className="divider" style={{ margin: '14px 0' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {p.actions.map((a, i) => (
                    <div key={i} style={{ display: 'flex', gap: 9, fontSize: 12.5, alignItems: 'baseline' }}>
                      <span className="mono muted-3" style={{ fontSize: 10.5 }}>{String(i + 1).padStart(2, '0')}</span>
                      <span style={{ flex: 1 }}>{a.title}</span>
                      <span className="mono muted-3" style={{ fontSize: 10.5 }}>{a.days}d</span>
                      <span className="xp-chip" style={{ fontSize: 10 }}>+{a.xp}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center' }}>
                  <span className="reward" style={{ marginTop: 0, fontSize: 11 }}>🔒 {p.rewardLabel}</span>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--accent)', marginLeft: 'auto' }}>até {totalXp} XP</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

// ---------- Gerenciador de recompensas (advisor/equipe) ----------

export function RewardsAdmin({ store, api }: { store: Store; api: Api }) {
  const countRedemptions = (id: string) => store.redemptions.filter(r => r.rewardId === id).length
  return (
    <>
      <div className="topbar"><h1>Recompensas <span className="crumb">· catálogo do programa</span></h1>
        <div className="topbar-right"><span className="chip">{store.rewards.length} recompensas</span></div>
      </div>
      <div className="content page-enter">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div className="eyebrow">Gamificação</div>
            <div className="display" style={{ marginTop: 8 }}>O que o mentorado resgata com XP</div>
            <div className="muted" style={{ marginTop: 8, fontSize: 13.5, maxWidth: 560 }}>
              Você e a equipe criam, editam e removem as recompensas aqui. O catálogo é o mesmo para todos os mentorados e sincroniza na hora.
            </div>
          </div>
          <button className="btn" onClick={() => api.open({ kind: 'reward' })}>＋ Nova recompensa</button>
        </div>

        <div className="mentee-grid stagger" style={{ marginTop: 26 }}>
          {store.rewards.map(r => (
            <div key={r.id} className="card hover">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="glyph" style={{ margin: 0 }}>{r.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, letterSpacing: '-0.01em' }}>{r.label}</div>
                  <div className="mono" style={{ fontSize: 12.5, color: 'var(--accent)', marginTop: 3, fontWeight: 650 }}>{r.costXp} XP</div>
                </div>
                <span className="row-tools" style={{ opacity: 1 }}>
                  <button className="icon-btn" title="Editar" onClick={() => api.open({ kind: 'reward', reward: r })}>✎</button>
                  <button className="icon-btn danger" title="Excluir"
                    onClick={() => confirm(`Excluir a recompensa "${r.label}"?`) && api.delReward(r.id)}>✕</button>
                </span>
              </div>
              <div className="muted-3" style={{ fontSize: 12.5, marginTop: 12, lineHeight: 1.5 }}>{r.description}</div>
              <div className="divider" style={{ margin: '12px 0' }} />
              <div className="stat-label">{countRedemptions(r.id)} resgate{countRedemptions(r.id) === 1 ? '' : 's'} no total</div>
            </div>
          ))}
          {!store.rewards.length && <div className="empty">Nenhuma recompensa ainda. Clique em “＋ Nova recompensa”.</div>}
        </div>
      </div>
    </>
  )
}

// ---------- Central de alertas (advisor) ----------

export function AlertsView({ store, onOpenMentee }: { store: Store; onOpenMentee: (id: string) => void }) {
  const alerts = buildAlerts(store)
  const risks = alerts.filter(a => a.severity === 'risk').length
  return (
    <>
      <div className="topbar"><h1>Alertas</h1>
        <div className="topbar-right"><span className="chip">{alerts.length} {alerts.length === 1 ? 'aviso' : 'avisos'}</span></div>
      </div>
      <div className="content page-enter">
        <div className="eyebrow">O que precisa de você</div>
        <div className="display" style={{ marginTop: 8 }}>{alerts.length ? 'Ação recomendada' : 'Tudo em dia ✓'}</div>
        <div className="muted" style={{ marginTop: 8, fontSize: 13.5 }}>
          {alerts.length
            ? <>{risks > 0 && <><b style={{ color: '#f27979' }}>{risks} em risco</b> · </>}entregas para aprovar, ações atrasadas e check-ins pendentes.</>
            : 'Nenhuma entrega pendente, atraso ou check-in em falta. Bom trabalho.'}
        </div>

        {alerts.length > 0 && (
          <div className="grid stagger" style={{ marginTop: 24 }}>
            {alerts.map(a => {
              const meta = alertMeta(a.kind)
              return (
                <div key={a.id} className={`card alert-card ${a.severity}`} onClick={() => onOpenMentee(a.menteeId)}>
                  <div className={`alert-ic ${a.severity}`}>{meta.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                      <span className="alert-title">{a.title}</span>
                      <span className="tag">{a.menteeName}</span>
                      <span className="muted-3" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{meta.label}</span>
                    </div>
                    <div className="muted" style={{ fontSize: 12.5, marginTop: 5 }}>{a.detail}</div>
                  </div>
                  <span className="alert-go">abrir →</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

// ---------- Pauta automática da próxima call ----------

export function AgendaCard({ m, store }: { m: Mentee; store: Store }) {
  const ag = buildAgenda(m, store)
  const Row = ({ icon, tone, children }: { icon: string; tone?: string; children: React.ReactNode }) => (
    <div className="agenda-row">
      <span className="agenda-ic" style={tone ? { color: tone } : undefined}>{icon}</span>
      <div style={{ fontSize: 13, lineHeight: 1.5 }}>{children}</div>
    </div>
  )
  return (
    <div className="card agenda">
      <div className="section-head" style={{ marginBottom: 12 }}>
        <div className="h2" style={{ fontSize: 16 }}>Pauta da próxima call</div>
        <span className="muted-3" style={{ fontSize: 11.5 }}>gerada automaticamente do plano</span>
      </div>
      {ag.lastNext && <Row icon="→" tone="var(--good)"><b>Combinado anterior:</b> {ag.lastNext}</Row>}
      {ag.lastCheckIn && (
        <Row icon="⟳" tone="var(--accent)">
          <b>Último check-in ({fmtDate(ag.lastCheckIn.date)}):</b> {ag.lastCheckIn.wins}
          {ag.lastCheckIn.blockers && ag.lastCheckIn.blockers !== 'Nenhum.' && <> · <span style={{ color: '#f0b36a' }}>travou em: {ag.lastCheckIn.blockers}</span></>}
        </Row>
      )}
      {ag.review.length > 0 && (
        <Row icon="!" tone="var(--accent)">
          <b>{ag.review.length} entrega{ag.review.length > 1 ? 's' : ''} para aprovar:</b>{' '}
          {ag.review.map(x => x.a.title).join(' · ')}
        </Row>
      )}
      {ag.overdue.length > 0 && (
        <Row icon="⚠" tone="#f27979">
          <b>{ag.overdue.length === 1 ? '1 ação atrasada' : `${ag.overdue.length} ações atrasadas`}:</b>{' '}
          {ag.overdue.slice(0, 3).map(x => `${x.a.title} (${fmtDate(x.a.due)})`).join(' · ')}{ag.overdue.length > 3 ? ' …' : ''}
        </Row>
      )}
      {ag.goalPct !== undefined && (
        <Row icon="◎" tone={ag.goalPct >= 1 ? 'var(--good)' : undefined}>
          <b>Meta de {monthLabel(CURRENT_MONTH)}:</b> {Math.round(ag.goalPct * 100)}% da receita prevista{ag.goalPct >= 1 ? ' — meta batida ✓' : ''}
        </Row>
      )}
      {ag.delivered.length > 0 && (
        <Row icon="✓" tone="var(--good)">
          <b>Entregas recentes:</b> {ag.delivered.map(x => x.a.title).join(' · ')}
        </Row>
      )}
      {!ag.lastNext && !ag.overdue.length && !ag.review.length && !ag.delivered.length && (
        <div className="muted-3" style={{ fontSize: 12.5 }}>Sem itens ainda — registre calls e ações para alimentar a pauta.</div>
      )}
    </div>
  )
}

// ---------- Copiloto (insights heurísticos) ----------

export function InsightsCard({ store, menteeId }: { store: Store; menteeId?: string }) {
  const list = insightsFor(store, menteeId)
  if (!list.length) return null
  const toneColor = (t: string) => t === 'good' ? 'var(--good)' : t === 'warn' ? '#f0b36a' : 'var(--text-2)'
  return (
    <div className="card insights">
      <div className="section-head" style={{ marginBottom: 12 }}>
        <div className="h2" style={{ fontSize: 16 }}>⚡ Copiloto</div>
        <span className="tag">análise automática dos dados</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {list.map((ins, i) => (
          <div key={i} className="agenda-row">
            <span className="agenda-ic" style={{ color: toneColor(ins.tone) }}>{ins.tone === 'good' ? '▲' : ins.tone === 'warn' ? '⚠' : '◈'}</span>
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>
              <b>{ins.title}.</b> {ins.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------- Notas privadas do advisor ----------

export function NotesCard({ m, api }: { m: Mentee; api: Api }) {
  const [text, setText] = useState(m.privateNotes ?? '')
  return (
    <div className="card notes">
      <div className="section-head" style={{ marginBottom: 10 }}>
        <div className="h2" style={{ fontSize: 16 }}>Notas privadas</div>
        <span className="muted-3" style={{ fontSize: 11.5 }}>só você e a equipe veem · salva ao sair do campo</span>
      </div>
      <textarea className="in" rows={4} value={text}
        placeholder="Percepções, contexto pessoal, pontos de atenção para as próximas calls..."
        onChange={e => setText(e.target.value)}
        onBlur={() => api.setNotes(m.id, text)} />
    </div>
  )
}

// ---------- Badges automáticos ----------

export function BadgesRow({ m, store }: { m: Mentee; store: Store }) {
  const badges = computeBadges(m, store)
  return (
    <div className="badges">
      {badges.map(b => (
        <div key={b.id} className={`badge ${b.earned ? '' : 'locked'}`} title={b.hint}>
          <div className="glyph">{b.icon}</div>
          <div className="bl">{b.label}</div>
        </div>
      ))}
    </div>
  )
}

// ---------- Comentários por ação ----------

export function CommentsModal({ store, api, menteeId, blockId, actionId, role, onClose }: {
  store: Store; api: Api; menteeId: string; blockId: string; actionId: string
  role: 'advisor' | 'mentee'; onClose: () => void
}) {
  const m = store.mentees.find(x => x.id === menteeId)
  const block = m?.blocks.find(b => b.id === blockId)
  const action = block?.actions.find(a => a.id === actionId)
  const [text, setText] = useState('')
  if (!m || !block || !action) return null
  const author = role === 'advisor' ? ADVISOR.name.split(' ')[0] : m.name.split(' ')[0]
  const send = () => {
    if (text.trim().length < 2) return
    api.addComment(menteeId, blockId, actionId, text.trim(), author, role)
    setText('')
  }
  const comments = action.comments ?? []
  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <div>
            <div className="h2" style={{ fontSize: 16 }}>💬 {action.title}</div>
            <div className="muted-3" style={{ fontSize: 11.5, marginTop: 3 }}>{block.title} · prazo {fmtDate(action.due)}</div>
          </div>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="thread">
          {comments.length ? comments.map(c => (
            <div key={c.id} className={`bubble ${c.role}`}>
              <div className="bubble-head">
                <b>{c.author}</b>
                <span className="mono muted-3" style={{ fontSize: 10.5 }}>{fmtDate(c.date)}</span>
              </div>
              {c.text}
            </div>
          )) : <div className="empty" style={{ padding: '26px 0' }}>Sem comentários ainda. Comece a conversa.</div>}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <input className="in" value={text} placeholder={`Comentar como ${author}...`}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()} />
          <button className="btn" disabled={text.trim().length < 2} onClick={send}>Enviar</button>
        </div>
      </div>
    </div>
  )
}

// ---------- Pipeline high ticket ----------

export function PipelineSection({ store, api, menteeId, editable }: {
  store: Store; api: Api; menteeId?: string; editable: boolean
}) {
  const deals = store.deals.filter(d => !menteeId || d.menteeId === menteeId)
  const name = (id: string) => store.mentees.find(m => m.id === id)?.name.split(' ')[0] ?? ''
  const move = (d: Deal, dir: -1 | 1) => {
    const i = DEAL_STAGES.findIndex(s => s.id === d.stage)
    const next = DEAL_STAGES[i + dir]
    if (next) api.upDeal({ ...d, stage: next.id })
  }
  const open = deals.filter(d => d.stage !== 'won' && d.stage !== 'lost')
  const openValue = open.reduce((s, d) => s + d.value, 0)
  const wonValue = deals.filter(d => d.stage === 'won').reduce((s, d) => s + d.value, 0)
  return (
    <div className="section">
      <div className="section-head">
        <div className="h2">Pipeline high ticket</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="tag">{fmtBRL(openValue)} em aberto</span>
          <span className="tag good">{fmtBRL(wonValue)} fechado</span>
          {editable && <button className="btn ghost" onClick={() => api.open({ kind: 'deal', menteeId })}>＋ Oportunidade</button>}
        </div>
      </div>
      <div className="kanban">
        {DEAL_STAGES.map(stage => {
          const list = deals.filter(d => d.stage === stage.id)
          const total = list.reduce((s, d) => s + d.value, 0)
          return (
            <div key={stage.id} className={`kan-col ${stage.id}`}>
              <div className="kan-head">
                <span>{stage.id === 'won' ? '✓ ' : ''}{stage.label}</span>
                <span className="mono">{list.length ? fmtBRL(total) : '—'}</span>
              </div>
              {list.map(d => (
                <div key={d.id} className="kan-card">
                  <div style={{ fontWeight: 600, fontSize: 12.5 }}>{d.client}</div>
                  <div className="muted-3" style={{ fontSize: 11, marginTop: 2 }}>{d.product}{!menteeId && <> · {name(d.menteeId)}</>}</div>
                  <div className="mono" style={{ fontSize: 12.5, color: 'var(--accent)', marginTop: 7, fontWeight: 650 }}>{fmtBRL(d.value)}</div>
                  {d.nextStep && <div className="kan-next">→ {d.nextStep}</div>}
                  {editable && (
                    <div className="kan-tools">
                      <button className="icon-btn" title="Voltar estágio" disabled={stage.id === 'lead'} onClick={() => move(d, -1)}>←</button>
                      <button className="icon-btn" title="Avançar estágio" disabled={stage.id === 'lost'} onClick={() => move(d, 1)}>→</button>
                      <span style={{ flex: 1 }} />
                      <button className="icon-btn" onClick={() => api.open({ kind: 'deal', deal: d })}>✎</button>
                      <button className="icon-btn danger" onClick={() => confirm(`Excluir "${d.client}"?`) && api.delDeal(d.id)}>✕</button>
                    </div>
                  )}
                </div>
              ))}
              {!list.length && <div className="kan-empty">vazio</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------- Relatório mensal (imprimível) ----------

export function ReportView({ m, store, onClose }: { m: Mentee; store: Store; onClose: () => void }) {
  const xp = actionXp(m)
  const lv = levelForXp(xp)
  const prog = overallProgress(m)
  const streak = effectiveStreak(m, store.checkins)
  const sales = store.sales.filter(s => s.menteeId === m.id && s.month === CURRENT_MONTH)
  const sum = salesSummary(sales)
  const camps = store.campaigns.filter(c => c.menteeId === m.id && c.month === CURRENT_MONTH)
  const goal = store.goals.find(g => g.menteeId === m.id && g.month === CURRENT_MONTH)
  const act = monthActuals(m.id, CURRENT_MONTH, store.sales, store.campaigns)
  const ag = buildAgenda(m, store)
  return (
    <div className="report-wrap">
      <div className="report-bar">
        <button className="btn ghost" onClick={onClose}>← Voltar</button>
        <div className="muted" style={{ fontSize: 13 }}>Relatório mensal · {m.name}</div>
        <button className="btn" onClick={() => window.print()}>Imprimir / Salvar PDF</button>
      </div>
      <div className="report-sheet">
        <div className="rp-head">
          <div>
            <div className="rp-eyebrow">{ADVISOR.program} · Relatório de {monthFull(CURRENT_MONTH)}</div>
            <h1>{m.name}</h1>
            <div className="rp-sub">{m.business} · {m.niche} · {m.cycle}</div>
          </div>
          <div className="rp-mark">A</div>
        </div>

        <div className="rp-cards">
          <div><span>Execução do ciclo</span><b>{Math.round(prog.pct * 100)}%</b></div>
          <div><span>XP · Nível</span><b>{xp} · Nv {lv.current.n}</b></div>
          <div><span>Constância</span><b>{streak} semana{streak === 1 ? '' : 's'}</b></div>
          <div><span>Receita do mês</span><b>{fmtBRL(sum.revenue)}</b></div>
        </div>

        {goal && (
          <div className="rp-section">
            <h2>Meta do mês (previsto × realizado)</h2>
            <table>
              <thead><tr><th>Indicador</th><th>Meta</th><th>Realizado</th><th>%</th></tr></thead>
              <tbody>
                {goal.revenueGoal > 0 && <tr><td>Receita</td><td>{fmtBRL(goal.revenueGoal)}</td><td>{fmtBRL(act.revenue)}</td><td>{Math.round(act.revenue / goal.revenueGoal * 100)}%</td></tr>}
                {goal.htRevenueGoal > 0 && <tr><td>High ticket</td><td>{fmtBRL(goal.htRevenueGoal)}</td><td>{fmtBRL(act.htRevenue)}</td><td>{Math.round(act.htRevenue / goal.htRevenueGoal * 100)}%</td></tr>}
                {goal.leadsGoal > 0 && <tr><td>Leads</td><td>{goal.leadsGoal}</td><td>{act.leads}</td><td>{Math.round(act.leads / goal.leadsGoal * 100)}%</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {sales.length > 0 && (
          <div className="rp-section">
            <h2>Vendas de {monthLabel(CURRENT_MONTH)}</h2>
            <table>
              <thead><tr><th>Produto</th><th>Ticket</th><th>Qtd</th><th>Receita</th><th></th></tr></thead>
              <tbody>
                {sales.map(e => (
                  <tr key={e.id}><td>{e.product}</td><td>{fmtBRL(e.ticket)}</td><td>{e.units}</td><td>{fmtBRL(e.ticket * e.units)}</td><td>{e.highTicket ? 'HIGH TICKET' : ''}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {camps.length > 0 && (
          <div className="rp-section">
            <h2>Campanhas do mês</h2>
            <table>
              <thead><tr><th>Funil</th><th>Produto</th><th>CPL</th><th>CPA</th><th>Leads</th><th>Conv.</th><th>Receita</th></tr></thead>
              <tbody>
                {camps.map(c => {
                  const d = campaignCalc(c)
                  return <tr key={c.id}><td>{funnelById(c.funnel).label}</td><td>{c.product}</td><td>{c.cpl ? fmtBRL(c.cpl) : '—'}</td><td>{d.cpa ? fmtBRL(d.cpa) : '—'}</td><td>{c.leads}</td><td>{c.convPct.toFixed(1)}%</td><td>{fmtBRL(d.revenue)}</td></tr>
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="rp-section">
          <h2>Maturidade por pilar (0–10)</h2>
          <table>
            <thead><tr><th>Pilar</th><th>Base</th><th>Atual</th><th>Evolução</th></tr></thead>
            <tbody>
              {PILLARS.map(p => {
                const sc = m.scores[p.id]
                return <tr key={p.id}><td>{p.label}</td><td>{sc.baseline}</td><td>{sc.current}</td><td>{sc.current - sc.baseline > 0 ? `+${sc.current - sc.baseline}` : sc.current - sc.baseline}</td></tr>
              })}
            </tbody>
          </table>
        </div>

        <div className="rp-section">
          <h2>Próximos passos</h2>
          <ul>
            {ag.lastNext && <li>{ag.lastNext}</li>}
            {ag.overdue.slice(0, 3).map(x => <li key={x.a.id}>Retomar: {x.a.title} (prazo {fmtDate(x.a.due)})</li>)}
            {ag.lastCheckIn?.focus && <li>Foco declarado no check-in: {ag.lastCheckIn.focus}</li>}
          </ul>
        </div>

        <div className="rp-foot">Gerado pelo ADVISOR OS · {fmtDate(new Date().toISOString().slice(0, 10))} · uso interno do programa</div>
      </div>
    </div>
  )
}
