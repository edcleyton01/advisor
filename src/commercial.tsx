import { useState } from 'react'
import { PipelineSection } from './extras'
import {
  FUNNELS, funnelById, pillarById, pcolor, fmtBRL, fmtK, monthLabel, monthFull, shiftMonth,
  CURRENT_MONTH, chartMonths, salesSummary, campaignCalc, CAMPAIGN_STATUS, monthActuals,
  type Store, type Api, type Mentee, type Campaign, type FunnelId,
} from './data'

// ---------- Primitivas ----------

export function MonthNav({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  return (
    <div className="month-nav">
      <button onClick={() => onChange(shiftMonth(month, -1))} title="Mês anterior">←</button>
      <span className="mn-label">{monthFull(month)}</span>
      <button onClick={() => onChange(shiftMonth(month, 1))} title="Próximo mês">→</button>
    </div>
  )
}

function Kpi({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className="card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ fontSize: 23, color: accent ? 'var(--accent)' : undefined }}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

function WhoFilter({ mentees, who, setWho }: { mentees: Mentee[]; who: string; setWho: (v: string) => void }) {
  return (
    <div className="pill-tabs">
      <button className={`pill-tab ${who === 'all' ? 'on' : ''}`} onClick={() => setWho('all')}>Todos</button>
      {mentees.map(m => (
        <button key={m.id} className={`pill-tab ${who === m.id ? 'on' : ''}`} onClick={() => setWho(m.id)}>
          {m.name.split(' ')[0]}
        </button>
      ))}
    </div>
  )
}

const menteeName = (store: Store, id: string) => store.mentees.find(m => m.id === id)?.name.split(' ')[0] ?? '—'

// ---------- Card de campanha ----------

function Mi({ l, v, accent }: { l: string; v: string | number; accent?: boolean }) {
  return (
    <div className="m-item">
      <div className="ml">{l}</div>
      <div className="mv" style={accent ? { color: 'var(--accent)' } : undefined}>{v}</div>
    </div>
  )
}

export function CampaignCard({ c, mentee, api, editable, showMonth }: {
  c: Campaign; mentee?: string; api: Api; editable: boolean; showMonth?: boolean
}) {
  const f = funnelById(c.funnel)
  const d = campaignCalc(c)
  const st = CAMPAIGN_STATUS[c.status]
  return (
    <div className="card camp">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span className="funnel-chip"><span className="fd" style={{ background: pcolor(f.hue) }} />{f.label}</span>
        {showMonth && <span className="mono" style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{monthLabel(c.month)}</span>}
        <div style={{ fontWeight: 600, fontSize: 14.5, letterSpacing: '-0.01em' }}>{c.product}</div>
        {c.highTicket && <span className="ht-chip">HIGH TICKET</span>}
        {mentee && <span className="tag">{mentee}</span>}
        <span className={`tag ${st.cls}`} style={{ marginLeft: 'auto' }}>{st.label}</span>
        {editable && (
          <span className="row-tools">
            <button className="icon-btn" title="Editar" onClick={() => api.open({ kind: 'campaign', campaign: c })}>✎</button>
            <button className="icon-btn danger" title="Excluir"
              onClick={() => confirm(`Excluir a campanha "${c.product}"?`) && api.delCampaign(c.id)}>✕</button>
          </span>
        )}
      </div>
      <div className="metric-grid">
        <Mi l="Ticket" v={fmtBRL(c.ticket)} />
        <Mi l="CPL" v={c.cpl ? fmtBRL(c.cpl) : '—'} />
        <Mi l="CPA" v={d.cpa ? fmtBRL(d.cpa) : '—'} />
        <Mi l="Leads" v={c.leads} />
        <Mi l="Conv. vendas" v={`${c.convPct.toFixed(1)}%`} />
        <Mi l="Vendas" v={d.sales} />
        <Mi l="Investido" v={d.invested ? fmtBRL(d.invested) : '—'} />
        <Mi l="Receita" v={fmtBRL(d.revenue)} accent={c.highTicket} />
      </div>
    </div>
  )
}

// ---------- Metas mensais (previsto × realizado) ----------

export function GoalCard({ m, month, store, api, editable }: {
  m: Mentee; month: string; store: Store; api: Api; editable: boolean
}) {
  const goal = store.goals.find(g => g.menteeId === m.id && g.month === month)
  const act = monthActuals(m.id, month, store.sales, store.campaigns)
  if (!goal) {
    if (!editable) return null
    return (
      <div className="card">
        <div className="mentee-name" style={{ fontSize: 14 }}>{m.name.split(' ')[0]}
          <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}> · {monthLabel(month)}</span>
        </div>
        <div className="empty" style={{ padding: '20px 0 16px' }}>Sem meta definida para este mês.</div>
        <button className="btn ghost" onClick={() => api.open({ kind: 'goal', menteeId: m.id, month })}>＋ Definir meta</button>
      </div>
    )
  }
  const rows = [
    { label: 'Receita',     goal: goal.revenueGoal,   val: act.revenue,   money: true,  accent: false },
    { label: 'High ticket', goal: goal.htRevenueGoal, val: act.htRevenue, money: true,  accent: true },
    { label: 'Leads',       goal: goal.leadsGoal,     val: act.leads,     money: false, accent: false },
  ].filter(r => r.goal > 0)
  const hit = goal.revenueGoal > 0 && act.revenue >= goal.revenueGoal
  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="mentee-name" style={{ fontSize: 14 }}>{m.name.split(' ')[0]}
          <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}> · {monthLabel(month)}</span>
        </div>
        <span className={`tag ${hit ? 'good' : ''}`} style={{ marginLeft: 'auto' }}>{hit ? '✓ Meta batida' : 'Em curso'}</span>
        {editable && (
          <span className="row-tools" style={{ opacity: 1 }}>
            <button className="icon-btn" title="Editar meta" onClick={() => api.open({ kind: 'goal', goal })}>✎</button>
            <button className="icon-btn danger" title="Excluir meta"
              onClick={() => confirm(`Excluir a meta de ${m.name.split(' ')[0]} em ${monthLabel(month)}?`) && api.delGoal(goal.id)}>✕</button>
          </span>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 18 }}>
        {rows.map(r => {
          const pct = Math.min(1, r.val / r.goal)
          const done = r.val >= r.goal
          return (
            <div key={r.label}>
              <div className="goal-line">
                <span>{r.label}{done && <span style={{ color: 'var(--good)' }}> ✓</span>}</span>
                <span className="mono">
                  {r.money ? fmtBRL(r.val) : r.val} <em>/ {r.money ? fmtBRL(r.goal) : r.goal}</em> · {Math.round((r.val / r.goal) * 100)}%
                </span>
              </div>
              <div className={`bar ${r.accent ? 'accent' : done ? 'good' : ''}`}><i style={{ width: `${pct * 100}%` }} /></div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function GoalsSection({ store, api, month, who }: { store: Store; api: Api; month: string; who: string }) {
  const list = store.mentees.filter(m => who === 'all' || m.id === who)
  return (
    <div className="section">
      <div className="section-head">
        <div className="h2">Metas de {monthFull(month)}</div>
        <button className="btn ghost" onClick={() => api.open({ kind: 'goal', month, menteeId: who === 'all' ? undefined : who })}>＋ Definir meta</button>
      </div>
      <div className="grid g-3 stagger">
        {list.map(m => <GoalCard key={m.id} m={m} month={month} store={store} api={api} editable />)}
      </div>
    </div>
  )
}

// ---------- Comercial (vendas mensais) ----------

export function SalesView({ store, api }: { store: Store; api: Api }) {
  const [month, setMonth] = useState(CURRENT_MONTH)
  const [who, setWho] = useState('all')
  const filtered = store.sales.filter(s => who === 'all' || s.menteeId === who)
  const months = chartMonths(filtered)
  const byMonth = (mo: string) => filtered.filter(s => s.month === mo)
  const maxRev = Math.max(1, ...months.map(mo => salesSummary(byMonth(mo)).revenue))
  const entries = [...byMonth(month)].sort((a, b) => b.ticket * b.units - a.ticket * a.units)
  const sum = salesSummary(entries)

  return (
    <>
      <div className="topbar">
        <h1>Comercial <span className="crumb">· vendas por período</span></h1>
        <div className="topbar-right"><MonthNav month={month} onChange={setMonth} /></div>
      </div>
      <div className="content page-enter">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div className="eyebrow">Receita & high ticket</div>
            <div className="display" style={{ marginTop: 8, fontSize: 26 }}>Vendas de {monthFull(month)}</div>
          </div>
          <WhoFilter mentees={store.mentees} who={who} setWho={setWho} />
        </div>

        <div className="grid g-4 stagger" style={{ marginTop: 24 }}>
          <Kpi label="Receita do mês" value={fmtBRL(sum.revenue)} sub={`${sum.units} vendas no período`} />
          <Kpi label="Receita high ticket" value={fmtBRL(sum.htRevenue)} sub={`${Math.round(sum.htShare * 100)}% da receita`} accent />
          <Kpi label="Vendas high ticket" value={sum.htUnits} sub={`de ${sum.units} vendas totais`} accent />
          <Kpi label="Ticket médio" value={fmtBRL(sum.avgTicket)} sub="por venda no mês" />
        </div>

        <GoalsSection store={store} api={api} month={month} who={who} />

        <PipelineSection store={store} api={api} menteeId={who === 'all' ? undefined : who} editable />

        <div className="card section">
          <div className="section-head" style={{ marginBottom: 4 }}>
            <div className="h2">Evolução mensal</div>
            <div className="legend">
              <span><i style={{ background: 'var(--accent)' }} /> high ticket</span>
              <span><i style={{ background: 'rgba(255,255,255,0.25)' }} /> demais produtos</span>
            </div>
          </div>
          <div className="bars">
            {months.map(mo => {
              const s = salesSummary(byMonth(mo))
              return (
                <div key={mo} className={`bar-col ${mo === month ? 'sel' : ''}`} onClick={() => setMonth(mo)}>
                  <div className="bar-val">{s.revenue ? fmtK(s.revenue) : ''}</div>
                  <div className="bar-area">
                    <div className="bar-stack" style={{ height: s.revenue ? `${(s.revenue / maxRev) * 100}%` : '3px', opacity: s.revenue ? 1 : 0.35 }}>
                      <i className="ht" style={{ height: `${s.revenue ? (s.htRevenue / s.revenue) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <div className="bar-lab">{monthLabel(mo)}</div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card section">
          <div className="section-head">
            <div className="h2">Registros de {monthLabel(month)}</div>
            <button className="btn" onClick={() => api.open({ kind: 'sale', menteeId: who === 'all' ? undefined : who, month })}>＋ Registrar venda</button>
          </div>
          {entries.length ? (
            <table className="table">
              <thead>
                <tr><th>Produto</th><th>Mentorado</th><th className="num">Ticket</th><th className="num">Qtd</th><th className="num">Receita</th><th></th><th></th></tr>
              </thead>
              <tbody>
                {entries.map(e => (
                  <tr key={e.id}>
                    <td style={{ fontWeight: 550 }}>{e.product}</td>
                    <td className="muted">{menteeName(store, e.menteeId)}</td>
                    <td className="num">{fmtBRL(e.ticket)}</td>
                    <td className="num">{e.units}</td>
                    <td className="num" style={e.highTicket ? { color: 'var(--accent)', fontWeight: 650 } : undefined}>{fmtBRL(e.ticket * e.units)}</td>
                    <td>{e.highTicket && <span className="ht-chip">HT</span>}</td>
                    <td style={{ width: 64 }}>
                      <span className="row-tools">
                        <button className="icon-btn" onClick={() => api.open({ kind: 'sale', sale: e })}>✎</button>
                        <button className="icon-btn danger" onClick={() => confirm(`Excluir a venda "${e.product}"?`) && api.delSale(e.id)}>✕</button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div className="empty">Nenhuma venda registrada em {monthFull(month)}.</div>}
        </div>
      </div>
    </>
  )
}

// ---------- Campanhas (calendário mensal por funil) ----------

type CmpMetric = 'revenue' | 'leads' | 'conv' | 'cpa' | 'sales'
const CMP_METRICS: { id: CmpMetric; label: string; best: 'max' | 'min' }[] = [
  { id: 'revenue', label: 'Receita',   best: 'max' },
  { id: 'leads',   label: 'Leads',     best: 'max' },
  { id: 'conv',    label: 'Conversão', best: 'max' },
  { id: 'cpa',     label: 'CPA',       best: 'min' },
  { id: 'sales',   label: 'Vendas',    best: 'max' },
]

export function CampaignsView({ store, api }: { store: Store; api: Api }) {
  const [month, setMonth] = useState(CURRENT_MONTH)
  const [who, setWho] = useState('all')
  const [mode, setMode] = useState<'month' | 'compare'>('month')
  const [metric, setMetric] = useState<CmpMetric>('revenue')
  const list = store.campaigns
    .filter(c => c.month === month && (who === 'all' || c.menteeId === who))
    .sort((a, b) => campaignCalc(b).revenue - campaignCalc(a).revenue)

  const tot = list.reduce((acc, c) => {
    const d = campaignCalc(c)
    return { invested: acc.invested + d.invested, leads: acc.leads + c.leads, sales: acc.sales + d.sales, revenue: acc.revenue + d.revenue }
  }, { invested: 0, leads: 0, sales: 0, revenue: 0 })
  const cplAvg = tot.leads ? tot.invested / tot.leads : 0
  const cpaAvg = tot.sales ? tot.invested / tot.sales : 0
  const conv = tot.leads ? (tot.sales / tot.leads) * 100 : 0
  const roas = tot.invested ? tot.revenue / tot.invested : 0

  // Comparativo entre meses: janela de 4 meses terminando no mês selecionado
  const cmpMonths = [-3, -2, -1, 0].map(d => shiftMonth(month, d))
  const cellAgg = (fid: FunnelId, mo: string) => {
    const cs = store.campaigns.filter(c => c.funnel === fid && c.month === mo && (who === 'all' || c.menteeId === who))
    if (!cs.length) return null
    return cs.reduce((acc, c) => {
      const d = campaignCalc(c)
      return { invested: acc.invested + d.invested, leads: acc.leads + c.leads, sales: acc.sales + d.sales, revenue: acc.revenue + d.revenue }
    }, { invested: 0, leads: 0, sales: 0, revenue: 0 })
  }
  type Agg = NonNullable<ReturnType<typeof cellAgg>>
  const metricVal = (t: Agg): number | null =>
    metric === 'revenue' ? t.revenue
    : metric === 'leads' ? t.leads
    : metric === 'sales' ? t.sales
    : metric === 'conv' ? (t.leads ? (t.sales / t.leads) * 100 : null)
    : (t.sales && t.invested ? t.invested / t.sales : null)
  const fmtMetric = (v: number) =>
    metric === 'revenue' || metric === 'cpa' ? fmtBRL(v) : metric === 'conv' ? `${v.toFixed(1)}%` : String(Math.round(v))
  const cmpRows = FUNNELS
    .map(f => ({ f, vals: cmpMonths.map(mo => { const t = cellAgg(f.id, mo); return t ? metricVal(t) : null }) }))
    .filter(r => r.vals.some(v => v !== null))
  const bestOf = (vals: (number | null)[]) => {
    const nums = vals.filter((v): v is number => v !== null)
    if (nums.length < 2) return null
    return CMP_METRICS.find(mm => mm.id === metric)!.best === 'min' ? Math.min(...nums) : Math.max(...nums)
  }

  const byFunnel = FUNNELS.map(f => {
    const cs = list.filter(c => c.funnel === f.id)
    if (!cs.length) return null
    const t = cs.reduce((acc, c) => {
      const d = campaignCalc(c)
      return { invested: acc.invested + d.invested, leads: acc.leads + c.leads, sales: acc.sales + d.sales, revenue: acc.revenue + d.revenue }
    }, { invested: 0, leads: 0, sales: 0, revenue: 0 })
    return { f, n: cs.length, ...t }
  }).filter(Boolean) as { f: typeof FUNNELS[number]; n: number; invested: number; leads: number; sales: number; revenue: number }[]

  return (
    <>
      <div className="topbar">
        <h1>Campanhas <span className="crumb">· calendário por funil</span></h1>
        <div className="topbar-right"><MonthNav month={month} onChange={setMonth} /></div>
      </div>
      <div className="content page-enter">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div className="eyebrow">Aquisição & conversão</div>
            <div className="display" style={{ marginTop: 8, fontSize: 26 }}>Campanhas de {monthFull(month)}</div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <WhoFilter mentees={store.mentees} who={who} setWho={setWho} />
            <button className="btn" onClick={() => api.open({ kind: 'campaign', menteeId: who === 'all' ? undefined : who, month })}>＋ Nova campanha</button>
          </div>
        </div>

        <div className="pill-tabs" style={{ marginTop: 20 }}>
          <button className={`pill-tab ${mode === 'month' ? 'on' : ''}`} onClick={() => setMode('month')}>Visão do mês</button>
          <button className={`pill-tab ${mode === 'compare' ? 'on' : ''}`} onClick={() => setMode('compare')}>Comparativo de funis</button>
        </div>

        <div className="grid g-4 stagger" style={{ marginTop: 24 }}>
          <Kpi label="Investimento" value={fmtBRL(tot.invested)} sub={`CPL médio ${cplAvg ? fmtBRL(cplAvg) : '—'}`} />
          <Kpi label="Leads geradas" value={tot.leads} sub={`${list.length} campanha${list.length === 1 ? '' : 's'} no mês`} />
          <Kpi label="Vendas · conversão" value={`${tot.sales} · ${conv.toFixed(1)}%`} sub={`CPA médio ${cpaAvg ? fmtBRL(cpaAvg) : '—'}`} />
          <Kpi label="Receita projetada" value={fmtBRL(tot.revenue)} sub={roas ? `ROAS ${roas.toFixed(1)}x` : 'sem investimento pago'} accent />
        </div>

        {mode === 'compare' && (
          <div className="card section">
            <div className="section-head" style={{ marginBottom: 14 }}>
              <div className="h2">Comparativo por funil <span className="crumb" style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 450 }}>· últimos 4 meses</span></div>
              <div className="pill-tabs">
                {CMP_METRICS.map(mm => (
                  <button key={mm.id} className={`pill-tab ${metric === mm.id ? 'on' : ''}`} onClick={() => setMetric(mm.id)}>{mm.label}</button>
                ))}
              </div>
            </div>
            {cmpRows.length ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>Funil</th>
                    {cmpMonths.map(mo => <th key={mo} className="num" style={mo === month ? { color: 'var(--text)' } : undefined}>{monthLabel(mo)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {cmpRows.map(r => {
                    const best = bestOf(r.vals)
                    return (
                      <tr key={r.f.id}>
                        <td><span className="funnel-chip"><span className="fd" style={{ background: pcolor(r.f.hue) }} />{r.f.label}</span></td>
                        {r.vals.map((v, i) => (
                          <td key={i} className="num"
                            style={v !== null && best !== null && v === best ? { color: 'var(--accent)', fontWeight: 650 } : undefined}>
                            {v === null ? '—' : fmtMetric(v)}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : <div className="empty">Nenhuma campanha no período comparado.</div>}
            <div className="muted-3" style={{ fontSize: 11.5, marginTop: 12 }}>
              Em destaque: melhor resultado de cada funil no período ({CMP_METRICS.find(mm => mm.id === metric)!.best === 'min' ? 'menor' : 'maior'} é melhor).
            </div>
          </div>
        )}

        {mode === 'month' && byFunnel.length > 0 && (
          <div className="card section">
            <div className="h2" style={{ marginBottom: 14 }}>Resumo por funil</div>
            <table className="table">
              <thead>
                <tr><th>Funil</th><th className="num">Campanhas</th><th className="num">Leads</th><th className="num">CPL</th><th className="num">CPA</th><th className="num">Conv.</th><th className="num">Receita</th></tr>
              </thead>
              <tbody>
                {byFunnel.map(r => (
                  <tr key={r.f.id}>
                    <td><span className="funnel-chip"><span className="fd" style={{ background: pcolor(r.f.hue) }} />{r.f.label}</span></td>
                    <td className="num">{r.n}</td>
                    <td className="num">{r.leads}</td>
                    <td className="num">{r.leads && r.invested ? fmtBRL(r.invested / r.leads) : '—'}</td>
                    <td className="num">{r.sales && r.invested ? fmtBRL(r.invested / r.sales) : '—'}</td>
                    <td className="num">{r.leads ? `${((r.sales / r.leads) * 100).toFixed(1)}%` : '—'}</td>
                    <td className="num" style={{ color: 'var(--accent)', fontWeight: 650 }}>{fmtBRL(r.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {mode === 'month' && (
          <div className="section">
            <div className="grid stagger">
              {list.length
                ? list.map(c => <CampaignCard key={c.id} c={c} mentee={menteeName(store, c.menteeId)} api={api} editable />)
                : <div className="empty">Nenhuma campanha em {monthFull(month)}. Clique em “＋ Nova campanha” para planejar.</div>}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ---------- Equipe ----------

export function TeamView({ store, api }: { store: Store; api: Api }) {
  return (
    <>
      <div className="topbar">
        <h1>Equipe</h1>
        <div className="topbar-right"><span className="chip">{store.team.length} membros</span></div>
      </div>
      <div className="content page-enter">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div className="eyebrow">{'Programa ADVISOR'}</div>
            <div className="display" style={{ marginTop: 8 }}>Quem entrega com você</div>
          </div>
          <button className="btn" onClick={() => api.open({ kind: 'team' })}>＋ Adicionar membro</button>
        </div>

        <div className="mentee-grid stagger" style={{ marginTop: 26 }}>
          {store.team.map(t => (
            <div key={t.id} className="card hover">
              <div className="mentee-head">
                <div className="avatar">{t.initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="mentee-name">{t.name}</div>
                  <div className="mentee-biz">{t.role}</div>
                </div>
                <span className="row-tools" style={{ opacity: 1 }}>
                  <button className="icon-btn" onClick={() => api.open({ kind: 'team', member: t })}>✎</button>
                  <button className="icon-btn danger" onClick={() => confirm(`Remover ${t.name} da equipe?`) && api.delTeam(t.id)}>✕</button>
                </span>
              </div>
              <div style={{ display: 'flex', gap: 7, marginTop: 15, flexWrap: 'wrap' }}>
                {t.focus.map(pid => {
                  const p = pillarById(pid)
                  return <span key={pid} className="tag"><span className="pillar-dot" style={{ background: pcolor(p.hue), width: 7, height: 7 }} />{p.short}</span>
                })}
              </div>
              <div className="divider" style={{ margin: '14px 0' }} />
              <div className="stat-label" style={{ marginBottom: 8 }}>Mentorados ({t.menteeIds.length})</div>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {t.menteeIds.length
                  ? t.menteeIds.map(id => <span key={id} className="tag">{menteeName(store, id)}</span>)
                  : <span className="muted-3" style={{ fontSize: 12.5 }}>nenhum atribuído</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// ---------- Seção comercial do mentorado (detalhe & jornada) ----------

export function MenteeCommercial({ m, store, api, editable }: { m: Mentee; store: Store; api: Api; editable: boolean }) {
  const sales = store.sales.filter(s => s.menteeId === m.id).sort((a, b) => b.month.localeCompare(a.month))
  const camps = store.campaigns.filter(c => c.menteeId === m.id).sort((a, b) => b.month.localeCompare(a.month))
  const sum = salesSummary(sales)
  if (!sales.length && !camps.length && !editable) return null

  return (
    <div className="section">
      <div className="section-head">
        <div className="h2">{editable ? 'Comercial' : 'Meus resultados'}</div>
        {editable && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn ghost" onClick={() => api.open({ kind: 'sale', menteeId: m.id, month: CURRENT_MONTH })}>＋ Venda</button>
            <button className="btn ghost" onClick={() => api.open({ kind: 'campaign', menteeId: m.id, month: CURRENT_MONTH })}>＋ Campanha</button>
          </div>
        )}
      </div>

      <div className="grid g-4">
        <Kpi label="Receita acumulada" value={fmtBRL(sum.revenue)} sub={`${sum.units} vendas`} />
        <Kpi label="High ticket" value={fmtBRL(sum.htRevenue)} sub={`${Math.round(sum.htShare * 100)}% da receita`} accent />
        <Kpi label="Ticket médio" value={fmtBRL(sum.avgTicket)} />
        <Kpi label="Campanhas" value={camps.length} sub={`${camps.filter(c => c.status === 'running').length} em andamento`} />
      </div>

      <div style={{ marginTop: 16 }}>
        <GoalCard m={m} month={CURRENT_MONTH} store={store} api={api} editable={editable} />
      </div>

      {sales.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <table className="table">
            <thead>
              <tr><th>Mês</th><th>Produto</th><th className="num">Ticket</th><th className="num">Qtd</th><th className="num">Receita</th><th></th>{editable && <th></th>}</tr>
            </thead>
            <tbody>
              {sales.map(e => (
                <tr key={e.id}>
                  <td className="mono" style={{ fontSize: 12, color: 'var(--text-3)' }}>{monthLabel(e.month)}</td>
                  <td style={{ fontWeight: 550 }}>{e.product}</td>
                  <td className="num">{fmtBRL(e.ticket)}</td>
                  <td className="num">{e.units}</td>
                  <td className="num" style={e.highTicket ? { color: 'var(--accent)', fontWeight: 650 } : undefined}>{fmtBRL(e.ticket * e.units)}</td>
                  <td>{e.highTicket && <span className="ht-chip">HT</span>}</td>
                  {editable && (
                    <td style={{ width: 64 }}>
                      <span className="row-tools">
                        <button className="icon-btn" onClick={() => api.open({ kind: 'sale', sale: e })}>✎</button>
                        <button className="icon-btn danger" onClick={() => confirm(`Excluir a venda "${e.product}"?`) && api.delSale(e.id)}>✕</button>
                      </span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {camps.length > 0 && (
        <div className="grid" style={{ marginTop: 16 }}>
          {camps.map(c => <CampaignCard key={c.id} c={c} api={api} editable={editable} showMonth />)}
        </div>
      )}

      {(editable || store.deals.some(d => d.menteeId === m.id)) && (
        <PipelineSection store={store} api={api} menteeId={m.id} editable={editable} />
      )}
    </div>
  )
}
