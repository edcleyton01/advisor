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

// ---------- Materiais complementares (bucket 'materials') ----------
// Escrita: só staff (RLS). Leitura: qualquer usuário logado.
const MATERIALS_BUCKET = 'materials'
const MATERIALS_MAX = 50 * 1024 * 1024 // 50 MB

export async function uploadMaterialFile(file: File): Promise<{ path?: string; error?: string }> {
  if (!supabase) return { error: 'Nuvem não configurada.' }
  if (file.size > MATERIALS_MAX) return { error: 'Arquivo acima de 50 MB.' }
  const safe = file.name.replace(/[^\w.\-]+/g, '_').slice(-80)
  const rnd = (crypto as any).randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)
  const path = `${rnd}-${safe}`
  const { error } = await supabase.storage.from(MATERIALS_BUCKET).upload(path, file, { upsert: false })
  if (error) return { error: error.message }
  return { path }
}

export async function materialUrl(path: string): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.storage.from(MATERIALS_BUCKET).createSignedUrl(path, 600)
  return data?.signedUrl ?? null
}

export async function removeMaterialFile(path: string): Promise<void> {
  await supabase?.storage.from(MATERIALS_BUCKET).remove([path])
}

// Anexo de checkpoint (SÓ EQUIPE): o caminho começa em "_checkpoints/",
// que não é pasta de nenhum mentorado — a RLS do bucket só deixa staff
// (is_staff) ler/escrever fora da própria pasta, então o mentorado
// nunca enxerga estes arquivos.
export async function uploadCheckpointFile(menteeId: string, file: File): Promise<{ path?: string; error?: string }> {
  if (!supabase) return { error: 'Nuvem não configurada.' }
  if (file.size > MAX) return { error: 'Arquivo acima de 8 MB.' }
  const safe = file.name.replace(/[^\w.\-]+/g, '_').slice(-60)
  const rnd = (crypto as any).randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)
  const path = `_checkpoints/${menteeId}/${rnd}-${safe}`
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
