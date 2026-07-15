import {
  PILLARS, pcolor, fmtDate, monthLabel, weekKey, shiftWeek, todayIso,
  actionXp, overallProgress, effectiveStreak, levelForXp,
  type Mentee, type Store, type PillarId,
} from './data'
import { AccessChip } from './week'
import { Avatar } from './avatar'

// ============================================================
//  Minha evolução — a trajetória do mentorado no programa
//  (radar origem → hoje, ciclos, ritmo semanal e a narrativa
//   dos check-ins: o quanto ele já andou)
// ============================================================

type Scores = Record<PillarId, { baseline: number; current: number }>

// scores de ORIGEM: a baseline do primeiro ciclo registrado
const originScores = (m: Mentee): Scores =>
  (m.cycleHistory?.length ? m.cycleHistory[0].scores : m.scores)

// ---------- Radar origem → hoje ----------
function JourneyRadar({ origin, current, size = 230 }: { origin: Scores; current: Scores; size?: number }) {
  const cx = size / 2, cy = size / 2, R = size / 2 - 26, n = PILLARS.length
  const pt = (i: number, r: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]
  }
  const poly = (sc: Scores, key: 'baseline' | 'current') =>
    PILLARS.map((p, i) => pt(i, R * (sc[p.id][key] / 10)).join(',')).join(' ')
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[0.25, 0.5, 0.75, 1].map((r, i) => (
        <polygon key={i} points={PILLARS.map((_, idx) => pt(idx, R * r).join(',')).join(' ')} fill="none" stroke="rgba(255,255,255,0.07)" />
      ))}
      {PILLARS.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.06)" /> })}
      <polygon points={poly(origin, 'baseline')} fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.28)" strokeWidth={1} strokeDasharray="3 3" />
      <polygon points={poly(current, 'current')} fill="rgba(232,179,74,0.14)" stroke="var(--accent)" strokeWidth={1.6} />
      {PILLARS.map((p, i) => { const [x, y] = pt(i, R * (current[p.id].current / 10)); return <circle key={p.id} cx={x} cy={y} r={3} fill="var(--accent)" /> })}
      {PILLARS.map((p, i) => {
        const [x, y] = pt(i, R + 15)
        return <text key={p.id} x={x} y={y} fill="var(--text-3)" fontSize={10.5} textAnchor="middle" dominantBaseline="middle" style={{ fontWeight: 600 }}>{p.short}</text>
      })}
    </svg>
  )
}

// ---------- Ritmo: check-ins das últimas 12 semanas ----------
function RhythmGrid({ m, store }: { m: Mentee; store: Store }) {
  const weeks = Array.from({ length: 12 }, (_, i) => shiftWeek(weekKey(), -(11 - i)))
  const has = (w: string) => store.checkins.some(c => c.menteeId === m.id && c.week === w)
  const streak = effectiveStreak(m, store.checkins)
  return (
    <div className="card">
      <div className="section-head" style={{ marginBottom: 14 }}>
        <div className="h2" style={{ fontSize: 17 }}>Meu ritmo</div>
        <span className="tag good">⟳ {streak} semana{streak === 1 ? '' : 's'} seguidas</span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {weeks.map(w => (
          <div key={w} title={`semana de ${fmtDate(w)}${has(w) ? ' · check-in feito' : ''}`}
            style={{
              flex: 1, height: 34, borderRadius: 7,
              background: has(w) ? 'linear-gradient(180deg, #f4cf7d, var(--accent))' : 'rgba(255,255,255,0.07)',
              opacity: has(w) ? 1 : 0.8,
            }} />
        ))}
      </div>
      <div className="mini-axis" style={{ marginTop: 8 }}>
        <span>{fmtDate(weeks[0])}</span><span>últimas 12 semanas</span><span>{fmtDate(weeks[weeks.length - 1])}</span>
      </div>
    </div>
  )
}

// ---------- View ----------
export function MyEvolution({ m, store, onLogout }: { m: Mentee; store: Store; onLogout: () => void }) {
  const origin = originScores(m)
  const xpNow = actionXp(m)
  const xpHistory = (m.cycleHistory ?? []).reduce((s, c) => s + c.xp, 0)
  const xpTotal = xpHistory + xpNow
  const lv = levelForXp(xpNow)
  const prog = overallProgress(m)

  // tempo no programa
  const days = Math.max(0, Math.round((new Date(todayIso()).getTime() - new Date(m.startDate).getTime()) / 86400000))
  const monthsIn = Math.max(1, Math.round(days / 30))

  // evolução média por pilar (da origem até hoje)
  const deltas = PILLARS.map(p => m.scores[p.id].current - origin[p.id].baseline)
  const avgDelta = deltas.reduce((a, b) => a + b, 0) / PILLARS.length

  // ciclos: encerrados + o atual em andamento
  const cycles = [
    ...(m.cycleHistory ?? []).map(c => ({ ...c, live: false })),
    { id: 'now', cycle: m.cycle, closedAt: '', execution: prog.pct, xp: xpNow, scores: m.scores, live: true },
  ]

  // narrativa dos check-ins (mais recentes primeiro)
  const story = store.checkins
    .filter(c => c.menteeId === m.id)
    .sort((a, b) => b.week.localeCompare(a.week))
    .slice(0, 8)

  return (
    <>
      <div className="topbar"><h1>Minha evolução</h1>
        <div className="topbar-right">
          <AccessChip m={m} />
          <span className="chip">{m.cycle}</span>
          <Avatar m={m} size={34} fontSize={12} />
          <button className="btn ghost" style={{ padding: '7px 12px', fontSize: 12 }} onClick={onLogout}>Trocar perfil</button>
        </div>
      </div>
      <div className="content page-enter">
        <div className="eyebrow">Sua trajetória no programa</div>
        <div className="display" style={{ marginTop: 8, fontSize: 26 }}>Olha o quanto você já andou, {m.name.split(' ')[0]}.</div>

        <div className="grid g-4 stagger" style={{ marginTop: 24 }}>
          <div className="card">
            <div className="stat-label">Tempo de programa</div>
            <div className="stat-value">{monthsIn}<small> {monthsIn === 1 ? 'mês' : 'meses'}</small></div>
            <div className="stat-sub">desde {fmtDate(m.startDate)}</div>
          </div>
          <div className="card">
            <div className="stat-label">Evolução por pilar</div>
            <div className="stat-value" style={{ color: avgDelta > 0 ? 'var(--good)' : undefined }}>
              {avgDelta > 0 ? '+' : ''}{avgDelta.toFixed(1)}
            </div>
            <div className="stat-sub">média da origem até hoje</div>
          </div>
          <div className="card">
            <div className="stat-label">XP acumulado</div>
            <div className="stat-value" style={{ color: 'var(--accent)' }}>{xpTotal}</div>
            <div className="stat-sub">{m.cycleHistory?.length ? `${xpHistory} de ciclos anteriores` : `Nível ${lv.current.n} · ${lv.current.name}`}</div>
          </div>
          <div className="card">
            <div className="stat-label">Ciclos</div>
            <div className="stat-value">{cycles.length}</div>
            <div className="stat-sub">{(m.cycleHistory?.length ?? 0)} encerrado{(m.cycleHistory?.length ?? 0) === 1 ? '' : 's'} · 1 em andamento</div>
          </div>
        </div>

        {/* Radar origem → hoje */}
        <div className="card section">
          <div className="section-head" style={{ marginBottom: 4 }}>
            <div className="h2" style={{ fontSize: 17 }}>De onde você veio → onde está</div>
            <div className="legend">
              <span><i style={{ background: 'rgba(255,255,255,0.3)', borderRadius: 2 }} /> sua origem</span>
              <span><i style={{ background: 'var(--accent)' }} /> hoje</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 26, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="radar-wrap"><JourneyRadar origin={origin} current={m.scores} /></div>
            <div className="radar-legend" style={{ flex: 1, minWidth: 200 }}>
              {PILLARS.map((p, i) => (
                <div key={p.id} className="li">
                  <span className="pillar-dot" style={{ background: pcolor(p.hue) }} />
                  <span>{p.label}</span>
                  <span className="val">
                    {origin[p.id].baseline.toFixed(0)} → {m.scores[p.id].current.toFixed(0)}
                    {deltas[i] > 0 && <span style={{ color: 'var(--good)', marginLeft: 6 }}>+{deltas[i]}</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Ciclos + ritmo */}
        <div className="grid g-2 section">
          <div className="card">
            <div className="h2" style={{ fontSize: 17, marginBottom: 14 }}>Meus ciclos</div>
            {cycles.map(c => (
              <div key={c.id} className="redeem-row">
                <span style={{ fontWeight: 600 }}>{c.cycle}</span>
                {c.live
                  ? <span className="tag good">em andamento</span>
                  : <span className="mono muted-3" style={{ fontSize: 11 }}>até {fmtDate(c.closedAt)}</span>}
                <span className="tag" style={{ marginLeft: 'auto' }}>{Math.round(c.execution * 100)}% executado</span>
                <span className="xp-chip">{c.xp} XP</span>
              </div>
            ))}
          </div>
          <RhythmGrid m={m} store={store} />
        </div>

        {/* Narrativa dos check-ins */}
        <div className="section">
          <div className="section-head">
            <div className="h2">Sua história, semana a semana</div>
            <span className="muted-3" style={{ fontSize: 12 }}>o que você registrou nos check-ins</span>
          </div>
          <div className="timeline">
            {story.map(c => (
              <div key={c.id} className="tl-item">
                <div className="tl-date">semana de {fmtDate(c.week)}</div>
                <div className="tl-title" style={{ fontSize: 14 }}>{c.wins}</div>
                {c.blockers && <div className="tl-notes">travou em: {c.blockers}</div>}
                <div className="tl-next">→ <span>{c.focus}</span></div>
              </div>
            ))}
            {!story.length && (
              <div className="empty">Sua história começa no primeiro check-in semanal — registre o desta semana!</div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
