import { describe, it, expect } from 'vitest'
import { ensureStoreShape, migrateStore, seedStore, PLAYBOOKS } from './data'

const KEYS = ['mentees', 'team', 'sales', 'campaigns', 'goals', 'checkins', 'playbooks', 'redemptions', 'deals', 'funnels', 'rewards'] as const

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
    for (const k of ['goals', 'checkins', 'playbooks', 'redemptions', 'deals', 'funnels', 'rewards']) {
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
