import { useState, type ReactNode } from 'react'
import {
  PILLARS, FUNNELS, CAMPAIGN_STATUS, DEAL_STAGES, ADVISOR, campaignCalc, fmtBRL, CURRENT_MONTH,
  pillarById, pcolor, actionXp, overallProgress, levelForXp,
  type Mentee, type ActionBlock, type Action, type Session, type TeamMember,
  type SaleEntry, type Campaign, type PillarId, type FunnelId, type CampaignStatus,
  type MonthlyGoal, type Playbook, type PlaybookAction, type Deal, type DealStage, type Store,
  type RewardItem, type ScheduledCall,
} from './data'
import { createMenteeLogin, createTeamLogin } from './cloud2'

const uid = () => Math.random().toString(36).slice(2, 10)
const today = () => new Date().toISOString().slice(0, 10)
export const initialsOf = (name: string) =>
  name.trim().split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?'

// ---------- Primitivas ----------

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <div className="h2">{title}</div>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, span2, children }: { label: string; span2?: boolean; children: ReactNode }) {
  return (
    <label className={`field ${span2 ? 'span2' : ''}`}>
      <span>{label}</span>
      {children}
    </label>
  )
}

function Foot({ onClose, onSave, ok }: { onClose: () => void; onSave: () => void; ok: boolean }) {
  return (
    <div className="form-foot">
      <button className="btn ghost" onClick={onClose}>Cancelar</button>
      <button className="btn" disabled={!ok} onClick={onSave}>Salvar</button>
    </div>
  )
}

function CheckRow({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="check-row">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      {label}
    </label>
  )
}

// ---------- Mentorado ----------

function blankMentee(): Mentee {
  return {
    id: uid(), name: '', initials: '', business: '', niche: '', revenue: '', stage: 'Início',
    macroGoal: '', startDate: today(), cycle: 'Ciclo 1 · Fundação', streak: 0,
    scores: Object.fromEntries(PILLARS.map(p => [p.id, { baseline: 3, current: 3 }])) as Mentee['scores'],
    blocks: [],
    badges: [{ id: 'b1', label: 'Primeiro Bloco', icon: '◆', earned: false, hint: 'Conclua o primeiro bloco de ações.' }],
    sessions: [],
  }
}

export function MenteeForm({ initial, onSave, onClose }: { initial?: Mentee; onSave: (m: Mentee) => void; onClose: () => void }) {
  const [f, setF] = useState<Mentee>(() => (initial ? structuredClone(initial) : blankMentee()))
  const set = <K extends keyof Mentee>(k: K, v: Mentee[K]) => setF(p => ({ ...p, [k]: v }))
  const setScore = (id: PillarId, key: 'baseline' | 'current', v: number) =>
    setF(p => ({ ...p, scores: { ...p.scores, [id]: { ...p.scores[id], [key]: Math.max(0, Math.min(10, v)) } } }))
  const ok = f.name.trim().length > 1 && f.business.trim().length > 0
  const save = () => { onSave({ ...f, initials: initialsOf(f.name) }); onClose() }
  return (
    <Modal title={initial ? 'Editar mentorado' : 'Novo mentorado'} onClose={onClose}>
      <div className="form-grid">
        <Field label="Nome completo" span2>
          <input className="in" value={f.name} onChange={e => set('name', e.target.value)} placeholder="Nome do mentorado" />
        </Field>
        <Field label="Negócio">
          <input className="in" value={f.business} onChange={e => set('business', e.target.value)} placeholder="Nome da empresa · segmento" />
        </Field>
        <Field label="Nicho">
          <input className="in" value={f.niche} onChange={e => set('niche', e.target.value)} />
        </Field>
        <Field label="Faturamento atual">
          <input className="in" value={f.revenue} onChange={e => set('revenue', e.target.value)} placeholder="R$ 30k/mês" />
        </Field>
        <Field label="Estágio">
          <select className="in" value={f.stage} onChange={e => set('stage', e.target.value)}>
            <option>Início</option><option>Estruturando</option><option>Escalando</option>
          </select>
        </Field>
        <Field label="Objetivo do ciclo" span2>
          <textarea className="in" rows={2} value={f.macroGoal} onChange={e => set('macroGoal', e.target.value)} />
        </Field>
        <Field label="Ciclo">
          <input className="in" value={f.cycle} onChange={e => set('cycle', e.target.value)} />
        </Field>
        <Field label="Streak (semanas)">
          <input className="in" type="number" min={0} value={f.streak} onChange={e => set('streak', Number(e.target.value) || 0)} />
        </Field>
        <Field label="Data de entrada">
          <input className="in" type="date" value={f.startDate} onChange={e => set('startDate', e.target.value)} />
        </Field>
        <Field label="Acesso ao programa até">
          <input className="in" type="date" value={f.accessUntil ?? ''} onChange={e => set('accessUntil', e.target.value || undefined)} />
        </Field>
        <div className="span2">
          <div className="field" style={{ marginBottom: 8 }}><span>Diagnóstico por pilar · base → atual (0–10)</span></div>
          <div className="score-grid">
            {PILLARS.map(p => (
              <div key={p.id} className="score-row">
                <span className="score-name">{p.label}</span>
                <input className="in" type="number" min={0} max={10} value={f.scores[p.id].baseline}
                  onChange={e => setScore(p.id, 'baseline', Number(e.target.value) || 0)} />
                <input className="in" type="number" min={0} max={10} value={f.scores[p.id].current}
                  onChange={e => setScore(p.id, 'current', Number(e.target.value) || 0)} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <Foot onClose={onClose} onSave={save} ok={ok} />
    </Modal>
  )
}

// ---------- Bloco de ações ----------

export function BlockForm({ initial, onSave, onClose }: { initial?: ActionBlock; onSave: (b: ActionBlock) => void; onClose: () => void }) {
  const [f, setF] = useState<ActionBlock>(() => initial ? structuredClone(initial) : ({
    id: uid(), pillar: 'branding', title: '', period: 'Ciclo 1 · Semanas 1-2',
    rewardLabel: '', rewardXp: 120, actions: [],
  }))
  const ok = f.title.trim().length > 1
  const save = () => { onSave(f); onClose() }
  return (
    <Modal title={initial ? 'Editar bloco' : 'Novo bloco de ações'} onClose={onClose}>
      <div className="form-grid">
        <Field label="Título do bloco" span2>
          <input className="in" value={f.title} onChange={e => setF(p => ({ ...p, title: e.target.value }))} placeholder="Ex.: Fundamentos de Posicionamento" />
        </Field>
        <Field label="Pilar">
          <select className="in" value={f.pillar} onChange={e => setF(p => ({ ...p, pillar: e.target.value as PillarId }))}>
            {PILLARS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </Field>
        <Field label="Período">
          <input className="in" value={f.period} onChange={e => setF(p => ({ ...p, period: e.target.value }))} />
        </Field>
        <Field label="Recompensa ao concluir" >
          <input className="in" value={f.rewardLabel} onChange={e => setF(p => ({ ...p, rewardLabel: e.target.value }))} placeholder="Ex.: Desbloqueia: call extra" />
        </Field>
        <Field label="XP bônus do bloco">
          <input className="in" type="number" min={0} value={f.rewardXp} onChange={e => setF(p => ({ ...p, rewardXp: Number(e.target.value) || 0 }))} />
        </Field>
      </div>
      <Foot onClose={onClose} onSave={save} ok={ok} />
    </Modal>
  )
}

// ---------- Ação ----------

export function ActionForm({ initial, onSave, onClose }: { initial?: Action; onSave: (a: Action) => void; onClose: () => void }) {
  const [f, setF] = useState<Action>(() => initial ? structuredClone(initial) : ({
    id: uid(), title: '', xp: 40, status: 'todo', due: today(), evidence: '',
  }))
  const ok = f.title.trim().length > 1
  const save = () => { onSave({ ...f, evidence: f.evidence?.trim() || undefined }); onClose() }
  return (
    <Modal title={initial ? 'Editar ação' : 'Nova ação'} onClose={onClose}>
      <div className="form-grid">
        <Field label="Ação" span2>
          <input className="in" value={f.title} onChange={e => setF(p => ({ ...p, title: e.target.value }))} placeholder="O que o mentorado vai executar" />
        </Field>
        <Field label="XP">
          <input className="in" type="number" min={0} value={f.xp} onChange={e => setF(p => ({ ...p, xp: Number(e.target.value) || 0 }))} />
        </Field>
        <Field label="Prazo">
          <input className="in" type="date" value={f.due} onChange={e => setF(p => ({ ...p, due: e.target.value }))} />
        </Field>
        <Field label="Status">
          <select className="in" value={f.status} onChange={e => setF(p => ({ ...p, status: e.target.value as Action['status'] }))}>
            <option value="todo">A fazer</option>
            <option value="doing">Em andamento</option>
            <option value="review">Aguardando aprovação</option>
            <option value="done">Concluída</option>
          </select>
        </Field>
        <Field label="Evidência de entrega" span2>
          <input className="in" value={f.evidence ?? ''} onChange={e => setF(p => ({ ...p, evidence: e.target.value }))} placeholder="Link ou nota do que foi entregue" />
        </Field>
      </div>
      <Foot onClose={onClose} onSave={save} ok={ok} />
    </Modal>
  )
}

// ---------- Sessão de mentoria ----------

export function SessionForm({ team, onSave, onClose }: { team: TeamMember[]; onSave: (s: Session) => void; onClose: () => void }) {
  const [f, setF] = useState<Session>({ id: uid(), date: today(), title: '', notes: '', nextStep: '', withId: 'advisor' })
  const ok = f.title.trim().length > 1
  const save = () => { onSave(f); onClose() }
  return (
    <Modal title="Registrar call" onClose={onClose}>
      <div className="form-grid">
        <Field label="Data">
          <input className="in" type="date" value={f.date} onChange={e => setF(p => ({ ...p, date: e.target.value }))} />
        </Field>
        <Field label="Conduzida por">
          <select className="in" value={f.withId} onChange={e => setF(p => ({ ...p, withId: e.target.value }))}>
            <option value="advisor">{ADVISOR.name} · Mentor</option>
            {team.map(t => <option key={t.id} value={t.id}>{t.name} · Guardião</option>)}
          </select>
        </Field>
        <Field label="Título" span2>
          <input className="in" value={f.title} onChange={e => setF(p => ({ ...p, title: e.target.value }))} placeholder="Ex.: Mentoria 06 · Revisão de funil" />
        </Field>
        <Field label="O que foi tratado" span2>
          <textarea className="in" rows={3} value={f.notes} onChange={e => setF(p => ({ ...p, notes: e.target.value }))} />
        </Field>
        <Field label="Próximo passo combinado" span2>
          <input className="in" value={f.nextStep} onChange={e => setF(p => ({ ...p, nextStep: e.target.value }))} />
        </Field>
      </div>
      <Foot onClose={onClose} onSave={save} ok={ok} />
    </Modal>
  )
}

// ---------- Agendar call ----------

export function CallForm({ initial, mentees, team, defaults, onSave, onClose }: {
  initial?: ScheduledCall; mentees: Mentee[]; team: TeamMember[]
  defaults?: { menteeId?: string }
  onSave: (c: ScheduledCall) => void; onClose: () => void
}) {
  const [f, setF] = useState<ScheduledCall>(() => initial ? structuredClone(initial) : ({
    id: uid(), menteeId: defaults?.menteeId ?? mentees[0]?.id ?? '', date: today(), time: '10:00',
    withId: 'advisor', topic: '', status: 'scheduled',
  }))
  const ok = !!f.menteeId && !!f.date && !!f.time && f.topic.trim().length > 1
  const save = () => { onSave(f); onClose() }
  return (
    <Modal title={initial ? 'Editar call' : 'Agendar call'} onClose={onClose}>
      <div className="form-grid">
        <Field label="Mentorado">
          <select className="in" value={f.menteeId} onChange={e => setF(p => ({ ...p, menteeId: e.target.value }))}>
            {mentees.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </Field>
        <Field label="Conduzida por">
          <select className="in" value={f.withId} onChange={e => setF(p => ({ ...p, withId: e.target.value }))}>
            <option value="advisor">{ADVISOR.name} · Mentor</option>
            {team.map(t => <option key={t.id} value={t.id}>{t.name} · Guardião</option>)}
          </select>
        </Field>
        <Field label="Data">
          <input className="in" type="date" value={f.date} onChange={e => setF(p => ({ ...p, date: e.target.value }))} />
        </Field>
        <Field label="Horário">
          <input className="in" type="time" value={f.time} onChange={e => setF(p => ({ ...p, time: e.target.value }))} />
        </Field>
        <Field label="Pauta" span2>
          <input className="in" value={f.topic} onChange={e => setF(p => ({ ...p, topic: e.target.value }))}
            placeholder="Ex.: Mentoria 07 · Revisão da campanha de julho" />
        </Field>
      </div>
      <Foot onClose={onClose} onSave={save} ok={ok} />
    </Modal>
  )
}

// ---------- Equipe ----------

export function TeamForm({ initial, mentees, cloudMode, onSave, onClose }: {
  initial?: TeamMember; mentees: Mentee[]; cloudMode?: boolean
  onSave: (t: TeamMember) => void; onClose: () => void
}) {
  const [f, setF] = useState<TeamMember>(() => initial ? structuredClone(initial) : ({
    id: uid(), name: '', initials: '', role: '', focus: [], menteeIds: [],
  }))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const toggle = (key: 'focus' | 'menteeIds', v: string) =>
    setF(p => ({ ...p, [key]: (p[key] as string[]).includes(v) ? (p[key] as string[]).filter(x => x !== v) : [...(p[key] as string[]), v] }))
  // criar acesso só ao adicionar (não ao editar) e em modo nuvem
  const canGrant = !!cloudMode && !initial
  const wantsAccess = canGrant && (email.trim() !== '' || password !== '')
  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())
  const ok = f.name.trim().length > 1 && f.role.trim().length > 0 && (!wantsAccess || (emailOk && password.length >= 6))
  const save = async () => {
    setErr(null)
    if (wantsAccess) {
      setBusy(true)
      const { error } = await createTeamLogin(email.trim(), password)
      setBusy(false)
      if (error) { setErr(error); return }
    }
    onSave({ ...f, initials: initialsOf(f.name) })
    onClose()
  }
  return (
    <Modal title={initial ? 'Editar membro' : 'Adicionar membro da equipe'} onClose={onClose}>
      <div className="form-grid">
        <Field label="Nome" span2>
          <input className="in" value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} />
        </Field>
        <Field label="Função" span2>
          <input className="in" value={f.role} onChange={e => setF(p => ({ ...p, role: e.target.value }))} placeholder="Ex.: Especialista em Tráfego" />
        </Field>
        <div className="span2">
          <div className="field" style={{ marginBottom: 6 }}><span>Pilares de foco</span></div>
          <div className="opt-grid">
            {PILLARS.map(p => (
              <CheckRow key={p.id} checked={f.focus.includes(p.id)} onChange={() => toggle('focus', p.id)} label={p.label} />
            ))}
          </div>
        </div>
        <div className="span2">
          <div className="field" style={{ marginBottom: 6 }}><span>Mentorados atribuídos</span></div>
          <div className="opt-grid">
            {mentees.map(m => (
              <CheckRow key={m.id} checked={f.menteeIds.includes(m.id)} onChange={() => toggle('menteeIds', m.id)} label={m.name} />
            ))}
          </div>
        </div>
        {canGrant && (
          <div className="span2">
            <div className="field" style={{ marginBottom: 4 }}><span>Acesso ao sistema (opcional)</span></div>
            <div className="muted-3" style={{ fontSize: 11.5, marginBottom: 10 }}>
              Preencha para já criar o login do membro — ele entra no mesmo endereço e vê o painel completo.
            </div>
            <div className="form-grid">
              <Field label="E-mail de acesso">
                <input className="in" type="email" value={email} onChange={e => { setEmail(e.target.value); setErr(null) }} placeholder="membro@empresa.com" />
              </Field>
              <Field label="Senha (mín. 6)">
                <input className="in" type="password" value={password} onChange={e => { setPassword(e.target.value); setErr(null) }} />
              </Field>
            </div>
          </div>
        )}
      </div>
      {err && <div className="login-err" style={{ marginTop: 12 }}>{err}</div>}
      <div className="form-foot">
        <button className="btn ghost" onClick={onClose}>Cancelar</button>
        <button className="btn" disabled={!ok || busy} onClick={save}>{busy ? 'Criando acesso…' : 'Salvar'}</button>
      </div>
    </Modal>
  )
}

// ---------- Venda ----------

export function SaleForm({ initial, mentees, defaults, onSave, onClose }: {
  initial?: SaleEntry; mentees: Mentee[]; defaults?: { menteeId?: string; month?: string }
  onSave: (s: SaleEntry) => void; onClose: () => void
}) {
  const [f, setF] = useState<SaleEntry>(() => initial ? structuredClone(initial) : ({
    id: uid(), menteeId: defaults?.menteeId ?? mentees[0]?.id ?? '', month: defaults?.month ?? CURRENT_MONTH,
    product: '', ticket: 0, units: 1, highTicket: false,
  }))
  const ok = f.product.trim().length > 1 && f.ticket > 0 && f.units > 0 && !!f.menteeId
  const save = () => { onSave(f); onClose() }
  return (
    <Modal title={initial ? 'Editar venda' : 'Registrar venda'} onClose={onClose}>
      <div className="form-grid">
        <Field label="Mentorado">
          <select className="in" value={f.menteeId} onChange={e => setF(p => ({ ...p, menteeId: e.target.value }))}>
            {mentees.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </Field>
        <Field label="Mês">
          <input className="in" type="month" value={f.month} onChange={e => setF(p => ({ ...p, month: e.target.value }))} />
        </Field>
        <Field label="Produto" span2>
          <input className="in" value={f.product} onChange={e => setF(p => ({ ...p, product: e.target.value }))} />
        </Field>
        <Field label="Ticket (R$)">
          <input className="in" type="number" min={0} value={f.ticket} onChange={e => setF(p => ({ ...p, ticket: Number(e.target.value) || 0 }))} />
        </Field>
        <Field label="Quantidade">
          <input className="in" type="number" min={1} value={f.units} onChange={e => setF(p => ({ ...p, units: Number(e.target.value) || 0 }))} />
        </Field>
        <div className="span2">
          <CheckRow checked={f.highTicket} onChange={v => setF(p => ({ ...p, highTicket: v }))} label="Produto high ticket" />
        </div>
        <div className="span2 calc-preview">
          Receita desta venda: <b style={{ color: 'var(--accent)' }}>{fmtBRL(f.ticket * f.units)}</b>
        </div>
      </div>
      <Foot onClose={onClose} onSave={save} ok={ok} />
    </Modal>
  )
}

// ---------- Playbook (template da metodologia) ----------

export function PlaybookForm({ initial, onSave, onClose }: {
  initial?: Playbook; onSave: (p: Playbook) => void; onClose: () => void
}) {
  const [f, setF] = useState<Playbook>(() => initial ? structuredClone(initial) : ({
    id: uid(), pillar: 'branding', title: '', description: '', period: '2 semanas',
    rewardLabel: '', rewardXp: 150, actions: [{ title: '', xp: 40, days: 7 }],
  }))
  const setAction = (i: number, key: keyof PlaybookAction, v: string | number) =>
    setF(p => ({ ...p, actions: p.actions.map((a, j) => j === i ? { ...a, [key]: v } : a) }))
  const addAction = () => setF(p => ({ ...p, actions: [...p.actions, { title: '', xp: 40, days: 7 }] }))
  const rmAction = (i: number) => setF(p => ({ ...p, actions: p.actions.filter((_, j) => j !== i) }))
  const ok = f.title.trim().length > 1 && f.actions.some(a => a.title.trim().length > 1)
  const save = () => { onSave({ ...f, actions: f.actions.filter(a => a.title.trim()) }); onClose() }
  return (
    <Modal title={initial ? 'Editar playbook' : 'Novo playbook'} onClose={onClose}>
      <div className="form-grid">
        <Field label="Nome do playbook" span2>
          <input className="in" value={f.title} onChange={e => setF(p => ({ ...p, title: e.target.value }))} placeholder="Ex.: Social Selling Sprint" />
        </Field>
        <Field label="Pilar">
          <select className="in" value={f.pillar} onChange={e => setF(p => ({ ...p, pillar: e.target.value as PillarId }))}>
            {PILLARS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </Field>
        <Field label="Duração">
          <input className="in" value={f.period} onChange={e => setF(p => ({ ...p, period: e.target.value }))} />
        </Field>
        <Field label="Para que serve" span2>
          <textarea className="in" rows={2} value={f.description} onChange={e => setF(p => ({ ...p, description: e.target.value }))} />
        </Field>
        <Field label="Recompensa ao concluir">
          <input className="in" value={f.rewardLabel} onChange={e => setF(p => ({ ...p, rewardLabel: e.target.value }))} placeholder="Desbloqueia: ..." />
        </Field>
        <Field label="XP bônus">
          <input className="in" type="number" min={0} value={f.rewardXp} onChange={e => setF(p => ({ ...p, rewardXp: Number(e.target.value) || 0 }))} />
        </Field>
        <div className="span2">
          <div className="field" style={{ marginBottom: 8 }}><span>Ações do playbook · XP e prazo (dias após aplicar)</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {f.actions.map((a, i) => (
              <div key={i} className="pb-action-row">
                <input className="in" value={a.title} placeholder={`Ação ${i + 1}`}
                  onChange={e => setAction(i, 'title', e.target.value)} />
                <input className="in" type="number" min={0} title="XP" value={a.xp}
                  onChange={e => setAction(i, 'xp', Number(e.target.value) || 0)} />
                <input className="in" type="number" min={1} title="Prazo (dias)" value={a.days}
                  onChange={e => setAction(i, 'days', Number(e.target.value) || 1)} />
                <button className="icon-btn danger" onClick={() => rmAction(i)} title="Remover">✕</button>
              </div>
            ))}
          </div>
          <button className="add-row" style={{ width: '100%', margin: '10px 0 0' }} onClick={addAction}>＋ Adicionar ação</button>
        </div>
      </div>
      <Foot onClose={onClose} onSave={save} ok={ok} />
    </Modal>
  )
}

// ---------- Aplicar playbook a um mentorado ----------

export function ApplyPlaybookModal({ store, menteeId, onApply, onClose }: {
  store: Store; menteeId: string; onApply: (playbookId: string) => void; onClose: () => void
}) {
  const m = store.mentees.find(x => x.id === menteeId)
  return (
    <Modal title={`Aplicar playbook${m ? ` · ${m.name.split(' ')[0]}` : ''}`} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {store.playbooks.map(p => {
          const pi = pillarById(p.pillar)
          const totalXp = p.actions.reduce((s, a) => s + a.xp, 0) + p.rewardXp
          return (
            <div key={p.id} className="apply-row">
              <span className="pillar-dot" style={{ background: pcolor(pi.hue) }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{p.title}</div>
                <div className="muted-3" style={{ fontSize: 11.5, marginTop: 2 }}>
                  {pi.short} · {p.actions.length} ações · {p.period} · até {totalXp} XP
                </div>
              </div>
              <button className="btn ghost" onClick={() => { onApply(p.id); onClose() }}>Aplicar →</button>
            </div>
          )
        })}
        {!store.playbooks.length && <div className="empty">Nenhum playbook cadastrado ainda.</div>}
      </div>
    </Modal>
  )
}

// ---------- Oportunidade high ticket ----------

export function DealForm({ initial, mentees, defaults, onSave, onClose }: {
  initial?: Deal; mentees: Mentee[]; defaults?: { menteeId?: string }
  onSave: (d: Deal) => void; onClose: () => void
}) {
  const [f, setF] = useState<Deal>(() => initial ? structuredClone(initial) : ({
    id: uid(), menteeId: defaults?.menteeId ?? mentees[0]?.id ?? '',
    client: '', product: '', value: 0, stage: 'lead', nextStep: '',
  }))
  const ok = f.client.trim().length > 1 && f.value > 0 && !!f.menteeId
  const save = () => { onSave(f); onClose() }
  return (
    <Modal title={initial ? 'Editar oportunidade' : 'Nova oportunidade high ticket'} onClose={onClose}>
      <div className="form-grid">
        <Field label="Mentorado">
          <select className="in" value={f.menteeId} onChange={e => setF(p => ({ ...p, menteeId: e.target.value }))}>
            {mentees.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </Field>
        <Field label="Estágio">
          <select className="in" value={f.stage} onChange={e => setF(p => ({ ...p, stage: e.target.value as DealStage }))}>
            {DEAL_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </Field>
        <Field label="Cliente / oportunidade" span2>
          <input className="in" value={f.client} onChange={e => setF(p => ({ ...p, client: e.target.value }))} placeholder="Ex.: Residência Alphaville" />
        </Field>
        <Field label="Produto">
          <input className="in" value={f.product} onChange={e => setF(p => ({ ...p, product: e.target.value }))} />
        </Field>
        <Field label="Valor (R$)">
          <input className="in" type="number" min={0} value={f.value} onChange={e => setF(p => ({ ...p, value: Number(e.target.value) || 0 }))} />
        </Field>
        <Field label="Próximo passo" span2>
          <input className="in" value={f.nextStep} onChange={e => setF(p => ({ ...p, nextStep: e.target.value }))} />
        </Field>
      </div>
      <Foot onClose={onClose} onSave={save} ok={ok} />
    </Modal>
  )
}

// ---------- Encerrar ciclo (re-diagnóstico) ----------

export function CycleCloseForm({ m, onConfirm, onClose }: {
  m: Mentee; onConfirm: (newCycle: string) => void; onClose: () => void
}) {
  const n = (m.cycleHistory?.length ?? 0) + 2
  const [name, setName] = useState(`Ciclo ${n} · Aceleração`)
  const prog = overallProgress(m)
  const xp = actionXp(m)
  const lv = levelForXp(xp)
  const deltas = PILLARS.map(p => ({ p, d: m.scores[p.id].current - m.scores[p.id].baseline }))
  const ok = name.trim().length > 1
  return (
    <Modal title={`Encerrar ${m.cycle}`} onClose={onClose}>
      <div className="calc-preview" style={{ marginBottom: 16 }}>
        Review do ciclo: <b>{Math.round(prog.pct * 100)}%</b> de execução · <b style={{ color: 'var(--accent)' }}>{xp} XP</b> · Nível {lv.current.n} ({lv.current.name})
        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {deltas.map(({ p, d }) => (
            <span key={p.id} className="tag" style={d > 0 ? { color: 'var(--good)' } : undefined}>
              {p.short} {d > 0 ? `+${d}` : d === 0 ? '=' : d}
            </span>
          ))}
        </div>
      </div>
      <div className="muted" style={{ fontSize: 13, lineHeight: 1.55, marginBottom: 16 }}>
        Ao encerrar: o radar atual vira a <b>nova linha de base</b> (re-diagnóstico), os blocos atuais são arquivados
        (o XP conquistado permanece) e um novo ciclo começa do zero.
      </div>
      <div className="form-grid">
        <Field label="Nome do novo ciclo" span2>
          <input className="in" value={name} onChange={e => setName(e.target.value)} />
        </Field>
      </div>
      <div className="form-foot">
        <button className="btn ghost" onClick={onClose}>Cancelar</button>
        <button className="btn" disabled={!ok} onClick={() => { onConfirm(name.trim()); onClose() }}>Encerrar e iniciar novo ciclo</button>
      </div>
    </Modal>
  )
}

// ---------- Recompensa (catálogo) ----------

export function RewardForm({ initial, onSave, onClose }: {
  initial?: RewardItem; onSave: (r: RewardItem) => void; onClose: () => void
}) {
  const [f, setF] = useState<RewardItem>(() => initial ? structuredClone(initial) : ({
    id: uid(), icon: '✦', label: '', description: '', costXp: 300,
  }))
  const ok = f.label.trim().length > 1 && f.costXp > 0
  const save = () => { onSave({ ...f, icon: f.icon.trim() || '✦' }); onClose() }
  return (
    <Modal title={initial ? 'Editar recompensa' : 'Nova recompensa'} onClose={onClose}>
      <div className="form-grid">
        <Field label="Ícone / emoji">
          <input className="in" maxLength={4} value={f.icon} onChange={e => setF(p => ({ ...p, icon: e.target.value }))}
            style={{ maxWidth: 90, textAlign: 'center', fontSize: 18 }} />
        </Field>
        <Field label="Custo (XP)">
          <input className="in" type="number" min={0} value={f.costXp} onChange={e => setF(p => ({ ...p, costXp: Number(e.target.value) || 0 }))} />
        </Field>
        <Field label="Nome da recompensa" span2>
          <input className="in" value={f.label} onChange={e => setF(p => ({ ...p, label: e.target.value }))} placeholder="Ex.: Call extra 1:1 com o mentor" />
        </Field>
        <Field label="Descrição" span2>
          <textarea className="in" rows={2} value={f.description} onChange={e => setF(p => ({ ...p, description: e.target.value }))} placeholder="O que o mentorado ganha ao resgatar" />
        </Field>
        <div className="span2 calc-preview">
          Prévia: <b style={{ fontSize: 16 }}>{f.icon}</b> {f.label || 'nome da recompensa'} · <span style={{ color: 'var(--accent)' }}>{f.costXp} XP</span>
        </div>
      </div>
      <Foot onClose={onClose} onSave={save} ok={ok} />
    </Modal>
  )
}

// ---------- Meta mensal ----------

export function GoalForm({ initial, mentees, defaults, onSave, onClose }: {
  initial?: MonthlyGoal; mentees: Mentee[]; defaults?: { menteeId?: string; month?: string }
  onSave: (g: MonthlyGoal) => void; onClose: () => void
}) {
  const [f, setF] = useState<MonthlyGoal>(() => initial ? structuredClone(initial) : ({
    id: uid(), menteeId: defaults?.menteeId ?? mentees[0]?.id ?? '', month: defaults?.month ?? CURRENT_MONTH,
    revenueGoal: 0, htRevenueGoal: 0, leadsGoal: 0,
  }))
  const ok = f.revenueGoal > 0 && !!f.menteeId
  const save = () => { onSave(f); onClose() }
  return (
    <Modal title={initial ? 'Editar meta do mês' : 'Definir meta do mês'} onClose={onClose}>
      <div className="form-grid">
        <Field label="Mentorado">
          <select className="in" value={f.menteeId} onChange={e => setF(p => ({ ...p, menteeId: e.target.value }))}>
            {mentees.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </Field>
        <Field label="Mês">
          <input className="in" type="month" value={f.month} onChange={e => setF(p => ({ ...p, month: e.target.value }))} />
        </Field>
        <Field label="Meta de receita (R$)">
          <input className="in" type="number" min={0} value={f.revenueGoal} onChange={e => setF(p => ({ ...p, revenueGoal: Number(e.target.value) || 0 }))} />
        </Field>
        <Field label="Meta high ticket (R$)">
          <input className="in" type="number" min={0} value={f.htRevenueGoal} onChange={e => setF(p => ({ ...p, htRevenueGoal: Number(e.target.value) || 0 }))} />
        </Field>
        <Field label="Meta de leads">
          <input className="in" type="number" min={0} value={f.leadsGoal} onChange={e => setF(p => ({ ...p, leadsGoal: Number(e.target.value) || 0 }))} />
        </Field>
        <div className="span2 calc-preview">
          High ticket representa <b style={{ color: 'var(--accent)' }}>
            {f.revenueGoal ? Math.round((f.htRevenueGoal / f.revenueGoal) * 100) : 0}%</b> da meta de receita.
        </div>
      </div>
      <Foot onClose={onClose} onSave={save} ok={ok} />
    </Modal>
  )
}

// ---------- Campanha ----------

export function CampaignForm({ initial, mentees, defaults, onSave, onClose }: {
  initial?: Campaign; mentees: Mentee[]; defaults?: { menteeId?: string; month?: string }
  onSave: (c: Campaign) => void; onClose: () => void
}) {
  const [f, setF] = useState<Campaign>(() => initial ? structuredClone(initial) : ({
    id: uid(), menteeId: defaults?.menteeId ?? mentees[0]?.id ?? '', month: defaults?.month ?? CURRENT_MONTH,
    funnel: 'webinar', product: '', ticket: 0, highTicket: false, cpl: 0, leads: 0, convPct: 0, status: 'planned',
  }))
  const d = campaignCalc(f)
  const ok = f.product.trim().length > 1 && f.ticket > 0 && !!f.menteeId
  const save = () => { onSave(f); onClose() }
  return (
    <Modal title={initial ? 'Editar campanha' : 'Nova campanha'} onClose={onClose}>
      <div className="form-grid">
        <Field label="Mentorado">
          <select className="in" value={f.menteeId} onChange={e => setF(p => ({ ...p, menteeId: e.target.value }))}>
            {mentees.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </Field>
        <Field label="Mês">
          <input className="in" type="month" value={f.month} onChange={e => setF(p => ({ ...p, month: e.target.value }))} />
        </Field>
        <Field label="Funil">
          <select className="in" value={f.funnel} onChange={e => setF(p => ({ ...p, funnel: e.target.value as FunnelId }))}>
            {FUNNELS.map(fn => <option key={fn.id} value={fn.id}>{fn.label}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select className="in" value={f.status} onChange={e => setF(p => ({ ...p, status: e.target.value as CampaignStatus }))}>
            {(Object.keys(CAMPAIGN_STATUS) as CampaignStatus[]).map(s => (
              <option key={s} value={s}>{CAMPAIGN_STATUS[s].label}</option>
            ))}
          </select>
        </Field>
        <Field label="Produto" span2>
          <input className="in" value={f.product} onChange={e => setF(p => ({ ...p, product: e.target.value }))} />
        </Field>
        <Field label="Ticket (R$)">
          <input className="in" type="number" min={0} value={f.ticket} onChange={e => setF(p => ({ ...p, ticket: Number(e.target.value) || 0 }))} />
        </Field>
        <Field label="CPL (R$)">
          <input className="in" type="number" min={0} step={0.5} value={f.cpl} onChange={e => setF(p => ({ ...p, cpl: Number(e.target.value) || 0 }))} />
        </Field>
        <Field label="Qtd. de leads">
          <input className="in" type="number" min={0} value={f.leads} onChange={e => setF(p => ({ ...p, leads: Number(e.target.value) || 0 }))} />
        </Field>
        <Field label="Conversão em vendas (%)">
          <input className="in" type="number" min={0} max={100} step={0.1} value={f.convPct} onChange={e => setF(p => ({ ...p, convPct: Number(e.target.value) || 0 }))} />
        </Field>
        <div className="span2">
          <CheckRow checked={f.highTicket} onChange={v => setF(p => ({ ...p, highTicket: v }))} label="Produto high ticket" />
        </div>
        <div className="span2 calc-preview">
          Projeção: <b>{d.sales} vendas</b> · CPA {d.cpa ? fmtBRL(d.cpa) : '—'} · Investimento {d.invested ? fmtBRL(d.invested) : '—'} ·
          Receita <b style={{ color: 'var(--accent)' }}>{fmtBRL(d.revenue)}</b>{d.roas > 0 && <> · ROAS {d.roas.toFixed(1)}x</>}
        </div>
      </div>
      <Foot onClose={onClose} onSave={save} ok={ok} />
    </Modal>
  )
}

// ---------- Criar acesso do mentorado (login) ----------

export function MenteeLoginForm({ menteeId, menteeName, onClose }: {
  menteeId: string; menteeName: string; onClose: () => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const ok = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && password.length >= 6

  const submit = async () => {
    setBusy(true); setErr(null)
    const { error } = await createMenteeLogin(menteeId, email.trim(), password)
    setBusy(false)
    if (error) setErr(error); else setDone(true)
  }

  return (
    <Modal title={`Criar acesso · ${menteeName}`} onClose={onClose}>
      {done ? (
        <>
          <div className="calc-preview" style={{ borderColor: 'var(--good-dim)' }}>
            ✓ Acesso criado! <b>{menteeName}</b> já pode entrar no mesmo endereço do sistema com
            o e-mail <b>{email.trim()}</b> e a senha que você definiu — e verá apenas o próprio plano.
          </div>
          <div className="form-foot"><button className="btn" onClick={onClose}>Concluir</button></div>
        </>
      ) : (
        <>
          <div className="muted" style={{ fontSize: 13, lineHeight: 1.55, marginBottom: 16 }}>
            Defina o login do mentorado. Ele entra no <b>mesmo endereço</b> do sistema e enxerga
            somente a própria jornada — sem o painel do advisor.
          </div>
          <div className="form-grid">
            <Field label="E-mail do mentorado" span2>
              <input className="in" type="email" value={email} autoFocus
                onChange={e => { setEmail(e.target.value); setErr(null) }} placeholder="mentorado@email.com" />
            </Field>
            <Field label="Senha inicial (mín. 6)" span2>
              <input className="in" type="text" value={password}
                onChange={e => { setPassword(e.target.value); setErr(null) }} placeholder="defina e informe ao mentorado" />
            </Field>
          </div>
          {err && <div className="login-err" style={{ marginTop: 12 }}>{err}</div>}
          <div className="form-foot">
            <button className="btn ghost" onClick={onClose}>Cancelar</button>
            <button className="btn" disabled={!ok || busy} onClick={submit}>{busy ? 'Criando…' : 'Criar acesso'}</button>
          </div>
        </>
      )}
    </Modal>
  )
}
