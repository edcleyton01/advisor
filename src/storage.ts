// ============================================================
//  Supabase Storage — anexos de evidência (bucket privado)
//  Upload direto do navegador; a RLS do bucket controla o acesso
//  (mentorado só a própria pasta; advisor/equipe tudo).
// ============================================================
import { supabase } from './supabase'

const BUCKET = 'evidences'
const MAX = 8 * 1024 * 1024 // 8 MB

export async function uploadEvidence(menteeId: string, actionId: string, file: File): Promise<{ path?: string; error?: string }> {
  if (!supabase) return { error: 'Nuvem não configurada.' }
  if (file.size > MAX) return { error: 'Arquivo acima de 8 MB.' }
  const safe = file.name.replace(/[^\w.\-]+/g, '_').slice(-60)
  const rnd = (crypto as any).randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)
  const path = `${menteeId}/${actionId}/${rnd}-${safe}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false })
  if (error) return { error: error.message }
  return { path }
}

// URL temporária (10 min) para abrir/baixar o arquivo
export async function evidenceUrl(path: string): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 600)
  return data?.signedUrl ?? null
}

export async function removeEvidence(path: string): Promise<void> {
  await supabase?.storage.from(BUCKET).remove([path])
}
