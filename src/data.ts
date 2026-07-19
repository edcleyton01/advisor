// ============================================================
//  ADVISOR OS — Modelo de dados + dados de exemplo (protótipo)
// ============================================================

export type PillarId = 'branding' | 'marketing' | 'sales' | 'products' | 'ai'

export interface Pillar {
  id: PillarId
  label: string
  short: string
  hue: number // matiz base para tints sutis
  description: string
}

export const PILLARS: Pillar[] = [
  { id: 'branding',  label: 'Branding & Posicionamento', short: 'Branding',  hue: 32,  description: 'Identidade, autoridade e percepção de valor no mercado.' },
  { id: 'marketing', label: 'Marketing',                  short: 'Marketing', hue: 265, description: 'Atração, audiência e geração de demanda previsível.' },
  { id: 'sales',     label: 'Vendas',                     short: 'Vendas',    hue: 145, description: 'Processo comercial, conversão e previsibilidade de receita.' },
  { id: 'products',  label: 'Produtos',                   short: 'Produtos',  hue: 200, description: 'Oferta, entrega e escada de valor do negócio.' },
  { id: 'ai',        label: 'Inteligência Artificial',    short: 'IA',        hue: 0,   description: 'Alavancagem, automação e escala com IA aplicada.' },
]

export const pillarById = (id: PillarId) => PILLARS.find(p => p.id === id)!

// Programas/categorias em uso (distintos, ordenados) — alimenta o campo
// com sugestões no cadastro, sem precisar de um cadastro separado.
export const categoriesInUse = (mentees: { category?: string }[]): string[] =>
  [...new Set(mentees.map(m => m.category?.trim()).filter((c): c is string => !!c))].sort()

// ---------- Gamificação ----------

export interface Level {
  n: number
  name: string
  minXp: number
}

// Trilha de níveis do mentorado
export const LEVELS: Level[] = [
  { n: 1, name: 'Iniciante',    minXp: 0 },
  { n: 2, name: 'Explorador',   minXp: 300 },
  { n: 3, name: 'Estrategista', minXp: 800 },
  { n: 4, name: 'Executor',     minXp: 1500 },
  { n: 5, name: 'Autoridade',   minXp: 2600 },
  { n: 6, name: 'Referência',   minXp: 4200 },
]

export function levelForXp(xp: number) {
  let current = LEVELS[0]
  for (const l of LEVELS) if (xp >= l.minXp) current = l
  const next = LEVELS.find(l => l.minXp > xp)
  const floor = current.minXp
  const ceil = next ? next.minXp : current.minXp
  const progress = next ? (xp - floor) / (ceil - floor) : 1
  return { current, next, progress: Math.max(0, Math.min(1, progress)), toNext: next ? next.minXp - xp : 0 }
}

// 'review' = mentorado entregou e aguarda aprovação do mentor/guardião
export type ActionStatus = 'todo' | 'doing' | 'review' | 'done'

export interface Comment {
  id: string
  author: string
  role: 'advisor' | 'mentee'
  text: string
  date: string // ISO
}

// Anexo de evidência (arquivo no Supabase Storage)
export interface Attachment {
  id: string
  path: string        // caminho no bucket
  name: string
  size: number
  uploadedAt: string  // ISO
}

export interface Action {
  id: string
  title: string
  xp: number
  status: ActionStatus
  due: string // ISO
  evidence?: string // link/nota de entrega
  comments?: Comment[]
  attachments?: Attachment[]
}

export interface ActionBlock {
  id: string
  pillar: PillarId
  title: string
  period: string // ex.: "Ciclo 1 · Semanas 1-2"
  rewardLabel: string
  rewardXp: number // bônus ao concluir o bloco inteiro
  actions: Action[]
  archived?: boolean // pertence a um ciclo encerrado (mantém XP, sai do plano ativo)
}

export interface Badge {
  id: string
  label: string
  pillar?: PillarId
  icon: string // glifo simples
  earned: boolean
  hint: string
}

export interface Session {
  id: string
  date: string // ISO
  title: string
  notes: string
  nextStep: string
  withId?: string // 'advisor' ou id do membro da equipe (guardião/monitor) que conduziu a call
}

// Snapshot de um ciclo encerrado (re-diagnóstico)
export interface CycleSnapshot {
  id: string
  cycle: string
  closedAt: string // ISO
  execution: number // 0-1
  xp: number
  scores: Record<PillarId, { baseline: number; current: number }>
}

// ============================================================
//  Configurações do sistema (aba Administração — só o advisor)
//  Vivem no registro `shared`: valem para equipe e mentorados.
// ============================================================

export type AccentId = 'amber' | 'emerald' | 'blue' | 'violet' | 'rose'

export const ACCENTS: { id: AccentId; label: string; color: string; dim: string }[] = [
  { id: 'amber',   label: 'Âmbar',     color: '#e8b34a', dim: 'rgba(232,179,74,0.14)' },
  { id: 'emerald', label: 'Esmeralda', color: '#4ec98a', dim: 'rgba(78,201,138,0.14)' },
  { id: 'blue',    label: 'Azul',      color: '#6ea8f7', dim: 'rgba(110,168,247,0.14)' },
  { id: 'violet',  label: 'Violeta',   color: '#a78bf5', dim: 'rgba(167,139,245,0.14)' },
  { id: 'rose',    label: 'Rosé',      color: '#f08bb0', dim: 'rgba(240,139,176,0.14)' },
]

export interface AppSettings {
  appName: string
  tagline: string  // slogan sob o nome na barra lateral
  logo?: string     // data URL (quadrada, redimensionada no upload)
  favicon?: string  // data URL
  accent: AccentId
  notifications: {
    calls: boolean    // lembretes de call na Central de Alertas
    checkins: boolean // alertas de check-in atrasado
    badge: boolean    // contador vermelho no menu Alertas
  }
}

export const defaultSettings = (): AppSettings => ({
  appName: 'ADVISOR OS',
  tagline: 'acompanhamento',
  accent: 'amber',
  notifications: { calls: true, checkins: true, badge: true },
})

// normaliza um settings vindo de fora (parcial/corrompido → completo)
export function ensureSettings(s: any): AppSettings {
  const d = defaultSettings()
  if (!s || typeof s !== 'object') return d
  return {
    appName: typeof s.appName === 'string' && s.appName.trim() ? s.appName.slice(0, 40) : d.appName,
    tagline: typeof s.tagline === 'string' && s.tagline.trim() ? s.tagline.slice(0, 60) : d.tagline,
    logo: typeof s.logo === 'string' ? s.logo : undefined,
    favicon: typeof s.favicon === 'string' ? s.favicon : undefined,
    accent: ACCENTS.some(a => a.id === s.accent) ? s.accent : d.accent,
    notifications: {
      calls: s.notifications?.calls !== false,
      checkins: s.notifications?.checkins !== false,
      badge: s.notifications?.badge !== false,
    },
  }
}

// ============================================================
//  Checkpoints — histórico interno de acompanhamento (SÓ EQUIPE)
//  Nunca viaja no payload do mentorado: vive em mentees_private.
// ============================================================

export type CheckpointKind = 'scheduled' | 'done' | 'rescheduled' | 'canceled' | 'note'

export const CHECKPOINT_KINDS: { id: CheckpointKind; label: string; icon: string; tone: 'good' | 'warn' | 'bad' | '' }[] = [
  { id: 'scheduled',   label: 'Agendado',   icon: '◷', tone: '' },
  { id: 'done',        label: 'Realizado',  icon: '✓', tone: 'good' },
  { id: 'rescheduled', label: 'Reagendado', icon: '↷', tone: 'warn' },
  { id: 'canceled',    label: 'Cancelado',  icon: '✕', tone: 'bad' },
  { id: 'note',        label: 'Observação', icon: '✎', tone: '' },
]
export const checkpointKind = (k: CheckpointKind) => CHECKPOINT_KINDS.find(x => x.id === k)!

export interface CheckpointFile { id: string; path: string; name: string; size: number }

export interface Checkpoint {
  id: string
  date: string          // data do evento (ISO)
  kind: CheckpointKind
  text: string
  author?: string       // quem registrou
  files?: CheckpointFile[]
  createdAt: string     // quando foi registrado (ISO)
}

// ============================================================
//  Materiais complementares (PDF/RAR/ZIP) — equipe publica,
//  mentorado baixa. Metadados no `shared`; arquivo no bucket
//  'materials' (leitura: qualquer logado; escrita: só staff).
// ============================================================

export interface Material {
  id: string
  title: string
  description?: string
  category?: string   // programa alvo; vazio = todos os mentorados
  fileName: string
  path: string        // caminho no bucket 'materials'
  size: number
  uploadedAt: string  // ISO
  author?: string
}

// o que um mentorado enxerga: materiais gerais + os do programa dele
export const materialsVisibleTo = (materials: Material[], menteeCategory?: string): Material[] =>
  materials.filter(mt => !mt.category?.trim() || mt.category.trim() === menteeCategory?.trim())

export interface SocialLinks { instagram?: string; youtube?: string; linkedin?: string; tiktok?: string }

// Redes suportadas no cadastro: aceita @handle ou URL completa
export const SOCIAL_META: { id: keyof SocialLinks; label: string; base: string }[] = [
  { id: 'instagram', label: 'Instagram', base: 'https://instagram.com/' },
  { id: 'youtube',   label: 'YouTube',   base: 'https://youtube.com/@' },
  { id: 'linkedin',  label: 'LinkedIn',  base: 'https://linkedin.com/in/' },
  { id: 'tiktok',    label: 'TikTok',    base: 'https://tiktok.com/@' },
]

export function socialUrl(kind: keyof SocialLinks, value: string): string {
  const v = value.trim()
  if (/^https?:\/\//i.test(v)) return v
  const handle = v.replace(/^@/, '')
  return SOCIAL_META.find(s => s.id === kind)!.base + handle
}

export interface Mentee {
  id: string
  name: string
  initials: string
  photo?: string    // foto de perfil (data URL, redimensionada no upload)
  jobTitle?: string // cargo na empresa
  category?: string // programa ADVISOR ao qual pertence (ex.: Elevation)
  email?: string
  phone?: string
  socials?: SocialLinks
  business: string
  niche: string
  revenue: string
  stage: string
  macroGoal: string
  startDate: string
  cycle: string
  streak: number // semanas consecutivas executando
  scores: Record<PillarId, { baseline: number; current: number }> // 0-10
  blocks: ActionBlock[]
  badges: Badge[]
  sessions: Session[]
  cycleHistory?: CycleSnapshot[]
  privateNotes?: string // visível apenas para advisor/equipe
  checkpoints?: Checkpoint[] // histórico interno de acompanhamento — SÓ EQUIPE (vive em mentees_private)
  onboardedAt?: string  // quando o mentorado concluiu o diagnóstico de onboarding
  accessUntil?: string  // até quando o mentorado tem acesso ao programa (ISO)
}

// ---------- Helpers de cálculo ----------

export function actionXp(m: Mentee): number {
  return m.blocks.reduce((sum, b) => {
    const done = b.actions.filter(a => a.status === 'done')
    const base = done.reduce((s, a) => s + a.xp, 0)
    const blockDone = b.actions.length > 0 && done.length === b.actions.length
    return sum + base + (blockDone ? b.rewardXp : 0)
  }, 0)
}

export function blockProgress(b: ActionBlock) {
  const done = b.actions.filter(a => a.status === 'done').length
  return { done, total: b.actions.length, pct: b.actions.length ? done / b.actions.length : 0 }
}

// Blocos do ciclo atual (ignora ciclos encerrados)
export const activeBlocks = (m: Mentee) => m.blocks.filter(b => !b.archived)

export function overallProgress(m: Mentee) {
  const all = activeBlocks(m).flatMap(b => b.actions)
  const done = all.filter(a => a.status === 'done').length
  return { done, total: all.length, pct: all.length ? done / all.length : 0 }
}

// ============================================================
//  Quiz de onboarding — autodiagnóstico por pilar
// ============================================================

export interface QuizQuestion { id: string; pillar: PillarId; text: string }

// Escala de concordância 0–4 (maior = mais maduro)
export const QUIZ_SCALE = ['Discordo totalmente', 'Discordo', 'Neutro', 'Concordo', 'Concordo totalmente']

export const QUIZ: QuizQuestion[] = [
  { id: 'q_b1', pillar: 'branding',  text: 'Tenho uma proposta de valor clara que me diferencia dos concorrentes.' },
  { id: 'q_b2', pillar: 'branding',  text: 'Meu público sabe exatamente para quem eu sirvo e o que entrego.' },
  { id: 'q_b3', pillar: 'branding',  text: 'Minha marca transmite autoridade (site, redes e materiais consistentes).' },
  { id: 'q_m1', pillar: 'marketing', text: 'Gero demanda de forma previsível, sem depender só de indicação.' },
  { id: 'q_m2', pillar: 'marketing', text: 'Publico conteúdo com constância e uma linha editorial definida.' },
  { id: 'q_m3', pillar: 'marketing', text: 'Tenho uma isca/oferta que captura contatos qualificados.' },
  { id: 'q_s1', pillar: 'sales',     text: 'Tenho um processo comercial definido — não vendo no improviso.' },
  { id: 'q_s2', pillar: 'sales',     text: 'Sei minha taxa de conversão e acompanho meu funil de perto.' },
  { id: 'q_s3', pillar: 'sales',     text: 'Tenho um método claro para conduzir e fechar reuniões de venda.' },
  { id: 'q_p1', pillar: 'products',  text: 'Minha oferta está organizada em uma escada de valor clara.' },
  { id: 'q_p2', pillar: 'products',  text: 'Tenho um produto high ticket bem definido e posicionado.' },
  { id: 'q_p3', pillar: 'products',  text: 'Minha entrega é padronizada e escalável — não depende só de mim.' },
  { id: 'q_a1', pillar: 'ai',        text: 'Uso IA para ganhar tempo em tarefas repetitivas do negócio.' },
  { id: 'q_a2', pillar: 'ai',        text: 'Tenho processos automatizados que rodam sem eu tocar.' },
  { id: 'q_a3', pillar: 'ai',        text: 'Sei onde a IA pode alavancar meu resultado no próximo passo.' },
]

// Primeira ação fundamental de cada pilar (base do plano de onboarding)
export const ONBOARDING_ACTIONS: Record<PillarId, { title: string; xp: number }> = {
  branding:  { title: 'Escrever sua proposta única de valor (PUV) em 1 frase', xp: 40 },
  marketing: { title: 'Definir seus 3 pilares de conteúdo e uma isca de captura', xp: 50 },
  sales:     { title: 'Mapear seu funil atual e escrever um roteiro de reunião', xp: 50 },
  products:  { title: 'Organizar suas ofertas em uma escada de valor com o high ticket no topo', xp: 60 },
  ai:        { title: 'Listar 3 tarefas repetitivas e testar a IA em uma delas', xp: 40 },
}

// Calcula o score 0–10 por pilar a partir das respostas
export function quizScores(answers: Record<string, number>): Record<PillarId, number> {
  const out = {} as Record<PillarId, number>
  for (const p of PILLARS) {
    const vals = QUIZ.filter(q => q.pillar === p.id).map(q => answers[q.id]).filter(v => v !== undefined)
    out[p.id] = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length / 4) * 10) : 0
  }
  return out
}

// Monta o bloco "Plano de Onboarding" priorizando os pilares mais fracos
export function buildOnboardingBlock(scores: Record<PillarId, number>, idGen: () => string): ActionBlock {
  const ranked = [...PILLARS].sort((a, b) => scores[a.id] - scores[b.id])
  const weak = ranked.filter(p => scores[p.id] < 7)
  const chosen = (weak.length >= 2 ? weak : ranked.slice(0, 2)).slice(0, 5)
  const base = new Date()
  const actions: Action[] = chosen.map((p, i) => {
    const due = new Date(base); due.setDate(due.getDate() + (i + 1) * 3)
    return { id: idGen(), title: ONBOARDING_ACTIONS[p.id].title, xp: ONBOARDING_ACTIONS[p.id].xp, status: 'todo', due: isoLocal(due) }
  })
  return {
    id: idGen(), pillar: chosen[0].id, title: 'Plano de Onboarding',
    period: 'Início · primeiras 2 semanas',
    rewardLabel: 'Desbloqueia: primeira mentoria de alinhamento', rewardXp: 100, actions,
  }
}

// ---------- Dados de exemplo ----------

const d = (s: string) => s // apenas legibilidade das datas ISO

export const MENTEES: Mentee[] = [
  {
    id: 'ana',
    name: 'Ana Beatriz Lemos',
    initials: 'AL',
    jobTitle: 'Fundadora & CEO',
    email: 'ana@lemosconsultoria.com.br',
    phone: '(11) 98765-4321',
    socials: { instagram: '@analemos.consultoria', linkedin: 'ana-beatriz-lemos', youtube: '@analemos' },
    category: 'Elevation',
    checkpoints: [
      { id: 'cp3', date: d('2026-07-08'), kind: 'done', text: 'Checkpoint realizado. Ana trouxe os números do funil de cases; definimos os 3 estudos prioritários.', author: 'Marina', createdAt: d('2026-07-08') },
      { id: 'cp2', date: d('2026-07-08'), kind: 'rescheduled', text: 'Ana pediu remarcação (viagem a SP). Reagendado de 01/07 → 08/07, mesma pauta.', author: 'Julia', createdAt: d('2026-06-30') },
      { id: 'cp1', date: d('2026-07-01'), kind: 'scheduled', text: 'Checkpoint de meio de ciclo agendado. Pauta: revisão do funil de cases + metas de julho.', author: 'Julia', createdAt: d('2026-06-25') },
    ],
    business: 'Lemos Consultoria · Estratégia Comercial',
    niche: 'Consultoria high ticket para PMEs',
    revenue: 'R$ 85k/mês',
    stage: 'Escalando',
    macroGoal: 'Consolidar autoridade nacional e fechar 2 projetos de consultoria por mês sem depender de indicações.',
    startDate: d('2026-04-01'),
    accessUntil: d('2026-10-01'),
    cycle: 'Ciclo 1 · Fundação',
    streak: 5,
    scores: {
      branding:  { baseline: 4, current: 7 },
      marketing: { baseline: 3, current: 6 },
      sales:     { baseline: 5, current: 6 },
      products:  { baseline: 6, current: 8 },
      ai:        { baseline: 2, current: 5 },
    },
    badges: [
      { id: 'b1', label: 'Primeiro Bloco', icon: '◆', earned: true,  hint: 'Concluiu o primeiro bloco de ações.' },
    ],
    sessions: [
      { id: 's1', date: d('2026-06-28'), title: 'Mentoria 05 · Revisão de posicionamento', notes: 'Ana validou a nova headline e o manifesto da marca. Cases reorganizados por segmento de cliente.', nextStep: 'Publicar 3 estudos de caso no novo formato.', withId: 'advisor' },
      { id: 's1b', date: d('2026-06-21'), title: 'Check de execução · Guardião', notes: 'Julia revisou o cronograma de conteúdo e destravou a automação de follow-up.', nextStep: 'Subir a automação até quarta.', withId: 't3' },
      { id: 's2', date: d('2026-06-14'), title: 'Mentoria 04 · Estrutura de oferta', notes: 'Desenhamos a escada de valor: diagnóstico → projeto de consultoria → retainer de acompanhamento.', nextStep: 'Precificar o retainer de acompanhamento.', withId: 'advisor' },
    ],
    blocks: [
      {
        id: 'k1', pillar: 'branding', title: 'Fundamentos de Posicionamento', period: 'Ciclo 1 · Semanas 1-2',
        rewardLabel: 'Desbloqueia: Template de Manifesto de Marca', rewardXp: 120,
        actions: [
          { id: 'a1', title: 'Definir público-alvo e persona premium', xp: 40, status: 'done', due: d('2026-04-08'), evidence: 'Doc de persona v2' },
          { id: 'a2', title: 'Escrever proposta única de valor (PUV)', xp: 50, status: 'done', due: d('2026-04-12'), evidence: 'Headline aprovada' },
          { id: 'a3', title: 'Redesenhar bio e capa das redes', xp: 30, status: 'done', due: d('2026-04-15') },
        ],
      },
      {
        id: 'k2', pillar: 'marketing', title: 'Motor de Conteúdo & Autoridade', period: 'Ciclo 1 · Semanas 3-4',
        rewardLabel: 'Desbloqueia: Calendário editorial 30 dias', rewardXp: 120,
        actions: [
          { id: 'a4', title: 'Definir 3 pilares de conteúdo', xp: 40, status: 'done', due: d('2026-04-22') },
          { id: 'a5', title: 'Publicar 8 conteúdos de autoridade no mês', xp: 60, status: 'doing', due: d('2026-04-30') },
          { id: 'a6', title: 'Configurar captação de leads (diagnóstico gratuito)', xp: 50, status: 'todo', due: d('2026-05-05') },
        ],
      },
      {
        id: 'k3', pillar: 'ai', title: 'IA Aplicada à Consultoria', period: 'Ciclo 1 · Semanas 5-6',
        rewardLabel: 'Desbloqueia: Biblioteca de prompts do nicho', rewardXp: 150,
        actions: [
          { id: 'a7', title: 'Criar assistente de diagnóstico com IA', xp: 60, status: 'doing', due: d('2026-05-12') },
          { id: 'a8', title: 'Automatizar follow-up de propostas', xp: 60, status: 'todo', due: d('2026-05-16') },
          { id: 'a9', title: 'Gerar propostas comerciais com IA', xp: 40, status: 'todo', due: d('2026-05-20') },
        ],
      },
    ],
  },
  {
    id: 'rafael',
    category: 'Elevation',
    name: 'Rafael Nunes',
    initials: 'RN',
    business: 'Nunes Digital · Infoprodutos',
    niche: 'Educação financeira para autônomos',
    revenue: 'R$ 25k/mês',
    stage: 'Estruturando',
    macroGoal: 'Escalar com funil perpétuo e turmas trimestrais, mantendo a mentoria 1:1 como topo high ticket.',
    startDate: d('2026-05-01'),
    accessUntil: d('2026-11-01'),
    cycle: 'Ciclo 1 · Fundação',
    streak: 2,
    scores: {
      branding:  { baseline: 5, current: 6 },
      marketing: { baseline: 4, current: 5 },
      sales:     { baseline: 3, current: 5 },
      products:  { baseline: 2, current: 4 },
      ai:        { baseline: 3, current: 4 },
    },
    badges: [
      { id: 'b1', label: 'Primeiro Bloco', icon: '◆', earned: true, hint: 'Concluiu o primeiro bloco de ações.' },
    ],
    sessions: [
      { id: 's1', date: d('2026-06-30'), title: 'Mentoria 03 · Desenho da formação', notes: 'Mapeamos a transformação do aluno. Definimos formato híbrido (curso gravado + encontros ao vivo).', nextStep: 'Escrever a promessa central da formação.', withId: 'advisor' },
    ],
    blocks: [
      {
        id: 'k1', pillar: 'products', title: 'Arquitetura do Produto Escalável', period: 'Ciclo 1 · Semanas 1-2',
        rewardLabel: 'Desbloqueia: Framework de escada de valor', rewardXp: 120,
        actions: [
          { id: 'a1', title: 'Mapear a transformação do aluno', xp: 40, status: 'done', due: d('2026-05-08') },
          { id: 'a2', title: 'Definir formato e entregáveis da formação', xp: 50, status: 'done', due: d('2026-05-12') },
          { id: 'a3', title: 'Precificar as 3 ofertas da escada', xp: 40, status: 'doing', due: d('2026-05-16') },
        ],
      },
      {
        id: 'k2', pillar: 'sales', title: 'Processo Comercial Previsível', period: 'Ciclo 1 · Semanas 3-4',
        rewardLabel: 'Desbloqueia: Script de call de diagnóstico', rewardXp: 130,
        actions: [
          { id: 'a4', title: 'Montar funil no CRM', xp: 40, status: 'todo', due: d('2026-05-22') },
          { id: 'a5', title: 'Criar script de qualificação', xp: 50, status: 'todo', due: d('2026-05-26') },
          { id: 'a6', title: 'Fazer 10 calls de diagnóstico', xp: 70, status: 'todo', due: d('2026-06-02') },
        ],
      },
    ],
  },
  {
    id: 'carol',
    category: 'Advisor Start',
    name: 'Carolina Dias',
    initials: 'CD',
    business: 'Clínica Dias · Nutrologia',
    niche: 'Consultas e protocolos de saúde metabólica',
    revenue: 'R$ 14k/mês',
    stage: 'Início',
    macroGoal: 'Sair da agenda lotada de consultas avulsas e migrar para protocolos de acompanhamento high ticket.',
    startDate: d('2026-06-01'),
    accessUntil: d('2026-12-01'),
    cycle: 'Ciclo 1 · Fundação',
    streak: 1,
    scores: {
      branding:  { baseline: 3, current: 4 },
      marketing: { baseline: 2, current: 3 },
      sales:     { baseline: 3, current: 3 },
      products:  { baseline: 5, current: 6 },
      ai:        { baseline: 1, current: 2 },
    },
    badges: [
      { id: 'b1', label: 'Primeiro Bloco', icon: '◆', earned: false, hint: 'Conclua o primeiro bloco de ações.' },
    ],
    sessions: [
      { id: 's1', date: d('2026-06-20'), title: 'Mentoria 01 · Diagnóstico inicial', notes: 'Mapeamos os 5 pilares. Prioridade em posicionamento e oferta para vender protocolos em vez de consultas avulsas.', nextStep: 'Desenhar o protocolo de acompanhamento premium.', withId: 'advisor' },
    ],
    blocks: [
      {
        id: 'k1', pillar: 'branding', title: 'Posicionamento da Especialista', period: 'Ciclo 1 · Semanas 1-2',
        rewardLabel: 'Desbloqueia: Kit de autoridade médica', rewardXp: 110,
        actions: [
          { id: 'a1', title: 'Definir promessa e diferencial da clínica', xp: 40, status: 'done', due: d('2026-06-08') },
          { id: 'a2', title: 'Estruturar apresentação do protocolo premium', xp: 30, status: 'doing', due: d('2026-06-12') },
          { id: 'a3', title: 'Padronizar materiais e jornada do paciente', xp: 40, status: 'todo', due: d('2026-06-16') },
        ],
      },
    ],
  },
  {
    id: 'bruno',
    category: 'Advisor Start',
    name: 'Bruno Tavares',
    initials: 'BT',
    business: 'Tavares & Co · Agência de Marketing',
    niche: 'Serviços B2B em contratos recorrentes',
    revenue: 'R$ 38k/mês',
    stage: 'Estruturando',
    macroGoal: 'Reposicionar a agência para contratos anuais high ticket e sair da guerra de preço por job avulso.',
    startDate: d('2026-05-15'),
    accessUntil: d('2026-11-15'),
    cycle: 'Ciclo 1 · Fundação',
    streak: 3,
    scores: {
      branding:  { baseline: 4, current: 6 },
      marketing: { baseline: 6, current: 7 },
      sales:     { baseline: 4, current: 5 },
      products:  { baseline: 3, current: 5 },
      ai:        { baseline: 4, current: 6 },
    },
    badges: [
      { id: 'b1', label: 'Primeiro Bloco', icon: '◆', earned: true, hint: 'Concluiu o primeiro bloco de ações.' },
    ],
    sessions: [
      { id: 's1', date: d('2026-06-25'), title: 'Mentoria 02 · Oferta de contrato anual', notes: 'Desenhamos o pacote anual: fee mensal + implantação de IA como bônus de entrada.', nextStep: 'Apresentar o novo contrato para 3 clientes atuais.', withId: 'advisor' },
      { id: 's2', date: d('2026-06-18'), title: 'Check de execução · Guardião', notes: 'Pedro revisou o pipeline e definiu critérios de qualificação para contratos anuais.', nextStep: 'Atualizar os deals no pipeline com os novos critérios.', withId: 't2' },
    ],
    blocks: [
      {
        id: 'k1', pillar: 'sales', title: 'Reposicionamento de Oferta e Contratos', period: 'Ciclo 1 · Semanas 1-2',
        rewardLabel: 'Desbloqueia: modelo de contrato anual', rewardXp: 130,
        actions: [
          { id: 'a1', title: 'Mapear margem por cliente atual', xp: 40, status: 'done', due: d('2026-05-22'), evidence: 'Planilha de margens' },
          { id: 'a2', title: 'Desenhar oferta de contrato anual (fee + implantação)', xp: 50, status: 'done', due: d('2026-06-01') },
          { id: 'a3', title: 'Apresentar novo contrato para 3 clientes', xp: 60, status: 'doing', due: d('2026-06-28') },
        ],
      },
      {
        id: 'k2', pillar: 'ai', title: 'IA na Operação da Agência', period: 'Ciclo 1 · Semanas 3-4',
        rewardLabel: 'Desbloqueia: stack de IA para agências', rewardXp: 140,
        actions: [
          { id: 'a4', title: 'Implantar IA na produção de criativos', xp: 50, status: 'doing', due: d('2026-07-02') },
          { id: 'a5', title: 'Automatizar relatórios mensais dos clientes', xp: 50, status: 'todo', due: d('2026-07-10') },
          { id: 'a6', title: 'Criar agente de qualificação de leads', xp: 60, status: 'todo', due: d('2026-07-18') },
        ],
      },
    ],
  },
]

export const ADVISOR = {
  name: 'Ed Souza',
  role: 'Advisor',
  program: 'Programa ADVISOR',
}

// ============================================================
//  Equipe do advisor
// ============================================================

export interface TeamMember {
  id: string
  name: string
  initials: string
  role: string
  focus: PillarId[]
  menteeIds: string[]
}

export const TEAM: TeamMember[] = [
  { id: 't1', name: 'Marina Costa',   initials: 'MC', role: 'Co-advisor · Marketing',      focus: ['marketing', 'branding'], menteeIds: ['ana', 'carol'] },
  { id: 't2', name: 'Pedro Almeida',  initials: 'PA', role: 'Especialista em Vendas',      focus: ['sales'],                 menteeIds: ['rafael', 'bruno'] },
  { id: 't3', name: 'Julia Ferreira', initials: 'JF', role: 'Ops & Sucesso do Cliente',    focus: ['products', 'ai'],        menteeIds: ['ana', 'rafael', 'carol', 'bruno'] },
]

// ============================================================
//  Comercial — vendas mensais & campanhas por funil
// ============================================================

export type FunnelId =
  | 'webinar' | 'social_selling' | 'live' | 'quiz'
  | 'diagnostico' | 'organico' | 'vsl' | 'evento'

export interface Funnel { id: FunnelId; label: string; hue: number }

export const FUNNELS: Funnel[] = [
  { id: 'webinar',        label: 'Webinar',               hue: 210 },
  { id: 'social_selling', label: 'Social Selling',        hue: 330 },
  { id: 'live',           label: 'Lives',                 hue: 0 },
  { id: 'quiz',           label: 'Quiz',                  hue: 45 },
  { id: 'diagnostico',    label: 'Sessão de Diagnóstico', hue: 145 },
  { id: 'organico',       label: 'Conteúdo Orgânico',     hue: 100 },
  { id: 'vsl',            label: 'VSL',                   hue: 265 },
  { id: 'evento',         label: 'Evento Presencial',     hue: 25 },
]

export const funnelById = (id: FunnelId) => FUNNELS.find(f => f.id === id)!

export interface SaleEntry {
  id: string
  menteeId: string
  month: string // 'YYYY-MM'
  product: string
  ticket: number
  units: number
  highTicket: boolean
}

export type CampaignStatus = 'planned' | 'running' | 'done'

export interface Campaign {
  id: string
  menteeId: string
  month: string // 'YYYY-MM'
  funnel: FunnelId
  product: string
  ticket: number
  highTicket: boolean
  cpl: number      // custo por lead (R$)
  leads: number    // qtd. de leads geradas
  convPct: number  // conversão de leads em vendas (%)
  status: CampaignStatus
}

export const CAMPAIGN_STATUS: Record<CampaignStatus, { label: string; cls: string }> = {
  planned: { label: 'Planejada',    cls: '' },
  running: { label: 'Em andamento', cls: 'warn' },
  done:    { label: 'Concluída',    cls: 'good' },
}

// Métricas derivadas de uma campanha: investimento, vendas, receita, CPA, ROAS
export function campaignCalc(c: Campaign) {
  const invested = c.cpl * c.leads
  const sales = Math.round((c.leads * c.convPct) / 100)
  const revenue = sales * c.ticket
  const cpa = sales > 0 && invested > 0 ? invested / sales : 0
  const roas = invested > 0 ? revenue / invested : 0
  return { invested, sales, revenue, cpa, roas }
}

export function salesSummary(entries: SaleEntry[]) {
  const revenue = entries.reduce((s, e) => s + e.ticket * e.units, 0)
  const htRevenue = entries.filter(e => e.highTicket).reduce((s, e) => s + e.ticket * e.units, 0)
  const units = entries.reduce((s, e) => s + e.units, 0)
  const htUnits = entries.filter(e => e.highTicket).reduce((s, e) => s + e.units, 0)
  const avgTicket = units ? revenue / units : 0
  const htShare = revenue ? htRevenue / revenue : 0
  return { revenue, htRevenue, units, htUnits, avgTicket, htShare }
}

export const SALES: SaleEntry[] = [
  // Ana — consultoria empresarial (high ticket: projeto de consultoria / retainer)
  { id: 'v1',  menteeId: 'ana',    month: '2026-05', product: 'Projeto de Consultoria Comercial', ticket: 68000, units: 1, highTicket: true },
  { id: 'v2',  menteeId: 'ana',    month: '2026-05', product: 'Diagnóstico Empresarial',          ticket: 8500,  units: 2, highTicket: false },
  { id: 'v3',  menteeId: 'ana',    month: '2026-06', product: 'Projeto de Consultoria Comercial', ticket: 72000, units: 1, highTicket: true },
  { id: 'v4',  menteeId: 'ana',    month: '2026-06', product: 'Retainer de Acompanhamento',       ticket: 12000, units: 1, highTicket: true },
  { id: 'v5',  menteeId: 'ana',    month: '2026-06', product: 'Diagnóstico Empresarial',          ticket: 8500,  units: 1, highTicket: false },
  { id: 'v6',  menteeId: 'ana',    month: '2026-07', product: 'Projeto de Consultoria Comercial', ticket: 72000, units: 1, highTicket: true },
  { id: 'v7',  menteeId: 'ana',    month: '2026-07', product: 'Diagnóstico Empresarial',          ticket: 8500,  units: 1, highTicket: false },
  // Rafael — infoprodutos (high ticket: mentoria 1:1)
  { id: 'v8',  menteeId: 'rafael', month: '2026-05', product: 'Mentoria Executiva 1:1',           ticket: 15000, units: 1, highTicket: true },
  { id: 'v9',  menteeId: 'rafael', month: '2026-05', product: 'Formação Online · Turma',          ticket: 3500,  units: 4, highTicket: false },
  { id: 'v10', menteeId: 'rafael', month: '2026-06', product: 'Mentoria Executiva 1:1',           ticket: 15000, units: 2, highTicket: true },
  { id: 'v11', menteeId: 'rafael', month: '2026-06', product: 'Formação Online · Turma',          ticket: 3500,  units: 6, highTicket: false },
  { id: 'v12', menteeId: 'rafael', month: '2026-07', product: 'Mentoria Executiva 1:1',           ticket: 15000, units: 1, highTicket: true },
  { id: 'v13', menteeId: 'rafael', month: '2026-07', product: 'Formação Online · Turma',          ticket: 3500,  units: 3, highTicket: false },
  // Carol — consultas & protocolos de saúde (high ticket: protocolos de acompanhamento)
  { id: 'v14', menteeId: 'carol',  month: '2026-06', product: 'Protocolo Trimestral de Acompanhamento', ticket: 4200, units: 2, highTicket: true },
  { id: 'v15', menteeId: 'carol',  month: '2026-06', product: 'Consulta Avulsa',                  ticket: 900,   units: 8, highTicket: false },
  { id: 'v16', menteeId: 'carol',  month: '2026-07', product: 'Protocolo Semestral Premium',      ticket: 4800,  units: 1, highTicket: true },
  { id: 'v17', menteeId: 'carol',  month: '2026-07', product: 'Consulta Avulsa',                  ticket: 950,   units: 6, highTicket: false },
  // Bruno — agência de serviços (high ticket: contrato anual com implantação)
  { id: 'v18', menteeId: 'bruno',  month: '2026-05', product: 'Retainer Mensal de Marketing',     ticket: 6000,  units: 5, highTicket: false },
  { id: 'v19', menteeId: 'bruno',  month: '2026-06', product: 'Retainer Mensal de Marketing',     ticket: 6000,  units: 6, highTicket: false },
  { id: 'v20', menteeId: 'bruno',  month: '2026-06', product: 'Contrato Anual · Implantação',     ticket: 28000, units: 1, highTicket: true },
  { id: 'v21', menteeId: 'bruno',  month: '2026-07', product: 'Retainer Mensal de Marketing',     ticket: 6500,  units: 6, highTicket: false },
  { id: 'v22', menteeId: 'bruno',  month: '2026-07', product: 'Contrato Anual · Implantação',     ticket: 28000, units: 1, highTicket: true },
]

export const CAMPAIGNS: Campaign[] = [
  // Junho (concluídas)
  { id: 'c1', menteeId: 'ana',    month: '2026-06', funnel: 'diagnostico',    product: 'Projeto de Consultoria Comercial', ticket: 72000, highTicket: true,  cpl: 38,  leads: 120, convPct: 1.7, status: 'done' },
  { id: 'c2', menteeId: 'rafael', month: '2026-06', funnel: 'social_selling', product: 'Mentoria Executiva 1:1',           ticket: 15000, highTicket: true,  cpl: 25,  leads: 90,  convPct: 3.3, status: 'done' },
  { id: 'c3', menteeId: 'carol',  month: '2026-06', funnel: 'live',           product: 'Consulta Avulsa',                  ticket: 900,   highTicket: false, cpl: 4,   leads: 150, convPct: 4.0, status: 'done' },
  { id: 'c12', menteeId: 'bruno', month: '2026-06', funnel: 'organico',       product: 'Retainer Mensal de Marketing',     ticket: 6000,  highTicket: false, cpl: 0,   leads: 40,  convPct: 5.0, status: 'done' },
  // Julho (em andamento)
  { id: 'c4', menteeId: 'ana',    month: '2026-07', funnel: 'webinar',        product: 'Projeto de Consultoria Comercial', ticket: 72000, highTicket: true,  cpl: 42,  leads: 260, convPct: 0.8, status: 'running' },
  { id: 'c5', menteeId: 'ana',    month: '2026-07', funnel: 'organico',       product: 'Diagnóstico Empresarial',          ticket: 8500,  highTicket: false, cpl: 0,   leads: 85,  convPct: 2.4, status: 'running' },
  { id: 'c6', menteeId: 'rafael', month: '2026-07', funnel: 'vsl',            product: 'Formação Online · Turma',          ticket: 3500,  highTicket: false, cpl: 18,  leads: 340, convPct: 2.1, status: 'running' },
  { id: 'c7', menteeId: 'rafael', month: '2026-07', funnel: 'diagnostico',    product: 'Mentoria Executiva 1:1',           ticket: 15000, highTicket: true,  cpl: 30,  leads: 60,  convPct: 5.0, status: 'running' },
  { id: 'c8', menteeId: 'carol',  month: '2026-07', funnel: 'quiz',           product: 'Protocolo Semestral Premium',      ticket: 4800,  highTicket: true,  cpl: 6,   leads: 220, convPct: 1.8, status: 'running' },
  { id: 'c11', menteeId: 'bruno', month: '2026-07', funnel: 'social_selling', product: 'Contrato Anual · Implantação',     ticket: 28000, highTicket: true,  cpl: 15,  leads: 70,  convPct: 2.9, status: 'running' },
  // Agosto (planejadas)
  { id: 'c9', menteeId: 'rafael', month: '2026-08', funnel: 'evento',         product: 'Imersão Presencial',               ticket: 25000, highTicket: true,  cpl: 120, leads: 40,  convPct: 7.5, status: 'planned' },
  { id: 'c10', menteeId: 'ana',   month: '2026-08', funnel: 'social_selling', product: 'Projeto de Consultoria Comercial', ticket: 72000, highTicket: true,  cpl: 12,  leads: 50,  convPct: 2.0, status: 'planned' },
]

// ---------- Metas comerciais mensais ----------

export interface MonthlyGoal {
  id: string
  menteeId: string
  month: string // 'YYYY-MM'
  revenueGoal: number
  htRevenueGoal: number
  leadsGoal: number
}

export const GOALS: MonthlyGoal[] = [
  // Junho (fechado — mostra metas batidas/perdidas)
  { id: 'g1', menteeId: 'ana',    month: '2026-06', revenueGoal: 85000, htRevenueGoal: 70000, leadsGoal: 150 },
  { id: 'g2', menteeId: 'rafael', month: '2026-06', revenueGoal: 45000, htRevenueGoal: 30000, leadsGoal: 100 },
  { id: 'g3', menteeId: 'carol',  month: '2026-06', revenueGoal: 14000, htRevenueGoal: 8000,  leadsGoal: 120 },
  { id: 'g7', menteeId: 'bruno',  month: '2026-06', revenueGoal: 60000, htRevenueGoal: 25000, leadsGoal: 30 },
  // Julho (em curso)
  { id: 'g4', menteeId: 'ana',    month: '2026-07', revenueGoal: 95000, htRevenueGoal: 75000, leadsGoal: 320 },
  { id: 'g5', menteeId: 'rafael', month: '2026-07', revenueGoal: 40000, htRevenueGoal: 30000, leadsGoal: 380 },
  { id: 'g6', menteeId: 'carol',  month: '2026-07', revenueGoal: 12000, htRevenueGoal: 6000,  leadsGoal: 250 },
  { id: 'g8', menteeId: 'bruno',  month: '2026-07', revenueGoal: 70000, htRevenueGoal: 30000, leadsGoal: 80 },
]

// Realizado do mês (vendas + leads de campanhas) para comparar com a meta
export function monthActuals(menteeId: string, month: string, sales: SaleEntry[], campaigns: Campaign[]) {
  const s = salesSummary(sales.filter(e => e.menteeId === menteeId && e.month === month))
  const leads = campaigns.filter(c => c.menteeId === menteeId && c.month === month).reduce((t, c) => t + c.leads, 0)
  return { revenue: s.revenue, htRevenue: s.htRevenue, leads }
}

// ============================================================
//  Utilitários compartilhados
// ============================================================

export const CURRENT_MONTH = '2026-07'

const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const MES_FULL = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

export const monthLabel = (m: string) => { const [y, mo] = m.split('-'); return `${MES[+mo - 1]}/${y.slice(2)}` }
export const monthFull = (m: string) => { const [y, mo] = m.split('-'); return `${MES_FULL[+mo - 1]} de ${y}` }

export function shiftMonth(m: string, delta: number) {
  const [y, mo] = m.split('-').map(Number)
  const d = new Date(y, mo - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Meses exibidos no gráfico: janela recente + meses com dados
export function chartMonths(sales: SaleEntry[]): string[] {
  const set = new Set(sales.map(s => s.month))
  for (let i = 5; i >= 0; i--) set.add(shiftMonth(CURRENT_MONTH, -i))
  return [...set].sort().slice(-8)
}

export const fmtBRL = (v: number) => 'R$ ' + Math.round(v).toLocaleString('pt-BR')
export const fmtK = (v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v)))
export const pcolor = (hue: number, s = 62, l = 62) => `hsl(${hue} ${s}% ${l}%)`
export const fmtDate = (iso: string) => { const [y, m, dd] = iso.split('-'); return `${dd}/${m}/${y.slice(2)}` }

export const upsert = <T extends { id: string }>(arr: T[], item: T): T[] =>
  arr.some(x => x.id === item.id) ? arr.map(x => (x.id === item.id ? item : x)) : [...arr, item]

// ---------- Store & API (compartilhados entre views) ----------

// ============================================================
//  Funil do cliente — snapshots (histórico) por mentorado
// ============================================================

export interface FunnelSnapshot {
  id: string
  menteeId: string
  date: string   // ISO — quando o funil foi registrado
  leads: number
  cpl: number
  meetings: number
  sales: number
  ticket: number
}

// Métricas derivadas de um snapshot de funil (reutilizado na calculadora e no painel)
export function funnelCalc(f: { leads: number; cpl: number; meetings: number; sales: number; ticket: number }) {
  const invest = f.leads * f.cpl
  const taxaAgend = f.leads ? f.meetings / f.leads : 0     // lead → reunião
  const convReuniao = f.meetings ? f.sales / f.meetings : 0 // reunião → venda
  const convGeral = f.leads ? f.sales / f.leads : 0         // lead → venda
  const cac = f.sales ? invest / f.sales : 0
  const receita = f.sales * f.ticket
  const roas = invest ? receita / invest : 0
  const lucro = receita - invest
  return { invest, taxaAgend, convReuniao, convGeral, cac, receita, roas, lucro }
}

export const FUNNEL_SNAPSHOTS: FunnelSnapshot[] = [
  // Ana — consultoria (funil de diagnóstico) melhorando ao longo dos meses
  { id: 'fn1', menteeId: 'ana',    date: '2026-05-12', leads: 320, cpl: 42, meetings: 22, sales: 3, ticket: 68000 },
  { id: 'fn2', menteeId: 'ana',    date: '2026-06-15', leads: 380, cpl: 40, meetings: 34, sales: 5, ticket: 72000 },
  { id: 'fn3', menteeId: 'ana',    date: '2026-07-10', leads: 420, cpl: 38, meetings: 46, sales: 8, ticket: 72000 },
  // Rafael — infoprodutos (funil de VSL → call)
  { id: 'fn4', menteeId: 'rafael', date: '2026-06-08', leads: 900, cpl: 12, meetings: 40, sales: 6, ticket: 15000 },
  { id: 'fn5', menteeId: 'rafael', date: '2026-07-09', leads: 1100, cpl: 11, meetings: 66, sales: 11, ticket: 15000 },
  // Carol — saúde (funil de consulta → protocolo)
  { id: 'fn6', menteeId: 'carol',  date: '2026-06-20', leads: 220, cpl: 8, meetings: 30, sales: 4, ticket: 4200 },
  { id: 'fn7', menteeId: 'carol',  date: '2026-07-11', leads: 260, cpl: 7, meetings: 44, sales: 7, ticket: 4800 },
  // Bruno — agência (funil social selling → contrato)
  { id: 'fn8', menteeId: 'bruno',  date: '2026-06-18', leads: 140, cpl: 22, meetings: 26, sales: 3, ticket: 28000 },
  { id: 'fn9', menteeId: 'bruno',  date: '2026-07-08', leads: 180, cpl: 20, meetings: 38, sales: 6, ticket: 28000 },
]

export interface Store {
  mentees: Mentee[]
  team: TeamMember[]
  sales: SaleEntry[]
  campaigns: Campaign[]
  goals: MonthlyGoal[]
  checkins: CheckIn[]
  playbooks: Playbook[]
  redemptions: Redemption[]
  deals: Deal[]
  funnels: FunnelSnapshot[]
  rewards: RewardItem[]
  calls: ScheduledCall[]
  settings: AppSettings
  materials: Material[]
}

export type ModalState =
  | { kind: 'mentee'; mentee?: Mentee }
  | { kind: 'block'; menteeId: string; block?: ActionBlock }
  | { kind: 'action'; menteeId: string; blockId: string; action?: Action }
  | { kind: 'session'; menteeId: string }
  | { kind: 'team'; member?: TeamMember }
  | { kind: 'sale'; sale?: SaleEntry; menteeId?: string; month?: string }
  | { kind: 'campaign'; campaign?: Campaign; menteeId?: string; month?: string }
  | { kind: 'goal'; goal?: MonthlyGoal; menteeId?: string; month?: string }
  | { kind: 'playbook'; playbook?: Playbook }
  | { kind: 'apply'; menteeId: string }
  | { kind: 'deal'; deal?: Deal; menteeId?: string }
  | { kind: 'cycle'; menteeId: string }
  | { kind: 'comments'; menteeId: string; blockId: string; actionId: string }
  | { kind: 'report'; menteeId: string }
  | { kind: 'menteeLogin'; menteeId: string; menteeName: string }
  | { kind: 'reward'; reward?: RewardItem }
  | { kind: 'call'; call?: ScheduledCall; menteeId?: string }

export interface Api {
  open: (m: ModalState) => void
  upMentee: (m: Mentee) => void
  delMentee: (id: string) => void
  upBlock: (menteeId: string, b: ActionBlock) => void
  delBlock: (menteeId: string, blockId: string) => void
  upAction: (menteeId: string, blockId: string, a: Action) => void
  delAction: (menteeId: string, blockId: string, actionId: string) => void
  toggleAction: (menteeId: string, actionId: string, mode: 'advisor' | 'mentee') => void
  addSession: (menteeId: string, s: Session) => void
  upTeam: (t: TeamMember) => void
  delTeam: (id: string) => void
  upSale: (s: SaleEntry) => void
  delSale: (id: string) => void
  upCampaign: (c: Campaign) => void
  delCampaign: (id: string) => void
  upGoal: (g: MonthlyGoal) => void
  delGoal: (id: string) => void
  upFunnel: (f: FunnelSnapshot) => void
  delFunnel: (id: string) => void
  upReward: (r: RewardItem) => void
  delReward: (id: string) => void
  upCheckIn: (c: CheckIn) => void
  upPlaybook: (p: Playbook) => void
  delPlaybook: (id: string) => void
  applyPlaybook: (menteeId: string, playbookId: string) => void
  upDeal: (dl: Deal) => void
  delDeal: (id: string) => void
  redeem: (menteeId: string, rewardId: string) => void
  setRedemption: (id: string, status: Redemption['status']) => void
  closeCycle: (menteeId: string, newCycle: string) => void
  addComment: (menteeId: string, blockId: string, actionId: string, text: string, author: string, role: Comment['role']) => void
  setNotes: (menteeId: string, text: string) => void
  upCall: (c: ScheduledCall) => void
  delCall: (id: string) => void
  upCheckpoint: (menteeId: string, cp: Checkpoint) => void
  delCheckpoint: (menteeId: string, cpId: string) => void
  setSettings: (patch: Partial<AppSettings>) => void
  upMaterial: (mt: Material) => void
  delMaterial: (id: string) => void
}

// ============================================================
//  Check-in semanal (ritmo de execução)
// ============================================================

export interface CheckIn {
  id: string
  menteeId: string
  week: string // segunda-feira da semana (ISO)
  date: string // quando foi enviado
  wins: string
  blockers: string
  focus: string
}

const isoLocal = (dt: Date) =>
  `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`

export const todayIso = () => isoLocal(new Date())

export function weekKey(base: Date = new Date()): string {
  const dt = new Date(base)
  const day = (dt.getDay() + 6) % 7 // 0 = segunda
  dt.setDate(dt.getDate() - day)
  return isoLocal(dt)
}

export const shiftWeek = (week: string, delta: number) => {
  const [y, m, dd] = week.split('-').map(Number)
  return isoLocal(new Date(y, m - 1, dd + delta * 7))
}

export function checkinStreak(menteeId: string, checkins: CheckIn[]): number {
  const weeks = new Set(checkins.filter(c => c.menteeId === menteeId).map(c => c.week))
  if (!weeks.size) return 0
  let wk = weekKey()
  if (!weeks.has(wk)) wk = shiftWeek(wk, -1)
  let n = 0
  while (weeks.has(wk)) { n++; wk = shiftWeek(wk, -1) }
  return n
}

// Streak efetivo: automático quando há check-ins; senão usa o valor manual do cadastro
export const effectiveStreak = (m: Mentee, checkins: CheckIn[]) =>
  checkins.some(c => c.menteeId === m.id) ? checkinStreak(m.id, checkins) : m.streak

export const CHECKINS: CheckIn[] = [
  { id: 'ck1', menteeId: 'ana', week: '2026-06-01', date: '2026-06-01', wins: 'Manifesto publicado e 2 estudos de caso no ar.', blockers: 'Nenhum.', focus: 'Gravar depoimentos de clientes.' },
  { id: 'ck2', menteeId: 'ana', week: '2026-06-08', date: '2026-06-08', wins: 'Escada de valor definida com precificação.', blockers: 'Dúvida na garantia do pacote de obra.', focus: 'Validar oferta com 3 clientes antigos.' },
  { id: 'ck3', menteeId: 'ana', week: '2026-06-15', date: '2026-06-16', wins: '3 sessões de diagnóstico realizadas.', blockers: 'Agenda apertada com obra em andamento.', focus: 'Fechar proposta Alphaville.' },
  { id: 'ck4', menteeId: 'ana', week: '2026-06-22', date: '2026-06-22', wins: 'Proposta enviada + automação de follow-up no ar.', blockers: 'Cliente pediu prazo.', focus: 'Preparar webinar de julho.' },
  { id: 'ck5', menteeId: 'ana', week: '2026-06-29', date: '2026-06-30', wins: 'Webinar estruturado, landing no ar.', blockers: 'CPL um pouco alto no início.', focus: 'Otimizar criativos e ensaiar pitch.' },
  { id: 'ck6', menteeId: 'rafael', week: '2026-06-22', date: '2026-06-23', wins: 'Funil de VSL rodando.', blockers: 'Pouco tempo para prospecção ativa.', focus: 'Bloquear 1h/dia de social selling.' },
  { id: 'ck7', menteeId: 'rafael', week: '2026-06-29', date: '2026-06-29', wins: '2 mentorias 1:1 fechadas no mês.', blockers: 'Follow-up manual consumindo tempo.', focus: 'Implantar automação de follow-up.' },
  { id: 'ck8', menteeId: 'carol', week: '2026-06-22', date: '2026-06-23', wins: 'Quiz de sintomas no ar.', blockers: 'Agenda de consultas lotada limita horários para calls.', focus: 'Fechar o protocolo premium da paciente indicada.' },
  { id: 'ck9', menteeId: 'bruno', week: '2026-06-15', date: '2026-06-15', wins: 'Novo contrato anual desenhado com fee + implantação.', blockers: 'Cliente antigo resistente ao reajuste.', focus: 'Apresentar o contrato para os 3 primeiros clientes.' },
  { id: 'ck10', menteeId: 'bruno', week: '2026-06-22', date: '2026-06-22', wins: '2 clientes aceitaram migrar para o contrato anual.', blockers: 'Nenhum.', focus: 'Fechar o terceiro contrato e iniciar automação de relatórios.' },
  { id: 'ck11', menteeId: 'bruno', week: '2026-06-29', date: '2026-06-30', wins: 'Primeiro contrato anual assinado + IA nos criativos rodando.', blockers: 'Time apertado para produção.', focus: 'Contratar freela e avançar na automação de relatórios.' },
]

// ============================================================
//  Playbooks (templates da metodologia por pilar)
// ============================================================

export interface PlaybookAction { title: string; xp: number; days: number } // days = prazo após aplicar

export interface Playbook {
  id: string
  pillar: PillarId
  title: string
  description: string
  period: string
  rewardLabel: string
  rewardXp: number
  actions: PlaybookAction[]
}

export const PLAYBOOKS: Playbook[] = [
  {
    id: 'pb1', pillar: 'branding', title: 'Fundação de Posicionamento', period: '2 semanas',
    description: 'Clareia a proposta de valor e constrói autoridade percebida antes de escalar aquisição.',
    rewardLabel: 'Desbloqueia: review de marca 1:1', rewardXp: 150,
    actions: [
      { title: 'Definir proposta única de valor', xp: 60, days: 5 },
      { title: 'Escrever o manifesto da marca', xp: 50, days: 10 },
      { title: 'Auditoria de perfil e bio nos canais', xp: 40, days: 7 },
      { title: 'Montar banco de provas sociais', xp: 50, days: 14 },
    ],
  },
  {
    id: 'pb2', pillar: 'marketing', title: 'Máquina de Conteúdo Orgânico', period: '2 semanas',
    description: 'Cria consistência de conteúdo com linha editorial e rotina sustentável.',
    rewardLabel: 'Desbloqueia: análise de conteúdo pela equipe', rewardXp: 140,
    actions: [
      { title: 'Definir linha editorial (4 pilares de conteúdo)', xp: 50, days: 5 },
      { title: 'Produzir e programar 12 conteúdos', xp: 80, days: 14 },
      { title: 'Implantar rotina de stories diários', xp: 40, days: 7 },
      { title: 'Padronizar CTA nos posts', xp: 30, days: 7 },
    ],
  },
  {
    id: 'pb3', pillar: 'marketing', title: 'Social Selling Sprint', period: '2 semanas',
    description: 'Gera conversas comerciais ativas com leads quentes da audiência.',
    rewardLabel: 'Desbloqueia: review de pipeline com o guardião', rewardXp: 180,
    actions: [
      { title: 'Levantar lista de 50 leads quentes', xp: 50, days: 3 },
      { title: 'Escrever script de abordagem', xp: 40, days: 5 },
      { title: 'Iniciar 20 conversas qualificadas', xp: 80, days: 10 },
      { title: 'Agendar 5 calls comerciais', xp: 100, days: 14 },
    ],
  },
  {
    id: 'pb4', pillar: 'sales', title: 'Sessão de Diagnóstico que Converte', period: '3 semanas',
    description: 'Estrutura o funil de diagnóstico para vender a oferta high ticket com previsibilidade.',
    rewardLabel: 'Desbloqueia: role-play de vendas com o mentor', rewardXp: 200,
    actions: [
      { title: 'Escrever roteiro da sessão de diagnóstico', xp: 60, days: 5 },
      { title: 'Estruturar oferta high ticket (promessa + entrega)', xp: 80, days: 7 },
      { title: 'Realizar 10 sessões de diagnóstico', xp: 120, days: 21 },
      { title: 'Padronizar follow-up pós-sessão', xp: 40, days: 10 },
    ],
  },
  {
    id: 'pb5', pillar: 'products', title: 'Escada de Valor', period: '2 semanas',
    description: 'Organiza as ofertas em degraus claros, com o high ticket no topo.',
    rewardLabel: 'Desbloqueia: review da oferta', rewardXp: 160,
    actions: [
      { title: 'Mapear ofertas e margens atuais', xp: 40, days: 3 },
      { title: 'Desenhar o degrau high ticket', xp: 80, days: 7 },
      { title: 'Definir precificação e garantia', xp: 50, days: 10 },
      { title: 'Criar página/apresentação da oferta', xp: 70, days: 14 },
    ],
  },
  {
    id: 'pb6', pillar: 'ai', title: 'IA no Operacional', period: '3 semanas',
    description: 'Automatiza tarefas repetitivas para liberar tempo de execução estratégica.',
    rewardLabel: 'Desbloqueia: setup review de IA', rewardXp: 170,
    actions: [
      { title: 'Mapear 5 processos repetitivos', xp: 40, days: 4 },
      { title: 'Implantar assistente de conteúdo', xp: 70, days: 10 },
      { title: 'Automatizar follow-up comercial', xp: 80, days: 14 },
      { title: 'Montar dashboard semanal automatizado', xp: 60, days: 21 },
    ],
  },
  {
    id: 'pb7', pillar: 'sales', title: 'Webinar de Conversão', period: '3 semanas',
    description: 'Vende a oferta high ticket em escala: uma grande promessa, quebra das 3 objeções centrais e fechamento com stack de valor.',
    rewardLabel: 'Desbloqueia: review do pitch com o mentor', rewardXp: 200,
    actions: [
      { title: 'Definir a grande promessa e o conceito único do webinar', xp: 60, days: 4 },
      { title: 'Roteirizar os 3 segredos que quebram as objeções centrais', xp: 80, days: 8 },
      { title: 'Montar o stack da oferta: bônus, garantia e urgência real', xp: 70, days: 10 },
      { title: 'Criar página de inscrição e sequência de lembretes', xp: 50, days: 12 },
      { title: 'Ensaiar o pitch completo do início ao fechamento', xp: 40, days: 14 },
      { title: 'Realizar o webinar ao vivo + sequência de replay de 48h', xp: 100, days: 21 },
    ],
  },
  {
    id: 'pb8', pillar: 'products', title: 'Oferta Irresistível', period: '2 semanas',
    description: 'Reconstrói a oferta pela equação de valor: maximiza resultado e certeza, minimiza tempo e esforço percebidos — até o preço parecer óbvio.',
    rewardLabel: 'Desbloqueia: teardown da oferta com o mentor', rewardXp: 180,
    actions: [
      { title: 'Mapear o resultado dos sonhos que o cliente realmente compra', xp: 50, days: 3 },
      { title: 'Elevar a certeza percebida: provas, cases e demonstrações', xp: 50, days: 6 },
      { title: 'Reduzir tempo e esforço percebidos na promessa de entrega', xp: 50, days: 8 },
      { title: 'Empilhar bônus que resolvem as próximas dores do cliente', xp: 60, days: 10 },
      { title: 'Criar garantia agressiva que inverte o risco da compra', xp: 50, days: 12 },
      { title: 'Nomear a oferta e definir escassez e urgência legítimas', xp: 40, days: 14 },
    ],
  },
]

export function blockFromPlaybook(p: Playbook, idGen: () => string): ActionBlock {
  const base = new Date()
  return {
    id: idGen(), pillar: p.pillar, title: p.title, period: p.period,
    rewardLabel: p.rewardLabel, rewardXp: p.rewardXp,
    actions: p.actions.map(a => {
      const due = new Date(base)
      due.setDate(due.getDate() + a.days)
      return { id: idGen(), title: a.title, xp: a.xp, status: 'todo' as ActionStatus, due: isoLocal(due) }
    }),
  }
}

// ============================================================
//  Loja de recompensas (gamificação com resgate)
// ============================================================

export interface RewardItem { id: string; icon: string; label: string; description: string; costXp: number }

export const REWARD_CATALOG: RewardItem[] = [
  { id: 'r1', icon: '✦', label: 'Call extra 1:1 com o mentor', description: '30 minutos para destravar qualquer tema.', costXp: 400 },
  { id: 'r2', icon: '◎', label: 'Review de funil', description: 'Análise completa de uma campanha pela equipe.', costXp: 300 },
  { id: 'r3', icon: '✎', label: 'Análise de conteúdo', description: 'Feedback detalhado em 5 conteúdos seus.', costXp: 250 },
  { id: 'r4', icon: '⚙', label: 'Sessão com o guardião', description: '45 minutos dedicados com o monitor do programa.', costXp: 350 },
  { id: 'r5', icon: '⚑', label: 'Upgrade no evento presencial', description: 'Assento VIP + jantar com o mentor.', costXp: 800 },
]

export interface Redemption { id: string; menteeId: string; rewardId: string; date: string; status: 'pending' | 'delivered' }

export const REDEMPTIONS: Redemption[] = [
  { id: 'rd1', menteeId: 'ana', rewardId: 'r3', date: '2026-06-20', status: 'delivered' },
]

export const spentXp = (menteeId: string, redemptions: Redemption[], rewards: RewardItem[]) =>
  redemptions.filter(r => r.menteeId === menteeId)
    .reduce((s, r) => s + (rewards.find(c => c.id === r.rewardId)?.costXp ?? 0), 0)

// ============================================================
//  Pipeline high ticket (oportunidades em negociação)
// ============================================================

export type DealStage = 'lead' | 'call' | 'proposal' | 'won' | 'lost'

export const DEAL_STAGES: { id: DealStage; label: string }[] = [
  { id: 'lead', label: 'Lead qualificado' },
  { id: 'call', label: 'Call agendada' },
  { id: 'proposal', label: 'Proposta enviada' },
  { id: 'won', label: 'Fechado' },
  { id: 'lost', label: 'Perdido' },
]

export interface Deal {
  id: string
  menteeId: string
  client: string
  product: string
  value: number
  stage: DealStage
  nextStep: string
}

export const DEALS: Deal[] = [
  { id: 'd1', menteeId: 'ana', client: 'Indústria metalúrgica · SP', product: 'Projeto de Consultoria Comercial', value: 75000, stage: 'proposal', nextStep: 'Enviar proposta revisada até sexta' },
  { id: 'd2', menteeId: 'ana', client: 'Rede de franquias · 12 unidades', product: 'Projeto de Consultoria Comercial', value: 68000, stage: 'call', nextStep: 'Call de diagnóstico em 08/07' },
  { id: 'd3', menteeId: 'rafael', client: 'Diretor · multinacional', product: 'Mentoria Executiva 1:1', value: 15000, stage: 'won', nextStep: 'Onboarding marcado' },
  { id: 'd4', menteeId: 'rafael', client: 'CEO · startup B2B', product: 'Mentoria Executiva 1:1', value: 15000, stage: 'lead', nextStep: 'Qualificar orçamento na quinta' },
  { id: 'd5', menteeId: 'carol', client: 'Paciente executiva · indicação', product: 'Protocolo Anual VIP', value: 5200, stage: 'proposal', nextStep: 'Consulta de retorno em 10/07' },
  { id: 'd6', menteeId: 'bruno', client: 'Rede de clínicas · 4 unidades', product: 'Contrato Anual · Implantação', value: 32000, stage: 'proposal', nextStep: 'Reunião de fechamento em 09/07' },
  { id: 'd7', menteeId: 'bruno', client: 'E-commerce de suplementos', product: 'Contrato Anual · Implantação', value: 28000, stage: 'call', nextStep: 'Call de diagnóstico em 08/07' },
]

// ============================================================
//  Saúde do mentorado, pauta automática, badges e insights
// ============================================================

export function overdueActions(m: Mentee): Action[] {
  const t = todayIso()
  return activeBlocks(m).flatMap(b => b.actions).filter(a => a.status !== 'done' && a.due < t)
}

export const reviewActions = (m: Mentee): Action[] =>
  activeBlocks(m).flatMap(b => b.actions).filter(a => a.status === 'review')

export interface Health { status: 'ok' | 'warn' | 'risk'; reasons: string[] }

export function menteeHealth(m: Mentee, checkins: CheckIn[]): Health {
  const overdue = overdueActions(m).length
  const hasCheckins = checkins.some(c => c.menteeId === m.id)
  const thisWeek = checkins.some(c => c.menteeId === m.id && c.week === weekKey())
  const lastWeek = checkins.some(c => c.menteeId === m.id && c.week === shiftWeek(weekKey(), -1))
  const gap = hasCheckins && !thisWeek && !lastWeek
  const reasons: string[] = []
  if (overdue) reasons.push(overdue === 1 ? '1 ação atrasada' : `${overdue} ações atrasadas`)
  if (gap) reasons.push('sem check-in há 2+ semanas')
  else if (hasCheckins && !thisWeek) reasons.push('sem check-in nesta semana')
  if (!hasCheckins && m.streak <= 1) reasons.push('ritmo baixo')
  const status: Health['status'] = overdue >= 3 || gap ? 'risk' : reasons.length ? 'warn' : 'ok'
  return { status, reasons }
}

export interface AgendaItem { a: Action; block: string }
export interface Agenda {
  lastNext?: string
  overdue: AgendaItem[]
  review: AgendaItem[]
  delivered: AgendaItem[]
  lastCheckIn?: CheckIn
  goalPct?: number
}

// Pauta sugerida da próxima call, montada a partir do plano e dos resultados
export function buildAgenda(m: Mentee, store: Store): Agenda {
  const withBlock: AgendaItem[] = activeBlocks(m).flatMap(b => b.actions.map(a => ({ a, block: b.title })))
  const t = todayIso()
  const goal = store.goals.find(g => g.menteeId === m.id && g.month === CURRENT_MONTH)
  const act = monthActuals(m.id, CURRENT_MONTH, store.sales, store.campaigns)
  const cks = store.checkins.filter(c => c.menteeId === m.id).sort((x, y) => y.week.localeCompare(x.week))
  return {
    lastNext: m.sessions[0]?.nextStep,
    overdue: withBlock.filter(x => x.a.status !== 'done' && x.a.due < t),
    review: withBlock.filter(x => x.a.status === 'review'),
    delivered: withBlock.filter(x => x.a.status === 'done').slice(-4).reverse(),
    lastCheckIn: cks[0],
    goalPct: goal?.revenueGoal ? act.revenue / goal.revenueGoal : undefined,
  }
}

export interface AutoBadge { id: string; icon: string; label: string; hint: string; earned: boolean }

// Conquistas calculadas automaticamente a partir dos dados reais
export function computeBadges(m: Mentee, store: Store): AutoBadge[] {
  const doneBlock = (pillar?: PillarId) =>
    m.blocks.some(b => (!pillar || b.pillar === pillar) && b.actions.length > 0 && b.actions.every(a => a.status === 'done'))
  const streak = effectiveStreak(m, store.checkins)
  const funnels = new Set(store.campaigns.filter(c => c.menteeId === m.id).map(c => c.funnel))
  const hitGoal = (key: 'revenueGoal' | 'htRevenueGoal', actKey: 'revenue' | 'htRevenue') =>
    store.goals.some(g => g.menteeId === m.id && g[key] > 0 &&
      monthActuals(m.id, g.month, store.sales, store.campaigns)[actKey] >= g[key])
  return [
    { id: 'ab1', icon: '◆', label: 'Primeiro Bloco', hint: 'Conclua um bloco inteiro de ações.', earned: doneBlock() },
    { id: 'ab2', icon: '✦', label: 'Marca Viva', hint: 'Conclua um bloco de Branding.', earned: doneBlock('branding') },
    { id: 'ab3', icon: '◉', label: 'Tração', hint: 'Conclua um bloco de Marketing.', earned: doneBlock('marketing') },
    { id: 'ab4', icon: '▲', label: 'Máquina de Vendas', hint: 'Conclua um bloco de Vendas.', earned: doneBlock('sales') },
    { id: 'ab5', icon: '■', label: 'Oferta Afiada', hint: 'Conclua um bloco de Produtos.', earned: doneBlock('products') },
    { id: 'ab6', icon: '⚡', label: 'IA na Veia', hint: 'Conclua um bloco de IA.', earned: doneBlock('ai') },
    { id: 'ab7', icon: '⟳', label: 'Streak x4', hint: '4 semanas seguidas de check-in.', earned: streak >= 4 },
    { id: 'ab8', icon: '◎', label: 'Meta Batida', hint: 'Bata a meta de receita de um mês.', earned: hitGoal('revenueGoal', 'revenue') },
    { id: 'ab9', icon: '⬙', label: 'High Ticket', hint: 'Bata a meta high ticket de um mês.', earned: hitGoal('htRevenueGoal', 'htRevenue') },
    { id: 'ab10', icon: '⚑', label: 'Multicanal', hint: 'Rode campanhas em 3+ funis diferentes.', earned: funnels.size >= 3 },
  ]
}

export interface Insight { tone: 'good' | 'warn' | 'info'; title: string; text: string }

// Copiloto heurístico: lê os dados e aponta onde agir (sem API externa)
export function insightsFor(store: Store, menteeId?: string): Insight[] {
  const out: Insight[] = []
  const mentees = store.mentees.filter(m => !menteeId || m.id === menteeId)
  const name = (id: string) => store.mentees.find(m => m.id === id)?.name.split(' ')[0] ?? ''
  const camps = store.campaigns.filter(c => c.month === CURRENT_MONTH && (!menteeId || c.menteeId === menteeId))

  if (!menteeId) {
    for (const m of store.mentees) {
      const h = menteeHealth(m, store.checkins)
      if (h.status === 'risk') out.push({ tone: 'warn', title: `${m.name.split(' ')[0]} precisa de atenção`, text: `${h.reasons.join(' · ')}. Vale um toque do guardião esta semana.` })
    }
  }

  const dayPct = Math.min(1, new Date().getDate() / 30)
  for (const m of mentees) {
    const g = store.goals.find(x => x.menteeId === m.id && x.month === CURRENT_MONTH)
    if (!g?.revenueGoal) continue
    const pct = monthActuals(m.id, CURRENT_MONTH, store.sales, store.campaigns).revenue / g.revenueGoal
    if (pct < dayPct - 0.15) out.push({ tone: 'warn', title: `Meta de ${m.name.split(' ')[0]} atrás do ritmo`, text: `${Math.round(pct * 100)}% da meta com ${Math.round(dayPct * 100)}% do mês decorrido. Priorize o pipeline high ticket nesta semana.` })
  }

  const withCpa = camps.map(c => ({ c, d: campaignCalc(c) })).filter(x => x.d.cpa > 0)
  if (withCpa.length >= 2) {
    const avg = withCpa.reduce((s, x) => s + x.d.cpa, 0) / withCpa.length
    const bad = [...withCpa].filter(x => x.d.cpa > avg * 1.5).sort((a, b) => b.d.cpa - a.d.cpa)[0]
    if (bad) out.push({ tone: 'warn', title: 'CPA fora da curva', text: `${funnelById(bad.c.funnel).label} de ${name(bad.c.menteeId)} está com CPA ${fmtBRL(bad.d.cpa)} — ${Math.round((bad.d.cpa / avg - 1) * 100)}% acima da média do mês. Revise criativo e página.` })
  }

  const best = camps.map(c => ({ c, d: campaignCalc(c) })).filter(x => x.d.roas > 0).sort((a, b) => b.d.roas - a.d.roas)[0]
  if (best) out.push({ tone: 'good', title: 'Funil campeão do mês', text: `${funnelById(best.c.funnel).label} (${name(best.c.menteeId)}) com ROAS ${best.d.roas.toFixed(1)}x. Considere aumentar o investimento enquanto a taxa se sustenta.` })

  for (const m of mentees) {
    const od = overdueActions(m)
    if (od.length) out.push({ tone: 'warn', title: menteeId ? `${od.length === 1 ? '1 ação atrasada' : `${od.length} ações atrasadas`}` : `Atrasos · ${m.name.split(' ')[0]}`, text: `A mais antiga: “${od[0].title}”. Reagende ou destrave na próxima call.` })
  }

  if (menteeId && mentees[0]) {
    const m = mentees[0]
    const weakest = [...PILLARS].map(p => ({ p, v: m.scores[p.id].current })).sort((a, b) => a.v - b.v)[0]
    const pb = store.playbooks.find(p => p.pillar === weakest.p.id && !activeBlocks(m).some(b => b.title === p.title))
    if (pb) out.push({ tone: 'info', title: `Pilar mais fraco: ${weakest.p.short} (${weakest.v}/10)`, text: `Sugestão: aplicar o playbook “${pb.title}” no próximo bloco do ciclo.` })
  }

  return out.slice(0, 5)
}

// ============================================================
//  Alertas — o que precisa de ação agora (advisor)
// ============================================================

// ============================================================
//  Agenda de calls (mentorias futuras — vira Session ao registrar)
// ============================================================

export interface ScheduledCall {
  id: string
  menteeId: string
  date: string   // ISO (dia)
  time: string   // 'HH:MM'
  withId?: string // 'advisor' ou id do membro da equipe que conduz
  topic: string
  status: 'scheduled' | 'done' | 'canceled'
}

export const CALLS: ScheduledCall[] = [
  { id: 'call1', menteeId: 'ana',    date: '2026-07-13', time: '10:00', withId: 'advisor', topic: 'Mentoria 06 · Revisão do funil de cases', status: 'scheduled' },
  { id: 'call2', menteeId: 'rafael', date: '2026-07-14', time: '15:00', withId: 't2',      topic: 'Pipeline high ticket · follow-up de propostas', status: 'scheduled' },
  { id: 'call3', menteeId: 'carol',  date: '2026-07-16', time: '11:00', withId: 't1',      topic: 'Campanha de protocolos premium · criativos', status: 'scheduled' },
  { id: 'call4', menteeId: 'bruno',  date: '2026-07-17', time: '14:00', withId: 't2',      topic: 'Renovações de retainer · playbook de upsell', status: 'scheduled' },
  { id: 'call0', menteeId: 'ana',    date: '2026-07-06', time: '10:00', withId: 'advisor', topic: 'Mentoria 05 · Revisão de posicionamento', status: 'done' },
]

export const addDaysIso = (iso: string, n: number) => {
  const [y, m, dd] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, dd + n)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

// Link "adicionar ao Google Agenda" (sem OAuth: o evento entra na conta
// de quem clica). Duração padrão de 1h; fuso de São Paulo.
export function gcalCallUrl(c: ScheduledCall, opts: { title: string; details?: string; durationMin?: number }): string {
  const [y, mo, dd] = c.date.split('-').map(Number)
  const [h, mi] = c.time.split(':').map(Number)
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp = (dt: Date) => `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`
  const start = new Date(y, mo - 1, dd, h, mi)
  const end = new Date(y, mo - 1, dd, h, mi + (opts.durationMin ?? 60))
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE'
    + `&text=${encodeURIComponent(opts.title)}`
    + `&dates=${stamp(start)}/${stamp(end)}`
    + `&details=${encodeURIComponent(opts.details ?? '')}`
    + '&ctz=America/Sao_Paulo'
}

// Próximas calls agendadas (hoje em diante), mais próxima primeiro
export function upcomingCalls(calls: ScheduledCall[], menteeId?: string): ScheduledCall[] {
  const t = todayIso()
  return calls
    .filter(c => c.status === 'scheduled' && c.date >= t && (!menteeId || c.menteeId === menteeId))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
}

export type AlertKind = 'review' | 'overdue' | 'checkin' | 'call'
export interface Alert {
  id: string
  kind: AlertKind
  severity: 'warn' | 'risk'
  menteeId: string
  menteeName: string
  title: string
  detail: string
}

const ALERT_META: Record<AlertKind, { icon: string; label: string }> = {
  review:  { icon: '✓', label: 'Aprovação pendente' },
  overdue: { icon: '⚠', label: 'Ação atrasada' },
  checkin: { icon: '⟳', label: 'Check-in' },
  call:    { icon: '◷', label: 'Call agendada' },
}
export const alertMeta = (k: AlertKind) => ALERT_META[k]

// Impressão digital do alerta no estado atual: marca de "lido" vale para
// ESTE estado — se o alerta mudar (ex.: mais uma ação atrasada), a
// impressão muda e ele volta como não-lido.
export const alertFingerprint = (a: Alert) => `${a.id}|${a.title}|${a.detail}`

export function buildAlerts(store: Store): Alert[] {
  const out: Alert[] = []
  const wk = weekKey()
  for (const m of store.mentees) {
    const first = m.name.split(' ')[0]

    const rev = reviewActions(m)
    if (rev.length) out.push({
      id: `rev-${m.id}`, kind: 'review', severity: 'warn', menteeId: m.id, menteeName: first,
      title: `${rev.length} entrega${rev.length > 1 ? 's' : ''} aguardando aprovação`,
      detail: rev.slice(0, 3).map(a => a.title).join(' · '),
    })

    const od = overdueActions(m)
    if (od.length) out.push({
      id: `od-${m.id}`, kind: 'overdue', severity: od.length >= 3 ? 'risk' : 'warn', menteeId: m.id, menteeName: first,
      title: od.length > 1 ? `${od.length} ações atrasadas` : '1 ação atrasada',
      detail: `mais antiga: “${od[0].title}” (${fmtDate(od[0].due)})`,
    })

    const notif = store.settings?.notifications
    const hasCk = (notif?.checkins !== false) && store.checkins.some(c => c.menteeId === m.id)
    const thisWeek = store.checkins.some(c => c.menteeId === m.id && c.week === wk)
    const lastWeek = store.checkins.some(c => c.menteeId === m.id && c.week === shiftWeek(wk, -1))
    if (hasCk && !thisWeek && !lastWeek) out.push({
      id: `ck-${m.id}`, kind: 'checkin', severity: 'risk', menteeId: m.id, menteeName: first,
      title: 'Sem check-in há 2+ semanas', detail: 'ritmo em risco — vale um toque do guardião',
    })
    else if (hasCk && !thisWeek) out.push({
      id: `ck-${m.id}`, kind: 'checkin', severity: 'warn', menteeId: m.id, menteeName: first,
      title: 'Sem check-in nesta semana', detail: 'lembre o mentorado de registrar o check-in',
    })

    // lembrete de call: hoje ou amanhã (desligável na Administração)
    const t = todayIso()
    const callList = notif?.calls === false ? [] : (store.calls ?? [])
    for (const c of callList.filter(c => c.menteeId === m.id && c.status === 'scheduled')) {
      if (c.date === t) out.push({
        id: `call-${c.id}`, kind: 'call', severity: 'warn', menteeId: m.id, menteeName: first,
        title: `Call hoje às ${c.time}`, detail: c.topic,
      })
      else if (c.date === addDaysIso(t, 1)) out.push({
        id: `call-${c.id}`, kind: 'call', severity: 'warn', menteeId: m.id, menteeName: first,
        title: `Call amanhã às ${c.time}`, detail: c.topic,
      })
    }
  }
  const rank = (s: Alert['severity']) => (s === 'risk' ? 0 : 1)
  return out.sort((a, b) => rank(a.severity) - rank(b.severity))
}

// ---------- Tempo de acesso ao programa ----------

export interface AccessInfo { daysLeft: number; totalDays: number; elapsedPct: number; expired: boolean; endDate: string }

export function accessInfo(m: Mentee): AccessInfo | null {
  if (!m.accessUntil) return null
  const DAY = 86400000
  const today = new Date(todayIso()).getTime()
  const end = new Date(m.accessUntil).getTime()
  const start = new Date(m.startDate).getTime()
  const daysLeft = Math.ceil((end - today) / DAY)
  const totalDays = Math.max(1, Math.round((end - start) / DAY))
  const elapsedPct = Math.max(0, Math.min(1, (today - start) / (end - start || DAY)))
  return { daysLeft, totalDays, elapsedPct, expired: daysLeft < 0, endDate: m.accessUntil }
}

// ============================================================
//  Seed & migração do store (compartilhado por localStorage e nuvem)
// ============================================================

export const seedStore = (): Store => structuredClone({
  mentees: MENTEES, team: TEAM, sales: SALES, campaigns: CAMPAIGNS, goals: GOALS,
  checkins: CHECKINS, playbooks: PLAYBOOKS, redemptions: REDEMPTIONS, deals: DEALS,
  funnels: FUNNEL_SNAPSHOTS, rewards: REWARD_CATALOG, calls: CALLS, settings: defaultSettings(), materials: [],
})

// Aplica migrações a um store salvo (localStorage ou nuvem) sem apagar edições.
// Retorna null se o objeto não for um store válido.
export function migrateStore(s: any): Store | null {
  if (!(s?.mentees && s?.team && s?.sales && s?.campaigns)) return null
  if (!s.goals) s.goals = structuredClone(GOALS)
  if (!s.checkins) s.checkins = structuredClone(CHECKINS)
  if (!s.playbooks) s.playbooks = structuredClone(PLAYBOOKS)
  if (!s.redemptions) s.redemptions = structuredClone(REDEMPTIONS)
  if (!s.deals) s.deals = structuredClone(DEALS)
  if (!s.funnels) s.funnels = structuredClone(FUNNEL_SNAPSHOTS)
  if (!s.rewards) s.rewards = structuredClone(REWARD_CATALOG)
  if (!s.calls) s.calls = []
  s.settings = ensureSettings(s.settings)
  if (!s.materials) s.materials = []
  // novos templates da metodologia entram sem apagar edições existentes
  for (const p of PLAYBOOKS) {
    if (!s.playbooks.some((x: { id: string }) => x.id === p.id)) s.playbooks.push(structuredClone(p))
  }
  return s as Store
}

// Garante que todo campo do Store é um array — blinda contra um blob/linha
// corrompido na nuvem (ex.: `mentees: null`) que derrubaria um `.map`.
// Idempotente: um Store já válido passa intacto.
export function ensureStoreShape(s: any): Store {
  const arr = <T,>(v: any): T[] => (Array.isArray(v) ? v : [])
  return {
    mentees: arr(s?.mentees),
    team: arr(s?.team),
    sales: arr(s?.sales),
    campaigns: arr(s?.campaigns),
    goals: arr(s?.goals),
    checkins: arr(s?.checkins),
    playbooks: arr(s?.playbooks),
    redemptions: arr(s?.redemptions),
    deals: arr(s?.deals),
    funnels: arr(s?.funnels),
    rewards: arr(s?.rewards),
    calls: arr(s?.calls),
    settings: ensureSettings(s?.settings),
    materials: arr(s?.materials),
  }
}
