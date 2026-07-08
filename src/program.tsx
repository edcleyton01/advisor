import {
  PILLARS, pcolor, fmtBRL, fmtK, monthLabel, monthFull, fmtDate, chartMonths, salesSummary,
  overallProgress, actionXp, effectiveStreak, weekKey, shiftWeek, CURRENT_MONTH,
  type Store, type Mentee,
} from './data'

// ============================================================
//  Painel de Evolução do Programa (advisor)
// ============================================================

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
const monthKey = (iso: string) => iso.slice(0, 7)

// ---------- Radar da turma (média base × atual) ----------
function CohortRadar({ base, current, size = 210 }: { base: number[]; current: number[]; size?: number }) {
  const cx = size / 2, cy = size / 2, R = size / 2 - 26, n = PILLARS.length
  const pt = (i: number, r: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]
  }
  const poly = (vals: number[]) => vals.map((v, i) => pt(i, R * (v / 10)).join(',')).join(' ')
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[0.25, 0.5, 0.75, 1].map((r, i) => (
        <polygon key={i} points={PILLARS.map((_, idx) => pt(idx, R * r).join(',')).join(' ')} fill="none" stroke="rgba(255,255,255,0.07)" />
      ))}
      {PILLARS.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.06)" /> })}
      <polygon points={poly(base)} fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.28)" strokeWidth={1} strokeDasharray="3 3" />
      <polygon points={poly(current)} fill="rgba(232,179,74,0.14)" stroke="var(--accent)" strokeWidth={1.6} />
      {PILLARS.map((p, i) => { const [x, y] = pt(i, R * (current[i] / 10)); return <circle key={p.id} cx={x} cy={y} r={3} fill="var(--accent)" /> })}
      {PILLARS.map((p, i) => {
        const [x, y] = pt(i, R + 15)
        return <text key={p.id} x={x} y={y} fill="var(--text-3)" fontSize={10} textAnchor="middle" dominantBaseline="middle" style={{ fontWeight: 600 }}>{p.short}</text>
      })}
    </svg>
  )
}

// ---------- Small multiple: receita mensal de 1 mentorado ----------
function MiniRevenue({ m, store, months }: { m: Mentee; store: Store; months: string[] }) {
  const rev = months.map(mo => salesSummary(store.sales.filter(s => s.menteeId === m.id && s.month === mo)).revenue)
  const max = Math.max(1, ...rev)
  const total = rev.reduce((a, b) => a + b, 0)
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{m.name.split(' ')[0]}</div>
        <div className="mono" style={{ fontSize: 12, color: 'var(--accent)' }}>{fmtBRL(total)}</div>
      </div>
      <div className="mini-bars">
        {rev.map((v, i) => (
          <div key={i} className="mini-col" title={`${monthLabel(months[i])}: ${fmtBRL(v)}`}>
            <div className="mini-bar" style={{ height: v ? `${(v / max) * 100}%` : '2px', opacity: v ? 1 : 0.3 }} />
          </div>
        ))}
      </div>
      <div className="mini-axis"><span>{monthLabel(months[0])}</span><span>{monthLabel(months[months.length - 1])}</span></div>
    </div>
  )
}

export function ProgramDashboard({ store }: { store: Store }) {
  const { mentees } = store
  const months = chartMonths(store.sales)
  const revByMonth = (mo: string) => salesSummary(store.sales.filter(s => s.month === mo))
  const maxRev = Math.max(1, ...months.map(mo => revByMonth(mo).revenue))

  // KPIs do programa
  const avgExec = mean(mentees.map(m => overallProgress(m).pct))
  const totalXp = mentees.reduce((s, m) => s + actionXp(m), 0)
  const totalRev = store.sales.reduce((s, e) => s + e.ticket * e.units, 0)
  const avgDelta = mean(mentees.map(m => mean(PILLARS.map(p => m.scores[p.id].current - m.scores[p.id].baseline))))

  // Maturidade da turma
  const baseAvg = PILLARS.map(p => mean(mentees.map(m => m.scores[p.id].baseline)))
  const curAvg = PILLARS.map(p => mean(mentees.map(m => m.scores[p.id].current)))

  // Execução por mentorado (ranking)
  const execRows = mentees.map(m => ({ m, pct: overallProgress(m).pct })).sort((a, b) => b.pct - a.pct)

  // Ritmo: check-ins por semana (últimas 8 semanas)
  const weeks = Array.from({ length: 8 }, (_, i) => shiftWeek(weekKey(), -(7 - i)))
  const ciByWeek = weeks.map(w => store.checkins.filter(c => c.week === w).length)
  const maxCi = Math.max(1, ...ciByWeek)

  // Turmas (cohort por mês de entrada)
  const cohortKeys = [...new Set(mentees.map(m => monthKey(m.startDate)))].sort()
  const cohorts = cohortKeys.map(k => {
    const ms = mentees.filter(m => monthKey(m.startDate) === k)
    return {
      k, ms,
      exec: mean(ms.map(m => overallProgress(m).pct)),
      rev: store.sales.filter(s => ms.some(m => m.id === s.menteeId)).reduce((a, e) => a + e.ticket * e.units, 0),
      delta: mean(ms.map(m => mean(PILLARS.map(p => m.scores[p.id].current - m.scores[p.id].baseline)))),
    }
  })

  return (
    <>
      <div className="topbar"><h1>Evolução do programa</h1>
        <div className="topbar-right"><span className="chip">{mentees.length} mentorados</span></div>
      </div>
      <div className="content page-enter">
        <div className="eyebrow">Analytics · visão de programa</div>
        <div className="display" style={{ marginTop: 8 }}>Como o programa evolui no tempo</div>

        {/* KPIs */}
        <div className="grid g-4 stagger" style={{ marginTop: 24 }}>
          <div className="card"><div className="stat-label">Execução média</div><div className="stat-value">{Math.round(avgExec * 100)}<small>%</small></div><div className="stat-sub">do ciclo, entre todos</div></div>
          <div className="card"><div className="stat-label">Receita acumulada</div><div className="stat-value" style={{ fontSize: 24 }}>{fmtBRL(totalRev)}</div><div className="stat-sub">todos os mentorados</div></div>
          <div className="card"><div className="stat-label">Evolução de maturidade</div><div className="stat-value" style={{ color: 'var(--good)' }}>+{avgDelta.toFixed(1)}</div><div className="stat-sub">média por pilar (base → atual)</div></div>
          <div className="card"><div className="stat-label">XP do programa</div><div className="stat-value" style={{ color: 'var(--accent)' }}>{totalXp}</div><div className="stat-sub">execução acumulada</div></div>
        </div>

        {/* Receita ao longo do tempo */}
        <div className="card section">
          <div className="section-head" style={{ marginBottom: 4 }}>
            <div className="h2">Receita do programa no tempo</div>
            <div className="legend"><span><i style={{ background: 'var(--accent)' }} /> high ticket</span><span><i style={{ background: 'rgba(255,255,255,0.25)' }} /> demais</span></div>
          </div>
          <div className="bars">
            {months.map(mo => {
              const s = revByMonth(mo)
              return (
                <div key={mo} className="bar-col" title={`${monthFull(mo)}: ${fmtBRL(s.revenue)} · high ticket ${fmtBRL(s.htRevenue)}`}>
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

        {/* Maturidade da turma + Execução por mentorado */}
        <div className="grid g-2 section">
          <div className="card">
            <div className="section-head" style={{ marginBottom: 4 }}>
              <div className="h2" style={{ fontSize: 17 }}>Maturidade da turma</div>
              <div className="legend"><span><i style={{ background: 'rgba(255,255,255,0.3)', borderRadius: 2 }} /> base</span><span><i style={{ background: 'var(--accent)' }} /> atual</span></div>
            </div>
            <div style={{ display: 'flex', gap: 22, alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="radar-wrap"><CohortRadar base={baseAvg} current={curAvg} /></div>
              <div className="radar-legend" style={{ flex: 1, minWidth: 190 }}>
                {PILLARS.map((p, i) => {
                  const dlt = curAvg[i] - baseAvg[i]
                  return (
                    <div key={p.id} className="li">
                      <span className="pillar-dot" style={{ background: pcolor(p.hue) }} />
                      <span>{p.label}</span>
                      <span className="val">{curAvg[i].toFixed(1)}/10{dlt > 0.05 && <span style={{ color: 'var(--good)', marginLeft: 6 }}>+{dlt.toFixed(1)}</span>}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="h2" style={{ fontSize: 17, marginBottom: 16 }}>Execução por mentorado</div>
            <div className="prog-rows">
              {execRows.map(({ m, pct }) => (
                <div key={m.id} className="prog-row">
                  <span className="prog-name">{m.name.split(' ')[0]}</span>
                  <div className="bar good" style={{ flex: 1 }}><i style={{ width: `${pct * 100}%` }} /></div>
                  <span className="mono prog-pct">{Math.round(pct * 100)}%</span>
                </div>
              ))}
            </div>
            <div className="divider" style={{ margin: '16px 0 12px' }} />
            <div className="h2" style={{ fontSize: 14, marginBottom: 12, color: 'var(--text-2)' }}>Ritmo · check-ins por semana</div>
            <div className="rhythm">
              {weeks.map((w, i) => (
                <div key={w} className="rh-col" title={`Semana de ${fmtDate(w)}: ${ciByWeek[i]} check-ins`}>
                  <div className="rh-bar" style={{ height: ciByWeek[i] ? `${(ciByWeek[i] / maxCi) * 100}%` : '2px', opacity: ciByWeek[i] ? 1 : 0.3 }} />
                </div>
              ))}
            </div>
            <div className="mini-axis"><span>{fmtDate(weeks[0])}</span><span>agora</span></div>
          </div>
        </div>

        {/* Trajetória individual (small multiples) */}
        <div className="section">
          <div className="section-head"><div className="h2">Trajetória de cada mentorado <span className="crumb" style={{ fontSize: 13, fontWeight: 450, color: 'var(--text-3)' }}>· receita mensal</span></div></div>
          <div className="grid g-4 stagger">
            {mentees.map(m => <MiniRevenue key={m.id} m={m} store={store} months={months} />)}
          </div>
        </div>

        {/* Turmas / cohort */}
        <div className="section">
          <div className="section-head"><div className="h2">Turmas <span className="crumb" style={{ fontSize: 13, fontWeight: 450, color: 'var(--text-3)' }}>· por mês de entrada</span></div></div>
          <div className="grid g-3 stagger">
            {cohorts.map(c => (
              <div key={c.k} className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="h2" style={{ fontSize: 16, textTransform: 'capitalize' }}>Turma {monthLabel(c.k + '-01').replace('/', '/')}</div>
                  <span className="tag" style={{ marginLeft: 'auto' }}>{c.ms.length} {c.ms.length === 1 ? 'mentorado' : 'mentorados'}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                  {c.ms.map(m => <span key={m.id} className="tag">{m.name.split(' ')[0]}</span>)}
                </div>
                <div className="divider" style={{ margin: '14px 0' }} />
                <div className="cohort-metrics">
                  <div><div className="stat-label">Execução</div><b>{Math.round(c.exec * 100)}%</b></div>
                  <div><div className="stat-label">Receita</div><b>{fmtBRL(c.rev)}</b></div>
                  <div><div className="stat-label">Maturidade</div><b style={{ color: 'var(--good)' }}>+{c.delta.toFixed(1)}</b></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
