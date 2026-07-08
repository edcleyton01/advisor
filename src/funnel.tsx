import { useEffect, useState } from 'react'
import { fmtBRL, type Mentee } from './data'

// ============================================================
//  Calculadora de Funil (área do mentorado)
//  Entra os dados do funil → resultados automáticos + otimização
// ============================================================

interface FunnelInputs {
  leads: number      // leads gerados
  cpl: number        // custo por lead (R$)
  meetings: number   // reuniões agendadas
  sales: number      // vendas fechadas
  ticket: number     // ticket médio (R$)
}

const DEFAULTS: FunnelInputs = { leads: 500, cpl: 20, meetings: 60, sales: 12, ticket: 5000 }

const pct = (n: number) => `${(n * 100).toFixed(1)}%`
const int = (n: number) => Math.round(n).toLocaleString('pt-BR')

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

export function FunnelCalculatorView({ m, onLogout }: { m: Mentee; onLogout: () => void }) {
  const key = `funnel-calc-${m.id}`
  const [f, setF] = useState<FunnelInputs>(() => {
    try { const r = localStorage.getItem(key); if (r) return { ...DEFAULTS, ...JSON.parse(r) } } catch { /* default */ }
    return DEFAULTS
  })
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(f)) } catch { /* quota */ } }, [f, key])
  const set = (k: keyof FunnelInputs) => (v: number) => setF(p => ({ ...p, [k]: v }))

  // ---------- métricas atuais ----------
  const invest = f.leads * f.cpl
  const taxaAgend = f.leads ? f.meetings / f.leads : 0        // lead → reunião
  const convReuniao = f.meetings ? f.sales / f.meetings : 0   // reunião → venda
  const convGeral = f.leads ? f.sales / f.leads : 0           // lead → venda
  const cac = f.sales ? invest / f.sales : 0                  // custo por venda
  const receita = f.sales * f.ticket
  const roas = invest ? receita / invest : 0
  const lucro = receita - invest
  const custoReuniao = f.meetings ? invest / f.meetings : 0

  // ---------- simulador de otimização ----------
  const [tAgend, setTAgend] = useState(() => +(taxaAgend * 100).toFixed(1))
  const [tConv, setTConv] = useState(() => +(convReuniao * 100).toFixed(1))
  const syncMetas = () => { setTAgend(+(taxaAgend * 100).toFixed(1)); setTConv(+(convReuniao * 100).toFixed(1)) }
  const meetingsProj = f.leads * (tAgend / 100)
  const salesProj = meetingsProj * (tConv / 100)
  const receitaProj = salesProj * f.ticket
  const cacProj = salesProj ? invest / salesProj : 0
  const dSales = salesProj - f.sales
  const dReceita = receitaProj - receita

  // ---------- gargalo ----------
  const gargalo = taxaAgend <= convReuniao
    ? { etapa: 'agendamento', txt: `só ${pct(taxaAgend)} dos leads viram reunião`, dica: 'melhore a qualificação e a abordagem inicial (script, oferta da call, velocidade de resposta).' }
    : { etapa: 'fechamento', txt: `só ${pct(convReuniao)} das reuniões viram venda`, dica: 'trabalhe o roteiro da reunião, quebra de objeções e follow-up pós-call.' }

  // larguras da barra do funil (proporcional aos leads)
  const wLead = 100
  const wMeet = f.leads ? Math.max(6, (f.meetings / f.leads) * 100) : 0
  const wSale = f.leads ? Math.max(4, (f.sales / f.leads) * 100) : 0

  return (
    <>
      <div className="topbar"><h1>Calculadora de funil</h1>
        <div className="topbar-right">
          <span className="chip">salva neste dispositivo</span>
          <div className="avatar" style={{ width: 34, height: 34, fontSize: 12 }}>{m.initials}</div>
          <button className="btn ghost" style={{ padding: '7px 12px', fontSize: 12 }} onClick={onLogout}>Trocar perfil</button>
        </div>
      </div>
      <div className="content page-enter">
        <div className="eyebrow">Ferramenta · otimização de funil</div>
        <div className="display" style={{ marginTop: 8, fontSize: 26 }}>Onde seu funil ganha e perde dinheiro</div>
        <div className="muted" style={{ marginTop: 8, fontSize: 13.5, maxWidth: 620 }}>
          Coloque os números do seu funil de vendas. Os resultados se atualizam sozinhos — e no fim mostramos seu maior gargalo e o quanto vale destravá-lo.
        </div>

        <div className="grid g-2" style={{ marginTop: 24 }}>
          {/* Entradas */}
          <div className="card">
            <div className="h2" style={{ fontSize: 16, marginBottom: 16 }}>Seu funil hoje</div>
            <div className="fc-fields">
              <NumField label="Leads gerados" value={f.leads} onChange={set('leads')} />
              <NumField label="Custo por lead" prefix="R$" value={f.cpl} onChange={set('cpl')} />
              <NumField label="Reuniões agendadas" value={f.meetings} onChange={set('meetings')} />
              <NumField label="Vendas fechadas" value={f.sales} onChange={set('sales')} />
              <NumField label="Ticket médio" prefix="R$" value={f.ticket} onChange={set('ticket')} />
            </div>
          </div>

          {/* Funil visual */}
          <div className="card">
            <div className="h2" style={{ fontSize: 16, marginBottom: 16 }}>Seu funil</div>
            <div className="fc-funnel">
              <div className="fc-stage">
                <div className="fc-bar" style={{ width: `${wLead}%` }}><span>{int(f.leads)}</span></div>
                <div className="fc-stage-label">Leads</div>
              </div>
              <div className="fc-drop">↓ {pct(taxaAgend)} agendam</div>
              <div className="fc-stage">
                <div className="fc-bar meet" style={{ width: `${wMeet}%` }}><span>{int(f.meetings)}</span></div>
                <div className="fc-stage-label">Reuniões</div>
              </div>
              <div className="fc-drop">↓ {pct(convReuniao)} fecham</div>
              <div className="fc-stage">
                <div className="fc-bar sale" style={{ width: `${wSale}%` }}><span>{int(f.sales)}</span></div>
                <div className="fc-stage-label">Vendas</div>
              </div>
            </div>
            <div className="divider" style={{ margin: '16px 0 12px' }} />
            <div className="fc-rates">
              <div><span>Conversão geral (lead → venda)</span><b>{pct(convGeral)}</b></div>
              <div><span>Custo por reunião</span><b>{fmtBRL(custoReuniao)}</b></div>
            </div>
          </div>
        </div>

        {/* Resultados */}
        <div className="section">
          <div className="section-head"><div className="h2">Resultados</div></div>
          <div className="grid g-4 stagger">
            <Kpi label="Investimento" value={fmtBRL(invest)} sub={`${int(f.leads)} leads × ${fmtBRL(f.cpl)}`} />
            <Kpi label="CAC · custo por venda" value={f.sales ? fmtBRL(cac) : '—'} sub={cac && f.ticket ? `${pct(cac / f.ticket)} do ticket` : 'informe vendas'} accent={cac > f.ticket} />
            <Kpi label="Receita gerada" value={fmtBRL(receita)} sub={`${int(f.sales)} vendas × ${fmtBRL(f.ticket)}`} />
            <Kpi label="ROAS" value={invest ? `${roas.toFixed(1)}x` : '—'} sub={`lucro ${fmtBRL(lucro)}`} good={lucro > 0} accent={lucro < 0} />
          </div>
        </div>

        {/* Gargalo + Simulador */}
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
                <NumField label="Meta de agendamento" hint={`atual ${pct(taxaAgend)}`} prefix="%" value={tAgend} onChange={setTAgend} />
                <NumField label="Meta de conversão da reunião" hint={`atual ${pct(convReuniao)}`} prefix="%" value={tConv} onChange={setTConv} />
              </div>
              <div className="fc-sim">
                <div className="fc-sim-row">
                  <span>Reuniões</span>
                  <b>{int(meetingsProj)}</b>
                </div>
                <div className="fc-sim-row big">
                  <span>Vendas projetadas</span>
                  <b style={{ color: 'var(--accent)' }}>{int(salesProj)}
                    {dSales > 0.5 && <em className="up"> +{int(dSales)}</em>}
                    {dSales < -0.5 && <em className="down"> {int(dSales)}</em>}
                  </b>
                </div>
                <div className="fc-sim-row big">
                  <span>Receita projetada</span>
                  <b style={{ color: dReceita >= 0 ? 'var(--good)' : '#f27979' }}>{fmtBRL(receitaProj)}
                    {Math.abs(dReceita) > 1 && <em className={dReceita > 0 ? 'up' : 'down'}> {dReceita > 0 ? '+' : ''}{fmtBRL(dReceita)}</em>}
                  </b>
                </div>
                <div className="fc-sim-row">
                  <span>Novo CAC</span>
                  <b>{salesProj ? fmtBRL(cacProj) : '—'}</b>
                </div>
              </div>
              <div className="muted-3" style={{ fontSize: 11.5, marginTop: 12 }}>
                Ajuste as metas e veja o impacto — mesmos leads e investimento, só melhorando as conversões.
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
