// ============================================================
//  Camada de nuvem (Supabase) — Fase 1: workspace compartilhado
//  Se as variáveis de ambiente não existirem, cloudEnabled = false
//  e o app cai automaticamente no modo localStorage.
// ============================================================
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Store } from './data'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export const cloudEnabled = !!(url && anon)

// Inicialização defensiva: uma URL/chave malformada não pode derrubar o app.
// Se falhar, guardamos a mensagem para exibir uma tela de erro clara.
let client: SupabaseClient | null = null
let initError: string | null = null

if (cloudEnabled) {
  try {
    if (!/^https:\/\/[^\s]+\.supabase\.(co|in|net)$/i.test(url!)) {
      throw new Error(
        `VITE_SUPABASE_URL parece inválida: "${url}". ` +
        `Ela deve ser a "Project URL" completa, começando com https:// e terminando em .supabase.co ` +
        `(ex.: https://abcdxyz.supabase.co) — sem barra no final e sem espaços.`
      )
    }
    client = createClient(url!, anon!)
  } catch (e: any) {
    initError = e?.message ?? 'Falha ao iniciar o cliente Supabase.'
    console.error('[cloud] init:', initError)
  }
}

export const supabase: SupabaseClient | null = client
export const cloudInitError: string | null = initError

// Host do projeto (ex.: abcdxyz.supabase.co) — seguro exibir, ajuda a conferir
// visualmente se a URL configurada aponta para o projeto certo.
export const cloudHost: string | null = (() => {
  if (!url) return null
  try { return new URL(url).host } catch { return url }
})()

// Fase 1: um único workspace compartilhado por toda a equipe.
// (Fase 2 normaliza em tabelas com permissão por mentorado.)
const WORKSPACE_ID = 'default'

export async function loadCloudStore(): Promise<Store | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('workspace')
    .select('data')
    .eq('id', WORKSPACE_ID)
    .maybeSingle()
  if (error) { console.error('[cloud] load:', error.message); throw error }
  return (data?.data as Store) ?? null
}

export async function saveCloudStore(store: Store): Promise<{ error?: string }> {
  if (!supabase) return {}
  const { error } = await supabase
    .from('workspace')
    .upsert({ id: WORKSPACE_ID, data: store, updated_at: new Date().toISOString() })
  if (error) { console.error('[cloud] save:', error.message); return { error: error.message } }
  return {}
}

// ---------- Autenticação (e-mail + senha) ----------

export async function signInWithPassword(email: string, password: string): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Nuvem não configurada.' }
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (!error) return {}
  // mensagens amigáveis para os casos comuns
  if (/invalid login credentials/i.test(error.message)) return { error: 'E-mail ou senha incorretos.' }
  if (/email not confirmed/i.test(error.message)) return { error: 'E-mail ainda não confirmado. No Supabase, marque o usuário como "Auto Confirm".' }
  return { error: error.message }
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut()
}
