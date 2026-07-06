// ============================================================
//  ADVISOR OS — Fase 2: camada de dados normalizada
//  (1 registro por mentorado + 1 registro shared + papéis/RLS)
//
//  Construído ao lado da Fase 1. Só entra em uso no "cutover".
// ============================================================
import { supabase } from './supabase'
import type {
  Store, Mentee, TeamMember, Playbook, SaleEntry, Campaign,
  MonthlyGoal, CheckIn, Redemption, Deal,
} from './data'

export type Role = 'advisor' | 'team' | 'mentee'

export interface Identity {
  userId: string
  email: string
  role: Role
  menteeId?: string      // quando role = 'mentee'
  configured: boolean    // false = login sem profile/mentee vinculado
}

// Fatia de um mentorado: seu registro + tudo que é dele
interface MenteeSlice {
  mentee: Mentee
  sales: SaleEntry[]
  campaigns: Campaign[]
  goals: MonthlyGoal[]
  checkins: CheckIn[]
  redemptions: Redemption[]
  deals: Deal[]
}
interface MenteeRow { id: string; data: MenteeSlice }
interface SharedData { team: TeamMember[]; playbooks: Playbook[] }

const STAFF: Role[] = ['advisor', 'team']
export const isStaff = (r: Role) => STAFF.includes(r)

// ---------- Identidade / papel ----------

export async function getIdentity(): Promise<Identity | null> {
  if (!supabase) return null
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const { data: profile, error } = await supabase
    .from('profiles').select('role, mentee_id').eq('user_id', session.user.id).maybeSingle()
  if (error) throw error  // tabela ausente → CloudRoot cai no fallback da Fase 1
  const role = (profile?.role as Role) ?? 'mentee'
  const menteeId = profile?.mentee_id ?? undefined
  // staff é configurado por ter profile; mentee precisa de mentee_id vinculado
  const configured = !!profile && (isStaff(role) ? true : !!menteeId)
  return { userId: session.user.id, email: session.user.email ?? '', role, menteeId, configured }
}

// ---------- Montar / repartir o Store ----------

function assembleStore(rows: MenteeRow[], shared: SharedData | null): Store {
  const pick = <T,>(f: (s: MenteeSlice) => T[] | undefined) => rows.flatMap(r => f(r.data) ?? [])
  return {
    mentees: rows.map(r => r.data.mentee).filter(Boolean),
    team: shared?.team ?? [],
    playbooks: shared?.playbooks ?? [],
    sales: pick(s => s.sales),
    campaigns: pick(s => s.campaigns),
    goals: pick(s => s.goals),
    checkins: pick(s => s.checkins),
    redemptions: pick(s => s.redemptions),
    deals: pick(s => s.deals),
  }
}

function sliceFor(store: Store, m: Mentee): MenteeSlice {
  const mine = <T extends { menteeId: string }>(arr: T[]) => arr.filter(x => x.menteeId === m.id)
  return {
    mentee: m,
    sales: mine(store.sales),
    campaigns: mine(store.campaigns),
    goals: mine(store.goals),
    checkins: mine(store.checkins),
    redemptions: mine(store.redemptions),
    deals: mine(store.deals),
  }
}

const sharedFrom = (store: Store): SharedData => ({ team: store.team, playbooks: store.playbooks })

// ---------- Load ----------

async function fetchShared(): Promise<SharedData | null> {
  const { data } = await supabase!.from('shared').select('data').eq('id', 'global').maybeSingle()
  return (data?.data as SharedData) ?? null
}

// Advisor/equipe: RLS entrega todas as linhas de mentorados
export async function loadForStaff(): Promise<Store | null> {
  if (!supabase) return null
  const [{ data: rows, error }, shared] = await Promise.all([
    supabase.from('mentees').select('id, data'),
    fetchShared(),
  ])
  if (error) throw error
  if (!rows) return null
  return assembleStore(rows as MenteeRow[], shared)
}

// Mentorado: RLS entrega só a própria linha
export async function loadForMentee(menteeId: string): Promise<Store | null> {
  if (!supabase) return null
  const [{ data: rows, error }, shared] = await Promise.all([
    supabase.from('mentees').select('id, data').eq('id', menteeId),
    fetchShared(),
  ])
  if (error) throw error
  return assembleStore((rows ?? []) as MenteeRow[], shared)
}

// ---------- Save ----------
// Não gravamos owner_user_id aqui (é gerido no provisionamento) —
// omitir a coluna no upsert preserva o valor existente.

export async function saveForStaff(store: Store): Promise<void> {
  if (!supabase) return
  const now = new Date().toISOString()
  const rows = store.mentees.map(m => ({ id: m.id, data: sliceFor(store, m), updated_at: now }))
  await Promise.all([
    supabase.from('mentees').upsert(rows),
    supabase.from('shared').upsert({ id: 'global', data: sharedFrom(store), updated_at: now }),
  ])
}

export async function saveForMentee(store: Store, menteeId: string): Promise<void> {
  if (!supabase) return
  const m = store.mentees.find(x => x.id === menteeId)
  if (!m) return
  await supabase.from('mentees').upsert({ id: m.id, data: sliceFor(store, m), updated_at: new Date().toISOString() })
}

// ---------- Migração única: workspace (Fase 1) → tabelas (Fase 2) ----------

export async function migrateFromWorkspace(store: Store): Promise<void> {
  if (!supabase) return
  // só migra se ainda não houver linhas de mentorados
  const { count } = await supabase.from('mentees').select('id', { count: 'exact', head: true })
  if ((count ?? 0) > 0) return
  await saveForStaff(store)
}

// ---------- Criar o login de um mentorado (via função serverless segura) ----------

export async function createMenteeLogin(
  menteeId: string, email: string, password: string,
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Nuvem não configurada.' }
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'Sessão expirada — entre novamente.' }
  try {
    const res = await fetch('/api/create-mentee-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ menteeId, email, password }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) return { error: json.error || `Erro ${res.status}` }
    return {}
  } catch (e: any) {
    return { error: e?.message || 'Falha de rede ao criar o acesso.' }
  }
}
