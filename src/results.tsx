import {
  CURRENT_MONTH, shiftMonth, monthLabel, monthFull, fmtBRL, fmtK,
  salesSummary, monthActuals, campaignCalc, funnelById, DEAL_STAGES,
  type Mentee, type Store, type FunnelId,
} from './data'
import { AccessChip } from './week'
import { Avatar } from './avatar'

// ============================================================
//  Meus resultados — painel de dados do mentorado
//  (tudo derivado do que já está registrado: vendas, metas,
//   campanhas e pipeline — visão do próprio negócio)
// ============================================================

// últimos n meses terminando no mês corrente
const lastMonths = (n: number) => Array.from({ length: n }, (_, i) => shiftMonth(CURRENT_MONTH, -(n - 1 - i)))

// ---------- Tendência vs mês anterior ----------
function Trend({ now, prev, fmt }: { now: number; prev: number; fmt?: (v: number) => string }) {
  if (!prev) return <span className="muted-3" style={{ fontSize: 11.5 }}>{now ? 'primeiro mês com registro' : 'sem registro anterior'}</span>
  const pct = ((now - prev) / prev) * 100
  const up = pct >= 0
  return (
    <span className="mono" style={{ fontSize: 11.5, color: up ? 'var(--good)' : '#f27979' }}>
      {up ? '▲' : '▼'} {Math.abs(pct).toFixed(0)}% vs {fmt ? fmt(prev) : monthLabel(shiftMonth(CURRENT_MONTH, -1))}
    </span>
  )
}

// ---------- Receita mês a mês com marca de meta ----------
function RevenueChart({ m, store, months }: { m: Mentee; store: Store; months: string[] }) {
  const data = months.map(mo => {
    const s = salesSummary(store.sales.filter(e => e.menteeId === m.id && e.month === mo))
    const goal = store.goals.find(g => g.menteeId === m.id && g.month === mo)?.revenueGoal ?? 0
    return { mo, ...s, goal }
  })
  const max = Math.max(1, ...data.map(d => Math.max(d.revenue, d.goal)))
  return (
    <div className="card section" style={{ marginTop: 18 }}>
      <div className="section-head" style={{ marginBottom: 4 }}>
        <div className="h2" style={{ fontSize: 17 }}>Minha receita no tempo</div>
        <div className="legend">
          <span><i style={{ background: 'var(--accent)' }} /> high ticket</span>
          <span><i style={{ background: 'rgba(255,255,255,0.25)' }} /> demais</span>
          <span><i style={{ background: 'transparent', borderTop: '2px dashed rgba(78,201,138,0.8)', borderRadius: 0, height: 0 }} /> meta</span>
        </div>
      </div>
      <div className="bars">
        {data.map(d => (
          <div key={d.mo} className="bar-col"
            title={`${monthFull(d.mo)}: ${fmtBRL(d.revenue)}${d.goal ? ` · meta ${fmtBRL(d.goal)}` : ''} · high ticket ${fmtBRL(d.htRevenue)}`}>
            <div className="bar-val">{d.revenue ? fmtK(d.revenue) : ''}</div>
            <div className="bar-area">
              {d.goal > 0 && <div className="goal-tick" style={{ bottom: `${(d.goal / max) * 100}%` }} />}
              <div className="bar-stack" style={{ height: d.revenue ? `${(d.revenue / max) * 100}%` : '3px', opacity: d.revenue ? 1 : 0.35 }}>
                <i className="ht" style={{ height: `${d.revenue ? (d.htRevenue / d.revenue) * 100 : 0}%` }} />
              </div>
            </div>
            <div className="bar-lab">{monthLabel(d.mo)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------- Desempenho por funil (histórico) ----------
function FunnelRanking({ m, store }: { m: Mentee; store: Store }) {
  const mine = store.campaigns.filter(c => c.menteeId === m.id)
  if (!mine.length) {
    return <div className="empty" style={{ marginTop: 16 }}>Nenhuma campanha registrada ainda — os funis aparecem aqui quando a primeira rodar.</div>
  }
  const byFunnel = new Map<FunnelId, { invested: number; revenue: number; sales: number; leads: number; n: number }>()
  for (const c of mine) {
    const calc = campaignCalc(c)
    const cur = byFunnel.get(c.funnel) ?? { invested: 0, revenue: 0, sales: 0, leads: 0, n: 0 }
    byFunnel.set(c.funnel, {
      invested: cur.invested + calc.invested, revenue: cur.revenue + calc.revenue,
      sales: cur.sales + calc.sales, leads: cur.leads + c.leads, n: cur.n + 1,
    })
  }
  const rows = [...byFunnel.entries()]
    .map(([id, v]) => ({
      id, ...v,
      roas: v.invested ? v.revenue / v.invested : 0,
      cpa: v.sales && v.invested ? v.invested / v.sales : 0,
      conv: v.leads ? (v.sales / v.leads) * 100 : 0,
    }))
    .sort((a, b) => b.roas - a.roas)

  return (
    <div className="grid g-3 stagger" style={{ marginTop: 16 }}>
      {rows.map((r, i) => {
        const f = funnelById(r.id)
        const champion = i === 0 && r.roas > 0
        return (
          <div key={r.id} className="card" style={champion ? { borderColor: 'rgba(232,179,74,0.4)', background: 'var(--accent-dim)' } : undefined}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="pillar-dot" style={{ background: `hsl(${f.hue} 62% 62%)` }} />
              <div style={{ fontWeight: 650, fontSize: 13.5 }}>{f.label}</div>
              {champion && <span className="tag" style={{ marginLeft: 'auto', color: 'var(--accent)', borderColor: 'rgba(232,179,74,0.35)' }}>◆ seu campeão</span>}
            </div>
            <div style={{ display: 'flex', gap: 18, marginTop: 14, flexWrap: 'wrap' }}>
              <div><div className="stat-label">ROAS</div><div className="stat-value" style={{ fontSize: 22, color: champion ? 'var(--accent)' : undefined }}>
                {r.invested ? <>{r.roas.toFixed(1)}<small>x</small></> : <span title="sem investimento (orgânico)">—</span>}
              </div></div>
              <div><div className="stat-label">CPA</div><div className="stat-value" style={{ fontSize: 22 }}>{r.cpa ? fmtBRL(r.cpa) : '—'}</div></div>
              <div><div className="stat-label">Conversão</div><div className="stat-value" style={{ fontSize: 22 }}>{r.conv.toFixed(1)}<small>%</small></div></div>
            </div>
            <div className="muted-3" style={{ fontSize: 11.5, marginTop: 10 }}>
              {r.n} campanha{r.n > 1 ? 's' : ''} · {r.leads} leads · {fmtBRL(r.revenue)} gerados
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------- Pipeline high ticket ----------
function PipelineCard({ m, store }: { m: Mentee; store: Store }) {
  const mine = store.deals.filter(d => d.menteeId === m.id)
  if (!mine.length) return null
  const open = mine.filter(d => !['won', 'lost'].includes(d.stage))
  const inPlay = open.reduce((s, d) => s + d.value, 0)
  const won = mine.filter(d => d.stage === 'won').reduce((s, d) => s + d.value, 0)
  const maxStage = Math.max(1, ...DEAL_STAGES.map(st => mine.filter(d => d.stage === st.id).reduce((s, d) => s + d.value, 0)))
  return (
    <div className="card">
      <div className="section-head" style={{ marginBottom: 14 }}>
        <div className="h2" style={{ fontSize: 17 }}>Meu pipeline high ticket</div>
        <span className="level-pill"><span className="lv">Em jogo</span>{fmtBRL(inPlay)}</span>
      </div>
      {DEAL_STAGES.filter(st => st.id !== 'lost').map(st => {
        const deals = mine.filter(d => d.stage === st.id)
        const value = deals.reduce((s, d) => s + d.value, 0)
        return (
          <div key={st.id} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-2)', marginBottom: 6 }}>
              <span>{st.label} <span className="muted-3">· {deals.length}</span></span>
              <span className="mono" style={{ color: st.id === 'won' ? 'var(--good)' : 'var(--text-2)' }}>{value ? fmtBRL(value) : '—'}</span>
            </div>
            <div className={`bar ${st.id === 'won' ? 'good' : 'accent'}`}><i style={{ width: `${(value / maxStage) * 100}%` }} /></div>
          </div>
        )
      })}
      {won > 0 && <div className="muted-3" style={{ fontSize: 11.5, marginTop: 4 }}>✓ {fmtBRL(won)} já fechados neste ciclo</div>}
    </div>
  )
}

// ---------- View ----------
export function MyResults({ m, store, onLogout }: { m: Mentee; store: Store; onLogout: () => void }) {
  const months = lastMonths(6)
  const now = monthActuals(m.id, CURRENT_MONTH, store.sales, store.campaigns)
  const prev = monthActuals(m.id, shiftMonth(CURRENT_MONTH, -1), store.sales, store.campaigns)
  const sumNow = salesSummary(store.sales.filter(e => e.menteeId === m.id && e.month === CURRENT_MONTH))
  const goal = store.goals.find(g => g.menteeId === m.id && g.month === CURRENT_MONTH)
  const goalPct = goal?.revenueGoal ? Math.min(1, now.revenue / goal.revenueGoal) : null
  const hasAny = store.sales.some(e => e.menteeId === m.id) || store.campaigns.some(c => c.menteeId === m.id)

  return (
    <>
      <div className="topbar"><h1>Meus resultados</h1>
        <div className="topbar-right">
          <AccessChip m={m} />
          <span className="chip">{monthFull(CURRENT_MONTH)}</span>
          <Avatar m={m} size={34} fontSize={12} />
          <button className="btn ghost" style={{ padding: '7px 12px', fontSize: 12 }} onClick={onLogout}>Trocar perfil</button>
        </div>
      </div>
      <div className="content page-enter">
        <div className="eyebrow">Sua operação em números</div>
        <div className="display" style={{ marginTop: 8, fontSize: 26 }}>O resultado é seu, {m.name.split(' ')[0]}.</div>

        {!hasAny && (
          <div className="empty" style={{ marginTop: 30 }}>
            Seus números aparecem aqui assim que a primeira venda ou campanha for registrada com seu mentor.
          </div>
        )}

        {hasAny && (
          <>
            {/* Mês atual */}
            <div className="grid g-4 stagger" style={{ marginTop: 24 }}>
              <div className="card">
                <div className="stat-label">Receita de {monthLabel(CURRENT_MONTH)}</div>
                <div className="stat-value" style={{ fontSize: 24 }}>{fmtBRL(now.revenue)}</div>
                <div className="stat-sub"><Trend now={now.revenue} prev={prev.revenue} /></div>
              </div>
              <div className="card">
                <div className="stat-label">Meta do mês</div>
                {goalPct !== null ? (
                  <>
                    <div className="stat-value" style={{ fontSize: 24, color: goalPct >= 1 ? 'var(--good)' : undefined }}>
                      {Math.round(goalPct * 100)}<small>%</small>
                    </div>
                    <div style={{ marginTop: 8 }}><div className="bar good"><i style={{ width: `${goalPct * 100}%` }} /></div></div>
                    <div className="stat-sub" style={{ marginTop: 7 }}>{goalPct >= 1 ? 'meta batida 🎉' : `faltam ${fmtBRL(goal!.revenueGoal - now.revenue)}`}</div>
                  </>
                ) : (
                  <><div className="stat-value" style={{ fontSize: 24, color: 'var(--text-3)' }}>—</div>
                  <div className="stat-sub">sem meta definida para o mês</div></>
                )}
              </div>
              <div className="card">
                <div className="stat-label">High ticket</div>
                <div className="stat-value" style={{ fontSize: 24, color: 'var(--accent)' }}>{Math.round(sumNow.htShare * 100)}<small>%</small></div>
                <div className="stat-sub">{fmtBRL(sumNow.htRevenue)} da receita do mês</div>
              </div>
              <div className="card">
                <div className="stat-label">Leads geradas</div>
                <div className="stat-value" style={{ fontSize: 24 }}>{now.leads}</div>
                <div className="stat-sub"><Trend now={now.leads} prev={prev.leads} /></div>
              </div>
            </div>

            <RevenueChart m={m} store={store} months={months} />

            <div className="section">
              <div className="section-head">
                <div className="h2">Meus funis</div>
                <span className="muted-3" style={{ fontSize: 12 }}>histórico de todas as campanhas · ordenado por ROAS</span>
              </div>
              <FunnelRanking m={m} store={store} />
            </div>

            <div className="section">
              <PipelineCard m={m} store={store} />
            </div>
          </>
        )}
      </div>
    </>
  )
}
