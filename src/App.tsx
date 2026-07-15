import { useEffect, useState } from 'react'
import {
  PILLARS, ADVISOR, pillarById, levelForXp, actionXp, blockProgress, overallProgress, activeBlocks,
  pcolor, fmtDate, fmtBRL, todayIso, CURRENT_MONTH, monthFull, salesSummary, campaignCalc,
  upsert, effectiveStreak, menteeHealth, blockFromPlaybook, seedStore, migrateStore, buildAlerts, accessInfo,
  SOCIAL_META, socialUrl, ACCENTS, ensureSettings,
  type Mentee, type PillarId, type ActionStatus, type ActionBlock, type Action,
  type Store, type ModalState, type Api, type CycleSnapshot, type Session,
} from './data'
import {
  MenteeForm, BlockForm, ActionForm, SessionForm, TeamForm, SaleForm, CampaignForm, GoalForm,
  PlaybookForm, ApplyPlaybookModal, DealForm, CycleCloseForm, MenteeLoginForm, RewardForm, CallForm,
} from './forms'
import { AgendaView, NextCallCard } from './agenda'
import { MyResults } from './results'
import { MyEvolution } from './evolution'
import { Avatar } from './avatar'
import { CheckpointsSection } from './checkpoints'
import { AdminView } from './admin'
import { SalesView, CampaignsView, TeamView, MenteeCommercial } from './commercial'
import { MyWeek, RewardsSection, RankingCard, AccessChip } from './week'
import { FunnelCalculatorView, FunnelBoard } from './funnel'
import { ProgramDashboard } from './program'
import { OnboardingQuiz } from './quiz'
import { Attachments } from './attachments'
import {
  PlaybooksView, AgendaCard, InsightsCard, NotesCard, BadgesRow, CommentsModal, ReportView, AlertsView, RewardsAdmin,
} from './extras'

// ---------- helpers ----------
const uid = () => Math.random().toString(36).slice(2, 10)

// Advisor marca concluído direto; mentorado envia para aprovação
const cycleAdvisor = (s: ActionStatus): ActionStatus =>
  s === 'todo' ? 'doing' : s === 'doing' ? 'done' : s === 'review' ? 'done' : 'todo'
const cycleMentee = (s: ActionStatus): ActionStatus =>
  s === 'todo' ? 'doing' : s === 'doing' ? 'review' : s === 'review' ? 'doing' : s

const sessionWho = (store: Store, withId?: string) =>
  !withId || withId === 'advisor'
    ? { label: 'Mentor', name: ADVISOR.name.split(' ')[0] }
    : { label: 'Guardião', name: store.team.find(t => t.id === withId)?.name.split(' ')[0] ?? 'Equipe' }

// ---------- Store local (localStorage) — usado quando a nuvem está desligada ----------
const STORE_KEY = 'advisor-os-store-v2'
function loadStore(): Store {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) { const s = migrateStore(JSON.parse(raw)); if (s) return s }
  } catch { /* seed */ }
  return seedStore()
}

// ---------- Radar (SVG) ----------
function Radar({ m, size = 230 }: { m: Mentee; size?: number }) {
  const cx = size / 2, cy = size / 2, R = size / 2 - 26
  const n = PILLARS.length
  const pt = (i: number, r: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]
  }
  const poly = (key: 'baseline' | 'current') =>
    PILLARS.map((p, i) => pt(i, R * (m.scores[p.id][key] / 10)).join(',')).join(' ')
  const rings = [0.25, 0.5, 0.75, 1]
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {rings.map((r, i) => (
        <polygon key={i}
          points={PILLARS.map((_, idx) => pt(idx, R * r).join(',')).join(' ')}
          fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
      ))}
      {PILLARS.map((_, i) => {
        const [x, y] = pt(i, R)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.06)" />
      })}
      <polygon points={poly('baseline')} fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.25)" strokeWidth={1} strokeDasharray="3 3" />
      <polygon points={poly('current')} fill="rgba(232,179,74,0.14)" stroke="var(--accent)" strokeWidth={1.6} />
      {PILLARS.map((p, i) => {
        const [x, y] = pt(i, R * (m.scores[p.id].current / 10))
        return <circle key={p.id} cx={x} cy={y} r={3} fill="var(--accent)" />
      })}
      {PILLARS.map((p, i) => {
        const [x, y] = pt(i, R + 15)
        return (
          <text key={p.id} x={x} y={y} fill="var(--text-3)" fontSize={10.5}
            textAnchor="middle" dominantBaseline="middle" style={{ fontWeight: 600 }}>
            {p.short}
          </text>
        )
      })}
    </svg>
  )
}

// ---------- Action block ----------
interface BlockTools {
  onEditBlock: () => void
  onDelBlock: () => void
  onAddAction: () => void
  onEditAction: (a: Action) => void
  onDelAction: (a: Action) => void
  onApprove: (a: Action) => void
  onReturn: (a: Action) => void
}

function ActionBlockView({ block, onToggle, interactive, tools, onComment, menteeId, api }: {
  block: ActionBlock; onToggle: (aId: string) => void; interactive: boolean
  tools?: BlockTools; onComment?: (a: Action) => void; menteeId?: string; api?: Api
}) {
  const p = pillarById(block.pillar)
  const prog = blockProgress(block)
  const complete = prog.total > 0 && prog.done === prog.total
  return (
    <div className="block">
      <div className="block-head">
        <span className="pillar-dot" style={{ background: pcolor(p.hue) }} />
        <div>
          <div className="block-title">{block.title}</div>
          <div className="block-period">{block.period} · {p.short}</div>
        </div>
        <div className="block-badge">
          <div className="mono" style={{ fontSize: 12, color: 'var(--text-2)' }}>
            {prog.done}/{prog.total}
          </div>
          <div className={`reward ${complete ? '' : 'locked'}`}>
            {complete ? '✓' : '🔒'} +{block.rewardXp} XP
          </div>
        </div>
        {tools && (
          <span className="row-tools" style={{ marginLeft: 4 }}>
            <button className="icon-btn" title="Editar bloco" onClick={tools.onEditBlock}>✎</button>
            <button className="icon-btn danger" title="Excluir bloco" onClick={tools.onDelBlock}>✕</button>
          </span>
        )}
      </div>
      <div className="actions">
        {block.actions.map(a => (
          <div key={a.id} className="action-wrap">
            <div className={`action ${a.status}`}>
            <button
              className={`check ${a.status}`}
              onClick={() => interactive && onToggle(a.id)}
              title={interactive ? 'Alterar status' : ''}
              style={{ cursor: interactive ? 'pointer' : 'default' }}
            >
              {a.status === 'done' ? '✓' : a.status === 'review' ? '!' : a.status === 'doing' ? '·' : ''}
            </button>
            <div className="action-title">
              {a.title}
              {a.status === 'review' && <span className="review-chip">aguardando aprovação</span>}
            </div>
            <div className="action-meta">
              {a.evidence && <span className="evi">✦ {a.evidence}</span>}
              {a.status === 'review' && tools && (
                <>
                  <button className="icon-btn approve" title="Aprovar entrega (+XP)" onClick={() => tools.onApprove(a)}>✓</button>
                  <button className="icon-btn" style={{ opacity: 1 }} title="Devolver para execução" onClick={() => tools.onReturn(a)}>↩</button>
                </>
              )}
              {onComment && (
                <button className="icon-btn" style={{ opacity: 1 }} title="Comentários" onClick={() => onComment(a)}>
                  💬{a.comments?.length ? <span className="c-count">{a.comments.length}</span> : null}
                </button>
              )}
              <span className="due">{fmtDate(a.due)}</span>
              <span className="xp-chip">+{a.xp}</span>
              {tools && (
                <span className="row-tools">
                  <button className="icon-btn" title="Editar ação" onClick={() => tools.onEditAction(a)}>✎</button>
                  <button className="icon-btn danger" title="Excluir ação" onClick={() => tools.onDelAction(a)}>✕</button>
                </span>
              )}
            </div>
            </div>
            {menteeId && api && (
              <Attachments menteeId={menteeId} blockId={block.id} action={a} api={api} canEdit={interactive || !!tools} />
            )}
          </div>
        ))}
        {tools && (
          <button className="add-row" onClick={tools.onAddAction}>＋ Adicionar ação</button>
        )}
      </div>
      <div style={{ padding: '0 6px 12px' }}>
        <div className="bar accent"><i style={{ width: `${prog.pct * 100}%` }} /></div>
        <div style={{ marginTop: 8, fontSize: 11.5, color: complete ? 'var(--accent)' : 'var(--text-3)' }}>
          {complete ? `Bloco concluído · ${block.rewardLabel}` : `Recompensa ao concluir: ${block.rewardLabel}`}
        </div>
      </div>
    </div>
  )
}

// ---------- Dados do mentorado (card de perfil, edição pelo time) ----------
function ProfileCard({ m, api }: { m: Mentee; api: Api }) {
  const socials = SOCIAL_META.filter(sm => m.socials?.[sm.id]?.trim())
  const na = <span className="muted-3">não informado</span>
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="section-head" style={{ marginBottom: 14 }}>
        <div className="h2" style={{ fontSize: 16 }}>Dados do mentorado</div>
        <button className="btn ghost" style={{ padding: '6px 12px', fontSize: 12 }}
          onClick={() => api.open({ kind: 'mentee', mentee: m })}>✎ Editar dados</button>
      </div>
      <dl className="profile-rows">
        <dt>Nome</dt><dd>{m.name}</dd>
        <dt>Empresa</dt><dd>{m.business}{m.jobTitle ? <span className="muted-3"> · {m.jobTitle}</span> : ''}</dd>
        <dt>Nicho</dt><dd>{m.niche || na}</dd>
        <dt>E-mail</dt><dd>{m.email ? <a href={`mailto:${m.email}`}>{m.email}</a> : na}</dd>
        <dt>Telefone</dt><dd>{m.phone ? <a href={`tel:+55${m.phone.replace(/\D/g, '')}`}>{m.phone}</a> : na}</dd>
        <dt>Redes</dt>
        <dd>{socials.length
          ? <div className="social-chips">{socials.map(sm => (
              <a key={sm.id} href={socialUrl(sm.id, m.socials![sm.id]!)} target="_blank" rel="noopener noreferrer">
                {sm.label} ↗
              </a>
            ))}</div>
          : na}</dd>
        <dt>Entrada</dt><dd>{fmtDate(m.startDate)}</dd>
      </dl>
    </div>
  )
}

// ---------- Mentee card (advisor list) ----------
function MenteeCard({ m, store, onOpen }: { m: Mentee; store: Store; onOpen: () => void }) {
  const xp = actionXp(m)
  const lv = levelForXp(xp)
  const prog = overallProgress(m)
  const streak = effectiveStreak(m, store.checkins)
  const health = menteeHealth(m, store.checkins)
  const riskStyle = health.status === 'risk'
    ? { color: '#f27979', borderColor: 'rgba(242,121,121,0.3)', background: 'rgba(242,121,121,0.08)' }
    : undefined
  return (
    <div className="card hover mentee-card" onClick={onOpen}>
      <div className="mentee-head">
        <Avatar m={m} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="mentee-name">{m.name}</div>
          <div className="mentee-biz">{m.business}</div>
        </div>
        <span className={`tag ${health.status === 'ok' ? 'good' : 'warn'}`} style={riskStyle}
          title={health.reasons.join(' · ') || 'em dia'}>
          ● {health.status === 'ok' ? 'em dia' : health.status === 'warn' ? 'atenção' : 'risco'}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
        <span className="level-pill"><span className="lv">Nv {lv.current.n}</span>{lv.current.name}</span>
        <span className="mono" style={{ fontSize: 12, color: 'var(--accent)', marginLeft: 'auto' }}>{xp} XP</span>
        <span className="mono" style={{ fontSize: 12, color: 'var(--text-3)' }}>⟳ {streak}sem</span>
      </div>
      <div style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--text-3)', marginBottom: 7 }}>
          <span>Execução do ciclo</span><span className="mono">{Math.round(prog.pct * 100)}%</span>
        </div>
        <div className="bar good"><i style={{ width: `${prog.pct * 100}%` }} /></div>
      </div>
    </div>
  )
}

// ---------- App ----------
type Role = 'advisor' | 'mentee'
type View = 'overview' | 'alerts' | 'agenda' | 'admin' | 'evolution' | 'mentees' | 'detail' | 'sales' | 'campaigns' | 'team' | 'playbooks' | 'journey' | 'week' | 'results' | 'myevolution' | 'funnel' | 'funnelboard' | 'quiz' | 'rewards'

const NAV: { id: View; label: string }[] = [
  { id: 'overview', label: 'Visão geral' },
  { id: 'alerts', label: 'Alertas' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'evolution', label: 'Evolução' },
  { id: 'mentees', label: 'Mentorados' },
  { id: 'sales', label: 'Comercial' },
  { id: 'campaigns', label: 'Campanhas' },
  { id: 'funnelboard', label: 'Funil' },
  { id: 'playbooks', label: 'Playbooks' },
  { id: 'rewards', label: 'Recompensas' },
  { id: 'team', label: 'Equipe' },
]

interface AppProps {
  // Nuvem: estado controlado pelo CloudRoot (permite Realtime). Ausente = modo localStorage.
  store?: Store
  setStore?: React.Dispatch<React.SetStateAction<Store>>
  cloudEmail?: string           // e-mail logado (mostra rodapé + sair da conta)
  onCloudSignOut?: () => void
  cloudRole?: 'advisor' | 'mentee' // 'mentee' trava o app na jornada do próprio mentorado
  onCloudDeleteMentee?: (id: string) => void // Fase 2: apaga a linha no banco (o save só upserta)
  isAdmin?: boolean // true só para a conta advisor (aba Administração)
}

export default function App({ store: cStore, setStore: cSetStore, cloudEmail, onCloudSignOut, cloudRole, onCloudDeleteMentee, isAdmin }: AppProps = {}) {
  const lockedMentee = cloudRole === 'mentee'
  const cloudMode = !!cloudEmail && !lockedMentee // advisor/equipe logados na nuvem → pode criar acessos
  const [role, setRole] = useState<Role>(lockedMentee ? 'mentee' : 'advisor')
  const [view, setView] = useState<View>('overview')
  const [selected, setSelected] = useState<string>('ana')
  const [modal, setModal] = useState<ModalState | null>(null)

  // Estado controlado (nuvem) ou local (localStorage)
  const controlled = !!cSetStore
  const [localStore, setLocalStore] = useState<Store>(() => loadStore())
  const store = controlled ? cStore! : localStore
  const setStore = controlled ? cSetStore! : setLocalStore

  useEffect(() => {
    if (controlled) return // na nuvem, o CloudRoot cuida da persistência
    try { localStorage.setItem(STORE_KEY, JSON.stringify(localStore)) } catch { /* quota */ }
  }, [localStore, controlled])

  const api: Api = {
    open: setModal,
    upMentee: m => setStore(s => ({ ...s, mentees: upsert(s.mentees, m) })),
    delMentee: id => {
      onCloudDeleteMentee?.(id) // nuvem Fase 2: remove a linha do banco também
      setStore(s => ({
      ...s,
      mentees: s.mentees.filter(m => m.id !== id),
      sales: s.sales.filter(x => x.menteeId !== id),
      campaigns: s.campaigns.filter(x => x.menteeId !== id),
      goals: s.goals.filter(x => x.menteeId !== id),
      checkins: s.checkins.filter(x => x.menteeId !== id),
      redemptions: s.redemptions.filter(x => x.menteeId !== id),
      deals: s.deals.filter(x => x.menteeId !== id),
      calls: s.calls.filter(x => x.menteeId !== id),
      team: s.team.map(t => ({ ...t, menteeIds: t.menteeIds.filter(x => x !== id) })),
      }))
    },
    upBlock: (menteeId, b) => setStore(s => ({
      ...s, mentees: s.mentees.map(m => m.id !== menteeId ? m : { ...m, blocks: upsert(m.blocks, b) }),
    })),
    delBlock: (menteeId, blockId) => setStore(s => ({
      ...s, mentees: s.mentees.map(m => m.id !== menteeId ? m : { ...m, blocks: m.blocks.filter(b => b.id !== blockId) }),
    })),
    upAction: (menteeId, blockId, a) => setStore(s => ({
      ...s, mentees: s.mentees.map(m => m.id !== menteeId ? m : {
        ...m, blocks: m.blocks.map(b => b.id !== blockId ? b : { ...b, actions: upsert(b.actions, a) }),
      }),
    })),
    delAction: (menteeId, blockId, actionId) => setStore(s => ({
      ...s, mentees: s.mentees.map(m => m.id !== menteeId ? m : {
        ...m, blocks: m.blocks.map(b => b.id !== blockId ? b : { ...b, actions: b.actions.filter(a => a.id !== actionId) }),
      }),
    })),
    toggleAction: (menteeId, aId, mode) => setStore(s => ({
      ...s, mentees: s.mentees.map(m => m.id !== menteeId ? m : {
        ...m,
        blocks: m.blocks.map(b => ({
          ...b,
          actions: b.actions.map(a => a.id !== aId ? a : {
            ...a, status: mode === 'advisor' ? cycleAdvisor(a.status) : cycleMentee(a.status),
          }),
        })),
      }),
    })),
    addSession: (menteeId, sess) => setStore(s => ({
      ...s, mentees: s.mentees.map(m => m.id !== menteeId ? m : { ...m, sessions: [sess, ...m.sessions] }),
    })),
    upTeam: t => setStore(s => ({ ...s, team: upsert(s.team, t) })),
    delTeam: id => setStore(s => ({ ...s, team: s.team.filter(t => t.id !== id) })),
    upSale: e => setStore(s => ({ ...s, sales: upsert(s.sales, e) })),
    delSale: id => setStore(s => ({ ...s, sales: s.sales.filter(e => e.id !== id) })),
    upCampaign: c => setStore(s => ({ ...s, campaigns: upsert(s.campaigns, c) })),
    delCampaign: id => setStore(s => ({ ...s, campaigns: s.campaigns.filter(c => c.id !== id) })),
    upGoal: g => setStore(s => ({ ...s, goals: upsert(s.goals, g) })),
    delGoal: id => setStore(s => ({ ...s, goals: s.goals.filter(g => g.id !== id) })),
    upFunnel: fn => setStore(s => ({ ...s, funnels: upsert(s.funnels, fn) })),
    delFunnel: id => setStore(s => ({ ...s, funnels: s.funnels.filter(x => x.id !== id) })),
    upReward: r => setStore(s => ({ ...s, rewards: upsert(s.rewards, r) })),
    delReward: id => setStore(s => ({ ...s, rewards: s.rewards.filter(x => x.id !== id) })),
    upCheckIn: c => setStore(s => ({ ...s, checkins: upsert(s.checkins, c) })),
    upPlaybook: p => setStore(s => ({ ...s, playbooks: upsert(s.playbooks, p) })),
    delPlaybook: id => setStore(s => ({ ...s, playbooks: s.playbooks.filter(p => p.id !== id) })),
    applyPlaybook: (menteeId, playbookId) => setStore(s => {
      const pb = s.playbooks.find(p => p.id === playbookId)
      if (!pb) return s
      const block = blockFromPlaybook(pb, uid)
      return { ...s, mentees: s.mentees.map(m => m.id !== menteeId ? m : { ...m, blocks: [...m.blocks, block] }) }
    }),
    upDeal: d => setStore(s => ({ ...s, deals: upsert(s.deals, d) })),
    delDeal: id => setStore(s => ({ ...s, deals: s.deals.filter(d => d.id !== id) })),
    redeem: (menteeId, rewardId) => setStore(s => ({
      ...s, redemptions: [...s.redemptions, { id: uid(), menteeId, rewardId, date: todayIso(), status: 'pending' as const }],
    })),
    setRedemption: (id, status) => setStore(s => ({
      ...s, redemptions: s.redemptions.map(r => r.id === id ? { ...r, status } : r),
    })),
    closeCycle: (menteeId, newCycle) => setStore(s => ({
      ...s, mentees: s.mentees.map(m => {
        if (m.id !== menteeId) return m
        const snap: CycleSnapshot = {
          id: uid(), cycle: m.cycle, closedAt: todayIso(),
          execution: overallProgress(m).pct, xp: actionXp(m), scores: structuredClone(m.scores),
        }
        const scores = Object.fromEntries(
          PILLARS.map(p => [p.id, { baseline: m.scores[p.id].current, current: m.scores[p.id].current }])
        ) as Mentee['scores']
        return {
          ...m, cycle: newCycle, scores,
          cycleHistory: [...(m.cycleHistory ?? []), snap],
          blocks: m.blocks.map(b => ({ ...b, archived: true })),
        }
      }),
    })),
    addComment: (menteeId, blockId, actionId, text, author, crole) => setStore(s => ({
      ...s, mentees: s.mentees.map(m => m.id !== menteeId ? m : {
        ...m, blocks: m.blocks.map(b => b.id !== blockId ? b : {
          ...b, actions: b.actions.map(a => a.id !== actionId ? a : {
            ...a, comments: [...(a.comments ?? []), { id: uid(), author, role: crole, text, date: todayIso() }],
          }),
        }),
      }),
    })),
    setNotes: (menteeId, text) => setStore(s => ({
      ...s, mentees: s.mentees.map(m => m.id !== menteeId ? m : { ...m, privateNotes: text }),
    })),
    upCall: c => setStore(s => ({ ...s, calls: upsert(s.calls, c) })),
    delCall: id => setStore(s => ({ ...s, calls: s.calls.filter(c => c.id !== id) })),
    upCheckpoint: (menteeId, cp) => setStore(s => ({
      ...s, mentees: s.mentees.map(m => m.id !== menteeId ? m : { ...m, checkpoints: upsert(m.checkpoints ?? [], cp) }),
    })),
    delCheckpoint: (menteeId, cpId) => setStore(s => ({
      ...s, mentees: s.mentees.map(m => m.id !== menteeId ? m : { ...m, checkpoints: (m.checkpoints ?? []).filter(c => c.id !== cpId) }),
    })),
    setSettings: patch => setStore(s => ({ ...s, settings: ensureSettings({ ...s.settings, ...patch }) })),
  }

  // Seleção de perfil do mentorado
  const [loggedId, setLoggedId] = useState<string | null>(() => localStorage.getItem('advisor-os-logged'))
  const login = (id: string) => { setLoggedId(id); localStorage.setItem('advisor-os-logged', id) }
  const logout = () => { setLoggedId(null); localStorage.removeItem('advisor-os-logged') }

  // No login de mentorado (nuvem) o Store traz só o próprio registro — sem seletor de perfil.
  const menteeSelf = lockedMentee ? store.mentees[0] : store.mentees.find(m => m.id === loggedId)
  const menteeLogout = lockedMentee ? (onCloudSignOut ?? logout) : logout
  const current = store.mentees.find(m => m.id === selected)

  const switchRole = (r: Role) => {
    setRole(r)
    setView(r === 'advisor' ? 'overview' : 'week')
  }

  const resetDemo = () => {
    if (confirm('Restaurar os dados de demonstração? Suas edições serão perdidas.')) setStore(seedStore())
  }

  const openMentee = (id: string) => { setSelected(id); setView('detail') }
  const alertCount = buildAlerts(store).length
  const admin = !lockedMentee && (isAdmin ?? true) // local/demo: sempre; nuvem: só role advisor
  const settings = store.settings

  // Branding e tema valem para o app inteiro (equipe e mentorados)
  useEffect(() => {
    document.title = `${settings.appName} — Acompanhamento de Mentorados`
    const acc = ACCENTS.find(a => a.id === settings.accent) ?? ACCENTS[0]
    const root = document.documentElement.style
    root.setProperty('--accent', acc.color)
    root.setProperty('--accent-dim', acc.dim)
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (link) link.href = settings.favicon ?? '/icon-192.png'
  }, [settings])

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          {settings.logo
            ? <img className="brand-mark" src={settings.logo} alt={settings.appName} style={{ objectFit: 'cover' }} />
            : <div className="brand-mark">{settings.appName.trim()[0]?.toUpperCase() ?? 'A'}</div>}
          <div>
            <div className="brand-name">{settings.appName}</div>
            <div className="brand-sub">acompanhamento</div>
          </div>
        </div>

        <nav className="nav">
          <div className="nav-label">{role === 'advisor' ? 'Painel do Advisor' : 'Minha Jornada'}</div>
          {role === 'advisor' ? (
            <>
              {NAV.map(n => (
                <button key={n.id}
                  className={`nav-item ${view === n.id || (n.id === 'mentees' && view === 'detail') ? 'active' : ''}`}
                  onClick={() => setView(n.id)}>
                  <span className="dot" /> {n.label}
                  {n.id === 'alerts' && alertCount > 0 && settings.notifications.badge && <span className="nav-badge">{alertCount}</span>}
                </button>
              ))}
              {admin && (
                <button className={`nav-item ${view === 'admin' ? 'active' : ''}`} onClick={() => setView('admin')}>
                  <span className="dot" /> Administração
                </button>
              )}
            </>
          ) : (
            <>
              <button className={`nav-item ${view === 'week' ? 'active' : ''}`} onClick={() => setView('week')}>
                <span className="dot" /> Minha semana
              </button>
              <button className={`nav-item ${view === 'journey' ? 'active' : ''}`} onClick={() => setView('journey')}>
                <span className="dot" /> Minha jornada
              </button>
              <button className={`nav-item ${view === 'results' ? 'active' : ''}`} onClick={() => setView('results')}>
                <span className="dot" /> Meus resultados
              </button>
              <button className={`nav-item ${view === 'myevolution' ? 'active' : ''}`} onClick={() => setView('myevolution')}>
                <span className="dot" /> Minha evolução
              </button>
              <button className={`nav-item ${view === 'funnel' ? 'active' : ''}`} onClick={() => setView('funnel')}>
                <span className="dot" /> Calculadora de funil
              </button>
              <button className={`nav-item ${view === 'quiz' ? 'active' : ''}`} onClick={() => setView('quiz')}>
                <span className="dot" /> Diagnóstico
              </button>
            </>
          )}
        </nav>

        <div className="role-switch">
          {!lockedMentee && (
            <>
              <div className="role-switch-label">Ver como</div>
              <div className="role-toggle">
                <button className={role === 'advisor' ? 'on' : ''} onClick={() => switchRole('advisor')}>Advisor</button>
                <button className={role === 'mentee' ? 'on' : ''} onClick={() => switchRole('mentee')}>Mentorado</button>
              </div>
            </>
          )}
          {cloudEmail ? (
            <div className="account-box">
              <div className="account-email" title={cloudEmail}>{cloudEmail}</div>
              <button className="reset-link" onClick={() => onCloudSignOut?.()}>⇥ sair da conta</button>
            </div>
          ) : (
            <button className="reset-link" onClick={resetDemo}>↺ restaurar demo</button>
          )}
        </div>
      </aside>

      <main className="main">
        {role === 'advisor' && view === 'overview' && <Overview store={store} onOpen={openMentee} />}
        {role === 'advisor' && view === 'alerts' && <AlertsView store={store} onOpenMentee={openMentee} />}
        {role === 'advisor' && view === 'agenda' && <AgendaView store={store} api={api} onOpenMentee={openMentee} />}
        {role === 'advisor' && view === 'admin' && admin && <AdminView store={store} api={api} adminEmail={cloudEmail} />}
        {role === 'advisor' && view === 'mentees' && <MenteesList store={store} api={api} onOpen={openMentee} />}
        {role === 'advisor' && view === 'detail' && (
          current
            ? <Detail m={current} store={store} api={api} onBack={() => setView('mentees')} cloudMode={!!cloudEmail && !lockedMentee} author={cloudEmail ? cloudEmail.split('@')[0] : ADVISOR.name.split(' ')[0]} />
            : <MenteesList store={store} api={api} onOpen={openMentee} />
        )}
        {role === 'advisor' && view === 'sales' && <SalesView store={store} api={api} />}
        {role === 'advisor' && view === 'campaigns' && <CampaignsView store={store} api={api} />}
        {role === 'advisor' && view === 'funnelboard' && <FunnelBoard store={store} />}
        {role === 'advisor' && view === 'evolution' && <ProgramDashboard store={store} />}
        {role === 'advisor' && view === 'rewards' && <RewardsAdmin store={store} api={api} />}
        {role === 'advisor' && view === 'playbooks' && <PlaybooksView store={store} api={api} />}
        {role === 'advisor' && view === 'team' && <TeamView store={store} api={api} />}
        {role === 'mentee' && (
          menteeSelf
            ? (view === 'journey'
              ? <Journey m={menteeSelf} store={store} api={api} onLogout={menteeLogout} />
              : view === 'results'
                ? <MyResults m={menteeSelf} store={store} onLogout={menteeLogout} />
              : view === 'myevolution'
                ? <MyEvolution m={menteeSelf} store={store} onLogout={menteeLogout} />
              : view === 'funnel'
                ? <FunnelCalculatorView m={menteeSelf} store={store} api={api} onLogout={menteeLogout} />
                : view === 'quiz'
                  ? <OnboardingQuiz m={menteeSelf} api={api} onLogout={menteeLogout} onOpenPlan={() => setView('week')} />
                  : <MyWeek m={menteeSelf} store={store} api={api} onLogout={menteeLogout} />)
            : <LoginView mentees={store.mentees} onLogin={login} />
        )}
      </main>

      {modal?.kind === 'mentee' && (
        <MenteeForm initial={modal.mentee} onSave={api.upMentee} onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'block' && (
        <BlockForm initial={modal.block} onSave={b => api.upBlock(modal.menteeId, b)} onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'action' && (
        <ActionForm initial={modal.action} onSave={a => api.upAction(modal.menteeId, modal.blockId, a)} onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'session' && (
        <SessionForm team={store.team} onSave={s => api.addSession(modal.menteeId, s)} onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'team' && (
        <TeamForm initial={modal.member} mentees={store.mentees} cloudMode={cloudMode} onSave={api.upTeam} onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'sale' && (
        <SaleForm initial={modal.sale} mentees={store.mentees}
          defaults={{ menteeId: modal.menteeId, month: modal.month }}
          onSave={api.upSale} onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'campaign' && (
        <CampaignForm initial={modal.campaign} mentees={store.mentees}
          defaults={{ menteeId: modal.menteeId, month: modal.month }}
          onSave={api.upCampaign} onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'goal' && (
        <GoalForm initial={modal.goal} mentees={store.mentees}
          defaults={{ menteeId: modal.menteeId, month: modal.month }}
          onSave={api.upGoal} onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'playbook' && (
        <PlaybookForm initial={modal.playbook} onSave={api.upPlaybook} onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'apply' && (
        <ApplyPlaybookModal store={store} menteeId={modal.menteeId}
          onApply={pid => api.applyPlaybook(modal.menteeId, pid)} onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'deal' && (
        <DealForm initial={modal.deal} mentees={store.mentees} defaults={{ menteeId: modal.menteeId }}
          onSave={api.upDeal} onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'cycle' && (() => {
        const cm = store.mentees.find(x => x.id === modal.menteeId)
        return cm ? <CycleCloseForm m={cm} onConfirm={name => api.closeCycle(cm.id, name)} onClose={() => setModal(null)} /> : null
      })()}
      {modal?.kind === 'comments' && (
        <CommentsModal store={store} api={api} menteeId={modal.menteeId} blockId={modal.blockId}
          actionId={modal.actionId} role={role === 'advisor' ? 'advisor' : 'mentee'} onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'report' && (() => {
        const rm = store.mentees.find(x => x.id === modal.menteeId)
        return rm ? <ReportView m={rm} store={store} onClose={() => setModal(null)} /> : null
      })()}
      {modal?.kind === 'menteeLogin' && (
        <MenteeLoginForm menteeId={modal.menteeId} menteeName={modal.menteeName} onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'reward' && (
        <RewardForm initial={modal.reward} onSave={api.upReward} onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'call' && (
        <CallForm initial={modal.call} mentees={store.mentees} team={store.team}
          defaults={{ menteeId: modal.menteeId }} onSave={api.upCall} onClose={() => setModal(null)} />
      )}
    </div>
  )
}

// ---------- Seleção de perfil do mentorado ----------
function LoginView({ mentees, onLogin }: { mentees: Mentee[]; onLogin: (id: string) => void }) {
  return (
    <div className="login-wrap page-enter">
      <div className="login-card">
        <div className="brand-mark" style={{ width: 44, height: 44, fontSize: 20, margin: '0 auto' }}>A</div>
        <div className="display" style={{ fontSize: 24, marginTop: 18, textAlign: 'center' }}>Área do mentorado</div>
        <div className="muted" style={{ textAlign: 'center', marginTop: 8, fontSize: 13.5 }}>
          Selecione o perfil para entrar na jornada.
        </div>
        <div className="login-people">
          {mentees.map(p => (
            <button key={p.id} className="login-person" onClick={() => onLogin(p.id)}>
              <Avatar m={p} size={44} fontSize={14} />
              <span>{p.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------- Advisor: Overview ----------
function Overview({ store, onOpen }: { store: Store; onOpen: (id: string) => void }) {
  const { mentees } = store
  const totalXp = mentees.reduce((s, m) => s + actionXp(m), 0)
  const allActions = mentees.flatMap(m => activeBlocks(m).flatMap(b => b.actions))
  const doneActions = allActions.filter(a => a.status === 'done').length
  const avgExec = Math.round((doneActions / Math.max(1, allActions.length)) * 100)
  const atRisk = mentees.filter(m => menteeHealth(m, store.checkins).status !== 'ok')

  const mSales = store.sales.filter(s => s.month === CURRENT_MONTH)
  const sum = salesSummary(mSales)
  const mCamps = store.campaigns.filter(c => c.month === CURRENT_MONTH)
  const leads = mCamps.reduce((s, c) => s + c.leads, 0)
  const vendas = mCamps.reduce((s, c) => s + campaignCalc(c).sales, 0)
  const conv = leads ? (vendas / leads) * 100 : 0

  return (
    <>
      <div className="topbar"><h1>Visão geral <span className="crumb">· {ADVISOR.program}</span></h1>
        <div className="topbar-right"><span className="chip">05 jul 2026</span><div className="avatar" style={{ width: 34, height: 34, fontSize: 12 }}>ES</div></div>
      </div>
      <div className="content page-enter">
        <div className="eyebrow">Bom dia, {ADVISOR.name.split(' ')[0]}</div>
        <div className="display" style={{ marginTop: 8 }}>Seus mentorados, num só lugar.</div>

        <div className="grid g-4 stagger" style={{ marginTop: 26 }}>
          <div className="card">
            <div className="stat-label">Mentorados ativos</div>
            <div className="stat-value">{mentees.length}</div>
            <div className="stat-sub">no programa</div>
          </div>
          <div className="card">
            <div className="stat-label">Execução média</div>
            <div className="stat-value">{avgExec}<small>%</small></div>
            <div className="stat-sub">{doneActions} de {allActions.length} ações concluídas</div>
          </div>
          <div className="card">
            <div className="stat-label">XP distribuído</div>
            <div className="stat-value" style={{ color: 'var(--accent)' }}>{totalXp}</div>
            <div className="stat-sub">pontos de execução no período</div>
          </div>
          <div className="card">
            <div className="stat-label">Precisam de atenção</div>
            <div className="stat-value" style={{ color: atRisk.length ? '#f0b36a' : 'var(--good)' }}>{atRisk.length}</div>
            <div className="stat-sub">{atRisk.length ? atRisk.map(m => m.name.split(' ')[0]).join(', ') : 'todos em dia'}</div>
          </div>
        </div>

        <div className="section">
          <div className="grid g-2">
            <InsightsCard store={store} />
            <RankingCard store={store} />
          </div>
        </div>

        <div className="section">
          <div className="section-head"><div className="h2">Comercial · {monthFull(CURRENT_MONTH)}</div></div>
          <div className="grid g-4 stagger">
            <div className="card">
              <div className="stat-label">Receita do mês</div>
              <div className="stat-value" style={{ fontSize: 24 }}>{fmtBRL(sum.revenue)}</div>
              <div className="stat-sub">{sum.units} vendas registradas</div>
            </div>
            <div className="card">
              <div className="stat-label">Receita high ticket</div>
              <div className="stat-value" style={{ fontSize: 24, color: 'var(--accent)' }}>{fmtBRL(sum.htRevenue)}</div>
              <div className="stat-sub">{Math.round(sum.htShare * 100)}% da receita do mês</div>
            </div>
            <div className="card">
              <div className="stat-label">Leads geradas</div>
              <div className="stat-value" style={{ fontSize: 24 }}>{leads}</div>
              <div className="stat-sub">{mCamps.length} campanhas no mês</div>
            </div>
            <div className="card">
              <div className="stat-label">Conversão em vendas</div>
              <div className="stat-value" style={{ fontSize: 24 }}>{conv.toFixed(1)}<small>%</small></div>
              <div className="stat-sub">{vendas} vendas via campanhas</div>
            </div>
          </div>
        </div>

        <div className="section">
          <div className="section-head">
            <div className="h2">Mentorados</div>
            {mentees.length > 0 && <button className="btn ghost" onClick={() => onOpen(mentees[0].id)}>Abrir primeiro →</button>}
          </div>
          <div className="mentee-grid stagger">
            {mentees.map(m => <MenteeCard key={m.id} m={m} store={store} onOpen={() => onOpen(m.id)} />)}
          </div>
        </div>
      </div>
    </>
  )
}

// ---------- Advisor: Mentees list ----------
function MenteesList({ store, api, onOpen }: { store: Store; api: Api; onOpen: (id: string) => void }) {
  const { mentees } = store
  return (
    <>
      <div className="topbar"><h1>Mentorados</h1>
        <div className="topbar-right"><span className="chip">{mentees.length} ativos</span></div>
      </div>
      <div className="content page-enter">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div className="eyebrow">Programa ADVISOR</div>
            <div className="display" style={{ marginTop: 8 }}>Quem você está acompanhando</div>
          </div>
          <button className="btn" onClick={() => api.open({ kind: 'mentee' })}>＋ Novo mentorado</button>
        </div>
        <div className="mentee-grid stagger" style={{ marginTop: 26 }}>
          {mentees.map(m => <MenteeCard key={m.id} m={m} store={store} onOpen={() => onOpen(m.id)} />)}
        </div>
      </div>
    </>
  )
}

// ---------- Shared pillar scores ----------
function PillarScores({ m }: { m: Mentee }) {
  return (
    <div className="radar-legend">
      {PILLARS.map(p => {
        const sc = m.scores[p.id]
        const delta = sc.current - sc.baseline
        return (
          <div key={p.id} className="li">
            <span className="pillar-dot" style={{ background: pcolor(p.hue) }} />
            <span>{p.label}</span>
            <span className="val">
              {sc.current.toFixed(0)}/10
              {delta > 0 && <span style={{ color: 'var(--good)', marginLeft: 6 }}>+{delta}</span>}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ---------- Sessão (timeline item) ----------
function SessionItem({ s, store }: { s: Session; store: Store }) {
  const who = sessionWho(store, s.withId)
  return (
    <div className="tl-item">
      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <div className="tl-date">{fmtDate(s.date)}</div>
        <span className={`tag ${who.label === 'Mentor' ? '' : 'good'}`} style={{ fontSize: 10 }}>{who.label} · {who.name}</span>
      </div>
      <div className="tl-title">{s.title}</div>
      <div className="tl-notes">{s.notes}</div>
      <div className="tl-next">→ <span>{s.nextStep}</span></div>
    </div>
  )
}

// ---------- Advisor: Detail ----------
function Detail({ m, store, api, onBack, cloudMode, author }: { m: Mentee; store: Store; api: Api; onBack: () => void; cloudMode?: boolean; author: string }) {
  const xp = actionXp(m)
  const lv = levelForXp(xp)
  const prog = overallProgress(m)
  const streak = effectiveStreak(m, store.checkins)
  const squad = store.team.filter(t => t.menteeIds.includes(m.id))
  const blocks = activeBlocks(m)
  return (
    <>
      <div className="topbar"><h1><span className="crumb">Mentorados ·</span> {m.name}</h1>
        <div className="topbar-right"><span className="chip">{m.cycle}</span></div>
      </div>
      <div className="content page-enter">
        <button className="back" onClick={onBack}>← Voltar</button>

        <div className="hero-line">
          <Avatar m={m} size={60} fontSize={20} />
          <div style={{ flex: 1, minWidth: 260 }}>
            <div className="display" style={{ fontSize: 25 }}>{m.name}</div>
            <div className="muted" style={{ marginTop: 4 }}>{m.business} · {m.niche}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <span className="tag">{m.stage}</span>
              <span className="tag">{m.revenue}</span>
              <span className="level-pill"><span className="lv">Nv {lv.current.n}</span>{lv.current.name}</span>
              <span className="tag good">⟳ {streak} semanas</span>
              {m.onboardedAt
                ? <span className="tag good" title="Diagnóstico de onboarding concluído pelo mentorado">✓ Onboarding {fmtDate(m.onboardedAt)}</span>
                : <span className="tag warn" title="O mentorado ainda não fez o diagnóstico de onboarding">◔ Diagnóstico pendente</span>}
              {(() => {
                const a = accessInfo(m)
                return a ? <span className={`tag ${a.expired ? 'warn' : 'good'}`} title={`Acesso até ${fmtDate(a.endDate)}`}>
                  {a.expired ? '⌛ Acesso encerrado' : `⌛ ${a.daysLeft}d de acesso`}
                </span> : null
              })()}
              {squad.map(t => <span key={t.id} className="tag" title={t.role}>◈ {t.name.split(' ')[0]}</span>)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {cloudMode && (
              <button className="btn" onClick={() => api.open({ kind: 'menteeLogin', menteeId: m.id, menteeName: m.name })}>🔑 Criar acesso</button>
            )}
            <button className="btn ghost" onClick={() => api.open({ kind: 'report', menteeId: m.id })}>⎙ Relatório</button>
            <button className="btn ghost" onClick={() => api.open({ kind: 'cycle', menteeId: m.id })}>◼ Encerrar ciclo</button>
            <button className="btn ghost" onClick={() => api.open({ kind: 'mentee', mentee: m })}>✎ Editar</button>
            <button className="btn ghost" title="Remover mentorado"
              onClick={() => { if (confirm(`Remover ${m.name} do programa? Todos os dados dele serão apagados.`)) { api.delMentee(m.id); onBack() } }}>✕</button>
          </div>
        </div>

        <div className="card" style={{ marginTop: 22 }}>
          <div className="eyebrow">Objetivo do ciclo</div>
          <div style={{ fontSize: 16, marginTop: 8, fontWeight: 500, lineHeight: 1.5 }}>{m.macroGoal}</div>
        </div>

        <ProfileCard m={m} api={api} />

        <div style={{ marginTop: 16 }}>
          <InsightsCard store={store} menteeId={m.id} />
        </div>

        <div className="grid g-2" style={{ marginTop: 16 }}>
          <div className="card">
            <div className="section-head"><div className="h2">Maturidade por pilar</div><span className="mono muted-3" style={{ fontSize: 11 }}>base ·· atual</span></div>
            <div className="radar-wrap"><Radar m={m} /></div>
            <div className="divider" />
            <PillarScores m={m} />
          </div>
          <div className="card">
            <div className="h2" style={{ marginBottom: 16 }}>Progresso & gamificação</div>
            <div className="grid g-2">
              <div><div className="stat-label">XP total</div><div className="stat-value" style={{ color: 'var(--accent)', fontSize: 26 }}>{xp}</div></div>
              <div><div className="stat-label">Execução</div><div className="stat-value" style={{ fontSize: 26 }}>{Math.round(prog.pct * 100)}<small>%</small></div></div>
            </div>
            <div style={{ marginTop: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-3)', marginBottom: 8 }}>
                <span>Nível {lv.current.n} · {lv.current.name}</span>
                <span className="mono">{lv.next ? `faltam ${lv.toNext} XP p/ ${lv.next.name}` : 'nível máximo'}</span>
              </div>
              <div className="bar accent"><i style={{ width: `${lv.progress * 100}%` }} /></div>
            </div>
            <div className="divider" />
            <div className="eyebrow" style={{ marginBottom: 12 }}>Conquistas automáticas</div>
            <BadgesRow m={m} store={store} />
          </div>
        </div>

        {(m.cycleHistory?.length ?? 0) > 0 && (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="stat-label" style={{ marginBottom: 10 }}>Ciclos anteriores</div>
            {m.cycleHistory!.map(c => (
              <div key={c.id} className="redeem-row">
                <span style={{ fontWeight: 600 }}>{c.cycle}</span>
                <span className="mono muted-3" style={{ fontSize: 11.5 }}>encerrado em {fmtDate(c.closedAt)}</span>
                <span className="tag" style={{ marginLeft: 'auto' }}>{Math.round(c.execution * 100)}% executado</span>
                <span className="xp-chip">{c.xp} XP</span>
              </div>
            ))}
          </div>
        )}

        <div className="section">
          <div className="section-head">
            <div className="h2">Plano de ação</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn ghost" onClick={() => api.open({ kind: 'apply', menteeId: m.id })}>⚡ Aplicar playbook</button>
              <button className="btn ghost" onClick={() => api.open({ kind: 'block', menteeId: m.id })}>＋ Novo bloco</button>
            </div>
          </div>
          <div className="grid stagger">
            {blocks.length ? blocks.map(b => (
              <ActionBlockView key={b.id} block={b} interactive menteeId={m.id} api={api}
                onToggle={aId => api.toggleAction(m.id, aId, 'advisor')}
                onComment={a => api.open({ kind: 'comments', menteeId: m.id, blockId: b.id, actionId: a.id })}
                tools={{
                  onEditBlock: () => api.open({ kind: 'block', menteeId: m.id, block: b }),
                  onDelBlock: () => confirm(`Excluir o bloco "${b.title}" e suas ações?`) && api.delBlock(m.id, b.id),
                  onAddAction: () => api.open({ kind: 'action', menteeId: m.id, blockId: b.id }),
                  onEditAction: a => api.open({ kind: 'action', menteeId: m.id, blockId: b.id, action: a }),
                  onDelAction: a => confirm(`Excluir a ação "${a.title}"?`) && api.delAction(m.id, b.id, a.id),
                  onApprove: a => api.upAction(m.id, b.id, { ...a, status: 'done' }),
                  onReturn: a => api.upAction(m.id, b.id, { ...a, status: 'doing' }),
                }} />
            )) : <div className="empty">Nenhum bloco neste ciclo. Aplique um playbook ou crie o primeiro bloco.</div>}
          </div>
        </div>

        <MenteeCommercial m={m} store={store} api={api} editable />

        <RewardsSection m={m} store={store} api={api} canRedeem={false} canManage />

        <div className="section">
          <div className="grid g-2">
            <AgendaCard m={m} store={store} />
            <NotesCard m={m} api={api} />
          </div>
        </div>

        <CheckpointsSection m={m} api={api} author={author} />

        <div className="section">
          <div className="section-head">
            <div className="h2">Histórico de calls</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn ghost" onClick={() => api.open({ kind: 'call', menteeId: m.id })}>◷ Agendar call</button>
              <button className="btn ghost" onClick={() => api.open({ kind: 'session', menteeId: m.id })}>＋ Registrar call</button>
            </div>
          </div>
          <div className="timeline">
            {m.sessions.map(s => <SessionItem key={s.id} s={s} store={store} />)}
            {!m.sessions.length && <div className="empty">Nenhuma call registrada ainda.</div>}
          </div>
        </div>
      </div>
    </>
  )
}

// ---------- Mentee: Journey (gamified) ----------
function Journey({ m, store, api, onLogout }: { m: Mentee; store: Store; api: Api; onLogout: () => void }) {
  const [tab, setTab] = useState<PillarId | 'all'>('all')
  const xp = actionXp(m)
  const lv = levelForXp(xp)
  const prog = overallProgress(m)
  const streak = effectiveStreak(m, store.checkins)
  const blocks = (tab === 'all' ? activeBlocks(m) : activeBlocks(m).filter(b => b.pillar === tab))
  const nextStep = m.sessions[0]?.nextStep

  return (
    <>
      <div className="topbar"><h1>Minha jornada</h1>
        <div className="topbar-right">
          <AccessChip m={m} />
          <span className="chip">{m.cycle}</span>
          <Avatar m={m} size={34} fontSize={12} />
          <button className="btn ghost" style={{ padding: '7px 12px', fontSize: 12 }} onClick={onLogout}>Trocar perfil</button>
        </div>
      </div>
      <div className="content page-enter">
        <div className="journey-hero">
          <div style={{ display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
            <div className="ring" style={{ ['--p' as any]: lv.progress * 100 }}>
              <div style={{ textAlign: 'center' }}>
                <div className="rv">{lv.current.n}</div>
                <div className="rl">Nível</div>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div className="eyebrow">Olá, {m.name.split(' ')[0]}</div>
              <div className="display" style={{ fontSize: 26, marginTop: 6 }}>{lv.current.name}</div>
              <div className="muted" style={{ marginTop: 6 }}>
                {lv.next ? <>Faltam <b style={{ color: 'var(--accent)' }}>{lv.toNext} XP</b> para <b>{lv.next.name}</b></> : 'Você atingiu o nível máximo. Referência!'}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                <span className="level-pill"><span className="lv">XP</span>{xp}</span>
                <span className="tag good">⟳ {streak} semana{streak === 1 ? '' : 's'} seguidas</span>
                <span className="tag">{Math.round(prog.pct * 100)}% do ciclo</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <NextCallCard store={store} menteeId={m.id} />
        </div>

        {nextStep && (
          <div className="card" style={{ marginTop: 16, borderColor: 'rgba(78,201,138,0.25)', background: 'var(--good-dim)' }}>
            <div className="eyebrow" style={{ color: 'var(--good)' }}>Seu próximo passo combinado</div>
            <div style={{ fontSize: 15.5, marginTop: 8, fontWeight: 500 }}>{nextStep}</div>
          </div>
        )}

        <div className="section">
          <div className="section-head"><div className="h2">Meu plano de ação</div>
            <span className="muted-3" style={{ fontSize: 12 }}>entregas passam pela aprovação do mentor</span>
          </div>
          <div className="pill-tabs" style={{ marginBottom: 18 }}>
            <button className={`pill-tab ${tab === 'all' ? 'on' : ''}`} onClick={() => setTab('all')}>Todos</button>
            {PILLARS.map(p => (
              <button key={p.id} className={`pill-tab ${tab === p.id ? 'on' : ''}`} onClick={() => setTab(p.id)}>{p.short}</button>
            ))}
          </div>
          <div className="grid stagger">
            {blocks.length ? blocks.map(b => (
              <ActionBlockView key={b.id} block={b} interactive menteeId={m.id} api={api}
                onToggle={aId => api.toggleAction(m.id, aId, 'mentee')}
                onComment={a => api.open({ kind: 'comments', menteeId: m.id, blockId: b.id, actionId: a.id })} />
            )) : <div className="empty">Nenhum bloco neste pilar ainda.</div>}
          </div>
        </div>

        <MenteeCommercial m={m} store={store} api={api} editable={false} />

        <RewardsSection m={m} store={store} api={api} canRedeem canManage={false} />

        <div className="section">
          <div className="grid g-2">
            <div className="card">
              <div className="h2" style={{ fontSize: 16, marginBottom: 14 }}>Minhas conquistas</div>
              <BadgesRow m={m} store={store} />
            </div>
            <RankingCard store={store} highlightId={m.id} />
          </div>
        </div>

        <div className="section">
          <div className="h2" style={{ marginBottom: 16 }}>Minha evolução por pilar</div>
          <div className="card">
            <div style={{ display: 'flex', gap: 30, flexWrap: 'wrap', alignItems: 'center' }}>
              <div className="radar-wrap"><Radar m={m} /></div>
              <div style={{ flex: 1, minWidth: 240 }}><PillarScores m={m} /></div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
