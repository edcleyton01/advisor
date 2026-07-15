import { describe, it, expect } from 'vitest'
import { ensureStoreShape, ensureSettings, migrateStore, seedStore, buildAlerts, todayIso, PLAYBOOKS } from './data'

const KEYS = ['mentees', 'team', 'sales', 'campaigns', 'goals', 'checkins', 'playbooks', 'redemptions', 'deals', 'funnels', 'rewards', 'calls'] as const

describe('ensureStoreShape', () => {
  it('de null/lixo, devolve um Store com todos os campos como arrays vazios', () => {
    for (const garbage of [null, undefined, 42, 'x', {}, []]) {
      const s = ensureStoreShape(garbage as any)
      for (const k of KEYS) expect(Array.isArray(s[k]), `${k} de ${JSON.stringify(garbage)}`).toBe(true)
    }
  })
  it('coage campos corrompidos a array mas preserva os válidos', () => {
    const s = ensureStoreShape({ mentees: null, team: 'nope', sales: [{ id: 's1' }] } as any)
    expect(s.mentees).toEqual([])
    expect(s.team).toEqual([])
    expect(s.sales).toEqual([{ id: 's1' }])
  })
  it('é idempotente num Store já válido', () => {
    const seed = seedStore()
    const s = ensureStoreShape(seed)
    for (const k of KEYS) expect(s[k]).toEqual(seed[k])
  })
})

describe('settings (Administração)', () => {
  it('ensureSettings normaliza lixo para os padrões', () => {
    for (const garbage of [null, undefined, 42, 'x', {}]) {
      const st = ensureSettings(garbage as any)
      expect(st.appName).toBe('ADVISOR OS')
      expect(st.accent).toBe('amber')
      expect(st.notifications).toEqual({ calls: true, checkins: true, badge: true })
    }
  })
  it('preserva valores válidos e descarta inválidos', () => {
    const st = ensureSettings({ appName: '  Mentory OS  ', accent: 'roxo-inexistente', notifications: { calls: false } })
    expect(st.appName).toBe('Mentory OS')
    expect(st.accent).toBe('amber') // inválido → padrão
    expect(st.notifications.calls).toBe(false)
    expect(st.notifications.badge).toBe(true)
  })
  it('ensureStoreShape sempre entrega settings completo', () => {
    expect(ensureStoreShape(null as any).settings.appName).toBe('ADVISOR OS')
  })
  it('buildAlerts respeita os toggles de call e check-in', () => {
    const base = seedStore()
    const withCall = { ...base, calls: [{ id: 'c', menteeId: base.mentees[0].id, date: todayIso(), time: '10:00', topic: 'x', status: 'scheduled' as const }] }
    const on = buildAlerts(withCall)
    const off = buildAlerts({ ...withCall, settings: { ...base.settings, notifications: { calls: false, checkins: false, badge: true } } })
    expect(on.some(a => a.kind === 'call')).toBe(true)
    expect(off.some(a => a.kind === 'call')).toBe(false)
    expect(off.some(a => a.kind === 'checkin')).toBe(false)
  })
})

describe('migrateStore', () => {
  it('rejeita objeto que não parece um Store', () => {
    expect(migrateStore(null)).toBeNull()
    expect(migrateStore({})).toBeNull()
    expect(migrateStore({ mentees: [] })).toBeNull() // faltam team/sales/campaigns
  })
  it('preenche coleções ausentes num store antigo válido', () => {
    const old: any = { mentees: [], team: [], sales: [], campaigns: [] }
    const s = migrateStore(old)!
    expect(s).not.toBeNull()
    for (const k of ['goals', 'checkins', 'playbooks', 'redemptions', 'deals', 'funnels', 'rewards', 'calls']) {
      expect(Array.isArray((s as any)[k])).toBe(true)
    }
  })
  it('semeia os playbooks da metodologia sem duplicar os existentes', () => {
    const s = migrateStore({ mentees: [], team: [], sales: [], campaigns: [] } as any)!
    const ids = s.playbooks.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)           // sem duplicatas
    for (const p of PLAYBOOKS) expect(ids).toContain(p.id) // todos presentes
  })
})
