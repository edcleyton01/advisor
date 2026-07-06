// ============================================================
//  Função serverless (Vercel) — cria o login de um mentorado.
//  Usa a service_role (chave admin) que fica SÓ no servidor
//  (env sem prefixo VITE_ → nunca vai para o navegador).
//  Confirma que quem chama é advisor/equipe antes de criar.
// ============================================================
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' })

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return res.status(500).json({ error: 'Serviço não configurado: falta SUPABASE_SERVICE_ROLE_KEY na Vercel.' })
  }

  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: 'Sem autenticação.' })

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

  // 1) quem está chamando?
  const { data: caller, error: cErr } = await admin.auth.getUser(token)
  if (cErr || !caller?.user) return res.status(401).json({ error: 'Sessão inválida.' })

  // 2) só advisor/equipe podem criar acessos
  const { data: prof } = await admin.from('profiles').select('role').eq('user_id', caller.user.id).maybeSingle()
  if (!prof || !['advisor', 'team'].includes(prof.role)) {
    return res.status(403).json({ error: 'Apenas advisor/equipe podem criar acessos.' })
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '')
  const menteeId = String(body.menteeId || '')
  if (!email || !password || !menteeId) return res.status(400).json({ error: 'Dados incompletos.' })
  if (password.length < 6) return res.status(400).json({ error: 'A senha precisa de ao menos 6 caracteres.' })

  // 3) confirma que o mentorado existe
  const { data: mentee } = await admin.from('mentees').select('id, owner_user_id').eq('id', menteeId).maybeSingle()
  if (!mentee) return res.status(404).json({ error: 'Mentorado não encontrado.' })
  if (mentee.owner_user_id) return res.status(409).json({ error: 'Este mentorado já tem um acesso vinculado.' })

  // 4) cria o usuário de login (já confirmado, sem e-mail)
  const { data: created, error: uErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
  })
  if (uErr || !created?.user) {
    return res.status(400).json({ error: uErr?.message || 'Falha ao criar o usuário de login.' })
  }
  const uid = created.user.id

  // 5) vincula: papel + posse da linha (a RLS usa owner_user_id)
  const { error: pErr } = await admin.from('profiles').upsert({ user_id: uid, role: 'mentee', mentee_id: menteeId })
  if (pErr) return res.status(500).json({ error: 'Login criado, mas falhou o vínculo (perfil): ' + pErr.message })
  const { error: mErr } = await admin.from('mentees').update({ owner_user_id: uid }).eq('id', menteeId)
  if (mErr) return res.status(500).json({ error: 'Login criado, mas falhou o vínculo (mentorado): ' + mErr.message })

  return res.status(200).json({ ok: true, email })
}
