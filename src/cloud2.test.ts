import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ensureStoreShape } from './data'

// Mock do cliente Supabase: cada .from(tabela).upsert(...) usa o mesmo espião,
// cujo resultado ({ error }) controlamos por teste.
const { upsertMock } = vi.hoisted(() => ({ upsertMock: vi.fn() }))
vi.mock('./supabase', () => ({
  supabase: { from: () => ({ upsert: upsertMock }) },
}))

import { saveForStaff, saveForMentee } from './cloud2'

const storeWithMentee = () => ensureStoreShape({ mentees: [{ id: 'm1', name: 'A', blocks: [] }] })

beforeEach(() => upsertMock.mockReset())

describe('saveForStaff — contrato de erro', () => {
  it('sucesso: nenhum erro do upsert → retorna {} (sem error)', async () => {
    upsertMock.mockResolvedValue({ error: null })
    expect(await saveForStaff(storeWithMentee())).toEqual({})
  })
  it('falha: erro do upsert deixa de ser engolido → retorna { error }', async () => {
    upsertMock.mockResolvedValue({ error: { message: 'RLS negou a escrita' } })
    const r = await saveForStaff(storeWithMentee())
    expect(r.error).toBe('RLS negou a escrita')
  })
})

describe('saveForStaff — notas privadas fora do payload do mentorado', () => {
  const storeWithNotes = () => ensureStoreShape({ mentees: [{ id: 'm1', name: 'A', blocks: [], privateNotes: 'segredo do advisor' }] })
  // ordem das chamadas: [0] mentees_private, [1] mentees, [2] shared

  it('com a tabela privada disponível, privateNotes sai do blob e vai para mentees_private', async () => {
    upsertMock.mockResolvedValue({ error: null })
    await saveForStaff(storeWithNotes())
    const privRows = upsertMock.mock.calls[0][0]
    const menteeRows = upsertMock.mock.calls[1][0]
    expect(privRows[0].data.privateNotes).toBe('segredo do advisor')
    expect(menteeRows[0].data.mentee.privateNotes).toBeUndefined()
  })

  it('sem a tabela privada (SQL da Fase 3 não aplicado), mantém a nota no blob — nunca perde', async () => {
    upsertMock.mockResolvedValueOnce({ error: { message: 'relation "mentees_private" does not exist' } })
    upsertMock.mockResolvedValue({ error: null })
    const r = await saveForStaff(storeWithNotes())
    expect(r).toEqual({}) // falha da tabela privada não derruba o save
    const menteeRows = upsertMock.mock.calls[1][0]
    expect(menteeRows[0].data.mentee.privateNotes).toBe('segredo do advisor')
  })
})

describe('saveForMentee — contrato de erro', () => {
  it('propaga o erro do upsert em vez de fingir sucesso', async () => {
    upsertMock.mockResolvedValue({ error: { message: 'sem permissão' } })
    const r = await saveForMentee(storeWithMentee(), 'm1')
    expect(r.error).toBe('sem permissão')
  })
  it('mentorado inexistente no store: no-op sem erro', async () => {
    upsertMock.mockResolvedValue({ error: { message: 'não deveria ser chamado' } })
    expect(await saveForMentee(storeWithMentee(), 'fantasma')).toEqual({})
    expect(upsertMock).not.toHaveBeenCalled()
  })
})
