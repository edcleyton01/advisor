import { describe, it, expect } from 'vitest'
import {
  PILLARS, LEVELS, QUIZ, PLAYBOOKS,
  levelForXp, actionXp, overallProgress, quizScores,
  campaignCalc, salesSummary, monthActuals, funnelCalc,
  checkinStreak, spentXp, accessInfo, socialUrl, upcomingCalls, addDaysIso,
  weekKey, shiftWeek, todayIso,
  type Mentee, type ActionBlock, type Action, type CheckIn,
  type SaleEntry, type Campaign, type Redemption, type RewardItem, type ScheduledCall,
} from './data'

// ---------- fábricas mínimas ----------
const scores0 = () => Object.fromEntries(PILLARS.map(p => [p.id, { baseline: 0, current: 0 }])) as Mentee['scores']

const mkMentee = (p: Partial<Mentee> = {}): Mentee => ({
  id: 'm1', name: 'Teste', initials: 'TT', business: '', niche: '', revenue: '',
  stage: '', macroGoal: '', startDate: '2026-01-01', cycle: 'C1', streak: 0,
  scores: scores0(), blocks: [], badges: [], sessions: [], ...p,
})

const mkAction = (p: Partial<Action> = {}): Action => ({ id: 'a', title: '', xp: 50, status: 'todo', due: '2026-01-01', ...p })
const mkBlock = (p: Partial<ActionBlock> = {}): ActionBlock => ({
  id: 'b', pillar: PILLARS[0].id, title: '', period: '', rewardLabel: '', rewardXp: 0, actions: [], ...p,
})

const addDays = (iso: string, n: number) => {
  const d = new Date(iso); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10)
}

// ---------- levelForXp ----------
describe('levelForXp', () => {
  it('XP zero fica no primeiro nível, apontando para o próximo', () => {
    const r = levelForXp(0)
    expect(r.current).toBe(LEVELS[0])
    expect(r.next).toBe(LEVELS[1])
    expect(r.progress).toBe(0)
    expect(r.toNext).toBe(LEVELS[1].minXp)
  })
  it('no piso de um nível, o progresso reinicia em 0', () => {
    const r = levelForXp(LEVELS[1].minXp)
    expect(r.current).toBe(LEVELS[1])
    expect(r.progress).toBe(0)
  })
  it('interpola o progresso no meio de um nível', () => {
    const mid = (LEVELS[1].minXp + LEVELS[2].minXp) / 2
    expect(levelForXp(mid).progress).toBeCloseTo(0.5, 5)
  })
  it('no topo, satura em 1 sem próximo nível', () => {
    const r = levelForXp(LEVELS[LEVELS.length - 1].minXp + 10_000)
    expect(r.current).toBe(LEVELS[LEVELS.length - 1])
    expect(r.next).toBeUndefined()
    expect(r.progress).toBe(1)
    expect(r.toNext).toBe(0)
  })
})

// ---------- actionXp ----------
describe('actionXp', () => {
  it('soma o XP das ações concluídas + bônus quando o bloco inteiro fecha', () => {
    const m = mkMentee({ blocks: [mkBlock({
      rewardXp: 100,
      actions: [mkAction({ id: 'a1', status: 'done' }), mkAction({ id: 'a2', status: 'done' })],
    })] })
    expect(actionXp(m)).toBe(50 + 50 + 100)
  })
  it('não dá o bônus do bloco se sobra ação em aberto', () => {
    const m = mkMentee({ blocks: [mkBlock({
      rewardXp: 100,
      actions: [mkAction({ id: 'a1', status: 'done' }), mkAction({ id: 'a2', status: 'todo' })],
    })] })
    expect(actionXp(m)).toBe(50)
  })
})

// ---------- overallProgress ----------
describe('overallProgress', () => {
  it('ignora blocos arquivados e calcula a fração concluída', () => {
    const m = mkMentee({ blocks: [
      mkBlock({ id: 'ativo', actions: [mkAction({ id: 'x', status: 'done' }), mkAction({ id: 'y', status: 'todo' })] }),
      mkBlock({ id: 'velho', archived: true, actions: [mkAction({ id: 'z', status: 'done' })] }),
    ] })
    expect(overallProgress(m)).toEqual({ done: 1, total: 2, pct: 0.5 })
  })
})

// ---------- quizScores ----------
describe('quizScores', () => {
  it('mapeia respostas Likert 0-4 para 0-10 por pilar', () => {
    const pill = PILLARS[0].id
    const answers: Record<string, number> = {}
    for (const q of QUIZ.filter(q => q.pillar === pill)) answers[q.id] = 4 // máximo
    expect(quizScores(answers)[pill]).toBe(10)
  })
  it('pilar sem respostas fica 0', () => {
    expect(quizScores({})[PILLARS[1].id]).toBe(0)
  })
})

// ---------- campaignCalc ----------
describe('campaignCalc', () => {
  const base: Campaign = {
    id: 'c', menteeId: 'm1', month: '2026-07', funnel: 'webinar' as Campaign['funnel'], product: '',
    ticket: 1000, highTicket: false, cpl: 10, leads: 100, convPct: 5, status: 'planned',
  }
  it('deriva investimento, vendas, receita, CPA e ROAS', () => {
    expect(campaignCalc(base)).toEqual({ invested: 1000, sales: 5, revenue: 5000, cpa: 200, roas: 5 })
  })
  it('sem leads, tudo zera sem divisão por zero', () => {
    expect(campaignCalc({ ...base, leads: 0 })).toEqual({ invested: 0, sales: 0, revenue: 0, cpa: 0, roas: 0 })
  })
})

// ---------- salesSummary ----------
describe('salesSummary', () => {
  const sale = (p: Partial<SaleEntry>): SaleEntry => ({ id: 's', menteeId: 'm1', month: '2026-07', product: '', ticket: 0, units: 0, highTicket: false, ...p })
  it('agrega receita, unidades, ticket médio e participação high ticket', () => {
    const r = salesSummary([
      sale({ ticket: 1000, units: 2, highTicket: true }),
      sale({ ticket: 500, units: 1, highTicket: false }),
    ])
    expect(r.revenue).toBe(2500)
    expect(r.htRevenue).toBe(2000)
    expect(r.units).toBe(3)
    expect(r.htUnits).toBe(2)
    expect(r.avgTicket).toBeCloseTo(2500 / 3, 5)
    expect(r.htShare).toBeCloseTo(0.8, 5)
  })
  it('lista vazia não divide por zero', () => {
    const r = salesSummary([])
    expect(r).toMatchObject({ revenue: 0, units: 0, avgTicket: 0, htShare: 0 })
  })
})

// ---------- monthActuals ----------
describe('monthActuals', () => {
  it('filtra por mentorado e mês e soma leads das campanhas', () => {
    const sales: SaleEntry[] = [
      { id: 's1', menteeId: 'm1', month: '2026-07', product: '', ticket: 1000, units: 1, highTicket: true },
      { id: 's2', menteeId: 'm2', month: '2026-07', product: '', ticket: 999, units: 9, highTicket: false },
      { id: 's3', menteeId: 'm1', month: '2026-06', product: '', ticket: 500, units: 1, highTicket: false },
    ]
    const camps: Campaign[] = [
      { id: 'c1', menteeId: 'm1', month: '2026-07', funnel: 'webinar' as Campaign['funnel'], product: '', ticket: 0, highTicket: false, cpl: 1, leads: 30, convPct: 0, status: 'planned' },
      { id: 'c2', menteeId: 'm1', month: '2026-06', funnel: 'webinar' as Campaign['funnel'], product: '', ticket: 0, highTicket: false, cpl: 1, leads: 99, convPct: 0, status: 'planned' },
    ]
    expect(monthActuals('m1', '2026-07', sales, camps)).toEqual({ revenue: 1000, htRevenue: 1000, leads: 30 })
  })
})

// ---------- funnelCalc ----------
describe('funnelCalc', () => {
  it('calcula taxas, CAC, receita, ROAS e lucro', () => {
    const r = funnelCalc({ leads: 100, cpl: 10, meetings: 20, sales: 5, ticket: 1000 })
    expect(r).toMatchObject({ invest: 1000, cac: 200, receita: 5000, roas: 5, lucro: 4000 })
    expect(r.taxaAgend).toBeCloseTo(0.2, 5)
    expect(r.convReuniao).toBeCloseTo(0.25, 5)
    expect(r.convGeral).toBeCloseTo(0.05, 5)
  })
  it('sem leads/vendas não estoura', () => {
    expect(funnelCalc({ leads: 0, cpl: 10, meetings: 0, sales: 0, ticket: 1000 }))
      .toMatchObject({ invest: 0, taxaAgend: 0, convGeral: 0, cac: 0, roas: 0 })
  })
})

// ---------- checkinStreak ----------
describe('checkinStreak', () => {
  const ci = (week: string): CheckIn => ({ id: week, menteeId: 'm1', week, date: week, wins: '', blockers: '', focus: '' })
  it('conta semanas consecutivas a partir da atual', () => {
    const wk = weekKey()
    const checkins = [ci(wk), ci(shiftWeek(wk, -1)), ci(shiftWeek(wk, -3))] // buraco em -2
    expect(checkinStreak('m1', checkins)).toBe(2)
  })
  it('sem check-in na semana atual, começa pela anterior', () => {
    const wk = weekKey()
    expect(checkinStreak('m1', [ci(shiftWeek(wk, -1))])).toBe(1)
  })
  it('mentorado sem check-ins tem streak 0', () => {
    expect(checkinStreak('m1', [])).toBe(0)
  })
})

// ---------- spentXp ----------
describe('spentXp', () => {
  const rewards: RewardItem[] = [{ id: 'r1', icon: '', label: '', description: '', costXp: 100 }]
  it('soma o custo das recompensas resgatadas', () => {
    const reds: Redemption[] = [
      { id: 'x', menteeId: 'm1', rewardId: 'r1', date: '2026-01-01', status: 'delivered' },
      { id: 'y', menteeId: 'm1', rewardId: 'r1', date: '2026-01-02', status: 'pending' },
    ]
    expect(spentXp('m1', reds, rewards)).toBe(200)
  })
  it('recompensa inexistente conta como 0', () => {
    const reds: Redemption[] = [{ id: 'x', menteeId: 'm1', rewardId: 'sumiu', date: '2026-01-01', status: 'delivered' }]
    expect(spentXp('m1', reds, rewards)).toBe(0)
  })
})

// ---------- accessInfo ----------
describe('accessInfo', () => {
  it('retorna null sem data de acesso', () => {
    expect(accessInfo(mkMentee())).toBeNull()
  })
  it('calcula dias restantes e não expirado quando futuro', () => {
    const today = todayIso()
    const m = mkMentee({ startDate: addDays(today, -20), accessUntil: addDays(today, 10) })
    const r = accessInfo(m)!
    expect(r.daysLeft).toBe(10)
    expect(r.expired).toBe(false)
    expect(r.totalDays).toBe(30)
  })
  it('marca expirado quando a data já passou', () => {
    const today = todayIso()
    const m = mkMentee({ startDate: addDays(today, -40), accessUntil: addDays(today, -5) })
    expect(accessInfo(m)!.expired).toBe(true)
  })
})

// ---------- upcomingCalls ----------
describe('upcomingCalls', () => {
  const call = (p: Partial<ScheduledCall>): ScheduledCall => ({
    id: Math.random().toString(36).slice(2), menteeId: 'm1', date: todayIso(), time: '10:00',
    topic: '', status: 'scheduled', ...p,
  })
  it('só agendadas de hoje em diante, ordenadas por data e hora', () => {
    const t = todayIso()
    const calls = [
      call({ id: 'passada', date: addDaysIso(t, -1) }),
      call({ id: 'depois', date: addDaysIso(t, 5) }),
      call({ id: 'hoje-tarde', date: t, time: '16:00' }),
      call({ id: 'hoje-manha', date: t, time: '09:00' }),
      call({ id: 'cancelada', date: addDaysIso(t, 2), status: 'canceled' }),
      call({ id: 'feita', date: addDaysIso(t, 3), status: 'done' }),
    ]
    expect(upcomingCalls(calls).map(c => c.id)).toEqual(['hoje-manha', 'hoje-tarde', 'depois'])
  })
  it('filtra por mentorado quando informado', () => {
    const t = todayIso()
    const calls = [call({ id: 'a', menteeId: 'm1', date: addDaysIso(t, 1) }), call({ id: 'b', menteeId: 'm2', date: addDaysIso(t, 1) })]
    expect(upcomingCalls(calls, 'm2').map(c => c.id)).toEqual(['b'])
  })
})

// ---------- addDaysIso ----------
describe('addDaysIso', () => {
  it('atravessa mês e ano corretamente', () => {
    expect(addDaysIso('2026-07-31', 1)).toBe('2026-08-01')
    expect(addDaysIso('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDaysIso('2026-03-01', -1)).toBe('2026-02-28')
  })
})

// ---------- socialUrl ----------
describe('socialUrl', () => {
  it('monta a URL a partir do @handle', () => {
    expect(socialUrl('instagram', '@ana.lemos')).toBe('https://instagram.com/ana.lemos')
    expect(socialUrl('tiktok', 'analemos')).toBe('https://tiktok.com/@analemos')
    expect(socialUrl('linkedin', 'ana-beatriz')).toBe('https://linkedin.com/in/ana-beatriz')
  })
  it('URL completa passa intocada', () => {
    expect(socialUrl('youtube', 'https://youtube.com/@canal')).toBe('https://youtube.com/@canal')
  })
})

// smoke: seeds continuam coerentes com os cálculos
describe('seeds', () => {
  it('há níveis e pilares definidos, e playbooks semente', () => {
    expect(LEVELS.length).toBeGreaterThan(1)
    expect(PILLARS.length).toBe(5)
    expect(PLAYBOOKS.length).toBeGreaterThan(0)
  })
})
