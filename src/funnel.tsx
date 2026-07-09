import { useState } from 'react'
import { funnelCalc, fmtBRL, fmtDate, todayIso, type Mentee, type Store, type Api, type FunnelSnapshot } from './data'
import { AccessChip } from './week'

// ============================================================
//  Calculadora de Funil + histórico (mentorado) e painel (advisor)
// ============================================================

interface FunnelInputs { leads: number; cpl: number; meetings: number; sales: number; ticket: number }
const DEFAULTS: FunnelInputs = { leads: 500, cpl: 20, meetings: 60, sales: 12, ticket: 5000 }

const pct = (n: number) => `${(n * 100).toFixed(1)}%`
const int = (n: number) => Math.round(n).toLocaleString('pt-BR')
const uid = () => Math.random().toString(36).slice(2, 10)

function NumField({ label, hint, prefix, value, onChange }: {
  label: string; hint?: string; prefix?: string; value: number; onChange: (v: number) => void
}) {
  return (
    <label className="fc-field">
      <span className="fc-label">{label}{hint && <em> · {hint}</em>}</span>
      <span className="fc-input">
        {prefix && <i>{prefix}</i>}
        <input className="in" type="number" min={0} value={value}
          onChange={e => onChange(Math.max(0, Number(e.target.value) || 0))} />
      </span>
    </label>
  )
}

function Kpi({ label, value, sub, accent, good }: { label: string; value: string; sub?: string; accent?: boolean; good?: boolean }) {
  return (
    <div className="card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ fontSize: 22, color: accent ? 'var(--accent)' : good ? 'var(--good)' : undefined }}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

// Sparkline simples (evolução de uma métrica ao longo dos snapshots)
function Spark({ values, height = 40 }: { values: number[]; height?: number }) {
  if (values.length < 2) return null
  const w = 180, max = Math.max(...values), min = Math.min(...values)
  const rng = max - min || 1
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${height - ((v - min) / rng) * (height - 6) - 3}`)
  return (
    <svg width={w} height={height} viewBox={`0 0 ${w} ${height}`} style={{ overflow: 'visible' }}>
      <polyline points={pts.join(' ')} fill="none" stroke="var(--accent)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => { const [x, y] = p.split(','); return <circle key={i} cx={x} cy={y} r={2.4} fill="var(--accent)" /> })}
    </svg>
  )
}

// ---------- Calculadora do mentorado ----------

export function FunnelCalculatorView({ m, store, api, onLogout }: {
  m: Mentee; store: Store; api: Api; onLogout: () => void
}) {
  const history = store.funnels.filter(x => x.menteeId === m.id).sort((a, b) => b.date.localeCompare(a.date))
  const latest = history[0]
  const [f, setF] = useState<FunnelInputs>(() =>
    latest ? { leads: latest.leads, cpl: latest.cpl, meetings: latest.meetings, sales: latest.sales, ticket: latest.ticket } : DEFAULTS)
  const [saved, setSaved] = useState(false)
  const set = (k: keyof FunnelInputs) => (v: number) => { setF(p => ({ ...p, [k]: v })); setSaved(false) }

  const d = funnelCalc(f)
  const custoReuniao = f.meetings ? d.invest / f.meetings : 0

  // simulador
  const [tAgend, setTAgend] = useState(() => +(d.taxaAgend * 100).toFixed(1))
  const [tConv, setTConv] = useState(() => +(d.convReuniao * 100).toFixed(1))
  const syncMetas = () => { setTAgend(+(d.taxaAgend * 100).toFixed(1)); setTConv(+(d.convReuniao * 100).toFixed(1)) }
  const meetingsProj = f.leads * (tAgend / 100)
  const salesProj = meetingsProj * (tConv / 100)
  const receitaProj = salesProj * f.ticket
  const cacProj = salesProj ? d.invest / salesProj : 0
  const dSales = salesProj - f.sales
  const dReceita = receitaProj - d.receita

  const gargalo = d.taxaAgend <= d.convReuniao
    ? { etapa: 'agendamento', txt: `só ${pct(d.taxaAgend)} dos leads viram reunião`, dica: 'melhore a qualificação e a abordagem inicial (script, oferta da call, velocidade de resposta).' }
    : { etapa: 'fechamento', txt: `só ${pct(d.convReuniao)} das reuniões viram venda`, dica: 'trabalhe o roteiro da reunião, quebra de objeções e follow-up pós-call.' }

  const wMeet = f.leads ? Math.max(6, (f.meetings / f.leads) * 100) : 0
  const wSale = f.leads ? Math.max(4, (f.sales / f.leads) * 100) : 0

  const save = () => {
    const snap: FunnelSnapshot = { id: uid(), menteeId: m.id, date: todayIso(), ...f }
    api.upFunnel(snap); setSaved(true)
  }

  // histórico em ordem cronológica p/ sparkline
  const chrono = [...history].reverse()

  return (
    <>
      <div className="topbar"><h1>Calculadora de funil</h1>
        <div className="topbar-right">
          <AccessChip m={m} />
          <span className="chip">salvo na nuvem</span>
          <div className="avatar" style={{ width: 34, height: 34, fontSize: 12 }}>{m.initials}</div>
          <button className="btn ghost" style={{ padding: '7px 12px', fontSize: 12 }} onClick={onLogout}>Trocar perfil</button>
        </div>
      </div>
      <div className="content page-enter">
        <div className="eyebrow">Ferramenta · otimização de funil</div>
        <div className="display" style={{ marginTop: 8, fontSize: 26 }}>Onde seu funil ganha e perde dinheiro</div>
        <div className="muted" style={{ marginTop: 8, fontSize: 13.5, maxWidth: 620 }}>
          Coloque os números do seu funil. Os resultados se atualizam sozinhos — salve para acompanhar a evolução ao longo do tempo.
        </div>

        <div className="grid g-2" style={{ marginTop: 24 }}>
          <div className="card">
            <div className="section-head" style={{ marginBottom: 16 }}>
              <div className="h2" style={{ fontSize: 16 }}>Seu funil hoje</div>
              <button className="btn" onClick={save} disabled={saved}>{saved ? '✓ Salvo' : '＋ Salvar no histórico'}</button>
            </div>
            <div className="fc-fields">
              <NumField label="Leads gerados" value={f.leads} onChange={set('leads')} />
              <NumField label="Custo por lead" prefix="R$" value={f.cpl} onChange={set('cpl')} />
              <NumField label="Reuniões agendadas" value={f.meetings} onChange={set('meetings')} />
              <NumField label="Vendas fechadas" value={f.sales} onChange={set('sales')} />
              <NumField label="Ticket médio" prefix="R$" value={f.ticket} onChange={set('ticket')} />
            </div>
          </div>

          <div className="card">
            <div className="h2" style={{ fontSize: 16, marginBottom: 16 }}>Seu funil</div>
            <div className="fc-funnel">
              <div className="fc-stage">
                <div className="fc-bar" style={{ width: '100%' }}><span>{int(f.leads)}</span></div>
                <div className="fc-stage-label">Leads</div>
              </div>
              <div className="fc-drop">↓ {pct(d.taxaAgend)} agendam</div>
              <div className="fc-stage">
                <div className="fc-bar meet" style={{ width: `${wMeet}%` }}><span>{int(f.meetings)}</span></div>
                <div className="fc-stage-label">Reuniões</div>
              </div>
              <div className="fc-drop">↓ {pct(d.convReuniao)} fecham</div>
              <div className="fc-stage">
                <div className="fc-bar sale" style={{ width: `${wSale}%` }}><span>{int(f.sales)}</span></div>
                <div className="fc-stage-label">Vendas</div>
              </div>
            </div>
            <div className="divider" style={{ margin: '16px 0 12px' }} />
            <div className="fc-rates">
              <div><span>Conversão geral (lead → venda)</span><b>{pct(d.convGeral)}</b></div>
              <div><span>Custo por reunião</span><b>{fmtBRL(custoReuniao)}</b></div>
            </div>
          </div>
        </div>

        <div className="section">
          <div className="section-head"><div className="h2">Resultados</div></div>
          <div className="grid g-4 stagger">
            <Kpi label="Investimento" value={fmtBRL(d.invest)} sub={`${int(f.leads)} leads × ${fmtBRL(f.cpl)}`} />
            <Kpi label="CAC · custo por venda" value={f.sales ? fmtBRL(d.cac) : '—'} sub={d.cac && f.ticket ? `${pct(d.cac / f.ticket)} do ticket` : 'informe vendas'} accent={d.cac > f.ticket} />
            <Kpi label="Receita gerada" value={fmtBRL(d.receita)} sub={`${int(f.sales)} vendas × ${fmtBRL(f.ticket)}`} />
            <Kpi label="ROAS" value={d.invest ? `${d.roas.toFixed(1)}x` : '—'} sub={`lucro ${fmtBRL(d.lucro)}`} good={d.lucro > 0} accent={d.lucro < 0} />
          </div>
        </div>

        <div className="section">
          <div className="grid g-2">
            <div className="card insights">
              <div className="h2" style={{ fontSize: 16, marginBottom: 12 }}>⚑ Seu maior gargalo</div>
              <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 6, textTransform: 'capitalize' }}>{gargalo.etapa}</div>
              <div className="muted" style={{ fontSize: 13, lineHeight: 1.55 }}>
                Hoje, {gargalo.txt}. É a etapa que mais represa resultado — {gargalo.dica}
              </div>
            </div>

            <div className="card">
              <div className="section-head" style={{ marginBottom: 12 }}>
                <div className="h2" style={{ fontSize: 16 }}>Simulador de metas</div>
                <button className="reset-link" style={{ padding: 0 }} onClick={syncMetas}>↺ usar taxas atuais</button>
              </div>
              <div className="fc-fields two">
                <NumField label="Meta de agendamento" hint={`atual ${pct(d.taxaAgend)}`} prefix="%" value={tAgend} onChange={setTAgend} />
                <NumField label="Meta de conversão da reunião" hint={`atual ${pct(d.convReuniao)}`} prefix="%" value={tConv} onChange={setTConv} />
              </div>
              <div className="fc-sim">
                <div className="fc-sim-row"><span>Reuniões</span><b>{int(meetingsProj)}</b></div>
                <div className="fc-sim-row big"><span>Vendas projetadas</span>
                  <b style={{ color: 'var(--accent)' }}>{int(salesProj)}
                    {dSales > 0.5 && <em className="up"> +{int(dSales)}</em>}
                    {dSales < -0.5 && <em className="down"> {int(dSales)}</em>}</b>
                </div>
                <div className="fc-sim-row big"><span>Receita projetada</span>
                  <b style={{ color: dReceita >= 0 ? 'var(--good)' : '#f27979' }}>{fmtBRL(receitaProj)}
                    {Math.abs(dReceita) > 1 && <em className={dReceita > 0 ? 'up' : 'down'}> {dReceita > 0 ? '+' : ''}{fmtBRL(dReceita)}</em>}</b>
                </div>
                <div className="fc-sim-row"><span>Novo CAC</span><b>{salesProj ? fmtBRL(cacProj) : '—'}</b></div>
              </div>
            </div>
          </div>
        </div>

        {history.length > 0 && (
          <div className="section">
            <div className="section-head">
              <div className="h2">Histórico do funil</div>
              {chrono.length >= 2 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="muted-3" style={{ fontSize: 11.5 }}>conversão geral</span>
                  <Spark values={chrono.map(s => funnelCalc(s).convGeral * 100)} />
                </div>
              )}
            </div>
            <div className="card" style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr><th>Data</th><th className="num">Leads</th><th className="num">Reuniões</th><th className="num">Vendas</th><th className="num">Conv. geral</th><th className="num">CAC</th><th className="num">Receita</th><th className="num">ROAS</th><th></th></tr>
                </thead>
                <tbody>
                  {history.map(s => {
                    const c = funnelCalc(s)
                    return (
                      <tr key={s.id}>
                        <td className="mono" style={{ fontSize: 12 }}>{fmtDate(s.date)}</td>
                        <td className="num">{int(s.leads)}</td>
                        <td className="num">{int(s.meetings)}</td>
                        <td className="num">{int(s.sales)}</td>
                        <td className="num">{pct(c.convGeral)}</td>
                        <td className="num">{s.sales ? fmtBRL(c.cac) : '—'}</td>
                        <td className="num" style={{ color: 'var(--accent)', fontWeight: 650 }}>{fmtBRL(c.receita)}</td>
                        <td className="num">{c.roas ? `${c.roas.toFixed(1)}x` : '—'}</td>
                        <td style={{ width: 40 }}>
                          <button className="icon-btn danger" onClick={() => confirm('Excluir este registro do histórico?') && api.delFunnel(s.id)}>✕</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ---------- Painel do advisor: funil de todos lado a lado ----------

export function FunnelBoard({ store }: { store: Store }) {
  const rows = store.mentees.map(m => {
    const hist = store.funnels.filter(x => x.menteeId === m.id).sort((a, b) => b.date.localeCompare(a.date))
    return { m, snap: hist[0], n: hist.length }
  })
  const withData = rows.filter(r => r.snap)
  const best = (sel: (c: ReturnType<typeof funnelCalc>) => number) =>
    withData.length ? Math.max(...withData.map(r => sel(funnelCalc(r.snap!)))) : 0
  const bestConv = best(c => c.convGeral)
  const bestRoas = best(c => c.roas)

  return (
    <>
      <div className="topbar"><h1>Funil da equipe <span className="crumb">· todos os mentorados</span></h1>
        <div className="topbar-right"><span className="chip">{withData.length}/{rows.length} com dados</span></div>
      </div>
      <div className="content page-enter">
        <div className="eyebrow">Comparativo de funil</div>
        <div className="display" style={{ marginTop: 8 }}>Como está o funil de cada um</div>
        <div className="muted" style={{ marginTop: 8, fontSize: 13.5, maxWidth: 620 }}>
          Último funil registrado por cada mentorado, lado a lado. Em destaque, a melhor conversão geral e o melhor ROAS da equipe.
        </div>

        <div className="card section" style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Mentorado</th><th className="num">Atualizado</th><th className="num">Leads</th><th className="num">Reuniões</th>
                <th className="num">Vendas</th><th className="num">Agend.</th><th className="num">Conv. reunião</th>
                <th className="num">Conv. geral</th><th className="num">CAC</th><th className="num">ROAS</th><th className="num">Receita</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ m, snap, n }) => {
                if (!snap) return (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 550 }}>{m.name.split(' ')[0]}</td>
                    <td colSpan={10} className="muted-3" style={{ fontSize: 12.5 }}>sem funil registrado ainda</td>
                  </tr>
                )
                const c = funnelCalc(snap)
                return (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 550 }}>{m.name.split(' ')[0]}<span className="muted-3" style={{ fontSize: 10.5, marginLeft: 6 }}>{n} reg.</span></td>
                    <td className="num mono" style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{fmtDate(snap.date)}</td>
                    <td className="num">{int(snap.leads)}</td>
                    <td className="num">{int(snap.meetings)}</td>
                    <td className="num">{int(snap.sales)}</td>
                    <td className="num">{pct(c.taxaAgend)}</td>
                    <td className="num">{pct(c.convReuniao)}</td>
                    <td className="num" style={c.convGeral === bestConv && bestConv > 0 ? { color: 'var(--accent)', fontWeight: 700 } : undefined}>{pct(c.convGeral)}</td>
                    <td className="num">{snap.sales ? fmtBRL(c.cac) : '—'}</td>
                    <td className="num" style={c.roas === bestRoas && bestRoas > 0 ? { color: 'var(--good)', fontWeight: 700 } : undefined}>{c.roas ? `${c.roas.toFixed(1)}x` : '—'}</td>
                    <td className="num" style={{ fontWeight: 600 }}>{fmtBRL(c.receita)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
